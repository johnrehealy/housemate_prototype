import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db, Tx } from "../db/client";
import {
  activityEvents,
  alerts,
  homes,
  members,
  messages,
  usageCosts,
} from "../db/schema";
import {
  createHome,
  createMember,
  one,
  testDb,
  withRollback,
} from "../db/testing";
import { createSimulatorProvider } from "../sms/simulator-provider";
import type { SmsProvider } from "../sms/types";
import type { ActionContext, AuthAdmin } from "./context";
import { ActionError } from "./errors";
import { inviteMember } from "./invite-member";
import { recordInboundMessage } from "./record-inbound-message";
import { recordUsageCost } from "./record-usage-cost";
import { sendMessage } from "./send-message";
import { updateMessageStatus } from "./update-message-status";

let db: Db;
beforeAll(() => {
  db = testDb();
});
afterAll(async () => {
  await db.close();
});

let phoneCounter = 0;
const nextPhone = () => `+1555020${String(phoneCounter++).padStart(4, "0")}`;

const AFTERNOON = new Date("2026-09-15T18:00:00Z"); // 2 PM in New York
const LATE_EVENING = new Date("2026-09-16T02:00:00Z"); // 10 PM in New York

/** Stands in for Supabase Auth, writing the same auth.users row it would. */
function fakeAuth(tx: Tx) {
  const created: string[] = [];
  const deleted: string[] = [];
  const auth: AuthAdmin = {
    async createUser({ phone }) {
      // A savepoint keeps a failure here (a phone that already has an account)
      // from aborting the test's transaction, the way a failed call to the
      // real Supabase Auth service wouldn't.
      const userId = await tx.transaction(async (savepoint) => {
        const [user] = await savepoint.execute<{ id: string }>(sql`
          insert into auth.users (instance_id, id, aud, role, phone, created_at, updated_at)
          values (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
            'authenticated', 'authenticated', ${phone.slice(1)}, now(), now()
          )
          returning id
        `);
        if (!user) throw new Error("Expected an auth user");
        return user.id;
      });
      created.push(userId);
      return { userId };
    },
    async deleteUser(userId) {
      await tx.execute(sql`delete from auth.users where id = ${userId}::uuid`);
      deleted.push(userId);
    },
  };
  return { auth, created, deleted };
}

function context(
  tx: Tx,
  overrides: Partial<ActionContext> & { sms?: SmsProvider } = {},
): ActionContext & { auth: ReturnType<typeof fakeAuth> } {
  const auth = fakeAuth(tx);
  return {
    db: tx,
    actor: { type: "system" },
    source: { type: "system" },
    services: {
      auth: auth.auth,
      sms: overrides.sms ?? createSimulatorProvider(),
    },
    now: AFTERNOON,
    ...overrides,
    auth,
  };
}

async function eventsFor(tx: Tx, entityType: string, entityId: string) {
  return tx
    .select({
      action: activityEvents.action,
      actorType: activityEvents.actorType,
      sourceType: activityEvents.sourceType,
      homeId: activityEvents.homeId,
    })
    .from(activityEvents)
    .where(
      and(
        eq(activityEvents.entityType, entityType),
        eq(activityEvents.entityId, entityId),
      ),
    );
}

async function queuedJobs(tx: Tx): Promise<number> {
  const rows = await tx.execute<{ count: string }>(
    sql`select count(*)::text as count from pgmq.q_inbound_messages`,
  );
  return Number(rows[0]?.count ?? 0);
}

