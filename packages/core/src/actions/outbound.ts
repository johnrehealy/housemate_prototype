import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "../db/client";
import { expectRow, firstRow } from "../db/rows";
import { messages } from "../db/schema";
import {
  costLookupDelaySeconds,
  enqueueJob,
  type MessageCostJob,
  QUEUES,
} from "../queue/jobs";
import type { ActionContext } from "./context";
import { defineAction } from "./define-action";

/*
 * What every outbound text shares, whichever action sends it: saving it at
 * most once, and handing it to the provider afterwards. Internal to the
 * actions; nothing outside them should send a text.
 */

type NewOutbound = typeof messages.$inferInsert & {
  direction: "outbound";
  deliveryStatus: "queued";
};

/** The text already saved under this key, if any. */
export async function findByIdempotencyKey(tx: Tx, key: string | undefined) {
  if (!key) return undefined;
  return firstRow(
    await tx
      .select({ id: messages.id, providerSid: messages.providerSid })
      .from(messages)
      .where(eq(messages.idempotencyKey, key))
      .limit(1),
  );
}

/**
 * Saves an outbound text, or finds the one already saved under its idempotency
 * key. The insert is race-safe: two workers retrying the same job can both get
 * here, and only one row is ever written.
 */
export async function insertOutbound(
  tx: Tx,
  values: NewOutbound,
): Promise<
  | { inserted: true; row: typeof messages.$inferSelect }
  | { inserted: false; id: string; providerSid: string | null }
> {
  const [row] = await tx
    .insert(messages)
    .values(values)
    .onConflictDoNothing({ target: messages.idempotencyKey })
    .returning();
  if (row) return { inserted: true, row };

  const existing = await findByIdempotencyKey(
    tx,
    values.idempotencyKey ?? undefined,
  );
  return {
    inserted: false,
    ...expectRow(existing ? [existing] : [], "the text saved under that key"),
  };
}

/** Records the provider's outcome. Delivery state lives on the message row. */
const setDeliveryResult = defineAction({
  name: "setDeliveryResult",
  input: z.object({
    messageId: z.uuid(),
    providerSid: z.string().min(1).optional(),
    status: z.enum(["sent", "failed"]),
  }),
  handler: async ({ input, tx, ctx }) => {
    await tx
      .update(messages)
      .set({
        deliveryStatus: input.status,
        ...(input.providerSid ? { providerSid: input.providerSid } : {}),
      })
      .where(eq(messages.id, input.messageId));

    // What it cost is looked up afterwards: the provider prices a text some
    // time after it takes it, and never in the status callback.
    if (input.status === "sent" && input.providerSid) {
      await enqueueJob(
        tx,
        QUEUES.messageCosts,
        {
          messageId: input.messageId,
          providerSid: input.providerSid,
        } satisfies MessageCostJob,
        costLookupDelaySeconds(ctx.services.sms.name),
      );
    }
  },
});

/**
 * Hands a saved text to the provider and records what happened. Called after
 * the save has committed, so nothing is ever sent that isn't recorded.
 */
export async function deliver(
  ctx: ActionContext,
  text: { messageId: string; to: string; body: string },
): Promise<{ messageId: string; providerSid: string }> {
  try {
    const { providerSid } = await ctx.services.sms.send({
      to: text.to,
      body: text.body,
    });
    await setDeliveryResult(ctx, {
      messageId: text.messageId,
      providerSid,
      status: "sent",
    });
    return { messageId: text.messageId, providerSid };
  } catch (error) {
    await setDeliveryResult(ctx, {
      messageId: text.messageId,
      status: "failed",
    }).catch(() => {});
    throw error;
  }
}
