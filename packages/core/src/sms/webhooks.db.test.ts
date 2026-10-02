import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ActionContext } from "../actions/context";
import { sendMessage } from "../actions/send-message";
import type { Db, Tx } from "../db/client";
import { messages } from "../db/schema";
import {
  createHome,
  createMember,
  one,
  testDb,
  withRollback,
} from "../db/testing";
import { signTwilioRequest } from "./signature";
import { createSimulatorProvider } from "./simulator-provider";
import { handleInboundWebhook, handleStatusWebhook } from "./webhooks";

let db: Db;
beforeAll(() => {
  db = testDb();
});
afterAll(async () => {
  await db.close();
});

// Clear of the seed (+1555019xxxx) and the other suites (010, 020).
let phoneCounter = 0;
const nextPhone = () => `+1555030${String(phoneCounter++).padStart(4, "0")}`;
const UNINVITED = "+15550399999";
const HOUSEMATE = "+15550100000";

const authToken = "test-auth-token";
const inboundUrl = "https://housemate.test/api/twilio/inbound";
const statusUrl = "https://housemate.test/api/twilio/status";

/** The context the web app's routes build: the system, through SMS. */
function context(tx: Tx): ActionContext {
  return {
    db: tx,
    actor: { type: "system" },
    source: { type: "sms" },
    services: {
      auth: {
        createUser: () => Promise.reject(new Error("Not used")),
        deleteUser: () => Promise.reject(new Error("Not used")),
      },
      sms: createSimulatorProvider(),
    },
  };
}

/** A request exactly as Twilio would sign and send it. */
function signed(url: string, params: Record<string, string>) {
  return {
    authToken,
    url,
    params,
    signature: signTwilioRequest({ authToken, url, params }),
  };
}

function textFrom(from: string, body = "The AC stopped working") {
  return {
    MessageSid: `SM${randomUUID().replaceAll("-", "")}`,
    From: from,
    To: HOUSEMATE,
    Body: body,
    NumMedia: "0",
  };
}

async function queuedJobs(tx: Tx): Promise<number> {
  const rows = await tx.execute<{ count: string }>(
    sql`select count(*)::text as count from pgmq.q_inbound_messages`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function storedBySid(tx: Tx, providerSid: string) {
  return tx
    .select({
      homeId: messages.homeId,
      memberId: messages.memberId,
      body: messages.body,
      deliveryStatus: messages.deliveryStatus,
    })
    .from(messages)
    .where(eq(messages.providerSid, providerSid));
}

describe("the inbound webhook", () => {
  it("stores a member's text and queues it for the agent", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx, "Webhook home");
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });
      const before = await queuedJobs(tx);
      const params = textFrom(member.phone);

      const response = await handleInboundWebhook({
        ctx: context(tx),
        ...signed(inboundUrl, params),
      });

      expect(response).toMatchObject({ status: 200, contentType: "text/xml" });
      expect(response.body).toContain("<Response/>");
      expect(one(await storedBySid(tx, params.MessageSid))).toMatchObject({
        homeId: home.id,
        memberId: member.id,
        body: params.Body,
        deliveryStatus: "received",
      });
      expect(await queuedJobs(tx)).toBe(before + 1);
    });
  });

  it("stores a text from an uninvited number without a home, queued for the invite-only reply", async () => {
    await withRollback(db, async (tx) => {
      const before = await queuedJobs(tx);
      const params = textFrom(UNINVITED, "Who is this?");

      const response = await handleInboundWebhook({
        ctx: context(tx),
        ...signed(inboundUrl, params),
      });

      expect(response.status).toBe(200);
      expect(one(await storedBySid(tx, params.MessageSid))).toMatchObject({
        homeId: null,
        memberId: null,
      });
      expect(await queuedJobs(tx)).toBe(before + 1);
    });
  });

  it("stores a member's STOP without queueing it", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx, "STOP home");
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });
      const before = await queuedJobs(tx);
      const params = textFrom(member.phone, "Stop");

      const response = await handleInboundWebhook({
        ctx: context(tx),
        ...signed(inboundUrl, params),
      });

      expect(response.status).toBe(200);
      expect(await storedBySid(tx, params.MessageSid)).toHaveLength(1);
      expect(await queuedJobs(tx)).toBe(before);
    });
  });

  it("stores nothing when the signature is wrong", async () => {
    await withRollback(db, async (tx) => {
      const params = textFrom(UNINVITED);

      const response = await handleInboundWebhook({
        ctx: context(tx),
        ...signed(inboundUrl, params),
        authToken: "some-other-token",
      });

      expect(response.status).toBe(403);
      expect(await storedBySid(tx, params.MessageSid)).toHaveLength(0);
    });
  });

  it("answers a repeated webhook without a second message or job", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx, "Repeat home");
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });
      const params = textFrom(member.phone);
      const request = { ctx: context(tx), ...signed(inboundUrl, params) };

      await handleInboundWebhook(request);
      const jobsAfterFirst = await queuedJobs(tx);
      const second = await handleInboundWebhook(request);

      expect(second.status).toBe(200);
      expect(await storedBySid(tx, params.MessageSid)).toHaveLength(1);
      expect(await queuedJobs(tx)).toBe(jobsAfterFirst);
    });
  });
});

describe("the status webhook", () => {
  it("keeps a delivered text delivered when a late 'sent' arrives", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx, "Status webhook home");
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });
      const ctx = context(tx);
      const sent = await sendMessage(ctx, {
        homeId: home.id,
        memberId: member.id,
        body: "Booked for Tuesday",
        kind: "reply",
      });
      const callback = (MessageStatus: string) =>
        handleStatusWebhook({
          ctx,
          ...signed(statusUrl, { MessageSid: sent.providerSid, MessageStatus }),
        });

      expect((await callback("delivered")).status).toBe(200);
      expect((await callback("sent")).status).toBe(200);

      expect(one(await storedBySid(tx, sent.providerSid))).toMatchObject({
        deliveryStatus: "delivered",
      });
    });
  });

  it("acknowledges a text it has no record of", async () => {
    await withRollback(db, async (tx) => {
      const response = await handleStatusWebhook({
        ctx: context(tx),
        ...signed(statusUrl, {
          MessageSid: "SMnot-a-text-we-sent",
          MessageStatus: "delivered",
        }),
      });
      expect(response.status).toBe(200);
    });
  });
});
