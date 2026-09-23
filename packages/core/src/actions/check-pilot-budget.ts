import { and, gte, sql } from "drizzle-orm";
import { BUDGET_TIMEZONE, MONTHLY_BUDGET_USD } from "../config";
import { usageCosts } from "../db/schema";
import { monthKeyInTimezone, startOfMonthInTimezone } from "../time/timezone";
import type { ActionContext } from "./context";
import { raiseAlert } from "./raise-alert";

/** The month's spending so far, as the team would read it. */
export function overBudgetText(month: string, totalUsd: number): string {
  const [year, index] = month.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("en-US", {
    timeZone: BUDGET_TIMEZONE,
    month: "long",
  }).format(new Date(Date.UTC(year ?? 1970, (index ?? 1) - 1, 1)));
  return `Housemate alert: costs for ${monthName} are $${totalUsd.toFixed(2)}, over the $${MONTHLY_BUDGET_USD} budget. Nothing is blocked.`;
}

/**
 * Adds up this month's costs and tells the team once if the pilot is over
 * budget. Called after each cost is recorded.
 */
export async function checkPilotBudget(
  ctx: ActionContext,
  options: { teamPhones?: string[] } = {},
): Promise<{ month: string; totalUsd: number; raised: boolean }> {
  const now = ctx.now ?? new Date();
  const month = monthKeyInTimezone(now, BUDGET_TIMEZONE);
  const since = startOfMonthInTimezone(now, BUDGET_TIMEZONE);

  const totalUsd = await ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .select({ total: sql<string>`coalesce(sum(${usageCosts.amountUsd}), 0)` })
      .from(usageCosts)
      .where(and(gte(usageCosts.occurredAt, since)));
    return Number(row?.total ?? 0);
  });

  if (totalUsd < MONTHLY_BUDGET_USD) {
    return { month, totalUsd, raised: false };
  }

  const { raised } = await raiseAlert(ctx, {
    kind: "pilot_over_budget",
    dedupeKey: `over-budget:${month}`,
    detail: { month, totalUsd, budgetUsd: MONTHLY_BUDGET_USD },
    text: overBudgetText(month, totalUsd),
    teamPhones: options.teamPhones ?? [],
  });

  return { month, totalUsd, raised };
}
