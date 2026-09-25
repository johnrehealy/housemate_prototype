import type { Metadata } from "next";
import {
  A,
  B,
  Bullet,
  Bullets,
  Email,
  Glance,
  GlanceRow,
  Keywords,
  LegalDocument,
  Masthead,
  Note,
  Numbered,
  P,
  Pledge,
  Row,
  Rows,
  Section,
  Subsection,
  Summary,
  SummaryPoint,
} from "../_components/legal/prose";
import { outline } from "../_components/legal/outline";
import { Ribbon } from "../_components/ribbon";
import { SiteFooter } from "../_components/site-footer";

/*
 * The privacy policy (boards L1 and L2 in Paper, page "Legal"). Twilio's
 * reviewers read this page when they vet the texting registration, so Section
 * 2 carries everything they look for: the program's terms at a glance, the
 * opt-in, STOP and HELP, "message and data rates may apply", and the
 * sentences that mobile information is never shared for marketing (2.7, and
 * again at the top of Section 6).
 *
 * Change the dates whenever the text changes. Section 13 promises that.
 */
const EFFECTIVE = "September 25, 2026";

const DESCRIPTION =
  "What Housemate collects, why, who we share it with, how long we keep it, and the choices you have, including how our text messaging works.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  openGraph: {
    title: "Privacy Policy · Housemate",
    description: DESCRIPTION,
    siteName: "Housemate",
    type: "website",
  },
};

