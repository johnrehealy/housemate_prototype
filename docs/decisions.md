# Decisions

Approved decisions are binding. Proposed decisions are recommendations awaiting the user's approval; don't treat them as settled.

To add a decision, append an entry with the next number. To reverse one, add a new entry that supersedes it rather than editing the old one. Update an entry's status line when it's approved, withdrawn or superseded; the entry stays where it was first recorded.

**Entry format:** number and title, status (Proposed / Approved / Superseded by D-nnn), date, decision, and reason.

---

## Approved

### D-001 · SMS/RCS/MMS is the primary channel
- **Status:** Approved · 2026-09-15 (original CLAUDE.md draft)
- **Decision:** Texting is the primary way users interact with Housemate. The web app is available for users who prefer it.

### D-002 · The web app is the trusted control surface
- **Status:** Approved · 2026-09-15 (original CLAUDE.md draft)
- **Decision:** Transcripts, structured records, corrections, and status are reviewed and managed in the web app.

### D-003 · All channels share one action layer and one data source
- **Status:** Approved · 2026-09-15 (original CLAUDE.md draft)
- **Decision:** SMS, web, and future channels use the same application actions and authoritative data. Changes from chat appear across the app in real time.
- **Reason:** Product rules and data ownership must not depend on a channel.

### D-004 · Supabase is the system of record
- **Status:** Approved · 2026-09-15 (original CLAUDE.md draft)
- **Decision:** Supabase holds the authoritative data for the first implementation.

### D-005 · Twilio for messaging, Vercel for hosting, GitHub for code
- **Status:** Approved · 2026-09-15 (original CLAUDE.md draft)
- **Decision:** These are the current providers. They may change, so they sit behind our own interfaces.

### D-010 · The design system lives in the repo; Claude doesn't take specs from Paper
- **Status:** Approved · 2026-09-15 (user instruction). **Clarified by D-034:** "doesn't use Paper" means Claude doesn't read other Paper boards and infer the design system from them. Creating mockups in Paper is expected.
- **Decision:** `docs/design.md`, exported from the "Housemate Design System" page, is the design system. Claude disregards everything else in Paper and doesn't consult Paper again. Paper visuals are for the user's review only.
- **Reason:** Specs must be readable and versioned alongside the code.

### D-011 · The agent is Claude, running on the server
- **Status:** Approved · 2026-09-15 (answer to open question 1a)
- **Decision:** Housemate's agent is Claude, running server-side.

### D-012 · The agent reads Housemate's records; the prototype uses dummy data
- **Status:** Approved · 2026-09-15 (1b). The dummy-data clause is superseded by D-028.
- **Decision:** The agent has real access to Housemate's own records. In the prototype those records hold dummy data. Connectors to inbox, email and calendars come in the eventual product, not the prototype.

### D-013 · The agent acts on its own, except where money is involved
- **Status:** Approved · 2026-09-15 (1c, 1d, clarified the same day)
- **Decision:** The agent can change anything in Housemate and acts on its own. The starting rule is that anything involving a payment, or that could lead to one, needs the member's confirmation first. That includes fees such as deposits, cancellation fees and accepting a quote.

### D-014 · The agent contacts vendors itself, or hands the member everything needed
- **Status:** Approved · 2026-09-15 (1e)
- **Decision:** The agent contacts vendors wherever it can, including using computer use to book appointments. When it can't, it gives the member all the relevant information, including direct links and contact details, to do it themselves.

### D-015 · One SMS thread, sorted into conversations by topic
- **Status:** Approved · 2026-09-15 (1f)
- **Decision:** The agent assigns each inbound text to an open conversation by topic, or starts a new one. Members can move a message to another conversation in the web app.

### D-016 · Unprompted texts are narrowly scoped and monitored
- **Status:** Approved · 2026-09-15 (1g)
- **Decision:** The agent may text first only to remind the member of upcoming appointments and to follow up on important issues, such as payment problems. Other unprompted texts are out of scope unless approved, and all unprompted texts are monitored.

