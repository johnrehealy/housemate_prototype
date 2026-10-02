import { eq } from "drizzle-orm";
import { z } from "zod";
import { firstRow } from "../db/rows";
import { homes, members } from "../db/schema";
import {
  isWithinQuietHours,
  QUIET_HOURS_END_HOUR,
  QUIET_HOURS_START_HOUR,
} from "../time/timezone";
import type { ActionContext } from "./context";
import { defineAction } from "./define-action";
import { ActionError } from "./errors";
import { deliver, findByIdempotencyKey, insertOutbound } from "./outbound";

export const sendMessageInput = z.object({
  homeId: z.uuid(),
  memberId: z.uuid(),
  body: z.string().min(1),
  /** "reply" answers the member; "proactive" is Housemate texting first. */
  kind: z.enum(["reply", "proactive"]),
  conversationId: z.uuid().optional(),
  channel: z.enum(["sms", "web"]).default("sms"),
  /** "system" for automatic texts that aren't the agent speaking. */
  author: z.enum(["agent", "system"]).default("agent"),
  /**
   * Sends at most once per key (D-058). A retried job passes the same key, and
   * finds the text it already saved instead of sending another.
   */
  idempotencyKey: z.string().min(1).optional(),
});

export type SendMessageInput = z.input<typeof sendMessageInput>;

export type SentMessage = {
  duplicate: false;
  messageId: string;
  providerSid: string;
};

/**
 * A text already saved under the same idempotency key. Nothing was sent. Its
 * providerSid is null if the earlier attempt never heard back from the
 * provider; it is not resent, because a duplicate text is worse than a gap.
 */
export type DuplicateMessage = {
  duplicate: true;
  messageId: string;
  providerSid: string | null;
};

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

    // Before quiet hours: a retry of a text already saved is not a new text.
    const earlier = await findByIdempotencyKey(tx, input.idempotencyKey);
    if (earlier) {
      return {
        duplicate: true as const,
        messageId: earlier.id,
        providerSid: earlier.providerSid,
      };
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

    const saved = await insertOutbound(tx, {
      homeId: input.homeId,
      memberId: recipient.id,
      conversationId: input.conversationId ?? null,
      direction: "outbound",
      channel: input.channel,
      author: input.author,
      outboundKind: input.kind,
      body: input.body,
      toPhone: recipient.phone,
      deliveryStatus: "queued",
      idempotencyKey: input.idempotencyKey ?? null,
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
      homeId: saved.row.homeId,
      action: "queued",
      after: {
        body: saved.row.body,
        kind: input.kind,
        toPhone: saved.row.toPhone,
      },
    });

    return {
      duplicate: false as const,
      messageId: saved.row.id,
      to: recipient.phone,
      body: input.body,
    };
  },
});

/**
 * Sends a text to a member: saves it first, then hands it to the provider, so
 * nothing is sent that isn't recorded.
 */
export async function sendMessage(
  ctx: ActionContext,
  input: SendMessageInput & { idempotencyKey?: undefined },
): Promise<SentMessage>;
export async function sendMessage(
  ctx: ActionContext,
  input: SendMessageInput,
): Promise<SentMessage | DuplicateMessage>;
export async function sendMessage(
  ctx: ActionContext,
  input: SendMessageInput,
): Promise<SentMessage | DuplicateMessage> {
  const queued = await queueOutboundMessage(ctx, input);
  if (queued.duplicate) return queued;

  const { providerSid } = await deliver(ctx, queued);
  return { duplicate: false, messageId: queued.messageId, providerSid };
}
