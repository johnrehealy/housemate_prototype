import { sql } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "../db/client";

export const QUEUES = {
  /** Inbound texts, waiting for the worker. */
  inboundMessages: "inbound_messages",
  /** Inbound-text jobs that failed every retry. */
  inboundMessagesDead: "inbound_messages_dead",
  /** Texts whose price hasn't been looked up yet. */
  messageCosts: "message_costs",
  /** Price lookups that failed every retry. */
  messageCostsDead: "message_costs_dead",
} as const;

/**
 * An inbound_messages job. Only the message ID is relied on: the worker reloads
 * the message, because the database is the source of truth. The home and member
 * are there for reading a job at a glance, and are null for uninvited senders.
 */
export const inboundMessageJob = z.object({
  messageId: z.uuid(),
  homeId: z.uuid().nullable().optional(),
  memberId: z.uuid().nullable().optional(),
});

export type InboundMessageJob = z.infer<typeof inboundMessageJob>;

/**
 * A message_costs job: what a text cost, once the provider has priced it. The
 * provider SID is the provider's own ID for the text, which is what its price
 * is looked up by.
 */
export const messageCostJob = z.object({
  messageId: z.uuid(),
  providerSid: z.string().min(1),
});

export type MessageCostJob = z.infer<typeof messageCostJob>;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/**
 * How long to wait before asking what a text cost. Twilio fills a message's
 * price in some time after it handles it, so asking straight away wastes a
 * retry; the simulator prices everything at once.
 */
export function costLookupDelaySeconds(provider: "twilio" | "simulator") {
  return provider === "twilio" ? 60 : 0;
}

/**
 * Adds a job inside the caller's transaction, so work is only queued if the
 * change that caused it is saved.
 */
export async function enqueueJob(
  tx: Tx,
  queue: QueueName,
  payload: Record<string, unknown>,
  delaySeconds = 0,
): Promise<string> {
  const rows = await tx.execute<{ msg_id: string }>(
    // Casts are explicit: pgmq.send also has a "send at this time" overload.
    sql`select pgmq.send(${queue}::text, ${JSON.stringify(payload)}::jsonb, ${delaySeconds}::integer) as msg_id`,
  );
  const [row] = rows;
  if (!row) throw new Error(`Failed to queue a ${queue} job`);
  return String(row.msg_id);
}
