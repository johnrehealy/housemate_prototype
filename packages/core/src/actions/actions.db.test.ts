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
import { activateMember } from "./activate-member";
import { checkPilotBudget } from "./check-pilot-budget";
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

describe("activateMember", () => {
  async function invited(tx: Tx, homeName: string) {
    const home = await createHome(tx, homeName);
    const member = await createMember(tx, {
      homeId: home.id,
      phone: nextPhone(),
      status: "invited",
    });
    const ctx = context(tx, {
      actor: { type: "member", id: member.id },
      source: { type: "web" },
    });
    return { home, member, ctx };
  }

  it("activates an invited member and records who did it", async () => {
    await withRollback(db, async (tx) => {
      const { home, member, ctx } = await invited(tx, "Activation home");

      const result = await activateMember(ctx, { memberId: member.id });

      expect(result).toMatchObject({
        memberId: member.id,
        homeId: home.id,
        activated: true,
      });
      const stored = one(
        await tx.select().from(members).where(eq(members.id, member.id)),
      );
      expect(stored.status).toBe("active");
      expect(await eventsFor(tx, "member", member.id)).toEqual([
        {
          action: "activated",
          actorType: "member",
          sourceType: "web",
          homeId: home.id,
        },
      ]);
    });
  });

  it("does nothing when they sign in again", async () => {
    // This runs on every sign-in, so the activity log must not grow an entry
    // each time.
    await withRollback(db, async (tx) => {
      const { member, ctx } = await invited(tx, "Repeat home");

      await activateMember(ctx, { memberId: member.id });
      const again = await activateMember(ctx, { memberId: member.id });

      expect(again.activated).toBe(false);
      expect(await eventsFor(tx, "member", member.id)).toHaveLength(1);
    });
  });

  it("refuses a removed member and leaves them removed", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx, "Removed home");
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
        status: "removed",
      });
      const ctx = context(tx, {
        actor: { type: "member", id: member.id },
        source: { type: "web" },
      });

      const attempt = activateMember(ctx, { memberId: member.id });

      await expect(attempt).rejects.toMatchObject({ code: "conflict" });
      const stored = one(
        await tx.select().from(members).where(eq(members.id, member.id)),
      );
      expect(stored.status).toBe("removed");
      expect(await eventsFor(tx, "member", member.id)).toEqual([]);
    });
  });

  it("refuses an account with no member record", async () => {
    await withRollback(db, async (tx) => {
      const attempt = activateMember(context(tx), { memberId: randomUUID() });
      await expect(attempt).rejects.toMatchObject({ code: "not_found" });
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

  it("stores a text from an unknown number without a home, queued only for the invite-only reply", async () => {
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
        queued: true,
      });
      const [event] = await eventsFor(tx, "message", result.messageId);
      expect(event).toMatchObject({ action: "received", homeId: null });
      expect(await queuedJobs(tx)).toBe(before + 1);
    });
  });

  it("stores STOP and HELP but never queues them, from members or not", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx, "Opt-out home");
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });
      const before = await queuedJobs(tx);

      for (const [fromPhone, optOut] of [
        [member.phone, "stop"],
        [member.phone, "help"],
        ["+15550199998", "stop"],
      ] as const) {
        const result = await recordInboundMessage(context(tx), {
          providerSid: `SM${randomUUID()}`,
          fromPhone,
          toPhone: "+15550100000",
          body: optOut.toUpperCase(),
          optOut,
        });
        expect(result.queued).toBe(false);
        const event = one(
          await tx
            .select({ after: activityEvents.after })
            .from(activityEvents)
            .where(eq(activityEvents.entityId, result.messageId)),
        );
        expect(event.after).toMatchObject({ optOut });
      }
      expect(await queuedJobs(tx)).toBe(before);
    });
  });

  it('queues a member\'s "Yes" like any other text', async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx, "Yes home");
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });

      const result = await recordInboundMessage(context(tx), {
        providerSid: `SM${randomUUID()}`,
        fromPhone: member.phone,
        toPhone: "+15550100000",
        body: "Yes",
      });

      expect(result.queued).toBe(true);
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
        async priceOf() {
          return null;
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

  it("never moves a text's status backwards", async () => {
    await withRollback(db, async (tx) => {
      const home = await createHome(tx, "Late callback home");
      const member = await createMember(tx, {
        homeId: home.id,
        phone: nextPhone(),
      });
      const ctx = context(tx, { sms: createSimulatorProvider() });
      const sent = await sendMessage(ctx, {
        homeId: home.id,
        memberId: member.id,
        body: "Booked",
        kind: "reply",
      });
      const update = (status: "sent" | "delivered" | "failed") =>
        updateMessageStatus(ctx, { providerSid: sent.providerSid, status });

      expect(await update("delivered")).toMatchObject({ applied: true });
      // Twilio's callbacks can arrive out of order, and "delivered" is final.
      expect(await update("sent")).toMatchObject({ applied: false });
      expect(await update("failed")).toMatchObject({ applied: false });

      const stored = one(
        await tx
          .select({ deliveryStatus: messages.deliveryStatus })
          .from(messages)
          .where(eq(messages.id, sent.messageId)),
      );
      expect(stored.deliveryStatus).toBe("delivered");
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

  it("leaves the budget alone: that is checkPilotBudget's job", async () => {
    await withRollback(db, async (tx) => {
      const { home, member } = await costMember(tx);

      const recorded = await recordUsageCost(context(tx), {
        kind: "claude",
        amountUsd: "120",
        refType: "agent_run",
        refId: randomUUID(),
        memberId: member.id,
        homeId: home.id,
      });

      expect(recorded.recorded).toBe(true);
      expect(await tx.select({ id: alerts.id }).from(alerts)).toHaveLength(0);
    });
  });
});

describe("checkPilotBudget", () => {
  /**
   * The pilot's budget counts every cost there is, so these start from an
   * empty month. The delete rolls back with the rest of the test.
   */
  async function emptyMonth(tx: Tx) {
    await tx.delete(usageCosts);
    await tx.delete(alerts);
  }

  async function costMember(tx: Tx) {
    const home = await createHome(tx, "Budget home");
    const member = await createMember(tx, {
      homeId: home.id,
      phone: nextPhone(),
    });
    return { home, member };
  }

  async function spend(tx: Tx, memberId: string, homeId: string, usd: string) {
    await recordUsageCost(context(tx), {
      kind: "claude",
      amountUsd: usd,
      refType: "agent_run",
      refId: randomUUID(),
      memberId,
      homeId,
    });
  }

  it("tells the team once when the pilot goes over budget", async () => {
    await withRollback(db, async (tx) => {
      await emptyMonth(tx);
      const { home, member } = await costMember(tx);
      const sms = createSimulatorProvider();
      const ctx = context(tx, { sms });
      const teamPhones = ["+15550700001", "+15550700002"];

      await spend(tx, member.id, home.id, "60");
      const under = await checkPilotBudget(ctx, { teamPhones });
      expect(under).toMatchObject({ totalUsd: 60, raised: false });
      expect(sms.sent).toHaveLength(0);

      await spend(tx, member.id, home.id, "45");
      const over = await checkPilotBudget(ctx, { teamPhones });
      expect(over).toMatchObject({ totalUsd: 105, raised: true });
      // One text per team number, and no member is texted.
      expect(sms.sent.map((text) => text.to)).toEqual(teamPhones);
      expect(sms.sent[0]?.body).toContain("over the $100 budget");

      await spend(tx, member.id, home.id, "10");
      const again = await checkPilotBudget(ctx, { teamPhones });
      expect(again.raised).toBe(false);
      expect(sms.sent).toHaveLength(2);

      const raised = one(
        await tx
          .select({
            dedupeKey: alerts.dedupeKey,
            notifiedAt: alerts.notifiedAt,
          })
          .from(alerts)
          .where(eq(alerts.kind, "pilot_over_budget")),
      );
      expect(raised.dedupeKey).toBe("over-budget:2026-09");
      expect(raised.notifiedAt).not.toBeNull();
    });
  });

  it("counts the pilot's month in UTC", async () => {
    await withRollback(db, async (tx) => {
      await emptyMonth(tx);
      const { home, member } = await costMember(tx);
      // 1 October 02:00 UTC is a new month, though it is still September in
      // New York: the pilot's budget isn't tied to one home.
      const october = new Date("2026-10-01T02:00:00Z");
      const ctx = { ...context(tx), now: october };

      await recordUsageCost(ctx, {
        kind: "claude",
        amountUsd: "120",
        refType: "agent_run",
        refId: randomUUID(),
        memberId: member.id,
        homeId: home.id,
        occurredAt: october,
      });
      const checked = await checkPilotBudget(ctx);

      expect(checked.month).toBe("2026-10");
      expect(checked.raised).toBe(true);
      const raised = one(
        await tx.select({ dedupeKey: alerts.dedupeKey }).from(alerts),
      );
      expect(raised.dedupeKey).toBe("over-budget:2026-10");
    });
  });

  it("raises the alert even when no team number is configured", async () => {
    await withRollback(db, async (tx) => {
      await emptyMonth(tx);
      const { home, member } = await costMember(tx);
      const ctx = context(tx);

      await spend(tx, member.id, home.id, "150");
      const checked = await checkPilotBudget(ctx, { teamPhones: [] });

      expect(checked.raised).toBe(true);
      const raised = one(
        await tx
          .select({ notifiedAt: alerts.notifiedAt })
          .from(alerts)
          .where(eq(alerts.kind, "pilot_over_budget")),
      );
      // Nobody to tell yet, so it stays waiting to be notified.
      expect(raised.notifiedAt).toBeNull();
    });
  });
});
