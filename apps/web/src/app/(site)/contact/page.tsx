import type { Metadata } from "next";
import type { ReactNode } from "react";
import { A, Email, Masthead } from "../_components/legal/prose";
import { Ribbon } from "../_components/ribbon";
import { SiteFooter } from "../_components/site-footer";

/*
 * How to reach Housemate (board L3 in Paper, page "Legal").
 *
 * It's a page, not a form, on purpose: every route is an email link or an
 * instruction, so it adds no write path, no storage and nothing to spam. No
 * texting number is listed either. Housemate is invite-only, a number that
 * isn't invited gets only the invite-only reply (D-050), and members already
 * have the number in their thread.
 */

const DESCRIPTION =
  "How to reach Housemate: members, privacy requests, the waitlist, and vendors, partners and press.";

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  openGraph: {
    title: "Contact · Housemate",
    description: DESCRIPTION,
    siteName: "Housemate",
    type: "website",
  },
};

const BODY = "text-base leading-6.5 text-body sm:text-lead sm:leading-7";

/**
 * One way in: its audience in serif on the left, what to do on the right.
 * They sit side by side from xl, with the legal pages' 260 and 660 columns;
 * below that the audience heads its own block.
 */
function Route({
  id,
  title,
  last = false,
  children,
}: {
  id: string;
  title: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col gap-4 py-10 sm:py-12 xl:flex-row xl:gap-[min(160px,calc(100vw_-_1160px))] ${
        last ? "pb-0 sm:pb-0" : "border-b border-line"
      }`}
    >
      <h2
        id={id}
        className="font-serif text-[26px] leading-[34px] tracking-tight text-evergreen xl:w-[260px] xl:shrink-0"
      >
        {title}
      </h2>
      <div className="flex max-w-(--container-thread) min-w-0 flex-1 flex-col gap-6">
        {children}
      </div>
    </section>
  );
}

/**
 * A bold line saying what it's for, and then how. The line is a lead-in, not a
 * heading: on the public site every heading is the serif (docs/design.md §1).
 */
function Way({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-base font-bold text-heading sm:text-lead sm:font-bold">
        {title}
      </p>
      {children}
    </div>
  );
}

export default function ContactPage() {
  return (
    <>
      <Ribbon page="inner" />
      <main>
        <Masthead
          title="Get in touch"
          lead="Housemate is run by a small team, and a person reads everything you send. Here's the fastest way to reach us."
          leadWidth={560}
        />
        <div className="px-6 pt-2 pb-16 lg:px-30 lg:pt-4 lg:pb-24">
          <Route id="members" title="Members">
            <Way title="Text your Housemate number">
              <p className={BODY}>
                It&rsquo;s the quickest way to get anything done. Text HELP at
                any time for help, or STOP to stop texts.
              </p>
            </Way>
            <Way title="Email for anything you'd rather not text">
              <p className={BODY}>
                <Email />
              </p>
            </Way>
          </Route>

          <Route id="privacy" title="Privacy and your data">
            <div className="flex flex-col gap-1">
              <p className={BODY}>
                To see, correct or delete what we hold, or to stop texts in
                writing, email <Email subject="Privacy" /> with
                &ldquo;Privacy&rdquo; in the subject. We&rsquo;ll confirm
                it&rsquo;s you and reply within 45 days, usually much sooner.
              </p>
              <p className={BODY}>
                <A href="/privacy">Read our Privacy Policy</A>
              </p>
            </div>
          </Route>

          <Route id="everyone-else" title="Everyone else">
            <Way title="Want to try Housemate?">
              <p className={BODY}>
                It&rsquo;s invite-only while we&rsquo;re in alpha. We&rsquo;ll
                be in touch when there&rsquo;s room.
              </p>
              <p className={BODY}>
                <A href="/#waitlist">Join the waitlist</A>
              </p>
            </Way>
            <Way title="Vendors, partners and press">
              <p className={BODY}>
                <Email />
              </p>
            </Way>
          </Route>

          <Route id="emergencies" title="Emergencies" last>
            <div className="flex flex-col gap-1 rounded-lg bg-status-action-bg px-5 py-4 text-status-action-fg sm:px-6 sm:py-5">
              <p className="text-base font-bold sm:text-lead sm:font-bold">
                Housemate is not an emergency service.
              </p>
              <p className="text-base leading-6.5 sm:text-lead sm:leading-7">
                If you smell gas, see an electrical hazard, have flooding or a
                break-in, call 911 or your utility right away.
              </p>
            </div>
            <p className="pt-2 text-label leading-5.5 text-muted">
              Housemate is operated by John Healy, a sole proprietor based in
              Georgia.
            </p>
          </Route>
        </div>
      </main>
      <SiteFooter current="contact" />
    </>
  );
}
