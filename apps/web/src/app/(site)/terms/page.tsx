import type { Metadata } from "next";
import {
  A,
  B,
  Bullet,
  Bullets,
  Email,
  Glance,
  GlanceRow,
  LegalDocument,
  Masthead,
  Note,
  P,
  Preamble,
  Section,
  Subsection,
  Summary,
  SummaryPoint,
} from "../_components/legal/prose";
import { outline } from "../_components/legal/outline";
import { Ribbon } from "../_components/ribbon";
import { SiteFooter } from "../_components/site-footer";

/*
 * The terms of service, laid out like the privacy policy (board L1). Section 5
 * holds the messaging program's terms, which Twilio's reviewers check the same
 * way they check the privacy policy's Section 2.
 *
 * Change the dates whenever the text changes. Section 16 promises that.
 */
const EFFECTIVE = "September 25, 2026";

const DESCRIPTION =
  "The agreement between you and Housemate: what Housemate does for you, the limits you control, texting, payments, and your rights.";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: DESCRIPTION,
  openGraph: {
    title: "Terms of Service · Housemate",
    description: DESCRIPTION,
    siteName: "Housemate",
    type: "website",
  },
};

const { items, section } = outline([
  ["who-can-use", "Who can use Housemate"],
  ["what-housemate-does", "What Housemate does"],
  ["acting-for-you", "Acting on your behalf"],
  ["vendors", "Vendors and service providers"],
  ["text-messaging", "Text messaging terms"],
  ["payments", "Payments"],
  ["home-security", "Your home's security"],
  ["ai-assistant", "The AI assistant"],
  ["acceptable-use", "Acceptable use"],
  ["account", "Your account"],
  ["your-content", "Your content"],
  ["ending", "Ending your use of Housemate"],
  ["disclaimers", "Disclaimers"],
  ["liability", "Limitation of liability"],
  ["disputes", "Disputes"],
  ["changes", "Changes to these terms"],
  ["general", "General"],
  ["contact", "Contact us"],
]);

