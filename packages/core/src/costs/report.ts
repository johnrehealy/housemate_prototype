import { and, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { MONTHLY_BUDGET_USD } from "../config";
import type { Db } from "../db/client";
import { alerts, members, messages, usageCosts } from "../db/schema";
import { QUEUES, type QueueName } from "../queue/jobs";
import {
  alertState,
  buildAlertRows,
  teamReach,
  type AlertFacts,
  type AlertRow,
  type TeamReach,
} from "./alerts";
import { monthOf, monthRange, shiftMonth } from "./month";

/** Anything that can run a query: the connection, or an open transaction. */
type Queryable = Pick<Db, "select" | "execute">;

/** One line of the by-member table. */
export type CostRow = {
  /** Null for the "Not a member" line. */
  memberId: string | null;
  name: string;
  /** Priced texts, sent and received. */
  texts: number;
  twilioUsd: number;
  claudeUsd: number;
  totalUsd: number;
};

export type CostReport = {
  /** The month shown, "YYYY-MM". */
  month: string;
  /** Whether it's the month in progress. */
  isCurrent: boolean;
  /** Neighbouring months worth stepping to, or null at either end. */
  previousMonth: string | null;
  nextMonth: string | null;
  budgetUsd: number;
  totalUsd: number;
  /** Whether any agent run has cost anything this month (Slice 1 onwards). */
  hasClaude: boolean;
  /** Members with any cost this month, biggest first. */
  members: CostRow[];
  /** Costs with no member: texts to and from numbers outside the pilot. */
  outside: CostRow | null;
  totals: Omit<CostRow, "memberId" | "name">;
  /** The alerts table, in reading order. */
  alerts: AlertRow[];
  /** Alerts raised this month; a grouped row counts each alert it stands for. */
  alertCount: number;
  /** Alerts this month the team never heard about, and why. */
  unreached: { count: number; reason: TeamReach | "mixed" } | null;
  /** Open alerts from before this month, and the months they're in, latest first. */
  earlierOpen: { count: number; months: string[] } | null;
};

/** Where a queue's failed jobs are parked. */
const DEAD_LETTER_QUEUE: Partial<Record<string, QueueName>> = {
  [QUEUES.inboundMessages]: QUEUES.inboundMessagesDead,
  [QUEUES.messageCosts]: QUEUES.messageCostsDead,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function money(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ");
}

/**
 * The ops view's month: what the pilot spent, by member, against the budget,
 * and the alerts raised, each with its state worked out from what has happened
 * since.
 *
 * Runs on the server connection, which bypasses row-level security: the caller
 * must already know the reader is staff.
 */
export async function getCostReport(
  db: Queryable,
  input: { month: string; now: Date },
): Promise<CostReport> {
  const { month, now } = input;
  const current = monthOf(now);
  const { from, to } = monthRange(month);
  const inMonth = and(
    gte(usageCosts.occurredAt, from),
    lt(usageCosts.occurredAt, to),
  );

  const sums = {
    texts: sql<number>`(count(*) filter (where ${usageCosts.kind} = 'twilio' and ${usageCosts.refType} = 'message'))::int`,
    twilio: sql<string>`coalesce(sum(${usageCosts.amountUsd}) filter (where ${usageCosts.kind} = 'twilio'), 0)`,
    claude: sql<string>`coalesce(sum(${usageCosts.amountUsd}) filter (where ${usageCosts.kind} = 'claude'), 0)`,
    claudeRuns: sql<number>`(count(*) filter (where ${usageCosts.kind} = 'claude'))::int`,
    total: sql<string>`coalesce(sum(${usageCosts.amountUsd}), 0)`,
  };

  const [byMember, [totals], [earliest], alertRows] = await Promise.all([
    db
      .select({
        memberId: usageCosts.memberId,
        firstName: members.firstName,
        lastName: members.lastName,
        ...sums,
      })
      .from(usageCosts)
      .leftJoin(members, eq(members.id, usageCosts.memberId))
      .where(inMonth)
      .groupBy(usageCosts.memberId, members.firstName, members.lastName),
    db.select(sums).from(usageCosts).where(inMonth),
    db.execute<{ first: Date | string | null }>(sql`
      select least(
        (select min(${usageCosts.occurredAt}) from ${usageCosts}),
        (select min(${alerts.createdAt}) from ${alerts})
      ) as first
    `),
    db
      .select({
        id: alerts.id,
        kind: alerts.kind,
        detail: alerts.detail,
        dedupeKey: alerts.dedupeKey,
        notifiedAt: alerts.notifiedAt,
        resolvedAt: alerts.resolvedAt,
        createdAt: alerts.createdAt,
      })
      .from(alerts)
      .where(
        or(
          and(gte(alerts.createdAt, from), lt(alerts.createdAt, to)),
          // Earlier alerts nobody has marked resolved may still need a look.
          and(lt(alerts.createdAt, from), isNull(alerts.resolvedAt)),
        ),
      ),
  ]);

  const facts = await alertFacts(db, alertRows);
  const thisMonth = facts.filter((alert) => alert.createdAt >= from);
  const before = facts.filter(
    (alert) => alert.createdAt < from && alertState(alert) === "needs_look",
  );

  const rows: CostRow[] = byMember.map((row) => ({
    memberId: row.memberId,
    name: row.memberId ? fullName(row.firstName, row.lastName) : "Not a member",
    texts: row.texts,
    twilioUsd: money(row.twilio),
    claudeUsd: money(row.claude),
    totalUsd: money(row.total),
  }));

  const firstAt = earliest?.first ? new Date(earliest.first) : null;
  const firstMonth = firstAt ? monthOf(firstAt) : null;

  return {
    month,
    isCurrent: month === current,
    previousMonth:
      firstMonth && month > firstMonth ? shiftMonth(month, -1) : null,
    nextMonth: month < current ? shiftMonth(month, 1) : null,
    budgetUsd: MONTHLY_BUDGET_USD,
    totalUsd: money(totals?.total),
    hasClaude: (totals?.claudeRuns ?? 0) > 0,
    members: rows
      .filter((row) => row.memberId !== null)
      .sort((a, b) => b.totalUsd - a.totalUsd || a.name.localeCompare(b.name)),
    outside: rows.find((row) => row.memberId === null) ?? null,
    totals: {
      texts: totals?.texts ?? 0,
      twilioUsd: money(totals?.twilio),
      claudeUsd: money(totals?.claude),
      totalUsd: money(totals?.total),
    },
    alerts: buildAlertRows(thisMonth, month),
    alertCount: thisMonth.length,
    unreached: unreachedSummary(thisMonth),
    earlierOpen: before.length
      ? {
          count: before.length,
          months: [...new Set(before.map((alert) => monthOf(alert.createdAt)))]
            .sort()
            .reverse(),
        }
      : null,
  };
}

function unreachedSummary(facts: AlertFacts[]): CostReport["unreached"] {
  const reaches = facts.map(teamReach).filter((reach) => reach !== "texted");
  if (reaches.length === 0) return null;
  const [first] = reaches;
  const same = reaches.every((reach) => reach === first);
  return { count: reaches.length, reason: same && first ? first : "mixed" };
}

type AlertRecord = {
  id: string;
  kind: AlertFacts["kind"];
  detail: unknown;
  dedupeKey: string;
  notifiedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
};

/** Looks up what's happened since each alert was raised. */
async function alertFacts(
  db: Queryable,
  records: AlertRecord[],
): Promise<AlertFacts[]> {
  const detailOf = (record: AlertRecord) =>
    (record.detail ?? {}) as Record<string, unknown>;

  // Failed jobs: which are still parked, and which text each was about.
  const parked = new Map<string, string | null>();
  const jobsByQueue = new Map<QueueName, string[]>();
  for (const record of records) {
    if (record.kind !== "worker_error") continue;
    const { queue, msgId } = detailOf(record);
    const dead =
      typeof queue === "string" ? DEAD_LETTER_QUEUE[queue] : undefined;
    if (!dead || msgId === undefined) continue;
    jobsByQueue.set(dead, [...(jobsByQueue.get(dead) ?? []), String(msgId)]);
  }
  for (const [dead, jobIds] of jobsByQueue) {
    // The queue name comes from the fixed list above, never from the alert.
    const rows = await db.execute<{
      msg_id: string;
      message_id: string | null;
    }>(sql`
      select message->>'msgId' as msg_id, message->'job'->>'messageId' as message_id
      from ${sql.raw(`pgmq.q_${dead}`)}
      where message->>'msgId' in (${sql.join(
        jobIds.map((id) => sql`${id}`),
        sql`, `,
      )})
    `);
    for (const row of rows) parked.set(`${dead}:${row.msg_id}`, row.message_id);
  }
  const parkedKey = (record: AlertRecord) => {
    const { queue, msgId } = detailOf(record);
    const dead =
      typeof queue === "string" ? DEAD_LETTER_QUEUE[queue] : undefined;
    return dead ? `${dead}:${String(msgId)}` : null;
  };

  // The texts the alerts are about.
  const messageIdOf = (record: AlertRecord): string | null => {
    if (record.kind === "send_stuck") {
      const { messageId } = detailOf(record);
      return isUuid(messageId) ? messageId : null;
    }
    if (record.kind === "worker_error") {
      const key = parkedKey(record);
      const messageId = key ? parked.get(key) : null;
      return isUuid(messageId) ? messageId : null;
    }
    return null;
  };
  const messageIds = [...new Set(records.map(messageIdOf).filter(isUuid))];
  const texts = messageIds.length
    ? await db
        .select({
          id: messages.id,
          direction: messages.direction,
          outboundKind: messages.outboundKind,
          deliveryStatus: messages.deliveryStatus,
          idempotencyKey: messages.idempotencyKey,
          memberName: members.firstName,
        })
        .from(messages)
        .leftJoin(members, eq(members.id, messages.memberId))
        .where(inArray(messages.id, messageIds))
    : [];
  const textById = new Map(texts.map((text) => [text.id, text]));

  // For alerts the team never heard about: were there numbers to text?
  const unnotified = records.filter((record) => !record.notifiedAt);
  const teamTexts = new Map<string, number>();
  if (unnotified.length) {
    const counts = await db
      .select({
        id: alerts.id,
        texts: sql<number>`count(${messages.id})::int`,
      })
      .from(alerts)
      .leftJoin(
        messages,
        sql`starts_with(${messages.idempotencyKey}, 'alert:' || ${alerts.dedupeKey} || ':')`,
      )
      .where(
        inArray(
          alerts.id,
          unnotified.map((record) => record.id),
        ),
      )
      .groupBy(alerts.id);
    for (const row of counts) teamTexts.set(row.id, row.texts);
  }

  return records.map((record) => {
    const messageId = messageIdOf(record);
    const text = messageId ? textById.get(messageId) : undefined;
    const key = record.kind === "worker_error" ? parkedKey(record) : null;
    return {
      id: record.id,
      kind: record.kind,
      detail: detailOf(record),
      notifiedAt: record.notifiedAt,
      resolvedAt: record.resolvedAt,
      createdAt: record.createdAt,
      teamTexts: teamTexts.get(record.id) ?? 0,
      message: text
        ? {
            id: text.id,
            direction: text.direction,
            outboundKind: text.outboundKind,
            deliveryStatus: text.deliveryStatus,
            memberName: text.memberName,
            toTeam: text.idempotencyKey?.startsWith("alert:") ?? false,
          }
        : null,
      parked:
        record.kind === "worker_error" && key !== null ? parked.has(key) : null,
    };
  });
}