describe("inviteMember", () => {
  it("creates the home, the member and their activity events", async () => {
    await withRollback(db, async (tx) => {
      const ctx = context(tx);
      const phone = nextPhone();

      const result = await inviteMember(ctx, {
        phone,
        firstName: "Alex",
        home: {
          name: "Maple Lane",
          address: "24 Maple Lane",
          timezone: "America/New_York",
        },
      });

      const member = one(
        await tx.select().from(members).where(eq(members.id, result.memberId)),
      );
      expect(member.status).toBe("invited");
      expect(member.phone).toBe(phone);
      expect(member.homeId).toBe(result.homeId);
      expect(ctx.auth.created).toEqual([member.userId]);

      expect(await eventsFor(tx, "member", member.id)).toEqual([
        {
          action: "invited",
          actorType: "system",
          sourceType: "system",
          homeId: result.homeId,
        },
      ]);
      expect(await eventsFor(tx, "home", result.homeId!)).toEqual([
        {
          action: "created",
          actorType: "system",
          sourceType: "system",
          homeId: result.homeId,
        },
      ]);
    });
  });

  it("records who invited them and through which channel", async () => {
    await withRollback(db, async (tx) => {
      const staff = await createMember(tx, {
        homeId: null,
        phone: nextPhone(),
        role: "staff",
      });
      const ctx = context(tx, {
        actor: { type: "staff", id: staff.id },
        source: { type: "web" },
      });

      const result = await inviteMember(ctx, {
        phone: nextPhone(),
        firstName: "Robin",
        home: { name: "Oak", address: "3 Oak", timezone: "Europe/Dublin" },
      });

      const [event] = await eventsFor(tx, "member", result.memberId);
      expect(event).toMatchObject({ actorType: "staff", sourceType: "web" });
    });
  });

  it("refuses an invite past the pilot cap and removes the sign-in account", async () => {
    await withRollback(db, async (tx) => {
      const ctx = context(tx);
      const home = await createHome(tx, "Cap home");
      const existing = await tx
        .select({ id: members.id })
        .from(members)
        .where(eq(members.role, "member"));
      for (let i = existing.length; i < 10; i++) {
        await createMember(tx, { homeId: home.id, phone: nextPhone() });
      }

      const attempt = inviteMember(ctx, {
        phone: nextPhone(),
        firstName: "Eleventh",
        homeId: home.id,
      });

      await expect(attempt).rejects.toMatchObject({ code: "member_cap" });
      expect(ctx.auth.deleted).toEqual(ctx.auth.created);
      const count = await tx
        .select({ id: members.id })
        .from(members)
        .where(eq(members.role, "member"));
      expect(count).toHaveLength(10);
    });
  });

  it("saves nothing when the phone is already invited", async () => {
    await withRollback(db, async (tx) => {
      const ctx = context(tx);
      const phone = nextPhone();
      await createMember(tx, {
        homeId: (await createHome(tx, "First home")).id,
        phone,
      });

      const attempt = inviteMember(ctx, {
        phone,
        firstName: "Duplicate",
        home: { name: "Second home", address: "2 Elm", timezone: "UTC" },
      });

      await expect(attempt).rejects.toMatchObject({ code: "conflict" });
      expect(ctx.auth.deleted).toEqual(ctx.auth.created);
      const created = await tx
        .select({ id: homes.id })
        .from(homes)
        .where(eq(homes.name, "Second home"));
      expect(created).toEqual([]);
    });
  });

  it("rejects an invalid timezone before touching the database", async () => {
    await withRollback(db, async (tx) => {
      const ctx = context(tx);
      const attempt = inviteMember(ctx, {
        phone: nextPhone(),
        firstName: "Bad timezone",
        home: {
          name: "Nowhere",
          address: "1 Nowhere",
          timezone: "Mars/Olympus",
        },
      });

      await expect(attempt).rejects.toBeInstanceOf(ActionError);
      expect(ctx.auth.created).toEqual([]);
    });
  });
});

describe("recordInboundMessage", () => {
  async function invitedMember(tx: Tx) {
    const home = await createHome(tx, "Inbound home");
    const member = await createMember(tx, {
      homeId: home.id,
      phone: nextPhone(),
    });
    return { home, member };
  }

  it("stores the text, records it, and queues it for the agent", async () => {
    await withRollback(db, async (tx) => {
      const { home, member } = await invitedMember(tx);
      const before = await queuedJobs(tx);

      const result = await recordInboundMessage(context(tx), {
        providerSid: `SM${randomUUID()}`,
        fromPhone: member.phone,
        toPhone: "+15550100000",
        body: "The AC is not working",
      });

      expect(result).toMatchObject({
        duplicate: false,
        queued: true,
        homeId: home.id,
        memberId: member.id,
      });
      const stored = one(
        await tx
          .select()
          .from(messages)
          .where(eq(messages.id, result.messageId)),
      );
      expect(stored).toMatchObject({
        direction: "inbound",
        channel: "sms",
        author: "member",
        deliveryStatus: "received",
        body: "The AC is not working",
      });
      expect(await eventsFor(tx, "message", result.messageId)).toHaveLength(1);
      expect(await queuedJobs(tx)).toBe(before + 1);
    });
  });

  it("ignores a repeated webhook for the same text", async () => {
    await withRollback(db, async (tx) => {
      const { member } = await invitedMember(tx);
      const providerSid = `SM${randomUUID()}`;
      const input = {
        providerSid,
        fromPhone: member.phone,
        toPhone: "+15550100000",
        body: "Hello",
      };

      const first = await recordInboundMessage(context(tx), input);
      const jobsAfterFirst = await queuedJobs(tx);
      const second = await recordInboundMessage(context(tx), input);

      expect(second).toMatchObject({
        messageId: first.messageId,
        duplicate: true,
        queued: false,
      });
      expect(await eventsFor(tx, "message", first.messageId)).toHaveLength(1);
      expect(await queuedJobs(tx)).toBe(jobsAfterFirst);
    });
  });

  it("stores a text from an unknown number without a home and without queueing", async () => {
    await withRollback(db, async (tx) => {
      const before = await queuedJobs(tx);

      const result = await recordInboundMessage(context(tx), {
        providerSid: `SM${randomUUID()}`,
        fromPhone: "+15550199999",
        toPhone: "+15550100000",
        body: "Who is this?",
      });

      expect(result).toMatchObject({
        homeId: null,
        memberId: null,
        queued: false,
      });
      const [event] = await eventsFor(tx, "message", result.messageId);
      expect(event).toMatchObject({ action: "received", homeId: null });
      expect(await queuedJobs(tx)).toBe(before);
    });
  });
});

