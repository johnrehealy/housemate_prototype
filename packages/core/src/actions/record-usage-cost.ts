import { z } from "zod";
import { usageCosts } from "../db/schema";
import { defineAction } from "./define-action";

export const recordUsageCostInput = z.object({
  kind: z.enum(["claude", "twilio"]),
  /** Dollars, as a string to avoid floating-point drift. */
  amountUsd: z.union([z.number().nonnegative(), z.string()]).transform(String),
  /** What the cost is for, e.g. "message" plus the provider's ID. */
  refType: z.string().min(1),
  refId: z.string().min(1),
  /** Null for costs that are nobody's, such as a text from a stranger. */
  memberId: z.uuid().optional(),
  homeId: z.uuid().optional(),
  occurredAt: z.coerce.date().optional(),
});

/**
 * Records what something cost (D-030). Recording the same cost twice is a
 * no-op: the unique index on (kind, ref_type, ref_id) decides, so a retried
 * job can't double-count.
 *
 * Whether the pilot is over budget is `checkPilotBudget`'s job, because
 * telling the team means sending a text, which can't happen inside this
 * transaction.
 */
export const recordUsageCost = defineAction({
  name: "recordUsageCost",
  input: recordUsageCostInput,
  handler: async ({ input, tx, record, now }) => {
    const occurredAt = input.occurredAt ?? now;

    const [row] = await tx
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
      .returning();
    if (!row) return { recorded: false as const };

    await record({
      entityType: "usage_cost",
      entityId: row.id,
      homeId: row.homeId,
      action: "recorded",
      after: {
        kind: row.kind,
        amountUsd: row.amountUsd,
        refType: row.refType,
        refId: row.refId,
      },
    });

    return { recorded: true as const, costId: row.id };
  },
});
