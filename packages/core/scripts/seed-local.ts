/**
 * Fills the local database with obviously fake data for development, using the
 * same actions the product uses. Refuses to run anywhere but local Supabase:
 * members are real people, so generated data never reaches a real database.
 *
 * Run with: pnpm db:seed
 */
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { inviteMember } from "../src/actions/invite-member";
import { recordInboundMessage } from "../src/actions/record-inbound-message";
import { sendMessage } from "../src/actions/send-message";
import type { ActionContext } from "../src/actions/context";
import { createSupabaseAuthAdmin } from "../src/auth/supabase-admin";
import { createDb } from "../src/db/client";
import { assertLocalDatabase } from "../src/db/local-guard";
import { members } from "../src/db/schema";
import { loadServerEnv } from "../src/env";
import { createSimulatorProvider } from "../src/sms/simulator-provider";

// Obviously fake numbers. Keep these clear of the blocks the tests generate:
// security tests use +1555010xxxx and action tests use +1555020xxxx, and the
// seed's rows are committed, so an overlap breaks them.
const SEED_PHONE = "+15550190001";
const STAFF_PHONE = "+15550190002";
const HOUSEMATE_NUMBER = "+15550190000";

// Use .env.local from the repo root when it exists; otherwise rely on whatever
// is already set in the environment.
try {
  process.loadEnvFile(
    fileURLToPath(new URL("../../../.env.local", import.meta.url)),
  );
} catch {
  // No .env.local. Carry on and let the checks below report what's missing.
}

const env = loadServerEnv();
if (env.APP_ENV !== "local") {
  throw new Error("The seed script only runs with APP_ENV=local.");
}
assertLocalDatabase(env.DATABASE_URL);
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. Run `pnpm exec supabase status -o env` to see the local values.",
  );
}

const db = createDb(env.DATABASE_URL);

async function seeded(phone: string): Promise<boolean> {
  const existing = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.phone, phone))
    .limit(1);
  return existing.length > 0;
}

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
      sms: createSimulatorProvider(),
    },
  };

  if (await seeded(SEED_PHONE)) {
    console.log(
      "Seed data is already there. Run `pnpm db:reset` first to redo it.",
    );
  } else {
    const { memberId, homeId } = await inviteMember(ctx, {
      phone: SEED_PHONE,
      firstName: "Sam",
      lastName: "Sample",
      home: {
        name: "Sample home",
        address: "1 Sample Street, Testville",
        timezone: "America/New_York",
      },
    });
    if (!homeId) throw new Error("Expected the invite to create a home.");

    // The member stays invited on purpose. Signing in is what activates them,
    // so local development exercises the same path a real member takes.

    await recordInboundMessage(ctx, {
      providerSid: `SIMSEED${randomUUID().replaceAll("-", "")}`,
      fromPhone: SEED_PHONE,
      toPhone: HOUSEMATE_NUMBER,
      body: "Hey - is the dishwasher still under warranty?",
    });

    await sendMessage(ctx, {
      homeId,
      memberId,
      body: "Hey Sam - let me check the paperwork and get back to you.",
      kind: "reply",
    });

    console.log(
      `Seeded home ${homeId} with member ${memberId} (${SEED_PHONE}).`,
    );
  }

  // Staff have no home. The ops pages (/ops/costs) are theirs alone, so local
  // development and the browser tests need one to open them. Checked on its
  // own, so a database seeded before staff existed gains one without a reset.
  if (!(await seeded(STAFF_PHONE))) {
    const { memberId } = await inviteMember(ctx, {
      phone: STAFF_PHONE,
      firstName: "Olly",
      lastName: "Ops",
      role: "staff",
    });
    console.log(`Seeded staff member ${memberId} (${STAFF_PHONE}).`);
  }
} finally {
  await db.close();
}
