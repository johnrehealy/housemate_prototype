import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { firstRow } from "../db/rows";
import { messages } from "../db/schema";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";

const OUTBOUND_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "undelivered",
  "failed",
] as const;

type OutboundStatus = (typeof OUTBOUND_STATUSES)[number];

/** How far along a text is. The last three are final. */
const PROGRESS: Record<OutboundStatus, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  undelivered: 2,
  failed: 2,
};

export const updateMessageStatusInput = z.object({
  providerSid: z.string().min(1),
  status: z.enum(OUTBOUND_STATUSES),
});

/**
 * Applies a delivery update from the provider. No activity event: the message
 * row carries its own delivery state, and these arrive several per text.
 *
 * Status only moves forward. Twilio's callbacks can arrive out of order, so a
 * late "sent" must not overwrite "delivered"; an update that would move it
 * back, or sideways between final states, is ignored (`applied: false`).
 */
export const updateMessageStatus = defineAction({
  name: "updateMessageStatus",
  input: updateMessageStatusInput,
  handler: async ({ input, tx }) => {
    const earlier = OUTBOUND_STATUSES.filter(
      (status) => PROGRESS[status] < PROGRESS[input.status],
    );

    const updated =
      earlier.length === 0
        ? []
        : await tx
            .update(messages)
            .set({ deliveryStatus: input.status })
            .where(
              and(
                eq(messages.providerSid, input.providerSid),
                inArray(messages.deliveryStatus, earlier),
              ),
            )
            .returning({ id: messages.id });

    const [message] = updated;
    if (message) {
      return { messageId: message.id, status: input.status, applied: true };
    }

    const existing = firstRow(
      await tx
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.providerSid, input.providerSid))
        .limit(1),
    );
    if (!existing) {
      throw new ActionError(
        "not_found",
        `updateMessageStatus: no message with provider ID ${input.providerSid}.`,
      );
    }
    return { messageId: existing.id, status: input.status, applied: false };
  },
});
