import { TERMS_VERSION } from "@housemate/core/legal";
import { SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentMember, homePath } from "@/lib/auth/session";
import { addressLookup } from "@/lib/server-context";
import { OnboardingHeader } from "../_components/onboarding-header";
import { GetStartedFlow } from "./_flow/get-started-flow";

export const metadata: Metadata = {
  title: "Get started",
  description:
    "Join the Housemate waitlist: tell us your name, your home and how to reach you.",
};

/**
 * Get started from the website (D-072): anyone can give their details. Someone
 * on the alpha list goes on to a code and an account; everyone else is on the
 * waitlist.
 */
export default async function GetStartedPage() {
  const member = await currentMember();
  if (member) redirect(homePath(member));

  return (
    <>
      <OnboardingHeader />
      <main className="flex flex-1 flex-col">
        <GetStartedFlow
          prefill={{
            email: "",
            firstName: "",
            lastName: "",
            phone: "",
            address: null,
          }}
          startAt={1}
          lookupEnabled={addressLookup() !== null}
          termsVersion={TERMS_VERSION}
          textsVersion={SMS_OPT_IN.version}
        />
      </main>
    </>
  );
}
