import { postToAppsScript, type AppsScriptConfig } from "../apps-script";
import type { Mailer } from "./types";

/**
 * Sends through the same Apps Script as the waitlist alerts, which emails as
 * the account that deployed it (john@myhousemate.co). The script writes the
 * email; this sends only what it needs.
 *
 * Nothing is retried, because the script can't tell a repeat from a new
 * request and a person shouldn't get two emails. A failed let-in email shows
 * on ops with the link to copy; a failed code is asked for again.
 */
export function createAppsScriptMailer(config: AppsScriptConfig): Mailer {
  return {
    name: "apps-script",
    sendLetIn(email) {
      return postToAppsScript(config, {
        event: "member.let_in",
        to: email.to,
        firstName: email.firstName ?? "",
        link: email.link,
        expiresAt: email.expiresAt.toISOString(),
      });
    },
    sendCode(email) {
      return postToAppsScript(
        // Supabase's Send Email hook gives up after five seconds, and a
        // late code is no use to someone waiting for it.
        { ...config, timeoutMs: Math.min(config.timeoutMs ?? 4_500, 4_500) },
        { event: "member.code", to: email.to, code: email.code },
      );
    },
  };
}