describe("sendMessage", () => {
  async function recipient(tx: Tx) {
    const home = await createHome(tx, "Sending home");
    const member = await createMember(tx, {
      homeId: home.id,
      phone: nextPhone(),
    });
    return { home, member };
  }

  it("saves the text, sends it, and marks it sent", async () => {
    await withRollback(db, async (tx) => {
      const { home, member } = await recipient(tx);
      const sms = createSimulatorProvider();
      const ctx = context(tx, { sms });

      const result = await sendMessage(ctx, {
        homeId: home.id,
        memberId: member.id,
        body: "On it",
        kind: "reply",
      });

      expect(sms.sent).toEqual([
        { to: member.phone, body: "On it", providerSid: result.providerSid },
      ]);
      const stored = one(
        await tx
          .select()
          .from(messages)
          .where(eq(messages.id, result.messageId)),
      );
      expect(stored).toMatchObject({
        direction: "outbound",
        author: "agent",
        outboundKind: "reply",
        deliveryStatus: "sent",
        providerSid: result.providerSid,
      });
      expect(await eventsFor(tx, "message", result.messageId)).toEqual([
        {
          action: "queued",
          actorType: "system",
          sourceType: "system",
          homeId: home.id,
        },
      ]);
    });
  });

  it("won't text first during quiet hours, and saves nothing", async () => {
    await withRollback(db, async (tx) => {
      const { home, member } = await recipient(tx);
      const sms = createSimulatorProvider();
      const ctx = context(tx, { sms, now: LATE_EVENING });

      const attempt = sendMessage(ctx, {
        homeId: home.id,
        memberId: member.id,
        body: "Just checking in",
        kind: "proactive",
      });

      await expect(attempt).rejects.toMatchObject({ code: "quiet_hours" });
      expect(sms.sent).toEqual([]);
      const stored = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.memberId, member.id));
      expect(stored).toEqual([]);
    });
  });

  it("still replies during quiet hours", async () => {
    await withRollback(db, async (tx) => {
      const { home, member } = await recipient(tx);
      const sms = createSimulatorProvider();
      const ctx = context(tx, { sms, now: LATE_EVENING });

      await sendMessage(ctx, {
        homeId: home.id,
        memberId: member.id,
        body: "Yes, booked",
        kind: "reply",
      });

      expect(sms.sent).toHaveLength(1);
    });
  });

  it("marks the text failed when the provider rejects it", async () => {
    await withRollback(db, async (tx) => {
      const { home, member } = await recipient(tx);
      const failing: SmsProvider = {
        name: "simulator",
        async send() {
          throw new Error("provider unavailable");
        },
      };
      const ctx = context(tx, { sms: failing });

      await expect(
        sendMessage(ctx, {
          homeId: home.id,
          memberId: member.id,
          body: "Hello",
          kind: "reply",
        }),
      ).rejects.toThrow(/provider unavailable/);

      const stored = one(
        await tx
          .select({ deliveryStatus: messages.deliveryStatus })
          .from(messages)
          .where(eq(messages.memberId, member.id)),
      );
      expect(stored.deliveryStatus).toBe("failed");
    });
  });
});

