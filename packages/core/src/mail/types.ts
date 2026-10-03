import type { AppsScriptResult } from "../apps-script";

/** What became of an email. `reason` never contains the link or the code. */
export type MailResult = AppsScriptResult;

/** E1: someone was let off the waitlist (D-072). */
export type LetInEmail = {
  to: string;
  /** Absent for entries from the old email bar, which have only an email. */
  firstName?: string;
  /** The Get started link. Never logged. */
  link: string;
  expiresAt: Date;
};

/** E2: a sign-in or Get started code for someone with no number (D-073). */
export type CodeEmail = {
  to: string;
  /** Never logged. */
  code: string;
};

/**
 * Sends Housemate's emails, from john@myhousemate.co. Behind this interface
 * so the sender can change without touching the flows (invariant 5).
 *
 * Neither method throws: the caller decides what a failed email means. Ops
 * shows a failed let-in link to copy instead; a failed code fails the code's
 * request, so the person can ask again.
 */
export interface Mailer {
  readonly name: "apps-script" | "off";
  sendLetIn(email: LetInEmail): Promise<MailResult>;
  sendCode(email: CodeEmail): Promise<MailResult>;
}
