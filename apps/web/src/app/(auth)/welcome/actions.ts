"use server";

import {
  activateMember,
  optInToTexts,
  sendMessage,
} from "@housemate/core/actions";
import { OPT_IN_CONFIRMATION, SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sessionMember } from "@/lib/auth/session";
import { actionContext } from "@/lib/server-context";
import type { WelcomeState } from "./state";

const TRY_AGAIN = "Something went wrong. Try again.";

/**
 * Finishes an invited member's first sign-in (D-067): records their text
 * consent if they ticked the box, then activates them, and a new consent gets
 * one confirmation text. Ticked or not, this is the only time they're asked.
 */
export async function completeWelcome(
  _previous: WelcomeState,
  formData: FormData,
): Promise<WelcomeState> {
  // The member comes from the session, never the form: this is what makes
  // them active.
  const member = await sessionMember();
  if (!member) redirect("/sign-in");
  // Already done, say in another tab.
  if (member.status === "active") redirect("/chat");
  if (member.status !== "invited" || member.role !== "member") {
    redirect("/sign-in");
  }

  const ticked = formData.get("textConsent");
  if (ticked !== null && ticked !== SMS_OPT_IN.version) {
    return {
      ticked: true,
      consentError: "This page has changed. Reload it and try again.",
    };
  }

  const context = actionContext({
    actor: { type: "member", id: member.id },
    source: { type: "web" },
  });

  let consentAt: Date | undefined;
  try {
    if (ticked !== null) {
      const consent = await optInToTexts(context, {
        memberId: member.id,
        disclosureVersion: SMS_OPT_IN.version,
      });
      if (consent.outcome === "opted_in") consentAt = consent.consentAt;
    }
    await activateMember(context, { memberId: member.id });
  } catch (error) {
    // The box isn't shown again once they're active, so a consent that didn't
    // save stops them here rather than being dropped. Both actions are safe to
    // repeat, so Continue can simply be pressed again.
    console.error("welcome: could not finish", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return { ticked: ticked !== null, error: TRY_AGAIN };
  }

  const { homeId } = member;
  if (consentAt && homeId) {
    // The one text the campaign promises after someone agrees. It goes after
    // the response, so Continue doesn't wait on the provider. The key is this
    // consent's, so a retried request can't send it twice.
    const key = `opt-in:${member.id}:${consentAt.toISOString()}`;
    after(async () => {
      try {
        await sendMessage(
          { ...context, actor: { type: "system" } },
          {
            homeId,
            memberId: member.id,
            kind: "reply",
            author: "system",
            body: OPT_IN_CONFIRMATION,
            idempotencyKey: key,
          },
        );
      } catch (error) {
        // Consent is saved either way; the text is what's missing.
        console.error("welcome: confirmation text failed", {
          name: error instanceof Error ? error.name : "unknown",
        });
      }
    });
  }

  redirect("/chat");
}
