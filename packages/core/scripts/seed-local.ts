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
import { acceptInvite } from "../src/actions/accept-invite";
import { activateMember } from "../src/actions/activate-member";
import { inviteMember } from "../src/actions/invite-member";
import { joinWaitlist } from "../src/actions/join-waitlist";
import { letIn } from "../src/actions/let-in";
import { recordInboundMessage } from "../src/actions/record-inbound-message";
import { sendMessage } from "../src/actions/send-message";
import type { ActionContext } from "../src/actions/context";
import { createFakeAddressLookup } from "../src/address/fake";
import { createSupabaseAuthAdmin } from "../src/auth/supabase-admin";
import { createDb } from "../src/db/client";
import { assertLocalDatabase } from "../src/db/local-guard";
import { members } from "../src/db/schema";
import { loadServerEnv } from "../src/env";
import { TERMS_VERSION } from "../src/legal";
import { SMS_OPT_IN } from "../src/sms/opt-in";
import { createSimulatorProvider } from "../src/sms/simulator-provider";

// Obviously fake numbers. Keep these clear of the blocks the tests generate:
// security tests use +1555010xxxx, action tests +1555020xxxx and invite tests
// +1555070xxxx, and the seed's rows are committed, so an overlap breaks them.
// Get started's browser test uses +15550190003, which stays free for it.
const SEED_PHONE = "+15550190001";
const STAFF_PHONE = "+15550190002";
const HOUSEMATE_NUMBER = "+15550190000";

// Generated addresses for these accounts. They sign in with a code, texted
// (supabase/config.toml's test codes) or emailed (caught by Mailpit). The
// browser tests use the same ones (apps/web/e2e/support.ts).
const SEED_EMAIL = "sam@example.com";
const STAFF_EMAIL = "olly@example.com";
/** On the waitlist, not let in yet, with no number: for /ops/waitlist. */
const WAITING_EMAIL = "wren@example.com";

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

try {
  const existing = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.phone, SEED_PHONE))
    .limit(1);

  if (existing.length > 0) {
    console.log(
      "Seed data is already there. Run `pnpm db:reset` first to redo it.",
    );
  } else {
    const auth = createSupabaseAuthAdmin({
      url: env.SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    });
    const ctx: ActionContext = {
      db,
      actor: { type: "system" },
      source: { type: "system" },
      services: { auth, sms: createSimulatorProvider() },
    };

    // Staff, the way add-staff.ts makes them, then signed in once.
    const staff = await inviteMember(ctx, {
      phone: STAFF_PHONE,
      firstName: "Olly",
      lastName: "Ops",
      role: "staff",
    });
    await auth.setEmail(staff.userId, STAFF_EMAIL);
    await activateMember(ctx, { memberId: staff.memberId });
    const staffCtx: ActionContext = {
      ...ctx,
      actor: { type: "staff", id: staff.memberId },
      source: { type: "web" },
    };

    const lookup = createFakeAddressLookup();
    const generatedAddress = async (placeId: string) => {
      const found = await lookup.resolve({
        placeId,
        sessionToken: randomUUID(),
      });
      if (!found) throw new Error("Expected a generated address.");
      return {
        line1: found.line1,
        city: found.city,
        state: found.state,
        zip: found.zip,
        placeId: found.placeId,
      };
    };

    // The member, through the same steps Get started takes: their details on
    // the waitlist with texts on, let in by staff, a confirmed number, then
    // the account.
    const signup = await joinWaitlist(ctx, {
      email: SEED_EMAIL,
      firstName: "Sam",
      lastName: "Sample",
      phone: SEED_PHONE,
      textsAgreed: true,
      textsVersion: SMS_OPT_IN.version,
      termsVersion: TERMS_VERSION,
      address: await generatedAddress("fake-place-1"),
      timezone: "America/Chicago",
    });
    if (signup.status !== "waitlisted") {
      throw new Error("Expected Sam to wait on the waitlist.");
    }
    const { token } = await letIn(staffCtx, { email: SEED_EMAIL });
    // As prepareSignupUser leaves it, without the earlier-attempt cleanup a
    // fresh database doesn't need.
    const { userId } = await auth.createSignupUser({ phone: SEED_PHONE });
    const accepted = await acceptInvite(
      { ...ctx, source: { type: "web" } },
      { token, userId, proof: { channel: "sms", phone: SEED_PHONE } },
    );
    // The link was emailed to Sam, which proves the address.
    if (accepted.emailProven) await auth.setEmail(userId, SEED_EMAIL);
    const { memberId, homeId } = accepted;

    await joinWaitlist(ctx, {
      email: WAITING_EMAIL,
      firstName: "Wren",
      lastName: "Waiting",
      textsAgreed: false,
      termsVersion: TERMS_VERSION,
      address: await generatedAddress("fake-place-2"),
      timezone: "America/Chicago",
    });

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
      `Seeded home ${homeId} with member ${memberId} (${SEED_PHONE}), staff ${staff.memberId} (${STAFF_PHONE}), and ${WAITING_EMAIL} on the waitlist.`,
    );
  }
} finally {
  await db.close();
}