const { items, section } = outline([
  ["who-this-covers", "Who this policy covers"],
  ["text-messaging", "Text messaging"],
  ["information-we-collect", "Information we collect"],
  ["how-we-use-it", "How we use it"],
  ["ai-assistant", "Housemate's AI assistant"],
  ["sharing", "When we share it"],
  ["retention", "How long we keep it"],
  ["your-rights", "Your choices and rights"],
  ["other-people", "Other people's information"],
  ["security", "How we protect it"],
  ["children", "Children"],
  ["where-processed", "Where it's processed"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact us"],
]);

/** The service providers in 6.3: what each does, and what it handles. */
const PROVIDERS = [
  [
    "Twilio",
    "Sends and receives text messages; sends sign-in codes",
    "Phone number, message content and media, delivery status",
  ],
  [
    "Supabase",
    "Database, account sign-in, and private file storage",
    "All member and home records, messages and media",
  ],
  [
    "Vercel",
    "Hosts our website and web app",
    "Technical information such as IP addresses; waitlist emails in transit",
  ],
  [
    "Fly.io",
    "Runs the servers where the assistant and its browser work",
    "Task and record information needed for each task",
  ],
  [
    "Anthropic",
    "Provides the AI model behind the assistant",
    "The parts of your records the assistant needs for a task",
  ],
  [
    "Stripe",
    "Processes payments you approve, including single-use card numbers",
    "Payment details you give Stripe, and payment amounts and outcomes",
  ],
  [
    "Google (Workspace)",
    "Keeps our waitlist list and notifies our team of new sign-ups",
    "Waitlist email addresses only",
  ],
] as const;

export default function PrivacyPage() {
  return (
    <>
      <Ribbon page="inner" />
      <main>
        <Masthead
          title="Privacy Policy"
          effective={EFFECTIVE}
          lead="Housemate takes the repairs, services and errands your home needs and gets them done. To do that, we have to know things about you and your home. This policy explains what we collect, why, who we share it with, how long we keep it, and the choices you have."
        />
        <LegalDocument sections={items}>
          <Summary>
            <SummaryPoint title="We use your information to run your home, and for nothing else.">
              We never sell your data, never share it for advertising, never
              take referral fees to steer your choices, and never show you ads.
            </SummaryPoint>
            <SummaryPoint title="Texting is how Housemate works.">
              We store your messages so we can act on them and you can review
              them. Reply STOP at any time to stop texts.
            </SummaryPoint>
            <SummaryPoint title="Your mobile number stays with us.">
              Your number and your consent to receive texts are never shared
              with anyone for their marketing.
            </SummaryPoint>
            <SummaryPoint title="You can see, correct and delete what we hold.">
              Everything Housemate does is visible in the app, and corrections
              are kept as history, never silently overwritten.
            </SummaryPoint>
          </Summary>

          <Section {...section("who-this-covers")}>
            <P>
              Housemate is operated by John Healy, a sole proprietor based in
              Georgia. &ldquo;Housemate,&rdquo; &ldquo;we,&rdquo;
              &ldquo;us&rdquo; and &ldquo;our&rdquo; mean John Healy, operating
              the Housemate service, the website at myhousemate.co and the
              Housemate text-messaging number. &ldquo;You&rdquo; means a visitor
              to our website, someone who joins our waitlist, or a member who
              has been invited to use Housemate.
            </P>
            <P>This policy covers:</P>
            <Numbered>
              <li>
                <B>Website visitors</B> to myhousemate.co.
              </li>
              <li>
                <B>Waitlist sign-ups</B>, who give us an email address.
              </li>
              <li>
                <B>Members</B>, who are invited to Housemate and use it by text
                and through the web app.
              </li>
              <li>
                <B>
                  Other people whose information reaches us through a member
                </B>
                , such as a vendor the member uses, a household member named in
                a message, or someone who texts our number without an
                invitation. Section 9 explains how we treat their information.
              </li>
            </Numbered>
            <P>
              Housemate is currently an invite-only early release (an
              &ldquo;alpha&rdquo;) for a small number of homes in the United
              States. Some features described on our website are still being
              built. This policy describes what we do today and, where we say
              so, what will change when a feature launches. We will not begin a
              new kind of collection described as &ldquo;planned&rdquo; without
              updating this policy first.
            </P>
          </Section>

          <Section {...section("text-messaging")}>
            <P>
              Texting is Housemate&rsquo;s primary channel, so we explain it
              first and in the most detail. It covers SMS, MMS and RCS.
            </P>
            <Glance title="The Housemate messaging program at a glance">
              <GlanceRow label="Who sends it">
                Housemate, operated by John Healy (sole proprietor).
              </GlanceRow>
              <GlanceRow label="What it is">
                Texts about your home, sent only to invited members who have
                agreed to them: replies to your requests, reminders you asked
                for, appointment reminders, follow-ups on bookings and payments,
                and sign-in codes. Never marketing.
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
                Reply HELP, or email john@myhousemate.co.
              </GlanceRow>
              <GlanceRow label="Your number">
                We do not share, sell, or provide your mobile phone number or
                messaging consent data to third parties or affiliates for
                marketing or promotional purposes.
              </GlanceRow>
            </Glance>

            <Subsection title="2.1 How you agree to receive texts">
              <P>
                Housemate texts only people who have been invited and have
                agreed to receive messages from us. When we invite you, we ask
                whether you want to receive texts from Housemate. Before you
                agree, we tell you the program&rsquo;s name, what we&rsquo;ll
                text you about, that message frequency varies, that message and
                data rates may apply, how to reply STOP and HELP, and where to
                find this policy and our <A href="/terms">Terms</A>. We record
                your consent, including the phone number, the date and time, and
                the wording you agreed to.
              </P>
              <Bullets>
                <Bullet>
                  <B>Your consent is to Housemate only.</B> It isn&rsquo;t
                  transferred to, shared with, or used by any other business.
                </Bullet>
                <Bullet>
                  <B>
                    You don&rsquo;t have to agree to receive texts as a
                    condition of buying anything.
                  </B>
                </Bullet>
                <Bullet>
                  <B>Texting us is also a request for a reply.</B> When you text
                  Housemate, we reply to that message.
                </Bullet>
              </Bullets>
              <P>
                If you text our number without an invitation, we send one
                automatic reply saying Housemate is invite-only, and nothing
                else. We will not text that number again unless you are later
                invited and agree.
              </P>
            </Subsection>

            <Subsection title="2.2 What we send, and how often">
              <P>We send these kinds of texts:</P>
              <Bullets>
                <Bullet>
                  <B>Conversational replies</B> to messages you send us. These
                  are most of our texts.
                </Bullet>
                <Bullet>
                  <B>Reminders</B> you asked us to set, and reminders about
                  upcoming appointments.
                </Bullet>
                <Bullet>
                  <B>Follow-ups on important issues</B>, such as a payment that
                  needs your confirmation or a problem with a booking.
                </Bullet>
                <Bullet>
                  <B>One-time sign-in codes</B> when you sign in to the web app.
                </Bullet>
              </Bullets>
              <P>
                Our texts may include links to the Housemate web app and
                vendors&rsquo; websites, and vendors&rsquo; phone numbers.{" "}
                <B>We do not send marketing or promotional texts.</B>
              </P>
              <P>
                <B>Message frequency varies</B> with how much you use Housemate.
                We do not send unprompted texts (reminders and follow-ups)
                between <B>9:00 PM and 7:30 AM</B> in your home&rsquo;s time
                zone. Replies to your own messages can arrive at any time.
              </P>
              <P>
                <B>Message and data rates may apply</B>, according to your
                mobile plan. Carriers are not liable for delayed or undelivered
                messages.
              </P>
            </Subsection>

            <Subsection title="2.3 How to stop texts, or get help">
              <Rows>
                <Row label="To stop">
                  <Keywords
                    words={[
                      "STOP",
                      "STOPALL",
                      "UNSUBSCRIBE",
                      "CANCEL",
                      "END",
                      "QUIT",
                      "REVOKE",
                      "OPTOUT",
                    ]}
                  />
                  <p>
                    Reply with any of these to any Housemate text. You&rsquo;ll
                    get one text confirming you&rsquo;ve been unsubscribed, and
                    nothing further. An opt-out applies to texts from Housemate
                    over SMS, MMS and RCS alike.
                  </p>
                  <p>
                    Any other reasonable way works too. If you tell us in your
                    own words (&ldquo;please stop texting me&rdquo;) or email{" "}
                    <Email subject="Stop texts" />, we&rsquo;ll treat it as an
                    opt-out and honor it promptly, and in any case within 10
                    business days.
                  </p>
                </Row>
                <Row label="To start again">
                  <Keywords words={["START", "YES", "UNSTOP"]} />
                </Row>
                <Row label="For help">
                  <Keywords words={["HELP", "INFO"]} />
                  <p>
                    Or email <Email />.
                  </p>
                </Row>
              </Rows>
              <P>
                Because texting is how Housemate works, stopping texts means
                Housemate can no longer act on requests by text. You can still
                use the web app, though signing in requires a texted code. We
                keep a record that you opted out so that we honor it.
              </P>
            </Subsection>

            <Subsection title="2.4 What we collect through texting">
              <P>When you text Housemate, we collect and store:</P>
              <Bullets>
                <Bullet>
                  <B>The content of your messages</B>, including text, photos,
                  videos, voice notes and other files you send.
                </Bullet>
                <Bullet>
                  <B>Message information</B>: your phone number, the time each
                  message was sent and received, and its delivery status (for
                  example, delivered or failed).
                </Bullet>
                <Bullet>
                  <B>Consent records</B>: when and how you agreed to receive
                  texts, and any opt-out or opt-in afterwards.
                </Bullet>
                <Bullet>
                  <B>Information derived from your messages</B>, such as a
                  reminder, an errand, a service appointment, a vendor&rsquo;s
                  details or an item added to your home&rsquo;s inventory. Each
                  of these records notes the message it came from, so you can
                  always see why it exists.
                </Bullet>
              </Bullets>
              <P>
                Photos and other media you send are stored in private storage
                that is not publicly accessible.
              </P>
              <Note>
                <strong className="font-bold">
                  Please don&rsquo;t text us door codes, alarm codes, lockbox
                  codes or passwords.
                </strong>{" "}
                We do not save these to your home&rsquo;s records. But anything
                you send becomes part of the message we store, so if you send
                one by mistake, tell us and we&rsquo;ll delete that message.
              </Note>
            </Subsection>

            <Subsection title="2.5 How we use messaging information">
              <P>
                We use your mobile number, your messages and your consent
                records only to run Housemate for you: to reply, to carry out
                what you ask, to send the reminders and follow-ups described
                above, to sign you in, to honor your opt-out, and to keep
                records of your consent. We do not use them to market to you,
                and we do not use them for anyone else&rsquo;s purposes.
              </P>
            </Subsection>

            <Subsection title="2.6 How messages travel">
              <P>
                Your texts pass through our messaging provider (currently
                Twilio) and your mobile carrier. For RCS messages, they may also
                pass through the RCS platform provider for your device (for
                example, Google). These parties process your messages to deliver
                them, under their own terms and privacy policies. Standard text
                messages are not end-to-end encrypted, and they are only as
                secure as the mobile networks that carry them. If you would
                prefer not to send something by text, you can send it through
                the web app instead.
              </P>
            </Subsection>

            <Subsection title="2.7 What we never do with your mobile information">
              <Pledge statement="We do not share, sell, rent, or provide your mobile phone number or messaging consent data to third parties or affiliates for marketing or promotional purposes.">
                Text-messaging originator opt-in data and consent are not shared
                with any third parties. This applies to every kind of sharing
                described in Section 6. The only exception is the service
                providers that deliver our texts, such as Twilio, which process
                that information on our behalf solely to send and receive your
                messages.
              </Pledge>
            </Subsection>
          </Section>

          <Section {...section("information-we-collect")}>
            <Subsection title="3.1 Information you give us">
              <Bullets>
                <Bullet>
                  <B>Waitlist:</B> your email address. That&rsquo;s all the
                  waitlist form asks for. We keep it in our database, and a copy
                  goes to a spreadsheet and an email notification in our
                  team&rsquo;s Google account so we can follow up.
                </Bullet>
                <Bullet>
                  <B>Account information:</B> your name, mobile phone number,
                  email address if you give it, and your home&rsquo;s address.
                  We use the address to schedule services and errands, and to
                  work out your time zone.
                </Bullet>
                <Bullet>
                  <B>Home information:</B> what you tell us about your home,
                  such as appliances and equipment, their models and service
                  history, paint colors, the vendors you use, and photos of your
                  home or its contents.
                </Bullet>
                <Bullet>
                  <B>Requests and tasks:</B> what you ask us to do, and your
                  answers to our questions.
                </Bullet>
                <Bullet>
                  <B>Payment confirmations:</B> your explicit &ldquo;yes&rdquo;
                  to a cost before we spend money on your behalf.
                </Bullet>
                <Bullet>
                  <B>Corrections:</B> changes you make to records in the web
                  app.
                </Bullet>
                <Bullet>
                  <B>Feedback:</B> anything you tell us about how Housemate is
                  working for you.
                </Bullet>
              </Bullets>
            </Subsection>

            <Subsection title="3.2 Information created when Housemate works for you">
              <Bullets>
                <Bullet>
                  <B>The agent&rsquo;s activity.</B> Housemate&rsquo;s assistant
                  keeps a record of what it did and why, including the vendor
                  websites it visited, the bookings it made or attempted, the
                  messages it sent on your behalf and the steps it handed back
                  to you. Every real-world action is logged. This is what lets
                  you see and correct everything Housemate has done.
                </Bullet>
                <Bullet>
                  <B>Browser session records.</B> When Housemate uses a web
                  browser to book or research something, we may keep screenshots
                  and step-by-step records of that session so you and our team
                  can review what happened. Payment card numbers and saved
                  logins are filled in by our systems outside the
                  assistant&rsquo;s view and are kept out of those records.
                </Bullet>
                <Bullet>
                  <B>Record history.</B> When a record changes, we keep the
                  earlier version and who changed it (you, the assistant, or our
                  team), rather than overwriting it.
                </Bullet>
                <Bullet>
                  <B>Visit and errand records.</B> When our team visits your
                  home for an errand, we record what was picked up, dropped off
                  or done.
                </Bullet>
              </Bullets>
            </Subsection>

            <Subsection title="3.3 Information collected automatically on our website and web app">
              <Bullets>
                <Bullet>
                  <B>Technical information</B> that any web server receives,
                  such as your IP address, browser type, the pages requested and
                  the time. Our hosting provider processes this to deliver the
                  site and protect it from abuse.
                </Bullet>
                <Bullet>
                  <B>Cookies.</B> We use only the cookies needed to keep you
                  signed in to the web app and to keep it secure.{" "}
                  <B>
                    We do not use advertising cookies, cross-site tracking or
                    third-party analytics.
                  </B>{" "}
                  Because we don&rsquo;t track you across sites, there is
                  nothing to opt out of; we also treat a Global Privacy Control
                  signal as a request to opt out of any sale or sharing, which
                  we don&rsquo;t do in any case.
                </Bullet>
              </Bullets>
            </Subsection>

            <Subsection title="3.4 Information from others">
              <Bullets>
                <Bullet>
                  <B>Vendors and service providers</B> may send us
                  confirmations, quotes, appointment times and invoices about
                  work done at your home.
                </Bullet>
                <Bullet>
                  <B>Payment processing:</B> our payment provider tells us
                  whether a payment or hold succeeded. It does not give us your
                  full card number.
                </Bullet>
                <Bullet>
                  <B>Connected accounts (planned).</B> We plan to let members
                  connect their email inbox and calendars so Housemate can find
                  appointment confirmations and schedule around them. That will
                  be optional, will require your separate permission, and will
                  be described here before it launches. Today, Housemate does
                  not access your email or calendar.
                </Bullet>
              </Bullets>
            </Subsection>
          </Section>

          <Section {...section("how-we-use-it")}>
            <P>We use your information to:</P>
            <Numbered>
              <li>
                <B>Do what you ask</B>: set reminders, book and follow up on
                services, run errands, keep your home&rsquo;s records, and
                contact vendors on your behalf.
              </li>
              <li>
                <B>Remember your home</B>, so each new request starts from
                what&rsquo;s already known.
              </li>
              <li>
                <B>Show you everything we did</B>, and let you correct it.
              </li>
              <li>
                <B>Take payments you approve.</B> Housemate acts on its own,
                except that anything involving or potentially involving a
                payment or fee waits for your explicit confirmation. That rule
                is enforced by our software, not just by the assistant&rsquo;s
                instructions.
              </li>
              <li>
                <B>Communicate with you</B>, by text and, where you&rsquo;ve
                given it, email. For waitlist sign-ups, that means telling you
                when there&rsquo;s room.
              </li>
              <li>
                <B>Keep Housemate safe and working</B>: preventing fraud and
                abuse, securing accounts, fixing problems, and monitoring the
                texts we send first.
              </li>
              <li>
                <B>Improve Housemate for you and other members</B>, for example
                by learning from corrections that the assistant got something
                wrong. We do not use your information to train third-party AI
                models (see Section 5).
              </li>
              <li>
                <B>Meet legal obligations</B>, and enforce our terms.
              </li>
            </Numbered>
            <P>
              We do not use your information for advertising, and we do not
              build profiles of you for anyone else.
            </P>
          </Section>

          <Section {...section("ai-assistant")}>
            <P>
              Housemate&rsquo;s assistant is powered by a large language model
              provided by Anthropic (Claude). To answer a message or carry out a
              task, the assistant is given the parts of your home&rsquo;s
              records it needs, such as your messages, reminders, vendors and
              equipment. It runs on our servers and on our provider&rsquo;s
              systems, under our control.
            </P>
            <Bullets>
              <Bullet>
                <B>No training on your data by our AI provider.</B> Under our
                agreement with Anthropic, it may not use your messages or
                records to train its models.
              </Bullet>
              <Bullet>
                <B>Secrets stay out of the assistant&rsquo;s view.</B> Payment
                card numbers are filled into forms by our own software. They
                never enter the assistant&rsquo;s context, the transcript, our
                logs or screenshots. Vendor logins, and codes like door codes,
                will work the same way once our secure vault launches (Section
                10).
              </Bullet>
              <Bullet>
                <B>Website content can&rsquo;t give instructions.</B> The
                assistant treats what it reads on vendor websites as
                information, not commands. A website can never approve a payment
                or change what the assistant is allowed to do.
              </Bullet>
              <Bullet>
                <B>You stay in control.</B> The assistant makes routine
                decisions on its own, like which conversation a message belongs
                to or what time to suggest. It does not make decisions that
                produce legal or similarly significant effects about you.
                Anything that costs money waits for your yes, and you can review
                and correct everything it did.
              </Bullet>
              <Bullet>
                <B>Emergencies go to people who can help.</B> If a message
                describes a safety emergency, such as a gas smell, an electrical
                hazard, flooding or a break-in, the assistant stops and tells
                you to contact emergency services or the utility. Housemate is
                not an emergency service. Call 911 in an emergency.
              </Bullet>
              <Bullet>
                <B>AI can be wrong.</B> The assistant may misunderstand a
                request or get a detail wrong. That&rsquo;s why every record
                shows where it came from and can be corrected.
              </Bullet>
            </Bullets>
          </Section>

          <Section {...section("sharing")}>
            <P>
              We share information only as described here.{" "}
              <B>
                We do not sell personal information, and we do not share it for
                cross-context behavioral advertising
              </B>
              , as those terms are defined under California law and similar
              state laws.
            </P>
            <P>
              <B>
                Mobile information is excluded from all of the sharing below.
              </B>{" "}
              None of the categories in this section includes text-messaging
              opt-in data or consent, and we never share your mobile number or
              consent with anyone for their marketing or promotional purposes
              (Section 2.7). Where a vendor needs your phone number to carry out
              a booking you asked for, we give it to them for that booking only.
            </P>

            <Subsection title="6.1 With vendors, to do what you asked">
              <P>
                To book or arrange a service, we give the vendor what it needs:
                typically your name, phone number, address, the problem, and
                relevant details about your equipment. Where a vendor&rsquo;s
                website or form requires it, we enter this on your behalf. Once
                a vendor has your information, its own privacy policy governs
                how it uses it. We will not share your information with a vendor
                you haven&rsquo;t asked us to contact about a task, and we do
                not accept payment from vendors for sending them business.
              </P>
            </Subsection>

            <Subsection title="6.2 With Housemate's team">
              <P>
                A small Housemate team supports the service. Team members may
                see your information to run errand visits, help when something
                goes wrong, monitor the texts we send first, check costs and
                review the assistant&rsquo;s work. Team members who visit your
                home receive what they need for the visit, such as your address
                and the errand. Access is limited to people who need it, and
                they are bound by confidentiality obligations.
              </P>
            </Subsection>

            <Subsection title="6.3 With our service providers">
              <P>
                We use a small number of companies to run Housemate. They
                process information only on our instructions and only to provide
                their service to us:
              </P>
              <Rows>
                {PROVIDERS.map(([name, role, data]) => (
                  <Row
                    key={name}
                    label={
                      <span className="text-base font-bold text-heading sm:leading-6.5">
                        {name}
                      </span>
                    }
                  >
                    <p className="flex flex-col gap-1">
                      {role}
                      <span className="text-label leading-5.5 text-muted">
                        Involves: {data}
                      </span>
                    </p>
                  </Row>
                ))}
              </Rows>
              <P>
                Your mobile carrier, and for RCS your device&rsquo;s messaging
                platform, also handle your texts as part of delivering them
                (Section 2.6).
              </P>
            </Subsection>

            <Subsection title="6.4 Payments">
              <P>
                When you approve a payment, Housemate places a hold on the card
                you saved with our payment provider, Stripe, then pays the
                vendor with a single-use card number created for exactly that
                amount. Your own card number is stored only by Stripe, never by
                Housemate, and is never given to the vendor. Stripe&rsquo;s use
                of your payment information is governed by its own privacy
                policy.
              </P>
            </Subsection>

            <Subsection title="6.5 Legal and safety reasons">
              <P>
                We may disclose information if we believe in good faith that the
                law requires it (for example, a valid subpoena or court order),
                or that it is necessary to protect someone&rsquo;s safety, to
                prevent fraud, or to protect Housemate&rsquo;s rights. Where the
                law allows, we will tell you before disclosing your information
                in response to a legal demand.
              </P>
            </Subsection>

            <Subsection title="6.6 Business changes">
              <P>
                If Housemate is involved in a merger, acquisition, financing or
                sale of assets, your information may be transferred as part of
                that transaction. The recipient will be bound by this policy for
                information collected under it, and we will notify you before
                your information becomes subject to a different privacy policy.
              </P>
            </Subsection>

            <Subsection title="6.7 With your permission">
              <P>
                We will share your information in other ways only if you ask us
                to or agree to it.
              </P>
            </Subsection>
          </Section>

          <Section {...section("retention")}>
            <P>
              We keep information only as long as we need it for the purposes in
              this policy.
            </P>
            <Bullets>
              <Bullet>
                <B>Member records, messages and media:</B> for as long as your
                account is active. Housemate&rsquo;s value is remembering your
                home, so we don&rsquo;t delete records while you&rsquo;re using
                it unless you ask.
              </Bullet>
              <Bullet>
                <B>After you close your account:</B> we delete or de-identify
                your information within 90 days, except as described below.
              </Bullet>
              <Bullet>
                <B>Record history:</B> kept with the record it belongs to, and
                deleted with it.
              </Bullet>
              <Bullet>
                <B>Waitlist emails:</B> until you&rsquo;re invited, you ask us
                to remove you, or we close the waitlist, whichever comes first.
                We delete every copy, including the one in our Google account.
              </Bullet>
              <Bullet>
                <B>Texts from numbers that aren&rsquo;t invited:</B> up to 90
                days, for abuse prevention.
              </Bullet>
              <Bullet>
                <B>Texting consent and opt-out records:</B> your phone number,
                when and how you agreed to receive texts, and when you opted
                out. We keep these for four years after your last text from us,
                even after you close your account, so we can show that we texted
                you only with your permission and so we keep honoring a STOP. We
                use them for nothing else.
              </Bullet>
              <Bullet>
                <B>Payment records:</B> kept as long as the law requires, for
                example for tax and accounting.
              </Bullet>
              <Bullet>
                <B>Backups:</B> deleted information may remain in encrypted
                backups for up to 30 days before it is overwritten.
              </Bullet>
            </Bullets>
          </Section>

          <Section {...section("your-rights")}>
            <Subsection title="8.1 Rights every member has">
              <P>Whatever state you live in, you can ask us to:</P>
              <Bullets>
                <Bullet>
                  <B>Access</B> the personal information we hold about you, and
                  receive a copy in a portable format.
                </Bullet>
                <Bullet>
                  <B>Correct</B> information that&rsquo;s wrong. Most of it you
                  can correct yourself in the web app.
                </Bullet>
                <Bullet>
                  <B>Delete</B> your information or your whole account.
                </Bullet>
                <Bullet>
                  <B>Stop texts</B> at any time by replying STOP.
                </Bullet>
                <Bullet>
                  <B>Leave the waitlist</B> at any time.
                </Bullet>
              </Bullets>
              <P>
                To make a request, email <Email subject="Privacy" /> or text us.
                We&rsquo;ll verify that the request comes from you, usually by
                confirming it from the phone number or email address on your
                account, and respond within 45 days. You can use an authorized
                agent to make a request; we may ask for proof of that
                authorization. We will not treat you differently for exercising
                any of these rights.
              </P>
              <P>
                Deleting information may mean Housemate can no longer do some
                things for you. For example, it won&rsquo;t remember a vendor or
                appliance that has been deleted.
              </P>
            </Subsection>

            <Subsection title="8.2 State privacy rights">
              <P>
                Residents of California and several other states have rights
                under state privacy laws, including the rights to know what
                personal information we collect and how we use and disclose it,
                to access, correct and delete it, to opt out of its sale or
                sharing and of certain profiling, and to limit the use of
                sensitive personal information. Those rights are summarized
                above and we honor them. In particular:
              </P>
              <Bullets>
                <Bullet>
                  <B>We do not sell or share personal information</B>, and have
                  not done so in the past 12 months.
                </Bullet>
                <Bullet>
                  <B>Sensitive personal information.</B> We collect your precise
                  home address and the contents of your messages, which some
                  state laws classify as sensitive. We use them only to provide
                  the service you asked for, which is a permitted purpose under
                  those laws, and not to infer characteristics about you.
                </Bullet>
                <Bullet>
                  <B>Categories of information</B> we collect, and their sources
                  and purposes, are described in Sections 2 through 4. The
                  categories of recipients are described in Section 6.
                </Bullet>
              </Bullets>
              <P>
                If we deny a request, you may be able to appeal. Reply to our
                decision to ask for an appeal and we&rsquo;ll respond within the
                time your state&rsquo;s law requires. If you&rsquo;re not
                satisfied, you may contact your state&rsquo;s attorney general.
              </P>
            </Subsection>
          </Section>

          <Section {...section("other-people")}>
            <P>
              Using Housemate sometimes means telling us about other people,
              like a housemate who&rsquo;ll be home for a repair, a neighbor
              with a spare key, or a contractor. Please share only what&rsquo;s
              needed for the task, and only if you&rsquo;re entitled to share
              it.
            </P>
            <Bullets>
              <Bullet>
                <B>Vendors and contractors.</B> We keep vendors&rsquo; business
                contact details, quotes and service history in your home&rsquo;s
                records so the assistant can use them for you. We don&rsquo;t
                use them for any other purpose.
              </Bullet>
              <Bullet>
                <B>People in photos.</B> If a photo you send includes other
                people, we store it as part of your records. Please avoid
                sending photos of people who haven&rsquo;t agreed to it.
              </Bullet>
              <Bullet>
                <B>Someone who texts our number without an invitation.</B> We
                store the message, send one reply explaining that Housemate is
                invite-only, and keep the message only for the period in Section
                7. Anyone in this position can ask us to delete it at <Email />.
              </Bullet>
            </Bullets>
          </Section>

          <Section {...section("security")}>
            <P>
              Your home&rsquo;s information deserves more care than most data,
              so we design around that:
            </P>
            <Bullets>
              <Bullet>
                <B>Access control.</B> Each member&rsquo;s records are isolated
                from every other member&rsquo;s at the database level. Web app
                sign-in uses a one-time code sent to your phone.
              </Bullet>
              <Bullet>
                <B>Encryption.</B> Information is encrypted in transit between
                your browser and our servers, and at rest in our database and
                storage.
              </Bullet>
              <Bullet>
                <B>Private media.</B> Photos and files are kept in private
                storage and are never publicly addressable.
              </Bullet>
              <Bullet>
                <B>No card numbers, and no codes in our records.</B> We
                don&rsquo;t store your payment card number. Door and alarm codes
                are not saved to your home&rsquo;s records.
              </Bullet>
              <Bullet>
                <B>A secure vault (planned).</B> We plan to let members save
                vendor logins and access details, such as door or lockbox codes,
                in a separate vault that Housemate&rsquo;s assistant can use but
                never read, with each use recorded for you to see. It
                isn&rsquo;t available yet. We&rsquo;ll update this policy before
                it launches, and until then, please don&rsquo;t send us these
                details.
              </Bullet>
              <Bullet>
                <B>Clean logs.</B> Our systems are built so that addresses,
                photos of your home, codes and similar sensitive details stay
                out of operational logs, and our development and testing use
                only made-up data, never real member information.
              </Bullet>
              <Bullet>
                <B>Limited people.</B> Only team members who need access to do
                their work have it.
              </Bullet>
            </Bullets>
            <P>
              No system is perfectly secure. If we learn of a security breach
              affecting your personal information, we&rsquo;ll notify you and
              any required authorities as the law requires, and tell you what
              we&rsquo;re doing about it.
            </P>
          </Section>

          <Section {...section("children")}>
            <P>
              Housemate is intended for adults who manage a home. It is not
              directed to children, and we do not knowingly collect personal
              information from anyone under 18. If you believe a child has given
              us personal information, contact <Email /> and we&rsquo;ll delete
              it.
            </P>
          </Section>

          <Section {...section("where-processed")}>
            <P>
              Housemate is offered in the United States, and your information is
              stored and processed in the United States. Some of our service
              providers may process information in other countries, subject to
              contractual safeguards.
            </P>
          </Section>

          <Section {...section("changes")}>
            <P>
              We&rsquo;ll update this policy as Housemate grows, in particular
              before we launch any planned feature that collects new kinds of
              information. We&rsquo;ll post the new version here and change the
              &ldquo;Last updated&rdquo; date. If a change is material, for
              example a new use of your messages or a new kind of sharing,
              we&rsquo;ll tell members by text or email before it takes effect,
              and where the law requires it, we&rsquo;ll ask for your consent.
            </P>
          </Section>

          <Section {...section("contact")}>
            <P>Questions, requests or concerns about your privacy:</P>
            <Bullets>
              <Bullet>
                <B>Email:</B> <Email subject="Privacy" />
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
      <SiteFooter current="privacy" />
    </>
  );
}
