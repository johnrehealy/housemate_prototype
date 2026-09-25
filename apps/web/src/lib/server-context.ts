import "server-only";
import {
  createSmsProvider,
  loadServerEnv,
  type ServerEnv,
} from "@housemate/core";
import type { Actor, ActionContext, Source } from "@housemate/core/actions";
import { createSupabaseAuthAdmin } from "@housemate/core/auth";
import { createDb, type Db } from "@housemate/core/db";

/**
 * The web app's server-side wiring: one database connection per process, and
 * the context every application action needs.
 */

// Next replaces modules on each hot reload, so the connection is cached on
// globalThis. Without this, editing a file would open a new pool every time.
const cache = globalThis as unknown as {
  housemateEnv?: ServerEnv;
  housemateDb?: Db;
};

/** The server's environment, parsed once per process. */
export function serverEnv(): ServerEnv {
  cache.housemateEnv ??= loadServerEnv();
  return cache.housemateEnv;
}

/**
 * The server connection. It bypasses row-level security, so only actions and
 * trusted server code may use it, and never a Client Component.
 */
export function serverDb(): Db {
  cache.housemateDb ??= createDb(serverEnv().DATABASE_URL);
  return cache.housemateDb;
}

/** Builds the context for an action: who is acting, and through which channel. */
export function actionContext(input: {
  actor: Actor;
  source: Source;
}): ActionContext {
  const current = serverEnv();
  const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: secretKey } = current;
  if (!url || !secretKey) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SECRET_KEY. Run `pnpm exec supabase status -o env` for the local values.",
    );
  }

  return {
    db: serverDb(),
    actor: input.actor,
    source: input.source,
    services: {
      auth: createSupabaseAuthAdmin({ url, secretKey }),
      sms: createSmsProvider(current),
    },
  };
}
