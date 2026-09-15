import { sql } from "drizzle-orm";
import { expect } from "vitest";
import { createDb, type Db, type Tx } from "./client";
import { assertLocalDatabase } from "./local-guard";
import { homes, members } from "./schema";

// Helpers for database tests. Never import from application code.

export const LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export type { Tx };

export function testDb(): Db {
  const url = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;
  assertLocalDatabase(url);
  return createDb(url);
}

class Rollback extends Error {}

/** Runs `fn` in a transaction that is always rolled back, so tests leave no data. */
export async function withRollback(
  db: Db,
  fn: (tx: Tx) => Promise<void>,
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

/** Makes the rest of the transaction run as a signed-in Supabase user. */
export async function actAs(tx: Tx, userId: string): Promise<void> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  await tx.execute(
    sql`select set_config('request.jwt.claims', ${claims}, true)`,
  );
  await tx.execute(sql`set local role authenticated`);
}

/** Makes the rest of the transaction run as a signed-out visitor. */
export async function actAsAnon(tx: Tx): Promise<void> {
  const claims = JSON.stringify({ role: "anon" });
  await tx.execute(
    sql`select set_config('request.jwt.claims', ${claims}, true)`,
  );
  await tx.execute(sql`set local role anon`);
}

/**
 * Asserts that `fn` fails with a database error matching `pattern`. Runs in a
 * savepoint so the surrounding transaction stays usable afterwards.
 */
export async function expectDbError(
  tx: Tx,
  fn: (savepoint: Tx) => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  let caught: unknown;
  try {
    await tx.transaction(async (savepoint) => {
      await fn(savepoint);
    });
  } catch (error) {
    caught = error;
  }
  const messages: string[] = [];
  for (let error = caught; error instanceof Error; error = error.cause) {
    messages.push(error.message);
  }
  expect(messages.join("\n"), "expected a database error").toMatch(pattern);
}

export function one<T>(rows: T[]): T {
  const [row] = rows;
  if (row === undefined) throw new Error("Expected a row");
  return row;
}

export async function createHome(tx: Tx, name = "Test home") {
  return one(
    await tx
      .insert(homes)
      .values({
        name,
        address: "1 Test Street, Testville",
        timezone: "America/New_York",
      })
      .returning(),
  );
}

/** Creates an auth user and member row directly, standing in for an invite. */
export async function createMember(
  tx: Tx,
  input: {
    homeId: string | null;
    phone: string;
    role?: "member" | "staff";
    status?: "invited" | "active" | "removed";
  },
) {
  const [user] = await tx.execute<{ id: string }>(sql`
    insert into auth.users (instance_id, id, aud, role, phone, created_at, updated_at)
    values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated', ${input.phone.slice(1)}, now(), now()
    )
    returning id
  `);
  if (!user) throw new Error("Expected an auth user");

  return one(
    await tx
      .insert(members)
      .values({
        userId: user.id,
        homeId: input.homeId,
        phone: input.phone,
        firstName: "Test",
        role: input.role ?? "member",
        status: input.status ?? "active",
      })
      .returning(),
  );
}
