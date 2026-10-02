import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { createSmsProvider, loadServerEnv } from "@housemate/core";
import { raiseAlert, type ActionContext } from "@housemate/core/actions";
import { createSupabaseAuthAdmin } from "@housemate/core/auth";
import { createDb } from "@housemate/core/db";
import {
  handleInboundMessageJob,
  handleMessageCostJob,
  sweepStuckSends,
} from "@housemate/core/jobs";
import {
  processNextJob,
  QUEUES,
  type JobOutcome,
  type QueueName,
} from "@housemate/core/queue";
import { startHealthServer } from "./health";

/*
 * The worker: takes jobs off the queues one at a time and runs them. For now
 * that means answering inbound texts (the temporary acknowledgment or the
 * invite-only reply; the agent replaces it in Slice 1) and asking the provider
 * what each text cost. Every few minutes it also looks for texts that were
 * saved but never sent.
 *
 * Logs carry job IDs, outcomes and error names only — never a text's body or
 * a phone number (invariant 6).
 */

// .env.local from the repo root when it exists; hosts set the environment.
try {
  process.loadEnvFile(
    fileURLToPath(new URL("../../../.env.local", import.meta.url)),
  );
} catch {
  // No .env.local. loadServerEnv reports anything missing.
}

const env = loadServerEnv();
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SECRET_KEY. Run `pnpm exec supabase status -o env` for the local values.",
  );
}

const db = createDb(env.DATABASE_URL);
const ctx: ActionContext = {
  db,
  actor: { type: "system" },
  source: { type: "system" },
  services: {
    auth: createSupabaseAuthAdmin({
      url: env.SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    }),
    sms: createSmsProvider(env),
  },
};
const teamPhones = env.TEAM_ALERT_PHONES;

/** A stalled loop for this long fails the health check. */
const STALL_MS = 30_000;
/** How often to look for texts that never got a result from the provider. */
const SWEEP_EVERY_MS = 5 * 60_000;
const port = Number(process.env.PORT ?? 8080);

let stopping = false;
let lastTurn = Date.now();
let lastSweep = Date.now();

function log(event: string, detail: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...detail }));
}

function errorDetail(error: unknown) {
  return error instanceof Error
    ? { error: error.name, code: (error as { code?: unknown }).code ?? null }
    : { error: "unknown" };
}

/** Runs a handler, logging what happened without ever logging the payload. */
function logged(
  name: string,
  run: (payload: unknown) => Promise<Record<string, unknown>>,
) {
  return async (payload: unknown, job: { msgId: string; attempt: number }) => {
    try {
      const detail = await run(payload);
      log("job.handled", { job: name, msgId: job.msgId, ...detail });
    } catch (error) {
      log("job.failed", {
        job: name,
        msgId: job.msgId,
        attempt: job.attempt,
        ...errorDetail(error),
      });
      throw error;
    }
  };
}

/** Tells the team about a job that has failed every retry. */
async function alertDeadLetter(queue: QueueName, result: JobOutcome) {
  if (result.outcome !== "dead") return;
  await raiseAlert(ctx, {
    kind: "worker_error",
    dedupeKey: `dead-letter:${queue}:${result.msgId}`,
    detail: { queue, msgId: result.msgId, attempts: result.attempt },
    text: `Housemate alert: a job failed every retry and has been parked - ${queue}, job ${result.msgId}. It won't run again on its own.`,
    teamPhones,
  });
}

/** Takes one job off a queue, and reports what happened to it. */
async function takeOne(
  queue: QueueName,
  deadQueue: QueueName,
  handler: (
    payload: unknown,
    job: { msgId: string; attempt: number },
  ) => Promise<void>,
  pollSeconds: number,
): Promise<JobOutcome> {
  const result = await processNextJob(db, {
    queue,
    deadQueue,
    handler,
    pollSeconds,
  });
  if (result.outcome !== "empty") {
    const { outcome, ...job } = result;
    log(`job.${outcome}`, { queue, ...job });
    await alertDeadLetter(queue, result);
  }
  return result;
}

const handleInbound = logged("inbound_message", async (payload) => {
  const outcome = await handleInboundMessageJob(ctx, payload, {
    ackReplyEnabled: env.ACK_REPLY_ENABLED,
  });
  return { reply: outcome.reply };
});

const handleCost = logged("message_cost", async (payload) => {
  const outcome = await handleMessageCostJob(ctx, payload, { teamPhones });
  return outcome.recorded
    ? { cost: "recorded", overBudget: outcome.overBudget }
    : { cost: "skipped", reason: outcome.reason };
});

async function runLoop() {
  while (!stopping) {
    try {
      // Answering a member comes first; a price lookup can wait a second.
      await takeOne(
        QUEUES.inboundMessages,
        QUEUES.inboundMessagesDead,
        handleInbound,
        1,
      );
      if (stopping) break;
      await takeOne(
        QUEUES.messageCosts,
        QUEUES.messageCostsDead,
        handleCost,
        0,
      );

      if (Date.now() - lastSweep >= SWEEP_EVERY_MS) {
        lastSweep = Date.now();
        const swept = await sweepStuckSends(ctx, { teamPhones });
        if (swept.found > 0) log("sweep.stuck_sends", swept);
      }

      lastTurn = Date.now();
    } catch (error) {
      // The database is unreachable, most likely. Wait and try again.
      log("loop.error", errorDetail(error));
      await sleep(1000);
    }
  }
}

const server = startHealthServer(
  port,
  () => !stopping && Date.now() - lastTurn < STALL_MS,
);
log("worker.started", {
  env: env.APP_ENV,
  sms: env.SMS_PROVIDER,
  ackReply: env.ACK_REPLY_ENABLED,
  teamNumbers: teamPhones.length,
  port,
});
const loop = runLoop();

/** Stop reading, finish the job in hand, then close everything and exit. */
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  log("worker.stopping", { signal });
  await loop;
  server.close();
  await db.close();
  log("worker.stopped");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
