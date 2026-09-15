import { eq } from "drizzle-orm";
import { z } from "zod";
import { expectRow, firstRow } from "../db/rows";
import { homes, members, messages } from "../db/schema";
import {
  isWithinQuietHours,
  QUIET_HOURS_END_HOUR,
  QUIET_HOURS_START_HOUR,
} from "../time/timezone";
import type { ActionContext } from "./context";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";

export const sendMessageInput = z.object({
  homeId: z.uuid(),
  memberId: z.uuid(),
  body: z.string().min(1),
  /** "reply" answers the member; "proactive" is Housemate texting first. */
  kind: z.enum(["reply", "proactive"]),
  conversationId: z.uuid().optional(),
  channel: z.enum(["sms", "web"]).default("sms"),
});

export type SendMessageInput = z.input<typeof sendMessageInput>;

/** Saves the outgoing text as queued. Quiet hours are enforced here, not in the prompt. */
const queueOutboundMessage = defineAction({
  name: "sendMessage",
  input: sendMessageInput,
  handler: async ({ input, tx, record, now }) => {
    const recipient = firstRow(
      await tx
        .select({
          id: members.id,
          phone: members.phone,
          homeId: members.homeId,
          status: members.status,
          timezone: homes.timezone,
        })
        .from(members)
        .innerJoin(homes, eq(members.homeId, homes.id))
        .where(eq(members.id, input.memberId))
        .limit(1),
    );
    if (!recipient || recipient.homeId !== input.homeId) {
      throw new ActionError(
        "not_found",
        "sendMessage: no such member in that home.",
      );
    }
    if (recipient.status === "removed") {
      throw new ActionError(
        "not_found",
        "sendMessage: that member was removed.",
      );
    }
    if (
      input.kind === "proactive" &&
      isWithinQuietHours(now, recipient.timezone)
    ) {
      throw new ActionError(
        "quiet_hours",
        `sendMessage: Housemate doesn't text first between ${QUIET_HOURS_START_HOUR}:00 and ${QUIET_HOURS_END_HOUR}:00 in the member's timezone.`,
      );
    }

    const message = expectRow(
      await tx
        .insert(messages)
        .values({
          homeId: input.homeId,
          memberId: recipient.id,
          conversationId: input.conversationId ?? null,
          direction: "outbound",
          channel: input.channel,
          author: "agent",
          outboundKind: input.kind,
          body: input.body,
          toPhone: recipient.phone,
          deliveryStatus: "queued",
          createdAt: now,
        })
        .returning(),
      "the queued message",
    );

    await record({
      entityType: "message",
      entityId: message.id,
      homeId: message.homeId,
      action: "queued",
      after: { body: message.body, kind: input.kind, toPhone: message.toPhone },
    });

    return { messageId: message.id, to: recipient.phone };
  },
});

/** Records the provider's outcome. Delivery state lives on the message row. */
const setDeliveryResult = defineAction({
  name: "setDeliveryResult",
  input: z.object({
    messageId: z.uuid(),
    providerSid: z.string().min(1).optional(),
    status: z.enum(["sent", "failed"]),
  }),
  handler: async ({ input, tx }) => {
    await tx
      .update(messages)
      .set({
        deliveryStatus: input.status,
        ...(input.providerSid ? { providerSid: input.providerSid } : {}),
      })
      .where(eq(messages.id, input.messageId));
  },
});

/**
 * Sends a text to a member: saves it first, then hands it to the provider, so
 * nothing is sent that isn't recorded.
 */
export async function sendMessage(ctx: ActionContext, input: SendMessageInput) {
  const { messageId, to } = await queueOutboundMessage(ctx, input);

  try {
    const { providerSid } = await ctx.services.sms.send({
      to,
      body: sendMessageInput.parse(input).body,
    });
    await setDeliveryResult(ctx, { messageId, providerSid, status: "sent" });
    return { messageId, providerSid };
  } catch (error) {
    await setDeliveryResult(ctx, { messageId, status: "failed" }).catch(
      () => {},
    );
    throw error;
  }
}
