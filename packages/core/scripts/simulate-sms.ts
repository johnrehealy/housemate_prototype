/**
 * Texts Housemate from the command line, through the real inbound webhook,
 * signed the way Twilio signs it (D-009). Nothing goes to Twilio. The web app
 * must be running at PUBLIC_BASE_URL.
 *
 *   pnpm sms "The AC stopped working"
 *   pnpm sms --from "(555) 999-9999" "Who is this?"
 */
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadServerEnv } from "../src/env";
import { formatUsPhone, toE164 } from "../src/phone";
import {
  SIMULATOR_HOUSEMATE_NUMBER,
  simulateInboundSms,
} from "../src/sms/simulate-inbound";

/** The seeded member (scripts/seed-local.ts), so the default text is invited. */
const DEFAULT_FROM = "+15550190001";

try {
  process.loadEnvFile(
    fileURLToPath(new URL("../../../.env.local", import.meta.url)),
  );
} catch {
  // No .env.local. Carry on and let loadServerEnv report what's missing.
}

const env = loadServerEnv();
if (env.APP_ENV === "production") {
  throw new Error("The SMS simulator doesn't run in production.");
}

const { values, positionals } = parseArgs({
  options: { from: { type: "string" } },
  allowPositionals: true,
});

const from = toE164(values.from ?? DEFAULT_FROM);
const body = positionals.join(" ").trim();
if (!from || !body) {
  console.error('Usage: pnpm sms [--from "(555) 019-0001"] "message"');
  process.exit(1);
}

const { status, messageSid } = await simulateInboundSms({
  baseUrl: env.PUBLIC_BASE_URL,
  authToken: env.TWILIO_AUTH_TOKEN,
  from,
  to: env.TWILIO_PHONE_NUMBER ?? SIMULATOR_HOUSEMATE_NUMBER,
  body,
});

console.log(
  `${status === 200 ? "Sent" : "Refused"}: ${messageSid} from ${formatUsPhone(from)} → HTTP ${status}`,
);
if (status !== 200) process.exit(1);
