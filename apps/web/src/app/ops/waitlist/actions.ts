"use server";

import { ActionError, letIn, markLetInEmailed } from "@housemate/core/actions";
import { requireStaff } from "@/lib/auth/session";
import { actionContext, mailer, publicBaseUrl } from "@/lib/server-context";

export type LetInResult =
  | { ok: true; signupId: string; emailed: true }
  | {
      ok: true;
      signupId: string;
      emailed: false;
      /** Shown once, for staff to send themselves; only its hash is kept. */
      link: string;
      expiresAt: string;
    }
  | { ok: false; error: string };

/**
 * Lets someone off the waitlist (D-072): puts the email on the alpha list,
 * makes a new Get started link and emails it from john@myhousemate.co. When
 * the email doesn't go, or mail is off, the link comes back to show instead.
 * "Let in" and "Send again" are both this.
 */
export async function letInByEmail(email: string): Promise<LetInResult> {
  const staff = await requireStaff();
  const ctx = actionContext({
    actor: { type: "staff", id: staff.id },
    source: { type: "web" },
  });

  let letInResult;
  try {
    letInResult = await letIn(ctx, { email });
  } catch (error) {
    return { ok: false, error: letInError(error) };
  }

  const link = `${publicBaseUrl()}/get-started/${letInResult.token}`;
  const sent = await mailer().sendLetIn({
    to: letInResult.email,
    firstName: letInResult.firstName,
    link,
    expiresAt: letInResult.expiresAt,
  });

  if (sent.ok) {
    try {
      await markLetInEmailed(ctx, { inviteId: letInResult.inviteId });
    } catch (error) {
      // The email went; only the "Emailed" label is lost.
      console.error("ops: could not record a let-in email", {
        name: error instanceof Error ? error.name : "unknown",
      });
    }
    return { ok: true, signupId: letInResult.signupId, emailed: true };
  }

  if (sent.reason !== "off") {
    // Never the link or the address.
    console.error("ops: the let-in email didn't go", { reason: sent.reason });
  }
  return {
    ok: true,
    signupId: letInResult.signupId,
    emailed: false,
    link,
    expiresAt: letInResult.expiresAt.toISOString(),
  };
}

function letInError(error: unknown): string {
  if (error instanceof ActionError) {
    switch (error.code) {
      case "invalid_input":
        return "Enter an email address.";
      case "conflict":
        return "That email already has a Housemate account.";
      case "member_cap":
        return "The pilot is full, so there’s no place to offer.";
    }
  }
  console.error("ops: could not let someone in", {
    name: error instanceof Error ? error.name : "unknown",
  });
  return "Couldn’t let them in. Try again.";
}
