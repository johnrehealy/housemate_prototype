import { eq } from "drizzle-orm";
import { z } from "zod";
import { firstRow } from "../db/rows";
import { messages } from "../db/schema";
import type { ActionContext } from "./context";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";
import { deliver, insertOutbound } from "./outbound";
import type { DuplicateMessage, SentMessage } from "./send-message";

/** D-050's reply, and D-058's approved copy. It goes to real people in production. */
export const INVITE_ONLY_REPLY =
  "Hi - Housemate is invite-only right now, so I can't help with requests from this number.";

export const sendInviteOnlyReplyInput = z.object({
  inboundMessageId: z.uuid(),
});

/**
 * Answers a text from a number that isn't invited, once per number ever
 * (D-050): the key is the phone, so a number that keeps texting gets nothing
 * further. The reply has no home, so like the text it answers it's staff-only.
 */
const queueInviteOnlyReply = defineAction({
  name: "sendInviteOnlyReply",
  input: sendInviteOnlyReplyInput,
  handler: async ({ input, tx, record, now }) => {
    const inbound = firstRow(
      await tx
        .select({
          id: messages.id,
          homeId: messages.homeId,
          direction: messages.direction,
          fromPhone: messages.fromPhone,
        })
        .from(messages)
        .where(eq(messages.id, input.inboundMessageId))
        .limit(1),
    );
    if (!inbound || inbound.direction !== "inbound" || !inbound.fromPhone) {
      throw new ActionError(
        "not_found",
        "sendInviteOnlyReply: no such inbound text.",
      );
    }
    if (inbound.homeId) {
      throw new ActionError(
        "conflict",
        "sendInviteOnlyReply: that text is from a member.",
      );
    }

    const saved = await insertOutbound(tx, {
      homeId: null,
      memberId: null,
      direction: "outbound",
      channel: "sms",
      author: "system",
      outboundKind: "reply",
      body: INVITE_ONLY_REPLY,
      toPhone: inbound.fromPhone,
      deliveryStatus: "queued",
      idempotencyKey: `invite-only:${inbound.fromPhone}`,
      createdAt: now,
    });
    if (!saved.inserted) {
      return {
        duplicate: true as const,
        messageId: saved.id,
        providerSid: saved.providerSid,
      };
    }

    await record({
      entityType: "message",
      entityId: saved.row.id,
      homeId: null,
      action: "queued",
      after: {
        body: saved.row.body,
        kind: "reply",
        toPhone: saved.row.toPhone,
        inReplyTo: inbound.id,
      },
    });

    return {
      duplicate: false as const,
      messageId: saved.row.id,
      to: inbound.fromPhone,
      body: INVITE_ONLY_REPLY,
    };
  },
});

export async function sendInviteOnlyReply(
  ctx: ActionContext,
  input: z.input<typeof sendInviteOnlyReplyInput>,
): Promise<SentMessage | DuplicateMessage> {
  const queued = await queueInviteOnlyReply(ctx, input);
  if (queued.duplicate) return queued;

  const { providerSid } = await deliver(ctx, queued);
  return { duplicate: false, messageId: queued.messageId, providerSid };
}
