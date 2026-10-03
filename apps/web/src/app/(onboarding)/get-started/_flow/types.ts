/**
 * What Get started's server actions take and return (D-072, D-073). Kept out
 * of actions.ts: a "use server" file may only export async functions.
 */

/** G2's answer: picked from the search, or typed. */
export type HomeAddress = {
  line1: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  /** Only for a picked address. */
  placeId?: string;
};

/** Where a code goes: a text when there's a number, an email when not. */
export type CodeChannel = "sms" | "email";

/** G3's Continue: everything Get started asks for. */
export type DetailsInput = {
  /** The link the page was opened from, if any. Its email is the one used. */
  token?: string;
  /** Ignored on a link, where the email is the invite's. */
  email: string;
  firstName: string;
  lastName: string;
  /** As typed. Blank for no number. */
  phone: string;
  textsAgreed: boolean;
  /** The versions the page showed, so a stale page can't agree to new words. */
  textsVersion: string;
  termsVersion: string;
  address: HomeAddress;
  /** The browser's own zone, which settles states with two clocks. */
  browserZone?: string;
  /**
   * The entry W1 showed, when the person went back to fix their email. It
   * takes the new email, rather than staying behind under the mistyped one.
   */
  replaces?: string;
};

/** The link can't be used any more. The page then shows G6. */
type LinkGone = { status: "link" };
type Failed = { status: "error" };
/** The email or number already belongs to a member (G7 states 1 and 2). */
type Member = { status: "member"; field: "email" | "phone" };

export type SubmitDetailsResult =
  | LinkGone
  | Failed
  | Member
  | { status: "invalid"; field: "email" | "phone" }
  /** W1. `entry` is sent back as `replaces` if they change their email. */
  | { status: "waitlisted"; firstName: string; email: string; entry: string }
  /** G4, with the link the code confirms against. */
  | { status: "code"; token: string; channel: CodeChannel };

export type SendCodeResult =
  | LinkGone
  | Failed
  | Member
  /** The saved details are missing or out of date: back through G3. */
  | { status: "stale" }
  | { status: "pilot_full" }
  | { status: "sent"; channel: CodeChannel };

/** Success redirects, so only failures come back. */
export type ConfirmCodeResult =
  | LinkGone
  | Failed
  | { status: "stale" }
  | { status: "pilot_full" }
  | { status: "wrong_code" };
