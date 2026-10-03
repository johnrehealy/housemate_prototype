import type { Mailer } from "./types";

/**
 * Sends nothing, and says so. Everywhere the Apps Script isn't configured —
 * local development, tests, CI and previews — so none of them can email a
 * real person. Ops then shows each let-in link to copy. Local codes never come
 * here: without the Send Email hook, Supabase sends them to Mailpit itself.
 */
export function createOffMailer(): Mailer {
  return {
    name: "off",
    async sendLetIn() {
      return { ok: false, reason: "off" };
    },
    async sendCode() {
      return { ok: false, reason: "off" };
    },
  };
}
