/**
 * Adds a staff account: someone who runs the pilot and signs in to /ops.
 * Staff aren't invited through Get started, so this is how the first one (and
 * any later one) is made.
 *
 * Staff sign in like members, with a code texted to the number (D-073); the
 * first sign-in makes the account active.
 *
 * Run from the repo root with the target environment's values set, e.g.:
 *   node --import tsx/esm packages/core/scripts/add-staff.ts \
 *     --phone "+1..." --first "Olly" --last "Ops"
 *
 * It reads .env.local when there is one. For a real environment, set
 * APP_ENV, DATABASE_URL, SUPABASE_URL and SUPABASE_SECRET_KEY in the shell
 * instead; never write them to a file in the repo.
 */
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { inviteMember } from "../src/actions/invite-member";
import type { ActionContext } from "../src/actions/context";
import { createSupabaseAuthAdmin } from "../src/auth/supabase-admin";
import { createDb } from "../src/db/client";
import { loadServerEnv } from "../src/env";
import { toE164 } from "../src/phone";
import { createSimulatorProvider } from "../src/sms/simulator-provider";

const { values } = parseArgs({
  options: {
    phone: { type: "string" },
    first: { type: "string" },
    last: { type: "string" },
  },
});

const phone = values.phone ? toE164(values.phone) : null;
if (!phone || !values.first) {
  throw new Error(
    'Usage: add-staff.ts --phone "+15550190002" --first "Olly" [--last "Ops"]',
  );
}

if (!process.env.APP_ENV) {
  try {
    process.loadEnvFile(
      fileURLToPath(new URL("../../../.env.local", import.meta.url)),
    );
  } catch {
    // No .env.local. The check below reports what's missing.
  }
}

const env = loadServerEnv();
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
}

const db = createDb(env.DATABASE_URL);
try {
  const ctx: ActionContext = {
    db,
    actor: { type: "system" },
    source: { type: "system" },
    services: {
      auth: createSupabaseAuthAdmin({
        url: env.SUPABASE_URL,
        secretKey: env.SUPABASE_SECRET_KEY,
      }),
      // Nothing is texted here: the code comes when they sign in.
      sms: createSimulatorProvider(),
    },
  };

  const { memberId } = await inviteMember(ctx, {
    phone,
    firstName: values.first,
    lastName: values.last,
    role: "staff",
  });
  console.log(
    `Added staff member ${memberId} in ${env.APP_ENV}. They sign in with a code texted to that number.`,
  );
} finally {
  await db.close();
}
