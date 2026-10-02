import { eq } from "drizzle-orm";
import { checkPilotBudget } from "../actions/check-pilot-budget";
import { MONTHLY_BUDGET_USD } from "../config";
import type { ActionContext } from "../actions/context";
import { ActionError } from "../actions/errors";
import { recordUsageCost } from "../actions/record-usage-cost";
import { firstRow } from "../db/rows";
import { messages } from "../db/schema";
import { messageCostJob } from "../queue/jobs";

export type MessageCostResult =
  | { recorded: true; amountUsd: number; overBudget: boolean }
  | { recorded: false; reason: "already-recorded" | "message-gone" };

/**
 * Handles one message_costs job: asks the provider what a text cost and
 * records it (D-030).
 *
 * Twilio doesn't send the price with its status callback, and fills it in some
 * time after it handles the message. An unpriced message isn't a failure, so
 * this asks again by failing with `price_pending`, which the consumer retries
 * with its usual backoff.
 *
 * Safe to run twice: the cost is keyed on the provider's message ID.
 */
export async function handleMessageCostJob(
  ctx: ActionContext,
  payload: unknown,
  options: { teamPhones?: string[] } = {},
): Promise<MessageCostResult> {
  const job = messageCostJob.parse(payload);

  const message = await ctx.db.transaction(async (tx) =>
    firstRow(
      await tx
        .select({
          id: messages.id,
          homeId: messages.homeId,
          memberId: messages.memberId,
          providerSid: messages.providerSid,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.id, job.messageId))
        .limit(1),
    ),
  );
  if (!message) return { recorded: false, reason: "message-gone" };

  const price = await ctx.services.sms.priceOf(
    message.providerSid ?? job.providerSid,
  );
  if (!price) {
    throw new ActionError(
      "price_pending",
      "handleMessageCostJob: the provider hasn't priced this text yet.",
    );
  }

  const { recorded } = await recordUsageCost(ctx, {
    ...(message.homeId ? { homeId: message.homeId } : {}),
    ...(message.memberId ? { memberId: message.memberId } : {}),
    kind: "twilio",
    amountUsd: price.amountUsd,
    refType: "message",
    refId: message.providerSid ?? job.providerSid,
    occurredAt: message.createdAt,
  });
  if (!recorded) return { recorded: false, reason: "already-recorded" };

  const budget = await checkPilotBudget(ctx, options);
  return {
    recorded: true,
    amountUsd: price.amountUsd,
    overBudget: budget.totalUsd >= MONTHLY_BUDGET_USD,
  };
}
