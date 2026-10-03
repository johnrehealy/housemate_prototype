"use server";

import { readSignInIdentifier } from "@housemate/core";
import { activateMember } from "@housemate/core/actions";
import { getMemberByUserId } from "@housemate/core/db";
import { redirect } from "next/navigation";
import { homePath } from "@/lib/auth/session";
import { actionContext, serverDb } from "@/lib/server-context";
import {
  createSupabaseCodeClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { WRONG_CODE, type SignInState } from "./state";

/**
 * Signs in with a code (D-073): texted to a mobile number, or emailed. Members
 * get their account from Get started; sign-in never makes one and never asks
 * anything else.
 *
 * A number or email with no account goes to the same code step as a real one,
 * and nothing is sent, so the page can't be used to find members.
 */
export async function signIn(
  previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const intent = formData.get("intent");

  if (previous.step === "code") {
    if (intent === "restart") {
      return { step: "who", identifier: previous.identifier };
    }
    if (intent === "resend") {
      const error = await requestCode(previous.channel, previous.to);
      return error
        ? { ...previous, error }
        : { ...previous, error: undefined, sends: previous.sends + 1 };
    }
    return checkCode(previous, String(formData.get("code") ?? ""));
  }

  const identifier = String(formData.get("identifier") ?? "").trim();
  const who = readSignInIdentifier(identifier);
  if (!who) {
    return {
      step: "who",
      identifier,
      error: "Enter your mobile number or email.",
    };
  }
  const channel = who.kind === "email" ? "email" : "sms";
  const to = who.kind === "email" ? who.email : who.phone;
  const error = await requestCode(channel, to);
  if (error) return { step: "who", identifier, error };
  return { step: "code", identifier, channel, to, sends: 1 };
}

/** Asks Supabase for a code. A message to show, or undefined once it's sent. */
async function requestCode(
  channel: "sms" | "email",
  to: string,
): Promise<string | undefined> {
  const { error } = await createSupabaseCodeClient().auth.signInWithOtp(
    // Signing in never makes an account.
    channel === "sms"
      ? { phone: to, options: { shouldCreateUser: false } }
      : { email: to, options: { shouldCreateUser: false } },
  );

  // A number or email with no account is refused as "otp_disabled", and has
  // to look exactly like success.
  if (!error || error.code === "otp_disabled") return undefined;
  console.error("sign-in: could not send a code", {
    channel,
    code: error.code,
    status: error.status,
  });
  return "We couldn’t send a code just now. Try again in a moment.";
}

async function checkCode(
  state: Extract<SignInState, { step: "code" }>,
  input: string,
): Promise<SignInState> {
  const token = input.replace(/\D/g, "");
  const wrong = { ...state, error: WRONG_CODE };
  if (token.length !== 6) return wrong;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp(
    state.channel === "sms"
      ? { phone: state.to, token, type: "sms" }
      : { email: state.to, token, type: "email" },
  );
  if (error || !data.user) return wrong;

  const member = await getMemberByUserId(serverDb(), data.user.id);
  if (!member) {
    // A Get started that stopped before the code was confirmed. They've just
    // proven the number or email, so saying so gives nothing away.
    await supabase.auth.signOut({ scope: "local" });
    return {
      step: "who",
      identifier: state.identifier,
      error:
        "There’s no account for that yet. Finish setting up from the Get started link we emailed you.",
    };
  }

  try {
    // Activates staff on their first sign-in, leaves active members as they
    // are, and turns away anyone removed.
    await activateMember(
      actionContext({
        actor: {
          type: member.role === "staff" ? "staff" : "member",
          id: member.id,
        },
        source: { type: "web" },
      }),
      { memberId: member.id },
    );
  } catch {
    await supabase.auth.signOut({ scope: "local" });
    return {
      step: "who",
      identifier: state.identifier,
      error: "This account can’t sign in. Get in touch and we’ll sort it out.",
    };
  }

  redirect(homePath(member));
}