### D-017 · The agent sounds like a friend, not an agent
- **Status:** Approved · 2026-09-15 (1h)
- **Decision:** Casual, brief, and friendly, as in the reference thread the user shared. The voice guide is in `docs/product.md`.

### D-018 · Web corrections don't send an SMS
- **Status:** Approved · 2026-09-15 (1i)
- **Decision:** Correcting a record in the web app updates the record but doesn't text the member.

### D-019 · Four acceptance scenarios define "the agent works"
- **Status:** Approved · 2026-09-15 (1j)
- **Decision:** Reminder by text, AC repair, errand by text, and a property item from an MMS photo. Details are in `docs/product.md`.

### D-020 · The prototype is for real use by a small set of users, on real vendor sites
- **Status:** Approved · 2026-09-15 (user instruction)
- **Decision:** A small set of real users will use the prototype the way they'd use the product and give feedback. The agent's computer use works on real vendor websites, not a mock.

### D-023 · The agent can pay on the member's behalf after confirmation, using Stripe
- **Status:** Approved · 2026-09-15 (user instruction)
- **Decision:** Once the member confirms a payment (D-013), the agent completes it for them. Stripe is the payments provider.

### D-024 · Vendor accounts, logins and CAPTCHAs are handed to the member, for now
- **Status:** Approved · 2026-09-15 (user instruction)
- **Decision:** The agent doesn't create vendor accounts, use the member's logins, or attempt CAPTCHAs. It hands that step to the member with the link and what to book.

### D-025 · Payments use Housemate-funded single-use Stripe Issuing cards
- **Status:** Approved · 2026-09-15 (build planning)
- **Decision:** For each confirmed payment, Housemate places a hold on the member's saved card, then creates a single-use Issuing card for exactly that amount. Worker code fills in the card number, which never enters the model's context. Live payments wait on business registration and Issuing approval; until then, payments are built in Stripe test mode.
- **Note:** Money moves from the member to Housemate to the vendor. Check with counsel before scaling beyond the pilot.

### D-026 · TypeScript throughout
- **Status:** Approved · 2026-09-15 (build planning)
- **Decision:** Next.js (App Router) on Vercel for the web app and webhooks; a TypeScript worker on a container host for agent runs, scheduling and the browser sandbox; Supabase; Tailwind themed from the `docs/design.md` tokens; Vitest and Playwright. The agent loop uses the Anthropic TypeScript SDK with `claude-opus-5`.

### D-027 · The Housemate team does weekly errand visits
- **Status:** Approved · 2026-09-15 (build planning)
- **Decision:** Errand requests and upcoming visits appear in an internal ops view, and someone on the team does the visits.

### D-028 · Real data only; every home starts empty
- **Status:** Approved · 2026-09-15 (user instruction)
- **Decision:** Members are real users, so the product has no dummy data. Every home starts empty, with a zero state in each area, and fills up through use. Generated test data lives only in local and test environments, and production data is never copied out of production. Supersedes D-012's dummy-data clause and withdraws D-021.

### D-029 · Pilot of up to 10 members, invite-only
- **Status:** Approved · 2026-09-15 (user instruction)

### D-030 · Cost budget of $100 per member per month, flagged not blocked
- **Status:** Approved · 2026-09-15 (user instruction)
- **Decision:** Track each member's costs (Claude, including computer use, and Twilio) from the start, and estimate from real usage. The initial budget is $100 per member per month. A member going over is flagged to the team; the agent isn't stopped.

### D-031 · Build plan
- **Status:** Approved · 2026-09-15
- **Decision:** Build in the vertical slices described in `docs/build-plan.md`. Each slice gets a detailed plan in `tasks/todo.md`, approved before implementation.

