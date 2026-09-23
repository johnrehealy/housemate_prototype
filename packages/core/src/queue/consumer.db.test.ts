import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db, Tx } from "../db/client";
import { testDb, withRollback } from "../db/testing";
import { processNextJob, retryDelaySeconds, type JobHandler } from "./consumer";
import type { QueueName } from "./jobs";

let db: Db;
beforeAll(() => {
  db = testDb();
});
afterAll(async () => {
  await db.close();
});

// Throwaway queues, created inside each test's transaction and rolled back
// with it, so jobs left in the real queues by local runs can't interfere.
const QUEUE = "consumer_test" as QueueName;
const DEAD = "consumer_test_dead" as QueueName;

async function createQueues(tx: Tx) {
  await tx.execute(sql`select pgmq.create(${QUEUE}::text)`);
  await tx.execute(sql`select pgmq.create(${DEAD}::text)`);
}

async function send(tx: Tx, payload: object, delaySeconds = 0) {
  await tx.execute(
    sql`select pgmq.send(${QUEUE}::text, ${JSON.stringify(payload)}::jsonb, ${delaySeconds}::integer)`,
  );
}

async function count(tx: Tx, queue: QueueName) {
  const [row] = await tx.execute<{ n: number }>(
    sql`select count(*)::int as n from ${sql.identifier("pgmq")}.${sql.identifier(`q_${queue}`)}`,
  );
  return row?.n ?? 0;
}

/** Makes every job visible now, standing in for waiting out a delay. */
async function makeVisible(tx: Tx) {
  await tx.execute(
    sql`update ${sql.identifier("pgmq")}.${sql.identifier(`q_${QUEUE}`)} set vt = clock_timestamp()`,
  );
}

function run(tx: Tx, handler: JobHandler, maxAttempts = 5) {
  return processNextJob(tx, {
    queue: QUEUE,
    deadQueue: DEAD,
    handler,
    maxAttempts,
    pollSeconds: 0,
  });
}

describe("processNextJob", () => {
  it("runs a job and deletes it", async () => {
    await withRollback(db, async (tx) => {
      await createQueues(tx);
      await send(tx, { n: 1 });
      const seen: unknown[] = [];

      const result = await run(tx, async (payload) => {
        seen.push(payload);
      });

      expect(result).toMatchObject({ outcome: "processed", attempt: 1 });
      expect(seen).toEqual([{ n: 1 }]);
      expect(await count(tx, QUEUE)).toBe(0);
      expect(await run(tx, async () => {})).toEqual({ outcome: "empty" });
    });
  });

  it("retries a failing job with a backoff, then dead-letters it", async () => {
    await withRollback(db, async (tx) => {
      await createQueues(tx);
      await send(tx, { n: 2 });
      const failing: JobHandler = async () => {
        throw Object.assign(new Error("Provider said no to +15550000000"), {
          code: "E_PROVIDER",
        });
      };

      const first = await run(tx, failing);
      expect(first).toMatchObject({ outcome: "retried", attempt: 1 });
      // Hidden for the backoff, so an immediate read finds nothing.
      expect(await run(tx, failing)).toEqual({ outcome: "empty" });

      for (const attempt of [2, 3, 4]) {
        await makeVisible(tx);
        expect(await run(tx, failing)).toMatchObject({
          outcome: "retried",
          attempt,
        });
      }
      await makeVisible(tx);
      expect(await run(tx, failing)).toMatchObject({
        outcome: "dead",
        attempt: 5,
      });

      expect(await count(tx, QUEUE)).toBe(0);
      const [dead] = await tx.execute<{ message: Record<string, unknown> }>(
        sql`select message from ${sql.identifier("pgmq")}.${sql.identifier(`q_${DEAD}`)}`,
      );
      expect(dead?.message).toMatchObject({
        job: { n: 2 },
        attempts: 5,
        error: { name: "Error", code: "E_PROVIDER" },
      });
      // The error's message, which quoted a phone number, is not kept.
      expect(JSON.stringify(dead?.message)).not.toContain("+1555");
    });
  });

  it("backs off 5s, 10s, 20s… up to 5 minutes", () => {
    expect([1, 2, 3, 4, 5, 10].map(retryDelaySeconds)).toEqual([
      5, 10, 20, 40, 80, 300,
    ]);
  });

  it("retries a job a crashed worker left behind, and runs it once", async () => {
    await withRollback(db, async (tx) => {
      await createQueues(tx);
      await send(tx, { n: 3 });
      // A worker read it and died: read, never deleted, and now visible again.
      await tx.execute(sql`select * from pgmq.read(${QUEUE}::text, 0, 1)`);
      let runs = 0;

      const result = await run(tx, async () => {
        runs += 1;
      });

      expect(result).toMatchObject({ outcome: "processed", attempt: 2 });
      expect(runs).toBe(1);
      expect(await count(tx, QUEUE)).toBe(0);
    });
  });

  it("parks a job that has crashed the worker too often, without running it", async () => {
    await withRollback(db, async (tx) => {
      await createQueues(tx);
      await send(tx, { n: 4 });
      for (let i = 0; i < 2; i++) {
        await tx.execute(sql`select * from pgmq.read(${QUEUE}::text, 0, 1)`);
      }
      let runs = 0;

      const result = await run(
        tx,
        async () => {
          runs += 1;
        },
        2,
      );

      expect(result).toMatchObject({ outcome: "dead", attempt: 3 });
      expect(runs).toBe(0);
      expect(await count(tx, DEAD)).toBe(1);
    });
  });

  it("doesn't run a delayed job before it's due", async () => {
    await withRollback(db, async (tx) => {
      await createQueues(tx);
      await send(tx, { n: 5 }, 60);

      expect(await run(tx, async () => {})).toEqual({ outcome: "empty" });

      await makeVisible(tx);
      expect(await run(tx, async () => {})).toMatchObject({
        outcome: "processed",
      });
    });
  });
});
