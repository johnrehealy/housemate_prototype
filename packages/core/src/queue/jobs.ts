import { sql } from "drizzle-orm";
import type { Tx } from "../db/client";

export const QUEUES = {
  /** Texts from members, waiting for the agent. */
  inboundMessages: "inbound_messages",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

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