export default function TermsPage() {
  return (
    <>
      <Ribbon page="inner" />
      <main>
        <Masthead
          title="Terms of Service"
          effective={EFFECTIVE}
          lead="These terms are the agreement between you and Housemate. We've written them to be read, not skimmed past."
        />
        <LegalDocument sections={items}>
          <Summary>
            <SummaryPoint title="Housemate acts for you, with limits you control.">
              We contact vendors, book appointments and run errands on your
              behalf. Anything that costs money waits for your explicit yes.
            </SummaryPoint>
            <SummaryPoint title="Vendors do the work, and they're independent.">
              Housemate arranges it; the plumber, the electrician or the dry
              cleaner is responsible for their own work.
            </SummaryPoint>
            <SummaryPoint title="It's an early release.">
              Housemate is invite-only and still being built. Things will
              change, and some things won&rsquo;t work perfectly.
            </SummaryPoint>
            <SummaryPoint title="Texting is the main way it works.">
              Reply STOP at any time to stop texts. Section 5 has the full
              texting terms.
            </SummaryPoint>
          </Summary>

          <Preamble>
            <P>
              Housemate is operated by John Healy, a sole proprietor based in
              Georgia. &ldquo;Housemate,&rdquo; &ldquo;we,&rdquo;
              &ldquo;us&rdquo; and &ldquo;our&rdquo; mean John Healy, operating
              the Housemate service, the website at myhousemate.co and the
              Housemate text-messaging number. &ldquo;You&rdquo; means the
              person using Housemate.
            </P>
            <P>
              Our <A href="/privacy">Privacy Policy</A> explains how we handle
              your information and is part of these terms. By using Housemate,
              you agree to these terms. If you don&rsquo;t agree, please
              don&rsquo;t use Housemate.
            </P>
          </Preamble>

          <Section {...section("who-can-use")}>
            <P>To use Housemate, you must:</P>
            <Bullets>
              <Bullet>be at least 18 years old;</Bullet>
              <Bullet>
                have been invited by us (Housemate is invite-only while in
                alpha);
              </Bullet>
              <Bullet>
                live in the United States, and use Housemate for a home in the
                United States; and
              </Bullet>
              <Bullet>
                own the home, or otherwise have the authority to arrange
                repairs, services and visits there.
              </Bullet>
            </Bullets>
            <P>
              You agree that the information you give us about yourself and your
              home is accurate, and that you&rsquo;ll keep it up to date.
            </P>
          </Section>

          <Section {...section("what-housemate-does")}>
            <P>
              Housemate is a home-management service. You tell it what your home
              needs, by text or in the web app, and it works to get it done:
              setting reminders, researching and booking service providers,
              following up, keeping records of your home, and arranging errands
              that our local team handles in person.
            </P>
            <P>
              <B>It&rsquo;s an alpha.</B> Housemate is an early, invite-only
              release for a small number of homes. Features may be added,
              changed or removed, and the service may sometimes be unavailable
              or make mistakes. We&rsquo;ll tell you about changes that matter
              to you.
            </P>
            <P>
              <B>The web app is your record.</B> Everything Housemate does for
              you is shown in the web app, where you can review it and correct
              it. Corrections are kept as history.
            </P>
          </Section>

          <Section {...section("acting-for-you")}>
            <Subsection title="3.1 What you authorize">
              <P>
                By asking Housemate to handle something, you authorize us to act
                on your behalf to do it. That includes:
              </P>
              <Bullets>
                <Bullet>
                  contacting vendors and service providers by phone, text, email
                  or their websites;
                </Bullet>
                <Bullet>
                  sharing the information about you and your home that a vendor
                  needs, such as your name, phone number, address and a
                  description of the problem;
                </Bullet>
                <Bullet>
                  booking, rescheduling and cancelling appointments; and
                </Bullet>
                <Bullet>
                  filling in forms and accepting a vendor&rsquo;s standard
                  booking terms where a booking requires it.
                </Bullet>
              </Bullets>
              <P>
                You can limit or withdraw this authority at any time, for a
                single task or in general, by telling us.
              </P>
            </Subsection>

            <Subsection title="3.2 Money waits for your yes">
              <P>
                Housemate acts on its own, <B>except</B> for anything that
                involves, or could involve, a payment or fee. That includes
                deposits, service charges, cancellation or no-show fees, and
                accepting a quote. Before any of these, we tell you what it will
                cost and wait for your clear, explicit confirmation. This rule
                is enforced by our software, not only by the assistant&rsquo;s
                instructions.
              </P>
              <P>
                If a vendor&rsquo;s terms include a fee that could apply later,
                such as a cancellation fee, we&rsquo;ll tell you before we
                accept them.
              </P>
            </Subsection>

            <Subsection title="3.3 Your responsibilities">
              <Bullets>
                <Bullet>
                  <B>Check what matters.</B> Review bookings and records in the
                  web app, and tell us if something is wrong.
                </Bullet>
                <Bullet>
                  <B>Be reachable.</B> Some steps, such as a CAPTCHA, a login or
                  a vendor&rsquo;s question, may need you.
                </Bullet>
                <Bullet>
                  <B>Be there, or arrange access.</B> You&rsquo;re responsible
                  for giving vendors and our team safe access to your home when
                  a visit is booked.
                </Bullet>
                <Bullet>
                  <B>Don&rsquo;t send access codes or passwords by text.</B> See
                  Section 7.
                </Bullet>
              </Bullets>
            </Subsection>
          </Section>

          <Section {...section("vendors")}>
            <P>
              <B>Vendors are independent.</B> The businesses Housemate books for
              you are independent third parties. They are not our employees,
              agents or subcontractors, and Housemate does not perform,
              supervise or guarantee their work. Your agreement for the work is
              between you and the vendor, and the vendor is responsible for its
              quality, safety, licensing, insurance, pricing and warranties.
            </P>
            <P>
              <B>We choose for you, not for them.</B> We never accept referral
              fees, commissions or other payment from vendors to steer your
              choices.
            </P>
            <P>
              <B>Disputes with a vendor.</B> If something goes wrong with a
              vendor&rsquo;s work, we&rsquo;ll help you follow up, gather the
              records and contact the vendor. But the vendor, not Housemate, is
              responsible for resolving it.
            </P>
            <P>
              <B>Vendor websites and terms.</B> When we book on a vendor&rsquo;s
              website, that site&rsquo;s own terms and privacy policy apply to
              your booking.
            </P>
          </Section>

          <Section {...section("text-messaging")}>
            <P>
              Texting is Housemate&rsquo;s primary channel. These terms apply to
              every text we send and receive, over SMS, MMS or RCS.
            </P>
            <Glance title="The Housemate messaging program">
              <GlanceRow label="Program">
                Housemate, operated by John Healy (sole proprietor).
              </GlanceRow>
              <GlanceRow label="What we send">
                Replies to your requests, reminders you ask for, appointment
                reminders, follow-ups on bookings and payments, and one-time
                sign-in codes. We don&rsquo;t send marketing texts.
              </GlanceRow>
              <GlanceRow label="Who receives them">
                Only members who have been invited and have agreed to receive
                texts from Housemate. Agreeing isn&rsquo;t a condition of buying
                anything.
              </GlanceRow>
              <GlanceRow label="How often">
                Message frequency varies with how you use Housemate. We
                don&rsquo;t send unprompted texts between 9:00 PM and 7:30 AM in
                your home&rsquo;s time zone.
              </GlanceRow>
              <GlanceRow label="Cost">
                Message and data rates may apply.
              </GlanceRow>
              <GlanceRow label="To stop">
                Reply STOP (or STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, REVOKE
                or OPTOUT) at any time. You&rsquo;ll receive one confirmation
                and no further texts. You can also tell us in your own words or
                email us. To start again, reply START.
              </GlanceRow>
              <GlanceRow label="For help">
                Reply HELP, or email john@myhousemate.co.
              </GlanceRow>
              <GlanceRow label="Carriers">
                Carriers are not liable for delayed or undelivered messages.
              </GlanceRow>
              <GlanceRow label="Privacy">
                We do not share, sell, or provide your mobile phone number or
                messaging consent data to third parties or affiliates for
                marketing or promotional purposes. See Section 2 of our{" "}
                <A href="/privacy#text-messaging">Privacy Policy</A>.
              </GlanceRow>
            </Glance>
            <P>
              Stopping texts means Housemate can no longer act on requests by
              text, and signing in to the web app needs a texted code.
            </P>
          </Section>

          <Section {...section("payments")}>
            <P>
              <B>Payments you approve.</B> When you confirm a payment, Housemate
              places a hold on the card you saved with our payment provider,
              Stripe, and pays the vendor with a single-use card number created
              for exactly that amount. Your own card number stays with Stripe
              and is never given to the vendor or to Housemate.
            </P>
            <P>
              <B>Amounts.</B> The amount you confirm is the amount we pay. If a
              vendor&rsquo;s final price differs from what you approved,
              we&rsquo;ll ask you again before paying the difference.
            </P>
            <P>
              <B>Refunds.</B> Refunds for a vendor&rsquo;s goods or services
              come from the vendor, under its policies. If a vendor refunds a
              payment we made for you, we&rsquo;ll pass the refund back to you.
            </P>
            <P>
              <B>Fees for Housemate itself.</B> If we introduce a fee for using
              Housemate, we&rsquo;ll tell you in advance, and it won&rsquo;t
              apply unless you agree to it.
            </P>
            <P>
              <B>Availability.</B> During the alpha, paying through Housemate
              may not be available. When it isn&rsquo;t, we&rsquo;ll give you
              what you need to pay the vendor directly.
            </P>
          </Section>

          <Section {...section("home-security")}>
            <Note>
              <strong className="font-bold">
                Please don&rsquo;t send us access codes, alarm codes, lockbox
                codes or passwords by text or in chat.
              </strong>{" "}
              Text messages are not a secure way to share them. We don&rsquo;t
              save them to your home&rsquo;s records, and if you send one by
              mistake, tell us and we&rsquo;ll delete it.
            </Note>
            <P>
              We plan to offer a secure vault for vendor logins and access
              details, which Housemate&rsquo;s assistant can use without seeing.
              It isn&rsquo;t available yet. When it is, these terms and our
              Privacy Policy will explain how it works before you can use it.
            </P>
            <P>
              <B>Team visits.</B> When our team visits your home for an errand,
              you agree to tell us about anything that affects their safety,
              such as pets or hazards. Our team may decline an errand that is
              unsafe or unlawful, or that involves hazardous materials, weapons,
              cash, or controlled substances.
            </P>
          </Section>

          <Section {...section("ai-assistant")}>
            <P>
              Housemate&rsquo;s assistant is powered by artificial intelligence.
              It can misunderstand a request or get a detail wrong, so every
              record shows where it came from and can be corrected.
            </P>
            <Bullets>
              <Bullet>
                <B>Not professional advice.</B> Troubleshooting suggestions are
                general guidance, not the advice of a licensed electrician,
                plumber, contractor, lawyer or other professional. Use your
                judgment, and don&rsquo;t attempt anything you&rsquo;re not
                comfortable with.
              </Bullet>
              <Bullet>
                <B>Not an emergency service.</B> If you smell gas, see an
                electrical hazard, have flooding or a break-in, or face any
                other emergency, <B>call 911 or your utility right away.</B>{" "}
                Housemate will tell you the same thing.
              </Bullet>
            </Bullets>
          </Section>

          <Section {...section("acceptable-use")}>
            <P>You agree not to use Housemate to:</P>
            <Bullets>
              <Bullet>
                do anything unlawful, or arrange anything unlawful at a home;
              </Bullet>
              <Bullet>
                act for a home you don&rsquo;t have authority over;
              </Bullet>
              <Bullet>
                harass, mislead or abuse vendors, our team, or anyone else;
              </Bullet>
              <Bullet>
                send content you don&rsquo;t have the right to share, such as
                photos of people who haven&rsquo;t agreed to it;
              </Bullet>
              <Bullet>
                interfere with or try to get around Housemate&rsquo;s security,
                including trying to manipulate the assistant into ignoring its
                limits; or
              </Bullet>
              <Bullet>
                resell Housemate, or use it to build a competing service.
              </Bullet>
            </Bullets>
          </Section>

          <Section {...section("account")}>
            <P>
              You sign in to the web app with a one-time code texted to your
              phone. Keep your phone secure, since anyone with access to it may
              be able to use your account. Tell us right away at <Email /> if
              you think someone else has used it.
            </P>
          </Section>

          <Section {...section("your-content")}>
            <P>
              <B>You own your content.</B> Your messages, photos, home records
              and other content remain yours. You give us permission to store,
              process and use your content only to run Housemate for you, as
              described in our Privacy Policy. This permission ends when your
              content is deleted, except for copies we must keep by law.
            </P>
            <P>
              <B>Feedback.</B> If you give us ideas or feedback, we may use them
              to improve Housemate without owing you anything. We won&rsquo;t
              identify you publicly without your permission.
            </P>
          </Section>

          <Section {...section("ending")}>
            <P>
              <B>You can stop at any time.</B> Tell us you want to close your
              account, and we&rsquo;ll delete your information as our Privacy
              Policy describes.
            </P>
            <P>
              <B>We can end or pause your access</B> if you break these terms,
              if it&rsquo;s needed to protect you, our team, vendors or
              Housemate, or if we end the alpha. Unless there&rsquo;s an urgent
              reason not to, we&rsquo;ll give you notice and a chance to get a
              copy of your records first.
            </P>
          </Section>

          <Section {...section("disclaimers")}>
            <P>
              Housemate is an early release, provided{" "}
              <B>&ldquo;as is&rdquo; and &ldquo;as available.&rdquo;</B> To the
              fullest extent the law allows, we disclaim all warranties, express
              or implied, including warranties of merchantability, fitness for a
              particular purpose and non-infringement. We don&rsquo;t promise
              that Housemate will be uninterrupted or error-free, that any
              vendor will be available, or that any vendor&rsquo;s work will
              meet your expectations.
            </P>
          </Section>

          <Section {...section("liability")}>
            <P>To the fullest extent the law allows:</P>
            <Bullets>
              <Bullet>
                Housemate is not liable for indirect, incidental, special,
                consequential or punitive damages, or for lost profits, data or
                goodwill.
              </Bullet>
              <Bullet>
                Housemate is not liable for the acts, omissions, work or
                products of vendors or other third parties.
              </Bullet>
              <Bullet>
                Housemate&rsquo;s total liability for any claim relating to
                these terms or the service is limited to the greater of the
                amount you paid Housemate itself (not vendors) in the 12 months
                before the claim, or $100.
              </Bullet>
            </Bullets>
            <P>
              These limits don&rsquo;t apply to liability that can&rsquo;t be
              limited by law, such as liability for our gross negligence,
              willful misconduct, or fraud, or for death or personal injury
              caused by our negligence. Some states don&rsquo;t allow certain
              limits, so some of these may not apply to you.
            </P>
          </Section>

          <Section {...section("disputes")}>
            <P>
              <B>Talk to us first.</B> Most problems can be solved directly.
              Email <Email /> and we&rsquo;ll try to resolve it within 30 days.
            </P>
            <P>
              <B>Governing law and courts.</B> These terms are governed by the
              laws of the State of Georgia and applicable federal law, without
              regard to conflict-of-law rules. Any dispute that we can&rsquo;t
              resolve informally will be decided in the state or federal courts
              located in Georgia, and both of us agree to those courts&rsquo;
              jurisdiction. Either of us may instead bring a qualifying claim in
              small-claims (magistrate) court, including in the county where you
              live.
            </P>
            <P>
              Nothing in these terms takes away rights you have under
              consumer-protection laws that can&rsquo;t be waived.
            </P>
          </Section>

          <Section {...section("changes")}>
            <P>
              We&rsquo;ll update these terms as Housemate grows. We&rsquo;ll
              post the new version here and change the &ldquo;Last
              updated&rdquo; date. If a change is material, we&rsquo;ll tell you
              by text or email at least 14 days before it takes effect, unless
              it&rsquo;s required sooner by law. If you keep using Housemate
              after a change takes effect, you accept it. If you don&rsquo;t,
              you can close your account.
            </P>
          </Section>

          <Section {...section("general")}>
            <Bullets>
              <Bullet>
                <B>Entire agreement.</B> These terms and the Privacy Policy are
                the whole agreement between you and Housemate about the service.
              </Bullet>
              <Bullet>
                <B>Severability.</B> If a court finds part of these terms
                unenforceable, the rest still applies.
              </Bullet>
              <Bullet>
                <B>No waiver.</B> If we don&rsquo;t enforce a term right away,
                we can still enforce it later.
              </Bullet>
              <Bullet>
                <B>Assignment.</B> You may not transfer these terms. We may
                transfer them in connection with a change in how Housemate is
                organized, such as forming a company to operate it, and
                we&rsquo;ll tell you if we do.
              </Bullet>
              <Bullet>
                <B>Notices.</B> We&rsquo;ll send notices by text or to the email
                you gave us. You can reach us at <Email />.
              </Bullet>
            </Bullets>
          </Section>

          <Section {...section("contact")}>
            <Bullets>
              <Bullet>
                <B>Email:</B> <Email />
              </Bullet>
              <Bullet>
                <B>Text:</B> reply to your Housemate thread, or text <B>HELP</B>
              </Bullet>
              <Bullet>
                <B>More ways to reach us:</B> <A href="/contact">Contact</A>
              </Bullet>
            </Bullets>
          </Section>
        </LegalDocument>
      </main>
      <SiteFooter current="terms" />
    </>
  );
}