### D-032 · Claude Code runs in its built-in sandbox
- **Status:** Approved · 2026-09-15 (user instruction, option A; a full dev container may follow later)
- **Decision:** Claude's shell commands run in Claude Code's built-in sandbox, configured in `.claude/settings.json`:
  - Writes are limited to the project and the pnpm, corepack and npm caches.
  - SSH, AWS, GitHub CLI and Docker credentials can't be read.
  - Network access is limited to npm, GitHub, Google Fonts and localhost.
  - Docker and Supabase CLI commands need the Docker socket, so they run outside the sandbox one at a time, each through the normal permission check.
- **Reason:** Contain mistaken commands and malicious packages before real credentials exist. Staging and production changes already go through MCP connectors (CLAUDE.md), so their secrets never need to be inside the sandbox.

### D-033 · Sign-in is built from existing design tokens
- **Status:** Approved · 2026-09-15 (user instruction, answering a question raised while building Slice 0 step 4)
- **Decision:** The design system covers no sign-in page, text field, button or focus treatment, and Mobbin's MCP isn't connected for pattern research. Sign-in is built from existing tokens rather than left unstyled or deferred: the field follows the search bar, the primary button is an evergreen fill at nav-item height, focus is an evergreen outline, and hover changes opacity so no second green enters the palette. The specific values are recorded as **Q13** in `docs/design.md` for approval, and may become named components later.
- **Reason:** Real pilot members sign in before any of these get designed, and inventing colors would be harder to undo than reusing tokens.
- **Note:** Superseded by D-036. The values first built were never approved; the approved design came from a Paper mockup.

### D-034 · Visual design is done in Paper; `docs/design.md` stays the written source of truth
- **Status:** Approved · 2026-09-17 (user instruction). Clarifies D-010.
- **Decision:**
  - **Every visual design goes in Paper for approval.** Anything the design system doesn't already cover — a page, component, field, button or state — is mocked up in Paper through the Paper MCP and approved there before it's built. A description in markdown is not a design proposal and won't be approved.
  - **Claude creates mockups in Paper and reads back its own work**, including screenshots and computed values, to iterate and to carry exact values into code.
  - **Claude still doesn't take specs from the rest of the Paper file.** That is all D-010's "disregard Paper" meant: other boards must not be read and turned into assumptions about the design system.
  - **`docs/design.md` remains the written source of truth** for tokens, components and patterns. Changes to it still need approval, and an approved mockup is recorded there.
  - **Design work uses the `/impeccable` command.** The user invokes it; Claude carries out the work it directs.
- **Reason:** The user reviews design visually, not as prose. The original rule was written to stop Claude inferring a design system from unrelated Paper boards, not to keep design work out of Paper.

### D-035 · Everything waiting on the user is tracked in Linear
- **Status:** Approved · 2026-09-17 (user instruction). Partly answers open question 16.
- **Decision:**
  - **Every action or question Claude needs from the user is a Linear issue** assigned to the user, not only a line in chat or in the docs.
  - **Priority is urgency:**
    - **Urgent:** blocks work now, or has a long lead time.
    - **High:** needed for the current slice.
    - **Medium:** needed for the next slice.
    - **Low:** a default is in effect, so answer anytime.
  - **State is readiness:** Todo when the user can act now, Backlog while it waits on Claude (for example, a mockup not yet built).
  - Each issue says what's needed, why, what it blocks, and the default in effect if there is one.
  - Claude checks these issues at the start of each session, records answers in the docs as usual, and closes issues once they're resolved. All changes go through the Linear MCP.
  - **Where:** the Linear project "Waiting on you" in the Housemate team (issue keys `HOU-`), with the labels Action, Decision and Review. Set up on 2026-09-17 with HOU-5 to HOU-29.
- **Reason:** The user wants to see at a glance what's waiting on them and how urgent it is, so they aren't a bottleneck.

