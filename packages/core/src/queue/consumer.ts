import { sql } from "drizzle-orm";
import type { Db } from "../db/client";
import type { QueueName } from "./jobs";

/*
 * Takes one job at a time off a pgmq queue. Reading a job hides it for the
 * visibility timeout rather than removing it, so a worker that dies mid-job
 * loses nothing: the job reappears and is retried. That makes every handler
 * run at least once, which is why the handlers are idempotent (D-058).
 */

/** Anything that can run SQL and open a transaction: the connection, or a test's. */
type Queryable = Pick<Db, "execute" | "transaction">;

export type JobHandler = (
  payload: unknown,
  job: { msgId: string; attempt: number },
) => Promise<void>;

export type ConsumerOptions = {
  queue: QueueName;
  deadQueue: QueueName;
  handler: JobHandler;
  /** How long a job stays hidden while it's worked on. */
  visibilitySeconds?: number;
  /** Attempts before a job is moved to the dead-letter queue. */
  maxAttempts?: number;
  /** How long one read waits for a job to arrive. 0 reads once and returns. */
  pollSeconds?: number;
};

export type JobOutcome =
  | { outcome: "empty" }
  | {
      outcome: "processed" | "retried" | "dead";
      msgId: string;
      attempt: number;
    };

/** The wait before a failed job's next attempt: 5s, 10s, 20s… capped at 5 minutes. */
export function retryDelaySeconds(attempt: number): number {
  return Math.min(5 * 2 ** (attempt - 1), 300);
}

type JobRow = { msg_id: string; read_ct: number; message: unknown };

export async function processNextJob(
  db: Queryable,
  {
    queue,
    deadQueue,
    handler,
    visibilitySeconds = 30,
    maxAttempts = 5,
    pollSeconds = 2,
  }: ConsumerOptions,
): Promise<JobOutcome> {
  // read_with_poll checks its deadline before its first read, so a zero wait
  // would never read anything: that case is a plain read.
  const read =
    pollSeconds > 0
      ? sql`pgmq.read_with_poll(${queue}::text, ${visibilitySeconds}::integer, 1, ${pollSeconds}::integer, 100)`
      : sql`pgmq.read(${queue}::text, ${visibilitySeconds}::integer, 1)`;
  const [job] = await db.execute<JobRow>(
    sql`select msg_id::text, read_ct, message from ${read}`,
  );
  if (!job) return { outcome: "empty" };

  const msgId = job.msg_id;
  const attempt = job.read_ct;

  // Read more often than allowed without ever finishing: the worker kept
  // dying on it. Park it rather than let it take the worker down again.
  if (attempt > maxAttempts) {
    await deadLetter(db, { queue, deadQueue, job, error: null });
    return { outcome: "dead", msgId, attempt };
  }

  try {
    await handler(job.message, { msgId, attempt });
  } catch (error) {
    if (attempt >= maxAttempts) {
      await deadLetter(db, { queue, deadQueue, job, error });
      return { outcome: "dead", msgId, attempt };
    }
    await db.execute(
      sql`select pgmq.set_vt(${queue}::text, ${msgId}::bigint, ${retryDelaySeconds(attempt)}::integer)`,
    );
    return { outcome: "retried", msgId, attempt };
  }

  await db.execute(sql`select pgmq.delete(${queue}::text, ${msgId}::bigint)`);
  return { outcome: "processed", msgId, attempt };
}

/**
 * Moves a job to the dead-letter queue, in one transaction so it's never in
 * both or neither. Only the error's name and code are kept: its message can
 * quote the values it was given.
 */
async function deadLetter(
  db: Queryable,
  {
    queue,
    deadQueue,
    job,
    error,
  }: { queue: QueueName; deadQueue: QueueName; job: JobRow; error: unknown },
) {
  const failure =
    error instanceof Error
      ? { name: error.name, code: (error as { code?: unknown }).code ?? null }
      : null;
  const record = {
    msgId: job.msg_id,
    job: job.message,
    attempts: job.read_ct,
    error: failure,
    deadAt: new Date().toISOString(),
  };
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pgmq.send(${deadQueue}::text, ${JSON.stringify(record)}::jsonb)`,
    );
    await tx.execute(
      sql`select pgmq.delete(${queue}::text, ${job.msg_id}::bigint)`,
    );
  });
}
