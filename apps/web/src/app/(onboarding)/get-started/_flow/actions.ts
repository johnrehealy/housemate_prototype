"use server";

import {
  acceptInvite,
  ActionError,
  completeDetails,
  joinWaitlist,
} from "@housemate/core/actions";
import {
  homeTimezone,
  type AddressSuggestion,
  type ResolvedAddress,
} from "@housemate/core/address";
import type { WaitlistJoined } from "@housemate/core/alerts";
import { prepareSignupUser } from "@housemate/core/auth";
import { PILOT_MEMBER_CAP } from "@housemate/core/config";
import {
  countPilotMembers,
  findMemberClash,
  getOpenInvite,
} from "@housemate/core/db";
import { toEmail } from "@housemate/core/email";
import { toE164 } from "@housemate/core/phone";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  actionContext,
  addressLookup,
  serverDb,
  waitlistAlerts,
} from "@/lib/server-context";
import {
  createSupabaseCodeClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type {
  CodeChannel,
  ConfirmCodeResult,
  DetailsInput,
  SendCodeResult,
  SubmitDetailsResult,
} from "./types";

/*
 * Get started's server side (D-072, D-073). Anyone may give their details;
 * only someone on the alpha list, while the pilot has room, gets a code, and
 * the code is what makes the account.
 *
 * What's typed here is a name, a home address, a number and an email, so none
 * of it is ever logged: failures record the call and a code only.
 */

/** Nobody is signed in and no member exists yet, so the system is acting. */
function systemContext() {
  return actionContext({ actor: { type: "system" }, source: { type: "web" } });
}

function logFailure(call: string, error: unknown) {
  console.error(`get-started: ${call} failed`, {
    name: error instanceof Error ? error.name : "unknown",
    code: error instanceof ActionError ? error.code : undefined,
  });
}

/**
 * The address search. On a link, the link must still be open; from the
 * website anyone may search, as anyone may join the waitlist.
 */
async function lookupAllowed(token: string | undefined) {
  return token === undefined || Boolean(await getOpenInvite(serverDb(), token));
}

/** Suggestions for the address typed so far, or null when the search failed. */
export async function suggestAddresses(
  token: string | undefined,
  query: string,
  sessionToken: string,
): Promise<AddressSuggestion[] | null> {
  const lookup = addressLookup();
  const typed = query.trim().slice(0, 200);
  if (!lookup || typed.length < 3 || !(await lookupAllowed(token))) return null;
  try {
    return await lookup.suggest({ query: typed, sessionToken });
  } catch (error) {
    logFailure("address suggestions", error);
    return null;
  }
}

/** The picked suggestion in full, with its map, or null. */
export async function resolveAddress(
  token: string | undefined,
  placeId: string,
  sessionToken: string,
): Promise<ResolvedAddress | null> {
  const lookup = addressLookup();
  if (!lookup || !(await lookupAllowed(token))) return null;
  try {
    return await lookup.resolve({ placeId, sessionToken });
  } catch (error) {
    logFailure("address details", error);
    return null;
  }
}

/**
 * Makes the sign-in account and asks Supabase for the code: a text to the
 * number, or an email when there's none. Supabase never makes an account
 * itself here (`shouldCreateUser: false`); `prepareSignupUser` just did.
 */
async function startCode(input: {
  email: string;
  phone: string | null;
}): Promise<CodeChannel | null> {
  const phone = input.phone ?? undefined;
  try {
    await prepareSignupUser(
      { auth: systemContext().services.auth, db: serverDb() },
      { email: input.email, phone },
    );
  } catch (error) {
    logFailure("making the sign-in account", error);
    return null;
  }

  const { error } = await createSupabaseCodeClient().auth.signInWithOtp(
    phone
      ? { phone, options: { shouldCreateUser: false } }
      : { email: input.email, options: { shouldCreateUser: false } },
  );
  if (error) {
    console.error("get-started: sending a code failed", {
      code: error.code,
      status: error.status,
    });
    return null;
  }
  return phone ? "sms" : "email";
}

/**
 * G3's Continue: saves everything to the waitlist. Someone on the alpha list,
 * while there's room, gets a code and goes on to G4; everyone else sees W1.
 */
export async function submitDetails(
  input: DetailsInput,
): Promise<SubmitDetailsResult> {
  const db = serverDb();
  let email: string | null;
  if (input.token !== undefined) {
    const invite = await getOpenInvite(db, input.token);
    if (!invite) return { status: "link" };
    email = invite.email;
  } else {
    email = toEmail(input.email);
    if (!email) return { status: "invalid", field: "email" };
  }

  const typedPhone = input.phone.trim();
  const phone = typedPhone ? toE164(typedPhone) : undefined;
  if (phone === null) return { status: "invalid", field: "phone" };

  const timezone = homeTimezone(input.address.state, input.browserZone);
  if (!timezone) return { status: "error" };

  let result: Awaited<ReturnType<typeof joinWaitlist>>;
  try {
    result = await joinWaitlist(systemContext(), {
      token: input.token,
      email,
      firstName: input.firstName,
      lastName: input.lastName || undefined,
      phone,
      textsAgreed: Boolean(phone) && input.textsAgreed,
      textsVersion: input.textsVersion,
      termsVersion: input.termsVersion,
      address: input.address,
      timezone,
      replaces: input.replaces,
    });
  } catch (error) {
    logFailure("saving to the waitlist", error);
    return { status: "error" };
  }

  if (result.status === "member") return result;

  if (result.status === "waitlisted") {
    if (result.isNew) alertTeam(result);
    return {
      status: "waitlisted",
      firstName: input.firstName.trim(),
      email: result.email,
      entry: result.signupId,
    };
  }

  const channel = await startCode({ email, phone: phone ?? null });
  if (!channel) return { status: "error" };
  return { status: "code", token: result.token, channel };
}

/**
 * A new entry alerts the team (an email and a row in the owner's Google
 * Sheet), after the page has answered, so a slow or failed alert never holds
 * up or fails the person's signup. The waitlist in Supabase is the record.
 */
function alertTeam(signup: WaitlistJoined) {
  const { signupId, email, joinedAt } = signup;
  after(async () => {
    const outcome = await waitlistAlerts().joined({
      signupId,
      email,
      joinedAt,
    });
    if (!outcome.ok) {
      // The signup ID, never the address: it finds the row in Supabase.
      console.error("waitlist: alert failed", {
        signupId,
        reason: outcome.reason,
      });
    }
  });
}

/**
 * G0 on a link whose details are already saved, and "Send again" on G4: sends
 * a code to the saved number, or the saved email when there's none.
 */
export async function sendCode(token: string): Promise<SendCodeResult> {
  const db = serverDb();
  const invite = await getOpenInvite(db, token);
  if (!invite) return { status: "link" };
  const details = invite.signup && completeDetails(invite.signup);
  if (!details) return { status: "stale" };

  const clash = await findMemberClash(db, {
    email: details.email,
    phone: details.phone ?? undefined,
  });
  if (clash.email) return { status: "member", field: "email" };
  if (clash.phone) return { status: "member", field: "phone" };
  if ((await countPilotMembers(db)) >= PILOT_MEMBER_CAP) {
    return { status: "pilot_full" };
  }

  const channel = await startCode(details);
  return channel ? { status: "sent", channel } : { status: "error" };
}

/**
 * G4: checks the code, then makes the member, their home and their texts
 * agreement from the saved details, in one go. Success goes on into the app.
 */
export async function confirmCode(
  token: string,
  code: string,
): Promise<ConfirmCodeResult> {
  const db = serverDb();
  const invite = await getOpenInvite(db, token);
  if (!invite) return { status: "link" };
  const details = invite.signup && completeDetails(invite.signup);
  if (!details) return { status: "stale" };

  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return { status: "wrong_code" };

  // Checked without signing in: the session is only kept once the member
  // exists, so nothing below that fails leaves one behind.
  const { data, error } = await createSupabaseCodeClient().auth.verifyOtp(
    details.phone
      ? { phone: details.phone, token: digits, type: "sms" }
      : { email: details.email, token: digits, type: "email" },
  );
  if (error || !data.user || !data.session) return { status: "wrong_code" };
  const userId = data.user.id;
  const session = data.session;

  const ctx = systemContext();
  let joined: Awaited<ReturnType<typeof acceptInvite>>;
  try {
    joined = await acceptInvite(ctx, {
      token,
      userId,
      proof: details.phone
        ? { channel: "sms", phone: details.phone }
        : { channel: "email", email: details.email },
    });
  } catch (error) {
    if (error instanceof ActionError) {
      if (error.code === "stale_details") return { status: "stale" };
      if (error.code === "member_cap") return { status: "pilot_full" };
      if (error.code === "not_found") return { status: "link" };
      // Used or expired since the check above, or a number or email that
      // became a member's in the meantime.
      if (error.code === "conflict" && !(await getOpenInvite(db, token))) {
        return { status: "link" };
      }
    }
    logFailure("creating the account", error);
    return { status: "error" };
  }

  // Only a proven email goes on the sign-in account (D-073): one the link
  // was emailed to, or the code was.
  if (joined.emailProven && details.phone) {
    try {
      await ctx.services.auth.setEmail(userId, joined.email);
    } catch (error) {
      // The member exists and signs in by number; the email can follow.
      logFailure("adding the email to the sign-in account", error);
    }
  }

  const supabase = await createSupabaseServerClient();
  const signedIn = await supabase.auth.setSession(session);
  if (signedIn.error) {
    // The account is made, so they can sign in themselves.
    logFailure("signing in the new member", signedIn.error);
    redirect("/sign-in");
  }
  redirect("/chat");
}
