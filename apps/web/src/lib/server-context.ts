import "server-only";
import {
  createSmsProvider,
  loadServerEnv,
  type ServerEnv,
} from "@housemate/core";
import type { Actor, ActionContext, Source } from "@housemate/core/actions";
import {
  createAddressLookup,
  type AddressLookup,
} from "@housemate/core/address";
import {
  createWaitlistAlerts,
  type WaitlistAlerts,
} from "@housemate/core/alerts";
import { createSupabaseAuthAdmin } from "@housemate/core/auth";
import { createDb, type Db } from "@housemate/core/db";
import { createMailer, type Mailer } from "@housemate/core/mail";

/**
 * The web app's server-side wiring: one database connection per process, and
 * the context every application action needs.
 */

// Next replaces modules on each hot reload, so the connection is cached on
// globalThis. Without this, editing a file would open a new pool every time.
const cache = globalThis as unknown as {
  housemateEnv?: ServerEnv;
  housemateDb?: Db;
  housemateWaitlistAlerts?: WaitlistAlerts;
  housemateAddressLookup?: AddressLookup | null;
  housemateMailer?: Mailer;
};

function env(): ServerEnv {
  cache.housemateEnv ??= loadServerEnv();
  return cache.housemateEnv;
}

/**
 * The server connection. It bypasses row-level security, so only actions and
 * trusted server code may use it, and never a Client Component.
 */
export function serverDb(): Db {
  cache.housemateDb ??= createDb(env().DATABASE_URL);
  return cache.housemateDb;
}

/** Tells the team about a new waitlist signup. Off unless configured. */
export function waitlistAlerts(): WaitlistAlerts {
  cache.housemateWaitlistAlerts ??= createWaitlistAlerts(env());
  return cache.housemateWaitlistAlerts;
}

/**
 * Housemate's emails: let-in links and sign-in codes (D-072, D-073). Off
 * unless the Apps Script is configured, which is production only.
 */
export function mailer(): Mailer {
  cache.housemateMailer ??= createMailer(env());
  return cache.housemateMailer;
}

/** The secret Supabase signs the Send Email hook with, where it's on. */
export function sendEmailHookSecret(): string | undefined {
  return env().SEND_EMAIL_HOOK_SECRET;
}

/**
 * Get started's address search, or null when it's off and the address is typed
 * (D-068). Server-only: the Google key never reaches a page.
 */
export function addressLookup(): AddressLookup | null {
  if (cache.housemateAddressLookup === undefined) {
    cache.housemateAddressLookup = createAddressLookup(env());
  }
  return cache.housemateAddressLookup;
}

/** Where this deployment is served, for links staff send by hand. */
export function publicBaseUrl(): string {
  return env().PUBLIC_BASE_URL.replace(/\/$/, "");
}

/** Builds the context for an action: who is acting, and through which channel. */
export function actionContext(input: {
  actor: Actor;
  source: Source;
}): ActionContext {
  const current = env();
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
