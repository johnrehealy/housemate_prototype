import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Server-side database connection. It bypasses row-level security, so only
 * application actions and trusted server code may use it.
 */
export function createDb(databaseUrl: string) {
  // prepare: false also works through Supabase's transaction pooler.
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client, { schema });
  return Object.assign(db, { close: () => client.end() });
}

export type Db = ReturnType<typeof createDb>;

/** A transaction handle, as passed to `db.transaction(...)`. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
