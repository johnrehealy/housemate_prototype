import { eq } from "drizzle-orm";
import { z } from "zod";
import { expectRow, firstRow } from "../db/rows";
import { members, messages } from "../db/schema";
import {
  costLookupDelaySeconds,
  enqueueJob,
  type InboundMessageJob,
  type MessageCostJob,
  QUEUES,
} from "../queue/jobs";
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
  /**
   * An opt-out keyword. Twilio has already answered it (D-051), so the text is
   * stored but never queued: nothing of ours replies to STOP or HELP.
   */
  optOut: z.enum(["stop", "help"]).optional(),
});

/**
 * Stores a text and queues it for the worker. Texts from numbers that aren't
 * invited are stored without a home (staff-only); they're queued too, but only
 * for D-050's invite-only reply, never for the agent.
 */
export const recordInboundMessage = defineAction({
  name: "recordInboundMessage",
  input: recordInboundMessageInput,
  handler: async ({ input, tx, ctx, record, now }) => {
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
        ...(input.optOut ? { optOut: input.optOut } : {}),
      },
    });

    // A text costs money whoever sent it, so this is queued before the
    // opt-out check below returns.
    await enqueueJob(
      tx,
      QUEUES.messageCosts,
      {
        messageId: message.id,
        providerSid: input.providerSid,
      } satisfies MessageCostJob,
      costLookupDelaySeconds(ctx.services.sms.name),
    );

    const homeId = known?.homeId ?? null;
    const memberId = known?.id ?? null;
    if (input.optOut) {
      return {
        messageId: message.id,
        homeId,
        memberId,
        duplicate: false,
        queued: false,
      };
    }

    await enqueueJob(tx, QUEUES.inboundMessages, {
      messageId: message.id,
      homeId,
      memberId,
    } satisfies InboundMessageJob);

    return {
      messageId: message.id,
      homeId,
      memberId,
      duplicate: false,
      queued: true,
    };
  },
});
