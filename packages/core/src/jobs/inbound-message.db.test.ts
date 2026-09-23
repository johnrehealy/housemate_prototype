import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionContext } from "../actions/context";
import { recordInboundMessage } from "../actions/record-inbound-message";
import { INVITE_ONLY_REPLY } from "../actions/send-invite-only-reply";
import type { Db, Tx } from "../db/client";
import { activityEvents, messages } from "../db/schema";
import {
  createHome,
  createMember,
  one,
  testDb,
  withRollback,
} from "../db/testing";
import {
  createSimulatorProvider,
  type SimulatorProvider,
} from "../sms/simulator-provider";
import { acknowledgment, handleInboundMessageJob } from "./inbound-message";

let db: Db;
beforeAll(() => {
  db = testDb();
});
afterAll(async () => {
  await db.close();
});

// Clear of the seed (019) and the other suites (010, 020, 030).
let phoneCounter = 0;
const nextPhone = () => `+1555040${String(phoneCounter++).padStart(4, "0")}`;
const HOUSEMATE = "+15550100000";

/** The context the worker builds, with a simulator to count what's sent. */
function context(tx: Tx, sms: SimulatorProvider): ActionContext {
  return {
    db: tx,
    actor: { type: "system" },
    source: { type: "system" },
    services: {
      auth: {
        createUser: () => Promise.reject(new Error("Not used")),
        deleteUser: () => Promise.reject(new Error("Not used")),
      },
      sms,
    },
  };
}

async function textFrom(
  ctx: ActionContext,
  fromPhone: string,
  body = "The AC stopped working",
) {
  const { messageId } = await recordInboundMessage(ctx, {
    providerSid: `SIM${randomUUID().replaceAll("-", "")}`,
    fromPhone,
    toPhone: HOUSEMATE,
    body,
  });
  return messageId;
}

async function repliesTo(tx: Tx, phone: string) {
  return tx
    .select({
      id: messages.id,
      body: messages.body,
      author: messages.author,
      homeId: messages.homeId,
      deliveryStatus: messages.deliveryStatus,
    })
    .from(messages)
    .where(
      and(eq(messages.toPhone, phone), eq(messages.direction, "outbound")),
    );
}

async function member(tx: Tx) {
  const home = await createHome(tx, "Worker home");
  return createMember(tx, { homeId: home.id, phone: nextPhone() });
}

describe("handleInboundMessageJob", () => {
  it("acknowledges a member's text once, however many times the job runs", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const sam = await member(tx);
      const messageId = await textFrom(ctx, sam.phone);

      const first = await handleInboundMessageJob(
        ctx,
        { messageId },
        { ackReplyEnabled: true },
      );
      // A retry, as after a worker dies before deleting the job.
      const second = await handleInboundMessageJob(
        ctx,
        { messageId },
        { ackReplyEnabled: true },
      );

      expect(first).toMatchObject({
        reply: "acknowledgment",
        duplicate: false,
      });
      expect(second).toMatchObject({
        reply: "acknowledgment",
        duplicate: true,
        messageId: first.reply === "acknowledgment" ? first.messageId : "",
      });
      expect(sms.sent).toHaveLength(1);
      expect(one(await repliesTo(tx, sam.phone))).toMatchObject({
        body: acknowledgment(sam.firstName),
        author: "system",
        deliveryStatus: "sent",
      });
    });
  });

  it("doesn't resend a reply whose earlier send never reported back", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const sam = await member(tx);
      const messageId = await textFrom(ctx, sam.phone);
      // The worker saved the reply, then died before hearing from the provider.
      await tx.insert(messages).values({
        homeId: sam.homeId,
        memberId: sam.id,
        direction: "outbound",
        channel: "sms",
        author: "system",
        outboundKind: "reply",
        body: acknowledgment(sam.firstName),
        toPhone: sam.phone,
        deliveryStatus: "queued",
        idempotencyKey: `ack:${messageId}`,
      });

      const result = await handleInboundMessageJob(
        ctx,
        { messageId },
        { ackReplyEnabled: true },
      );

      expect(result).toMatchObject({ duplicate: true });
      expect(sms.sent).toHaveLength(0);
      expect(await repliesTo(tx, sam.phone)).toHaveLength(1);
    });
  });

  it("gives an uninvited number exactly one reply, however often it texts", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const stranger = "+15550419999";

      for (const body of ["Who is this?", "Hello?"]) {
        const messageId = await textFrom(ctx, stranger, body);
        await handleInboundMessageJob(
          ctx,
          { messageId },
          { ackReplyEnabled: true },
        );
      }

      expect(sms.sent).toEqual([
        expect.objectContaining({ to: stranger, body: INVITE_ONLY_REPLY }),
      ]);
      expect(one(await repliesTo(tx, stranger))).toMatchObject({
        author: "system",
        homeId: null,
      });
    });
  });

  it("sends nothing to a member when the acknowledgment is off", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const sam = await member(tx);
      const messageId = await textFrom(ctx, sam.phone);

      const result = await handleInboundMessageJob(
        ctx,
        { messageId },
        { ackReplyEnabled: false },
      );

      expect(result).toEqual({ reply: "none", reason: "acknowledgment-off" });
      expect(sms.sent).toHaveLength(0);
    });
  });

  it("records the reply as the system's, answering the text it came from", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const sam = await member(tx);
      const messageId = await textFrom(ctx, sam.phone);

      const result = await handleInboundMessageJob(
        ctx,
        { messageId },
        { ackReplyEnabled: true },
      );
      if (result.reply === "none") throw new Error("Expected a reply");

      const event = one(
        await tx
          .select({
            action: activityEvents.action,
            actorType: activityEvents.actorType,
            sourceType: activityEvents.sourceType,
            sourceId: activityEvents.sourceId,
          })
          .from(activityEvents)
          .where(eq(activityEvents.entityId, result.messageId)),
      );
      expect(event).toEqual({
        action: "queued",
        actorType: "system",
        sourceType: "sms",
        sourceId: messageId,
      });
    });
  });

  it("refuses a payload without a message ID", async () => {
    await withRollback(db, async (tx) => {
      const ctx = context(tx, createSimulatorProvider());
      await expect(
        handleInboundMessageJob(
          ctx,
          { homeId: null },
          { ackReplyEnabled: true },
        ),
      ).rejects.toThrow();
    });
  });
});
