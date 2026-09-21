"use server";

import { toE164 } from "@housemate/core";
import { activateMember } from "@housemate/core/actions";
import { getMemberByUserId } from "@housemate/core/db";
import { redirect } from "next/navigation";
import { actionContext, serverDb } from "@/lib/server-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INITIAL_SIGN_IN_STATE, type SignInState } from "./state";

/**
 * The same answer whether or not the number is invited. Housemate is
 * invite-only, so saying "that number isn't invited" would turn this page into
 * a way of finding out who is in the pilot.
 */
const CODE_SENT = "If that number is invited, a code is on its way.";

export async function submitSignIn(
  previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (formData.get("restart") !== null) return INITIAL_SIGN_IN_STATE;

  const code = String(formData.get("code") ?? "").trim();
  if (previous.step === "code" && previous.phone) {
    if (!code) {
      return { ...previous, error: "Enter the code we texted you." };
    }
    return verifyCode(previous.phone, code);
  }

  return requestCode(String(formData.get("phone") ?? ""));
}

async function requestCode(input: string): Promise<SignInState> {
  const phone = toE164(input);
  if (!phone) {
    return { step: "phone", error: "Enter a 10-digit mobile number." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    // Inviting is what creates an account. Signing in never makes one.
    options: { shouldCreateUser: false },
  });

  // "Signups not allowed" just means the number isn't invited, which the
  // member must not be told apart from success.
  if (error && error.code !== "otp_disabled") {
    // Everyone sees the same message, so record the real reason for the team.
    // The code and status are enough to debug it; the number isn't.
    console.error("sign-in: could not send a code", {
      code: error.code,
      status: error.status,
    });
    return {
      step: "phone",
      error: "We couldn't send a code just now. Try again in a moment.",
    };
  }

  return { step: "code", phone, notice: CODE_SENT };
}

async function verifyCode(phone: string, token: string): Promise<SignInState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error || !data.user) {
    return {
      step: "code",
      phone,
      error: "That code didn't work. Check it and try again.",
    };
  }

  const member = await getMemberByUserId(serverDb(), data.user.id);
  if (!member) {
    await supabase.auth.signOut();
    return { step: "phone", error: "That number isn't set up yet." };
  }

  try {
    // Signing in is what activates an invited member.
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
    await supabase.auth.signOut();
    return {
      step: "phone",
      error: "That number can't sign in. Get in touch and we'll sort it out.",
    };
  }

  redirect("/chat");
}