### D-036 · The sign-in page design is approved
- **Status:** Approved · 2026-09-17 (user approval in chat, of the Paper boards "Sign-in · A1–A6 · Approved r1"). Answers design Q13 and supersedes D-033's values.
- **Decision:**
  - **Layout:** a 600px evergreen story panel explains Housemate (texting needs no sign-in, Housemate handles things, the web app shows everything), beside the sign-in form on the canvas. Chosen over a three-step layout and an example-conversation layout.
  - **Code step:** it signs in automatically when the sixth digit is entered. There's no submit button and no "Resend code". "Use a different number" stays.
  - **Controls:** the text field, primary button and text button are the first shared form controls, specified in `docs/design.md` §4. The field's resting border is `--color-muted` (4.9:1), chosen over line-strong (1.4:1) for visibility.
  - **Context from the user:** members text Housemate without ever signing in, because their number identifies them. The web sign-in is mostly used on desktop.
- **Reason:** The user reviewed and approved the mockups in Paper, as D-034 requires.
- **Still to do:** the build doesn't match yet. Automatic sign-in is a behavior change, so it's planned before it's built.

### D-037 · The web app meets WCAG 2.2 AA
- **Status:** Approved · 2026-09-17 (user answer during `/impeccable init`)
- **Decision:** Every web app screen meets WCAG 2.2 AA. That includes 4.5:1 contrast for text, 3:1 for controls and focus indicators, full keyboard use, and labelled form fields.
- **Reason:** The design system already checks colors against AA. This makes AA the standard for everything, not just the colors.
- **Also recorded:** the product record in `docs/product.md` gained Platform, Users, Positioning ("We own the mundane"), Operating context, Evidence on hand, Product principles and Accessibility sections.

---

## Proposed

### D-006 · Every record is traceable to its source
- **Status:** Proposed · 2026-09-15
- **Decision:** Each record stores the message, user, or agent action that created or last changed it.
- **Reason:** Users can't understand or correct what the agent did without knowing where a record came from.
### D-007 · Corrections are kept as history
- **Status:** Proposed · 2026-09-15
- **Decision:** Changes to agent-created records are recorded as history rather than silent overwrites.
- **Reason:** Lets the user see what the agent did versus what they changed, and gives the agent feedback to learn from.
### D-008 · Sensitive home data stays out of logs, fixtures, and commits
- **Status:** Proposed · 2026-09-15
- **Decision:** Access codes, alarm codes, addresses, and interior photos never appear in logs, seed data, test fixtures, or commits. Secrets live in environment variables.
- **Reason:** A home-management product holds data that gives physical access to someone's home.

### D-009 · SMS flows are verified with a local simulator
- **Status:** Proposed · 2026-09-15
- **Decision:** A local simulator sends messages through the same handler as the Twilio webhook, so text flows can be tested end to end without a phone. Real-device testing is a separate manual step.
- **Reason:** Claude can't send or receive real texts, and "verify before done" needs to be achievable.

### D-021 · Demo homes and real homes
- **Status:** Withdrawn · 2026-09-15. All members are real users with real data (D-028), so there are no demo homes.
- **Decision:** Every home is marked **demo** or **real**.
  - **Demo homes** hold dummy data for development and testing. The agent can browse real sites for them but never submits anything: no bookings, forms or messages to vendors.
  - **Real homes** hold the member's real name, phone and address, and start empty or with details the member provides. Real-world actions only happen for real homes.
- **Reason:** D-012 (dummy data) and D-020 (real sites) conflict. Booking a real technician with a fake name and address wastes vendors' time and could lead to no-show fees. Seeded history, like fake equipment models, could also be passed to real vendors as fact.

### D-022 · The payment check is enforced in code, not just in the prompt
- **Status:** Approved · 2026-09-15 (user instruction)
- **Decision:**
  - The application blocks any step that involves or could involve a payment until the member confirms it (D-013). The model's instructions alone aren't enough.
  - Content from websites is treated as untrusted data. It can never approve a payment or change what the agent is allowed to do.
  - Every real-world action the agent takes is logged.
- **Reason:** The agent reads real websites while able to change everything and message the member. A malicious or confusing page must not be able to talk it into spending money.
