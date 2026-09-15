import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { MONTHLY_BUDGET_USD } from "../config";
import { firstRow } from "../db/rows";
import { alerts, homes, members, usageCosts } from "../db/schema";
import { monthKeyInTimezone, startOfMonthInTimezone } from "../time/timezone";
import { defineAction } from "./define-action";

export const recordUsageCostInput = z.object({
  kind: z.enum(["claude", "twilio"]),
  /** Dollars, as a string to avoid floating-point drift. */
  amountUsd: z.union([z.number().nonnegative(), z.string()]).transform(String),
  /** What the cost is for, e.g. "message" plus the provider's ID. */
  refType: z.string().min(1),
  refId: z.string().min(1),
  memberId: z.uuid().optional(),
  homeId: z.uuid().optional(),
  occurredAt: z.coerce.date().optional(),
});

/**
 * Records what a member's usage cost. Recording the same cost twice is a
 * no-op. Crossing the monthly budget raises one alert per member per month
 * (D-030); it never stops the agent.
 */
export const recordUsageCost = defineAction({
  name: "recordUsageCost",
  input: recordUsageCostInput,
  handler: async ({ input, tx, record, now }) => {
    const occurredAt = input.occurredAt ?? now;

    const inserted = await tx
      .insert(usageCosts)
      .values({
        kind: input.kind,
        amountUsd: input.amountUsd,
        refType: input.refType,
        refId: input.refId,
        memberId: input.memberId ?? null,
        homeId: input.homeId ?? null,
        occurredAt,
      })
      .onConflictDoNothing()
      .returning({ id: usageCosts.id });

    if (inserted.length === 0) {
      return { recorded: false, alerted: false, monthToDateUsd: null };
    }
    if (!input.memberId) {
      return { recorded: true, alerted: false, monthToDateUsd: null };
    }

    const member = firstRow(
      await tx
        .select({ homeId: members.homeId, timezone: homes.timezone })
        .from(members)
        .innerJoin(homes, eq(members.homeId, homes.id))
        .where(eq(members.id, input.memberId))
        .limit(1),
    );
    // Staff have no home, so no budget period to measure against.
    if (!member)
      return { recorded: true, alerted: false, monthToDateUsd: null };

    const monthStart = startOfMonthInTimezone(occurredAt, member.timezone);
    const total = firstRow(
      await tx
        .select({ sum: sql<string>`coalesce(sum(${usageCosts.amountUsd}), 0)` })
        .from(usageCosts)
        .where(
          and(
            eq(usageCosts.memberId, input.memberId),
            gte(usageCosts.occurredAt, monthStart),
          ),
        ),
    );
    const monthToDateUsd = Number(total?.sum ?? 0);
    if (monthToDateUsd < MONTHLY_BUDGET_USD) {
      return { recorded: true, alerted: false, monthToDateUsd };
    }

    const monthKey = monthKeyInTimezone(occurredAt, member.timezone);
    const alert = await tx
      .insert(alerts)
      .values({
        kind: "member_over_budget",
        memberId: input.memberId,
        dedupeKey: `member_over_budget:${input.memberId}:${monthKey}`,
        detail: {
          monthKey,
          monthToDateUsd,
          budgetUsd: MONTHLY_BUDGET_USD,
        },
      })
      .onConflictDoNothing()
      .returning({ id: alerts.id });

    const [raised] = alert;
    if (raised) {
      await record({
        entityType: "alert",
        entityId: raised.id,
        homeId: member.homeId,
        action: "raised",
        after: { kind: "member_over_budget", monthKey, monthToDateUsd },
      });
    }

    return { recorded: true, alerted: Boolean(raised), monthToDateUsd };
  },
});
