import { SMS_OPT_IN } from "@housemate/core/sms/opt-in";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { TermsRow, TextsBox } from "@/components/onboarding/consent-boxes";
import { INSET_BOX, INSET_LABEL } from "@/components/onboarding/controls";
import { Email, Glance, GlanceRow, Masthead } from "../_components/legal/prose";
import { Ribbon } from "../_components/ribbon";
import { SiteFooter } from "../_components/site-footer";

/*
 * What Housemate texts, who gets them, and how to agree (boards L4 and L4n in
 * Paper, page "Legal"; D-067, updated by D-074).
 *
 * Members agree on Get started's contact step, with a box that appears once a
 * mobile number is typed. Twilio wants the opt-in shown publicly (30921,
 * 30925), so this page draws that step with the live wording, read from the
 * same `SMS_OPT_IN` Get started uses. It's information only: there's nothing
 * to submit here.
 */

const DESCRIPTION =
  "What Housemate texts, who gets them, and how members agree to receive them.";

export const metadata: Metadata = {
  title: "Texts",
  description: DESCRIPTION,
  openGraph: {
    title: "Texts · Housemate",
    description: DESCRIPTION,
    siteName: "Housemate",
    type: "website",
  },
};

const STEPS = [
  {
    title: "You join the waitlist",
    body: "Housemate is invite-only while we’re in alpha. Choose Join the waitlist on the home page, add your name, home address and email, and agree to the Terms. A mobile number is optional.",
  },
  {
    title: "You choose whether to get texts",
    body: `If you add a mobile number, a separate box appears below the Terms box: “${SMS_OPT_IN.label}”, with what you’re agreeing to written under it (shown below). It starts unticked, and you can join without ticking it. If you tick it, we record your number, the time and the wording you saw.`,
  },
  {
    title: "We email you when there’s a place",
    body: "When a spot opens up, John Healy emails you a link to finish setting up. It’s yours alone, works once, and expires after 14 days.",
  },
  {
    title: "You confirm it’s you",
    body: "We send a one-time code to your mobile number, or to your email if you didn’t add one. A code never signs you up for other texts. If you agreed to texts, the last step invites you to text your housemate, and our first reply confirms your agreement and how to stop.",
  },
] as const;

/** A column of the body: stacked below xl, side by side from it. */
function Column({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full max-w-[560px] min-w-0 flex-col xl:flex-1">
      {children}
    </div>
  );
}

/**
 * Get started's contact step (G3) once a number is typed, drawn. The boxes are
 * pictures rather than controls, so nobody mistakes this page for the place
 * to agree; the wording is the real one.
 */
function GetStartedSpecimen() {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-xs tracking-wide text-muted uppercase">
        What you&rsquo;ll see when you add a mobile number
      </figcaption>
      <div className="relative rounded-lg border border-line bg-canvas p-4 sm:p-6">
        <p className="absolute -top-[11px] right-5 flex h-[22px] items-center rounded-full border border-surface bg-status-idle-bg px-2 text-2xs tracking-wide text-status-idle-fg uppercase">
          Example
        </p>
        <div className="flex flex-col gap-4">
          <div className={`${INSET_BOX} border-line-field bg-surface`}>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className={`${INSET_LABEL} text-muted`}>
                Mobile number (optional)
              </p>
              <p className="text-lead leading-6 text-heading">(555) 019-0003</p>
            </div>
          </div>
          <TermsRow />
          <TextsBox />
        </div>
      </div>
    </figure>
  );
}

export default function TextsPage() {
  return (
    <>
      <Ribbon page="inner" />
      <main>
        <Masthead
          title="Texts from Housemate"
          lead="Housemate handles your home’s repairs, services and errands by text. You tell it what you need, and it texts back with questions, confirmations and reminders. Here’s what we send, who gets it, and how to agree."
          leadWidth={560}
        />
        <div className="flex flex-col gap-14 px-6 pt-10 pb-16 lg:px-30 lg:pt-16 lg:pb-30 xl:flex-row xl:items-start xl:justify-between xl:gap-16">
          <Column>
            <section
              aria-labelledby="how-to-agree"
              className="flex flex-col gap-7"
            >
              <h2
                id="how-to-agree"
                className="font-serif text-[26px] leading-[34px] tracking-tight text-evergreen"
              >
                How to agree to texts
              </h2>
              <ol className="flex flex-col gap-5">
                {STEPS.map(({ title, body }, index) => (
                  <li key={title} className="flex items-start gap-4">
                    <span
                      aria-hidden
                      className="w-7 shrink-0 font-serif text-[20px] leading-[26px] text-evergreen"
                    >
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-base font-bold text-heading">
                        {title}
                      </p>
                      <p className="text-label leading-5.5 tracking-normal text-body">
                        {body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <GetStartedSpecimen />
              <div className="flex flex-col gap-1">
                <Link
                  href="/sign-in"
                  className="self-start rounded-sm text-label leading-5.5 tracking-normal text-evergreen underline decoration-1 underline-offset-4 transition-[text-decoration-thickness] duration-120 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
                >
                  Go to sign in
                </Link>
                <p className="text-label leading-5.5 tracking-normal text-muted">
                  Not a member yet?{" "}
                  <Link
                    href="/get-started"
                    className="rounded-sm text-evergreen underline decoration-1 underline-offset-4 transition-[text-decoration-thickness] duration-120 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
                  >
                    Join the waitlist
                  </Link>
                  .
                </p>
              </div>
            </section>
          </Column>

          <Column>
            <Glance title="How Housemate texts" level={2}>
              <GlanceRow label="Who sends them">
                Housemate, operated by John Healy (sole proprietor).
              </GlanceRow>
              <GlanceRow label="What we send">
                Replies to your requests, reminders you ask for, appointment
                updates, and follow-ups on bookings and payments. Never
                marketing.
              </GlanceRow>
              <GlanceRow label="Who gets them">
                Only members who tick &ldquo;{SMS_OPT_IN.label}&rdquo; when they
                join. Texting is optional.
              </GlanceRow>
              <GlanceRow label="One-time codes">
                Sent to confirm your number when you set up your account, and
                when you sign in. Without a number, codes come by email. A code
                doesn&rsquo;t sign you up for other texts.
              </GlanceRow>
              <GlanceRow label="How often">
                Message frequency varies with how you use Housemate. No
                unprompted texts from 9:00 PM to 7:30 AM.
              </GlanceRow>
              <GlanceRow label="Cost">
                Message and data rates may apply.
              </GlanceRow>
              <GlanceRow label="To stop">Reply STOP at any time.</GlanceRow>
              <GlanceRow label="For help">
                Reply HELP, or email <Email />.
              </GlanceRow>
              <GlanceRow label="Your number">
                We do not share, sell, or provide your mobile phone number or
                messaging consent data to third parties or affiliates for
                marketing or promotional purposes.
              </GlanceRow>
            </Glance>
          </Column>
        </div>
      </main>
      <SiteFooter current="texts" />
    </>
  );
}
