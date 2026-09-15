import { eq } from "drizzle-orm";
import { z } from "zod";
import { messages } from "../db/schema";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";

export const updateMessageStatusInput = z.object({
  providerSid: z.string().min(1),
  status: z.enum(["queued", "sent", "delivered", "undelivered", "failed"]),
});

/**
 * Applies a delivery update from the provider. No activity event: the message
 * row carries its own delivery state, and these arrive several per text.
 */
export const updateMessageStatus = defineAction({
  name: "updateMessageStatus",
  input: updateMessageStatusInput,
  handler: async ({ input, tx }) => {
    const updated = await tx
      .update(messages)
      .set({ deliveryStatus: input.status })
      .where(eq(messages.providerSid, input.providerSid))
      .returning({ id: messages.id });

    const [message] = updated;
    if (!message) {
      throw new ActionError(
        "not_found",
        `updateMessageStatus: no message with provider ID ${input.providerSid}.`,
      );
    }
    return { messageId: message.id, status: input.status };
  },
});
