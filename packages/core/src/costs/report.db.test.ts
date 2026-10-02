import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db/client";
import { alerts, members, messages, usageCosts } from "../db/schema";
import {
  createHome,
  createMember,
  one,
  testDb,
  withRollback,
  type Tx,
} from "../db/testing";
import { getCostReport } from "./report";

let db: Db;

beforeAll(() => {
  db = testDb();
});
afterAll(async () => {
  await db.close();
});

// Clear of the seed (019), the other suites (010-050, 070) and the browser tests (08x).
let phoneCounter = 0;
const nextPhone = () => `+1555060${String(phoneCounter++).padStart(4, "0")}`;

// A month well clear of anything a developer's local database holds.
const MONTH = "2031-03";
const IN_MONTH = new Date("2031-03-14T10:00:00Z");
const NOW = new Date("2031-03-20T12:00:00Z");

/** The report reads every cost and alert, so each test starts from none. */
async function clearSlate(tx: Tx) {
  await tx.delete(alerts);
  await tx.delete(usageCosts);
}

async function member(tx: Tx, firstName: string, lastName: string) {
  const home = await createHome(tx, `${firstName}'s home`);
  const created = await createMember(tx, {
    homeId: home.id,
    phone: nextPhone(),
  });
  await tx
    .update(members)
    .set({ firstName, lastName })
    .where(eq(members.id, created.id));
  return { ...created, homeId: home.id };
}

let refCounter = 0;
async function cost(
  tx: Tx,
  input: {
    memberId?: string | null;
    kind?: "twilio" | "claude";
    amountUsd: string;
    occurredAt?: Date;
  },
) {
  await tx.insert(usageCosts).values({
    memberId: input.memberId ?? null,
    kind: input.kind ?? "twilio",
    amountUsd: input.amountUsd,
    refType: input.kind === "claude" ? "agent_run" : "message",
    refId: `report-test-${refCounter++}`,
    occurredAt: input.occurredAt ?? IN_MONTH,
  });
}

async function text(
  tx: Tx,
  input: {
    memberId?: string | null;
    homeId?: string | null;
    deliveryStatus: "queued" | "sent" | "delivered" | "failed";
    idempotencyKey?: string;
  },
) {
  return one(
    await tx
      .insert(messages)
      .values({
        homeId: input.homeId ?? null,
        memberId: input.memberId ?? null,
        direction: "outbound",
        channel: "sms",
        author: "agent",
        outboundKind: "reply",
        body: "Report test",
        toPhone: nextPhone(),
        deliveryStatus: input.deliveryStatus,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt: IN_MONTH,
      })
      .returning(),
  );
}

async function raise(
  tx: Tx,
  input: {
    kind: "pilot_over_budget" | "worker_error" | "send_stuck";
    dedupeKey: string;
    detail: Record<string, unknown>;
    createdAt?: Date;
    notified?: boolean;
    resolvedAt?: Date;
  },
) {
  const createdAt = input.createdAt ?? IN_MONTH;
  return one(
    await tx
      .insert(alerts)
      .values({
        kind: input.kind,
        dedupeKey: input.dedupeKey,
        detail: input.detail,
        createdAt,
        notifiedAt: input.notified === false ? null : createdAt,
        resolvedAt: input.resolvedAt ?? null,
      })
      .returning(),
  );
}

/** Parks a job the way the consumer does when it fails every retry. */
async function park(tx: Tx, msgId: string, job: Record<string, unknown>) {
  const record = { msgId, job, attempts: 8, error: null, deadAt: IN_MONTH };
  await tx.execute(
    sql`select pgmq.send('message_costs_dead'::text, ${JSON.stringify(record)}::jsonb)`,
  );
}

