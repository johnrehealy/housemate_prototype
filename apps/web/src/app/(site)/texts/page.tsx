import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { TextConsent } from "@/components/text-consent";
import { Email, Glance, GlanceRow, Masthead } from "../_components/legal/prose";
import { Ribbon } from "../_components/ribbon";
import { SiteFooter } from "../_components/site-footer";

/*
 * What Housemate texts, who gets them, and how to agree (boards L4 and L4n in
 * Paper, page "Legal"; D-067).
 *
 * Members agree on a welcome step that follows their first sign-in, which
 * nobody else can reach. Twilio accepts an opt-in behind a login only if a
 * public page shows it (30921, 30925), so this page draws that step with the
 * live wording, read from the same `SMS_OPT_IN` the step itself uses. It's
 * information only: there's nothing to submit here.
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
    title: "You're invited",
    body: "Housemate is invite-only while we're in alpha. John Healy invites each homeowner and sends them the link to sign in.",
  },
  {
    title: "You sign in",
    body: "Enter your mobile number at myhousemate.co/sign-in, then the one-time code we text you. Sign-in codes are sent whenever you ask for one.",
  },
  {
    title: "The first time, you choose whether to get texts",
    body: "The first time you sign in, and only then, a welcome page asks whether you want texts, with an optional box that starts unticked and the wording shown below. Tick it and press Continue to agree, or press Continue without it. If you agree, we save your agreement with your number, the time and the wording, and send one text to confirm.",
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
 * The welcome step, drawn. The box and the button are pictures rather than
 * controls, so nobody mistakes this page for the place to agree; the wording
 * and the links are the real ones.
 */
function WelcomeSpecimen() {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-xs tracking-wide text-muted uppercase">
        What you&rsquo;ll see the first time you sign in
      </figcaption>
      <div className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <p className="text-[24px] leading-8 tracking-display text-heading">
            Welcome to Housemate
          </p>
          <p className="text-label text-muted">
            You&rsquo;re signed in with (555) 019-0001.
          </p>
        </div>
        <TextConsent
          box={
            <span
              aria-hidden
              className="block size-5 rounded-sm border border-muted bg-surface"
            />
          }
        />
        <p className="flex h-10 items-center justify-center rounded-md bg-evergreen text-label text-on-evergreen">
          Continue
        </p>
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
          lead="Housemate handles your home's repairs, services and errands by text. You tell it what you need, and it texts back with questions, confirmations and reminders. Here's what we send, who gets it, and how to agree."
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
              <WelcomeSpecimen />
              <div className="flex flex-col gap-1">
                <Link
                  href="/sign-in"
                  className="self-start rounded-sm text-label leading-5.5 tracking-normal text-evergreen underline decoration-1 underline-offset-4 transition-[text-decoration-thickness] duration-120 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-evergreen"
                >
                  Go to sign in
                </Link>
                <p className="text-label leading-5.5 tracking-normal text-muted">
                  Not invited yet? Join the waitlist on the home page.
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
                Only invited members who tick the optional box the first time
                they sign in.
              </GlanceRow>
              <GlanceRow label="Sign-in codes">
                Sent whenever you ask for one, whether or not you&rsquo;ve
                agreed to other texts.
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
