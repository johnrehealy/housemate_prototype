import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionContext } from "../actions/context";
import { recordInboundMessage } from "../actions/record-inbound-message";
import { sendMessage } from "../actions/send-message";
import type { Db, Tx } from "../db/client";
import { alerts, messages, usageCosts } from "../db/schema";
import {
  createHome,
  createMember,
  one,
  testDb,
  withRollback,
} from "../db/testing";
import {
  createSimulatorProvider,
  SIMULATED_MESSAGE_PRICE_USD,
} from "../sms/simulator-provider";
import type { SmsProvider } from "../sms/types";
import { handleMessageCostJob } from "./message-cost";
import { stuckSendText, sweepStuckSends } from "./sweep-stuck-sends";

let db: Db;
beforeAll(() => {
  db = testDb();
});
afterAll(async () => {
  await db.close();
});

// Clear of the seed (019) and the other suites (010, 020, 030, 040).
let phoneCounter = 0;
const nextPhone = () => `+1555050${String(phoneCounter++).padStart(4, "0")}`;
const HOUSEMATE = "+15550100000";
const TEAM = ["+15550700001", "+15550700002"];

function context(tx: Tx, sms: SmsProvider): ActionContext {
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

async function member(tx: Tx) {
  const home = await createHome(tx, "Cost job home");
  const who = await createMember(tx, { homeId: home.id, phone: nextPhone() });
  return { home, member: who };
}

/** The job a saved text leaves behind, read straight off the queue. */
async function costJobFor(tx: Tx, messageId: string) {
  const rows = await tx.execute<{ message: { providerSid: string } }>(
    sql`select message from pgmq.q_message_costs where message->>'messageId' = ${messageId}`,
  );
  return rows.map((row) => row.message);
}

describe("the message_costs job", () => {
  it("queues a lookup for an inbound text and records what it cost", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const { home, member: who } = await member(tx);

      const providerSid = `SIM${randomUUID().replaceAll("-", "")}`;
      const { messageId } = await recordInboundMessage(ctx, {
        providerSid,
        fromPhone: who.phone,
        toPhone: HOUSEMATE,
        body: "The AC stopped working",
      });

      // The text's own transaction queued the lookup.
      expect(await costJobFor(tx, messageId)).toEqual([
        { messageId, providerSid },
      ]);

      const first = await handleMessageCostJob(ctx, { messageId, providerSid });
      expect(first).toEqual({
        recorded: true,
        amountUsd: SIMULATED_MESSAGE_PRICE_USD,
        overBudget: false,
      });

      const cost = one(
        await tx
          .select({
            kind: usageCosts.kind,
            amountUsd: usageCosts.amountUsd,
            memberId: usageCosts.memberId,
            homeId: usageCosts.homeId,
            refId: usageCosts.refId,
          })
          .from(usageCosts)
          .where(eq(usageCosts.refId, providerSid)),
      );
      expect(cost).toMatchObject({
        kind: "twilio",
        memberId: who.id,
        homeId: home.id,
        refId: providerSid,
      });
      expect(Number(cost.amountUsd)).toBe(SIMULATED_MESSAGE_PRICE_USD);
    });
  });

  it("records a text's cost once, however often the job runs", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const { member: who } = await member(tx);
      const providerSid = `SIM${randomUUID().replaceAll("-", "")}`;
      const { messageId } = await recordInboundMessage(ctx, {
        providerSid,
        fromPhone: who.phone,
        toPhone: HOUSEMATE,
        body: "Again",
      });

      await handleMessageCostJob(ctx, { messageId, providerSid });
      const second = await handleMessageCostJob(ctx, {
        messageId,
        providerSid,
      });

      expect(second).toEqual({ recorded: false, reason: "already-recorded" });
      expect(
        await tx
          .select({ id: usageCosts.id })
          .from(usageCosts)
          .where(eq(usageCosts.refId, providerSid)),
      ).toHaveLength(1);
    });
  });

  it("asks again when the provider hasn't priced the text yet", async () => {
    await withRollback(db, async (tx) => {
      const unpriced: SmsProvider = {
        name: "twilio",
        send: () => Promise.reject(new Error("Not used")),
        priceOf: async () => null,
      };
      const ctx = context(tx, unpriced);
      const { member: who } = await member(tx);
      const providerSid = `SM${randomUUID().replaceAll("-", "")}`;
      const { messageId } = await recordInboundMessage(ctx, {
        providerSid,
        fromPhone: who.phone,
        toPhone: HOUSEMATE,
        body: "Not priced yet",
      });

      // A retry, not a failure: the consumer backs off and tries again.
      await expect(
        handleMessageCostJob(ctx, { messageId, providerSid }),
      ).rejects.toMatchObject({ code: "price_pending" });
      expect(
        await tx
          .select({ id: usageCosts.id })
          .from(usageCosts)
          .where(eq(usageCosts.refId, providerSid)),
      ).toEqual([]);
    });
  });

  it("costs a text from a stranger, with no home or member", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const providerSid = `SIM${randomUUID().replaceAll("-", "")}`;
      const { messageId } = await recordInboundMessage(ctx, {
        providerSid,
        fromPhone: nextPhone(),
        toPhone: HOUSEMATE,
        body: "Who is this?",
      });

      await handleMessageCostJob(ctx, { messageId, providerSid });

      const cost = one(
        await tx
          .select({ homeId: usageCosts.homeId, memberId: usageCosts.memberId })
          .from(usageCosts)
          .where(eq(usageCosts.refId, providerSid)),
      );
      expect(cost).toEqual({ homeId: null, memberId: null });
    });
  });

  it("queues a lookup for a text Housemate sends", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const { home, member: who } = await member(tx);

      const sent = await sendMessage(ctx, {
        homeId: home.id,
        memberId: who.id,
        body: "On it",
        kind: "reply",
      });

      expect(await costJobFor(tx, sent.messageId)).toEqual([
        { messageId: sent.messageId, providerSid: sent.providerSid },
      ]);
    });
  });
});

