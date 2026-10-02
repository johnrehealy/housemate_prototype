import type { ServerEnv } from "../env";
import { createAppsScriptMailer } from "./apps-script-mailer";
import { createOffMailer } from "./off-mailer";
import type { Mailer } from "./types";

/**
 * Picks the mailer for this environment: the Apps Script where its URL and
 * secret are set (production only), and nothing everywhere else.
 */
export function createMailer(
  env: Pick<ServerEnv, "WAITLIST_ALERT_URL" | "WAITLIST_ALERT_SECRET">,
): Mailer {
  const { WAITLIST_ALERT_URL: url, WAITLIST_ALERT_SECRET: secret } = env;
  // loadServerEnv already refuses one without the other.
  if (!url || !secret) return createOffMailer();
  return createAppsScriptMailer({ url, secret });
}
