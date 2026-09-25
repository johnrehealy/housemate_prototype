/** A new address on the waitlist, as stored. */
export type WaitlistJoined = {
  signupId: string;
  email: string;
  joinedAt: Date;
};

/**
 * What became of an alert. `reason` is a short code for the log, and never
 * contains the address.
 */
export type AlertResult = { ok: true } | { ok: false; reason: string };

/**
 * Tells the team that someone joined the waitlist: for now an email and a row
 * in the owner's Google Sheet, through an Apps Script attached to the sheet
 * (`scripts/waitlist-alerts`), until the ops app has a waitlist page.
 */
export interface WaitlistAlerts {
  readonly name: "apps-script" | "off";
  /** Never throws: a failed alert must not fail the signup that caused it. */
  joined(signup: WaitlistJoined): Promise<AlertResult>;
}
