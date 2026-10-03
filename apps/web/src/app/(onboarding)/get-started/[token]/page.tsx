import { completeDetails } from "@housemate/core/actions";
import { getOpenInvite, type OpenInvite } from "@housemate/core/db";
import { TERMS_VERSION } from "@housemate/core/legal";
import { formatUsPhone } from "@housemate/core/phone";
import { SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentMember, homePath } from "@/lib/auth/session";
import { addressLookup, serverDb } from "@/lib/server-context";
import { OnboardingHeader } from "../../_components/onboarding-header";
import {
  GetStartedFlow,
  type Prefill,
  type StartAt,
} from "../_flow/get-started-flow";
import { LinkExpired } from "../_flow/link-expired";

export const metadata: Metadata = {
  title: "Get started",
  // A personal link: never indexed, and never passed on as a referrer.
  robots: { index: false },
  referrer: "no-referrer",
};

/** The details already on the waitlist row, for the steps to start from. */
function prefillFrom(invite: OpenInvite): Prefill {
  const row = invite.signup;
  const address =
    row?.addressLine1 && row.city && row.state && row.zip
      ? {
          line1: row.addressLine1,
          unit: row.addressUnit ?? undefined,
          city: row.city,
          state: row.state,
          zip: row.zip,
          placeId: row.placeId ?? undefined,
        }
      : null;
  return {
    email: invite.email,
    firstName: row?.firstName ?? "",
    lastName: row?.lastName ?? "",
    phone: row?.phone ? formatUsPhone(row.phone) : "",
    address,
  };
}

/**
 * Where "Let’s get started" goes: straight to the code when everything is
 * saved and current, or the first step with something missing. G3 is where
 * the Terms and texts boxes are, so out-of-date agreements start there.
 */
function startFrom(invite: OpenInvite, prefill: Prefill): StartAt {
  if (invite.signup && completeDetails(invite.signup)) return "code";
  if (!prefill.firstName || !prefill.lastName) return 1;
  if (!prefill.address) return 2;
  return 3;
}

/**
 * Get started from a link (D-072): the let-in email's, or the one the page
 * itself moved to once the website path reached the code. A link that never
 * existed, was used or expired shows G6, the same page for each.
 */
export default async function GetStartedLinkPage({
  params,
}: PageProps<"/get-started/[token]">) {
  const member = await currentMember();
  if (member) redirect(homePath(member));

  const { token } = await params;
  const invite = await getOpenInvite(serverDb(), token);
  const prefill = invite ? prefillFrom(invite) : null;

  return (
    <>
      <OnboardingHeader />
      <main className="flex flex-1 flex-col">
        {invite && prefill ? (
          <GetStartedFlow
            token={token}
            emailedLink={invite.delivery === "email"}
            prefill={prefill}
            startAt={startFrom(invite, prefill)}
            lookupEnabled={addressLookup() !== null}
            termsVersion={TERMS_VERSION}
            textsVersion={SMS_OPT_IN.version}
          />
        ) : (
          <LinkExpired />
        )}
      </main>
    </>
  );
}