describe("the cost report", () => {
  it("adds up the month by member, with numbers outside the pilot on their own line", async () => {
    await withRollback(db, async (tx) => {
      await clearSlate(tx);
      const maya = await member(tx, "Maya", "Alcott");
      const dana = await member(tx, "Dana", "Whitfield");

      for (let i = 0; i < 3; i++) {
        await cost(tx, { memberId: maya.id, amountUsd: "0.0079" });
      }
      await cost(tx, { memberId: dana.id, amountUsd: "0.0079" });
      await cost(tx, { memberId: dana.id, kind: "claude", amountUsd: "0.5" });
      await cost(tx, { amountUsd: "0.0079" });
      await cost(tx, { amountUsd: "0.0079" });
      // Either side of the month, and left out of it.
      await cost(tx, {
        memberId: maya.id,
        amountUsd: "1",
        occurredAt: new Date("2031-02-28T23:59:59Z"),
      });
      await cost(tx, {
        memberId: maya.id,
        amountUsd: "1",
        occurredAt: new Date("2031-04-01T00:00:00Z"),
      });

      const report = await getCostReport(tx, { month: MONTH, now: NOW });

      expect(report.members).toEqual([
        {
          memberId: dana.id,
          name: "Dana Whitfield",
          texts: 1,
          twilioUsd: 0.0079,
          claudeUsd: 0.5,
          totalUsd: 0.5079,
        },
        {
          memberId: maya.id,
          name: "Maya Alcott",
          texts: 3,
          twilioUsd: 0.0237,
          claudeUsd: 0,
          totalUsd: 0.0237,
        },
      ]);
      expect(report.outside).toMatchObject({
        memberId: null,
        name: "Not a member",
        texts: 2,
        totalUsd: 0.0158,
      });
      expect(report.totals).toEqual({
        texts: 6,
        twilioUsd: 0.0474,
        claudeUsd: 0.5,
        totalUsd: 0.5474,
      });
      expect(report.totalUsd).toBe(0.5474);
      expect(report.hasClaude).toBe(true);
      expect(report.isCurrent).toBe(true);
      expect(report.previousMonth).toBe("2031-02");
      expect(report.nextMonth).toBeNull();
    });
  });

  it("works out each alert's state from what has happened since", async () => {
    await withRollback(db, async (tx) => {
      await clearSlate(tx);
      const dana = await member(tx, "Dana", "Whitfield");
      const delivered = await text(tx, {
        memberId: dana.id,
        homeId: dana.homeId,
        deliveryStatus: "delivered",
      });
      const waiting = await text(tx, {
        memberId: dana.id,
        homeId: dana.homeId,
        deliveryStatus: "queued",
      });
      const priced = await text(tx, {
        memberId: dana.id,
        homeId: dana.homeId,
        deliveryStatus: "delivered",
      });

      // Two sweeps apart, so they stay on separate rows.
      await raise(tx, {
        kind: "send_stuck",
        dedupeKey: `stuck-send:${delivered.id}`,
        detail: { messageId: delivered.id, ageMinutes: 15 },
        createdAt: new Date("2031-03-10T08:00:00Z"),
      });
      await raise(tx, {
        kind: "send_stuck",
        dedupeKey: `stuck-send:${waiting.id}`,
        detail: { messageId: waiting.id, ageMinutes: 16 },
        createdAt: new Date("2031-03-11T08:00:00Z"),
      });
      await park(tx, "901", { messageId: priced.id, providerSid: "SM-test" });
      const parked = await raise(tx, {
        kind: "worker_error",
        dedupeKey: "dead-letter:message_costs:901",
        detail: { queue: "message_costs", msgId: "901", attempts: 8 },
        createdAt: new Date("2031-03-12T08:00:00Z"),
      });
      // Its job has since been cleared from the dead-letter queue.
      await raise(tx, {
        kind: "worker_error",
        dedupeKey: "dead-letter:message_costs:902",
        detail: { queue: "message_costs", msgId: "902", attempts: 8 },
        createdAt: new Date("2031-03-13T08:00:00Z"),
      });
      const overBudget = await raise(tx, {
        kind: "pilot_over_budget",
        dedupeKey: `over-budget:${MONTH}`,
        detail: { month: MONTH, totalUsd: 100.42, budgetUsd: 100 },
        createdAt: new Date("2031-03-14T08:00:00Z"),
      });

      const report = await getCostReport(tx, { month: MONTH, now: NOW });

      expect(report.alertCount).toBe(5);
      expect(report.unreached).toBeNull();
      expect(
        report.alerts.map(({ state, title, detail }) => ({
          state,
          title,
          detail,
        })),
      ).toEqual([
        {
          state: "needs_look",
          title:
            "One text's price couldn't be fetched, so March's total is about 1¢ short.",
          detail: `Message ${priced.id.slice(0, 6)} · gave up after 8 tries`,
        },
        {
          state: "needs_look",
          title: "A reply to Dana had no delivery result for 16 minutes.",
          detail: `Message ${waiting.id.slice(0, 6)} · still waiting`,
        },
        {
          state: "flagged",
          title: "Went over the $100 budget. Nothing was blocked.",
          detail: "$100.42 spent at the time",
        },
        {
          state: "resolved",
          title:
            "One text's price couldn't be fetched, so March's total is about 1¢ short.",
          detail: "Job 902 · gave up after 8 tries, since cleared",
        },
        {
          state: "resolved",
          title: "A reply to Dana had no delivery result for 15 minutes.",
          detail: `Message ${delivered.id.slice(0, 6)} · delivered since`,
        },
      ]);
      expect(report.alerts[0]?.key).toBe(parked.id);
      expect(report.alerts[2]?.key).toBe(overBudget.id);
    });
  });

  it("tells a failed team text apart from having no team numbers", async () => {
    await withRollback(db, async (tx) => {
      await clearSlate(tx);
      const failed = await raise(tx, {
        kind: "pilot_over_budget",
        dedupeKey: `over-budget:${MONTH}`,
        detail: { month: MONTH, totalUsd: 101, budgetUsd: 100 },
        notified: false,
      });
      await text(tx, {
        deliveryStatus: "failed",
        idempotencyKey: `alert:${failed.dedupeKey}:+15550609999`,
      });

      let report = await getCostReport(tx, { month: MONTH, now: NOW });
      expect(report.unreached).toEqual({ count: 1, reason: "failed" });
      expect(report.alerts[0]?.team).toBe("failed");

      await raise(tx, {
        kind: "worker_error",
        dedupeKey: "dead-letter:message_costs:903",
        detail: { queue: "message_costs", msgId: "903", attempts: 8 },
        notified: false,
      });
      report = await getCostReport(tx, { month: MONTH, now: NOW });
      expect(report.unreached).toEqual({ count: 2, reason: "mixed" });
      expect(report.alerts.map((row) => row.team).sort()).toEqual([
        "failed",
        "no_numbers",
      ]);
    });
  });

  it("points back to alerts from earlier months that still need a look", async () => {
    await withRollback(db, async (tx) => {
      await clearSlate(tx);
      const january = new Date("2031-01-09T08:00:00Z");
      await park(tx, "904", { messageId: crypto.randomUUID() });
      await raise(tx, {
        kind: "worker_error",
        dedupeKey: "dead-letter:message_costs:904",
        detail: { queue: "message_costs", msgId: "904", attempts: 8 },
        createdAt: january,
      });
      // Resolved by hand, and flagged-only: neither needs a look.
      await raise(tx, {
        kind: "worker_error",
        dedupeKey: "dead-letter:message_costs:905",
        detail: { queue: "message_costs", msgId: "905", attempts: 8 },
        createdAt: january,
        resolvedAt: new Date("2031-01-10T08:00:00Z"),
      });
      await raise(tx, {
        kind: "pilot_over_budget",
        dedupeKey: "over-budget:2031-02",
        detail: { month: "2031-02", totalUsd: 100.1, budgetUsd: 100 },
        createdAt: new Date("2031-02-20T08:00:00Z"),
      });

      const report = await getCostReport(tx, { month: MONTH, now: NOW });

      expect(report.alerts).toEqual([]);
      expect(report.earlierOpen).toEqual({ count: 1, months: ["2031-01"] });
      expect(report.totalUsd).toBe(0);
      expect(report.members).toEqual([]);
      expect(report.outside).toBeNull();
      expect(report.previousMonth).toBe("2031-02");

      const past = await getCostReport(tx, { month: "2031-01", now: NOW });
      expect(past.isCurrent).toBe(false);
      expect(past.previousMonth).toBeNull();
      expect(past.nextMonth).toBe("2031-02");
      expect(past.alerts.map((row) => row.state)).toEqual([
        "needs_look",
        "resolved",
      ]);
    });
  });
});
