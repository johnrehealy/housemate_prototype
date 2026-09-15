import { eq } from "drizzle-orm";
import { z } from "zod";
import { expectRow, firstRow } from "../db/rows";
import { members, messages } from "../db/schema";
import { enqueueJob, QUEUES } from "../queue/jobs";
import { defineAction } from "./define-action";
import { e164Phone } from "./shared";

export const recordInboundMessageInput = z.object({
  /** Twilio's message ID, or the simulator's. Makes repeat webhooks harmless. */
  providerSid: z.string().min(1),
  fromPhone: e164Phone,
  toPhone: e164Phone,
  body: z.string().default(""),
  media: z
    .array(z.object({ url: z.url(), contentType: z.string().min(1) }))
    .default([]),
  receivedAt: z.coerce.date().optional(),
});

/**
 * Stores a text from a member. Texts from numbers that aren't invited are
 * stored without a home (staff-only) and don't reach the agent.
 */
export const recordInboundMessage = defineAction({
  name: "recordInboundMessage",
  input: recordInboundMessageInput,
  handler: async ({ input, tx, record, now }) => {
    const existing = firstRow(
      await tx
        .select({
          id: messages.id,
          homeId: messages.homeId,
          memberId: messages.memberId,
        })
        .from(messages)
        .where(eq(messages.providerSid, input.providerSid))
        .limit(1),
    );
    if (existing) {
      return {
        messageId: existing.id,
        homeId: existing.homeId,
        memberId: existing.memberId,
        duplicate: true,
        queued: false,
      };
    }

    const sender = firstRow(
      await tx
        .select({
          id: members.id,
          homeId: members.homeId,
          status: members.status,
        })
        .from(members)
        .where(eq(members.phone, input.fromPhone))
        .limit(1),
    );
    const known = sender && sender.status !== "removed" ? sender : undefined;

    const message = expectRow(
      await tx
        .insert(messages)
        .values({
          homeId: known?.homeId ?? null,
          memberId: known?.id ?? null,
          direction: "inbound",
          channel: "sms",
          author: "member",
          body: input.body,
          media: input.media,
          fromPhone: input.fromPhone,
          toPhone: input.toPhone,
          providerSid: input.providerSid,
          deliveryStatus: "received",
          createdAt: input.receivedAt ?? now,
        })
        .returning(),
      "the stored message",
    );

    await record({
      entityType: "message",
      entityId: message.id,
      homeId: message.homeId,
      action: "received",
      after: {
        fromPhone: message.fromPhone,
        body: message.body,
        memberId: message.memberId,
      },
    });

    if (!known) {
      return {
        messageId: message.id,
        homeId: null,
        memberId: null,
        duplicate: false,
        queued: false,
      };
    }

    await enqueueJob(tx, QUEUES.inboundMessages, {
      messageId: message.id,
      homeId: known.homeId,
      memberId: known.id,
    });

    return {
      messageId: message.id,
      homeId: known.homeId,
      memberId: known.id,
      duplicate: false,
      queued: true,
    };
  },
});