describe("updateMessageStatus", () => {
  it("applies the provider's update without adding an activity event", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx, "Status home");
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });
      const sms = createSimulatorProvider();
      const ctx = context(tx, { sms });
      const sent = await sendMessage(ctx, {
        homeId: home.id,
        memberId: member.id,
        body: "Booked",
        kind: "reply",
      });

      await updateMessageStatus(ctx, {
        providerSid: sent.providerSid,
        status: "delivered",
      });

      const stored = one(
        await tx
          .select({ deliveryStatus: messages.deliveryStatus })
          .from(messages)
          .where(eq(messages.id, sent.messageId)),
      );
      expect(stored.deliveryStatus).toBe("delivered");
      expect(await eventsFor(tx, "message", sent.messageId)).toHaveLength(1);
    });
  });

  it("fails on an unknown provider ID", async () => {
    await withRollback(db, async (tx) => {
      await expect(
        updateMessageStatus(context(tx), {
          providerSid: "SM-unknown",
          status: "delivered",
        }),
      ).rejects.toMatchObject({ code: "not_found" });
    });
  });
});

describe("recordUsageCost", () => {
  async function costMember(tx: Tx) {
    const home = await createHome(tx, "Cost home");
    const member = await createMember(tx, {
      homeId: home.id,
      phone: nextPhone(),
    });
    return { home, member };
  }

  it("records a cost once, however many times it arrives", async () => {
    await withRollback(db, async (tx) => {
      const { home, member } = await costMember(tx);
      const cost = {
        kind: "twilio" as const,
        amountUsd: "0.0079",
        refType: "message",
        refId: `SM${randomUUID()}`,
        memberId: member.id,
        homeId: home.id,
      };

      const first = await recordUsageCost(context(tx), cost);
      const second = await recordUsageCost(context(tx), cost);

      expect(first.recorded).toBe(true);
      expect(second.recorded).toBe(false);
      const stored = await tx
        .select({ id: usageCosts.id })
        .from(usageCosts)
        .where(eq(usageCosts.memberId, member.id));
      expect(stored).toHaveLength(1);
    });
  });

  it("raises one budget alert per member per month", async () => {
    await withRollback(db, async (tx) => {
      const { home, member } = await costMember(tx);
      const ctx = context(tx);

      const under = await recordUsageCost(ctx, {
        kind: "claude",
        amountUsd: "60",
        refType: "agent_run",
        refId: randomUUID(),
        memberId: member.id,
        homeId: home.id,
      });
      expect(under).toMatchObject({ alerted: false, monthToDateUsd: 60 });

      const over = await recordUsageCost(ctx, {
        kind: "claude",
        amountUsd: "45",
        refType: "agent_run",
        refId: randomUUID(),
        memberId: member.id,
        homeId: home.id,
      });
      expect(over).toMatchObject({ alerted: true, monthToDateUsd: 105 });

      const again = await recordUsageCost(ctx, {
        kind: "claude",
        amountUsd: "10",
        refType: "agent_run",
        refId: randomUUID(),
        memberId: member.id,
        homeId: home.id,
      });
      expect(again.alerted).toBe(false);

      const raised = await tx
        .select({ id: alerts.id, dedupeKey: alerts.dedupeKey })
        .from(alerts)
        .where(eq(alerts.memberId, member.id));
      expect(raised).toHaveLength(1);
      expect(raised[0]?.dedupeKey).toBe(
        `member_over_budget:${member.id}:2026-09`,
      );
      expect(await eventsFor(tx, "alert", raised[0]!.id)).toHaveLength(1);
    });
  });

  it("counts the month in the home's timezone", async () => {
    await withRollback(db, async (tx) => {
      const { home, member } = await costMember(tx);
      const ctx = context(tx);

      // 1 October 02:00 UTC is still 30 September in New York.
      const septemberLate = new Date("2026-10-01T02:00:00Z");
      await recordUsageCost(
        { ...ctx, now: septemberLate },
        {
          kind: "claude",
          amountUsd: "120",
          refType: "agent_run",
          refId: randomUUID(),
          memberId: member.id,
          homeId: home.id,
        },
      );

      const raised = one(
        await tx
          .select({ dedupeKey: alerts.dedupeKey })
          .from(alerts)
          .where(eq(alerts.memberId, member.id)),
      );
      expect(raised.dedupeKey).toBe(`member_over_budget:${member.id}:2026-09`);
    });
  });
});
