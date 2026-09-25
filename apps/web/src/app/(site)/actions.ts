"use server";

import { after } from "next/server";
import { joinWaitlist } from "@housemate/core/actions";
import type { WaitlistJoined } from "@housemate/core/alerts";
// From the email module, not the package barrel: the barrel reaches the Twilio
// SDK, and this file is the one a public page posts to.
import { toEmail } from "@housemate/core/email";
import { actionContext, waitlistAlerts } from "@/lib/server-context";
import type { WaitlistState } from "./state";

/**
 * Puts an address on the waitlist (D-061). This is the only write a signed-out
 * visitor can cause, so it does as little as possible: no account, no session,
 * no text.
 *
 * A new address also alerts the team (an email and a row in the owner's
 * Google Sheet). That happens after the page has answered, so a slow or
 * failed alert never holds up or fails the signup. The list in Supabase is the
 * record either way.
 */
export async function submitWaitlist(
  _previous: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const typed = String(formData.get("email") ?? "");
  if (!toEmail(typed)) {
    return { status: "idle", error: "Enter an email address." };
  }

  let joined: WaitlistJoined | undefined;
  try {
    const result = await joinWaitlist(
      // Nobody is signed in and no member exists yet, so the system is acting.
      actionContext({ actor: { type: "system" }, source: { type: "web" } }),
      { email: typed },
    );
    // Only a new address: joining again changes nothing, so it says nothing.
    if (result.joined) {
      const { signupId, email, joinedAt } = result;
      joined = { signupId, email, joinedAt };
    }
  } catch (error) {
    // The address never reaches the log: it's the only personal data this page
    // holds, and a failure is just as debuggable without it.
    console.error("waitlist: could not save a signup", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return {
      status: "idle",
      error: "We couldn't save that just now. Try again in a moment.",
    };
  }

  if (joined) {
    const signup = joined;
    after(async () => {
      const outcome = await waitlistAlerts().joined(signup);
      if (!outcome.ok) {
        // The signup ID, never the address: it finds the row in Supabase.
        console.error("waitlist: alert failed", {
          signupId: signup.signupId,
          reason: outcome.reason,
        });
      }
    });
  }

  // The same answer whether the address was new or already on the list, so
  // this page can't be used to find out who has signed up.
  return { status: "joined" };
}