describe("the stuck-send sweep", () => {
  /** A text saved but never sent: what a crash between the two leaves. */
  async function stuckText(tx: Tx, minutesAgo: number) {
    const to = nextPhone();
    const [row] = await tx
      .insert(messages)
      .values({
        direction: "outbound",
        channel: "sms",
        author: "system",
        outboundKind: "reply",
        body: "Never sent",
        toPhone: to,
        deliveryStatus: "queued",
        createdAt: new Date(Date.now() - minutesAgo * 60_000),
      })
      .returning();
    return row!;
  }

  it("tells the team once about each text that never went out", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const stuck = await stuckText(tx, 20);

      const first = await sweepStuckSends(ctx, { teamPhones: TEAM });
      expect(first).toMatchObject({ raised: 1 });

      const alert = one(
        await tx
          .select({
            dedupeKey: alerts.dedupeKey,
            notifiedAt: alerts.notifiedAt,
          })
          .from(alerts)
          .where(eq(alerts.kind, "send_stuck")),
      );
      expect(alert.dedupeKey).toBe(`stuck-send:${stuck.id}`);
      expect(alert.notifiedAt).not.toBeNull();
      expect(sms.sent.map((text) => text.to)).toEqual(TEAM);
      expect(sms.sent[0]?.body).toContain(
        stuckSendText(stuck.id, stuck.toPhone, 20),
      );

      // A second sweep finds it again and says nothing further.
      const second = await sweepStuckSends(ctx, { teamPhones: TEAM });
      expect(second).toMatchObject({ found: 1, raised: 0 });
      expect(sms.sent).toHaveLength(TEAM.length);
    });
  });

  it("leaves a text that was sent, and one that's only just been saved", async () => {
    await withRollback(db, async (tx) => {
      const sms = createSimulatorProvider();
      const ctx = context(tx, sms);
      const { home, member: who } = await member(tx);
      await sendMessage(ctx, {
        homeId: home.id,
        memberId: who.id,
        body: "Sent fine",
        kind: "reply",
      });
      await stuckText(tx, 2);

      const swept = await sweepStuckSends(ctx, { teamPhones: TEAM });

      expect(swept).toEqual({ found: 0, raised: 0 });
      expect(
        await tx
          .select({ id: alerts.id })
          .from(alerts)
          .where(eq(alerts.kind, "send_stuck")),
      ).toEqual([]);
    });
  });
});
