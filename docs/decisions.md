# Decisions

Approved decisions are binding. A decision marked Proposed is a recommendation awaiting the user's approval; don't treat it as settled.

Entries are listed by number and never renumbered, so a reference like D-013 always points at the same decision. To add one, append an entry with the next number. To reverse one, add a new entry that supersedes it rather than editing the old one. When an entry is approved, withdrawn or superseded, update its status line and leave the rest of it alone: the text is the record of what was decided at the time.

**Entry format:** number and title, status (Proposed / Approved / Withdrawn / Superseded by D-nnn), date, decision, and reason.

---

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

### D-006 · Every record is traceable to its source
- **Status:** Approved · 2026-09-17
- **Decision:** Each record stores the message, user, or agent action that created or last changed it.
- **Reason:** Users can't understand or correct what the agent did without knowing where a record came from.

### D-007 · Corrections are kept as history
- **Status:** Approved · 2026-09-17
- **Decision:** Changes to agent-created records are recorded as history rather than silent overwrites.
- **Reason:** Lets the user see what the agent did versus what they changed, and gives the agent feedback to learn from.

### D-008 · Sensitive home data stays out of logs, fixtures, and commits
- **Status:** **Proposed. The user wants to discuss this one further** · raised 2026-09-15, held 2026-09-17 (HOU-23). It is followed in the meantime, and it is also product invariant 6 in `CLAUDE.md`.
- **Decision:** Access codes, alarm codes, addresses, and interior photos never appear in logs, seed data, test fixtures, or commits. Secrets live in environment variables.
- **Reason:** A home-management product holds data that gives physical access to someone's home.

### D-009 · SMS flows are verified with a local simulator
- **Status:** Approved · 2026-09-17
- **Decision:** A local simulator sends messages through the same handler as the Twilio webhook, so text flows can be tested end to end without a phone. Real-device testing is a separate manual step.
- **Reason:** Claude can't send or receive real texts, and "verify before done" needs to be achievable.

### D-010 · The design system lives in the repo; Claude doesn't take specs from Paper
- **Status:** Approved · 2026-09-15 (user instruction). **Clarified by D-034:** "doesn't use Paper" means Claude doesn't read other Paper boards and infer the design system from them. Creating mockups in Paper is expected.
- **Decision:** `docs/design.md`, exported from the "Housemate Design System" page, is the design system. Claude disregards everything else in Paper and doesn't consult Paper again. Paper visuals are for the user's review only.
- **Reason:** Specs must be readable and versioned alongside the code.

### D-011 · The agent is Claude, running on the server
- **Status:** Approved · 2026-09-15 (answer to open question 1a)
- **Decision:** Housemate's agent is Claude, running server-side.

### D-012 · The agent reads Housemate's records; the prototype uses dummy data
- **Status:** Approved · 2026-09-15 (1b). The dummy-data clause is superseded by D-028, and the connectors clause by the product record: connectors to the member's inbox, email and calendars are part of the product.
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

### D-023 · The agent can pay on the member's behalf after confirmation, using Stripe
- **Status:** Approved · 2026-09-15 (user instruction)
- **Decision:** Once the member confirms a payment (D-013), the agent completes it for them. Stripe is the payments provider.

### D-024 · Vendor accounts, logins and CAPTCHAs are handed to the member, for now
- **Status:** Approved · 2026-09-15 (user instruction)
- **Decision:** The agent doesn't create vendor accounts, use the member's logins, or attempt CAPTCHAs. It hands that step to the member with the link and what to book.

### D-025 · Payments use Housemate-funded single-use Stripe Issuing cards
- **Status:** Approved · 2026-09-15 (build planning)
- **Decision:** For each confirmed payment, Housemate places a hold on the member's saved card, then creates a single-use Issuing card for exactly that amount. Worker code fills in the card number, which never enters the model's context. Live payments wait on business registration and Issuing approval; until then, payments are built in Stripe test mode.
- **Note:** Money moves from the member to Housemate to the vendor. Check with counsel before scaling beyond the pilot (HOU-28).

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
- **Status:** Approved · 2026-09-15 (user instruction). Superseded in part by D-063: the $100 is the whole pilot's, not each member's.
- **Decision:** Track each member's costs (Claude, including computer use, and Twilio) from the start, and estimate from real usage. The initial budget is $100 per member per month. A member going over is flagged to the team; the agent isn't stopped.
- **Note:** Whether $100 is per member or for the whole pilot is still to be confirmed (HOU-24). Per member is what's built to.

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
- **Status:** Superseded by D-036 · approved 2026-09-15 (user instruction, answering a question raised while building Slice 0 step 4). The values first built were never approved; the approved design came from a Paper mockup.
- **Decision:** The design system covers no sign-in page, text field, button or focus treatment, and Mobbin's MCP isn't connected for pattern research. Sign-in is built from existing tokens rather than left unstyled or deferred: the field follows the search bar, the primary button is an evergreen fill at nav-item height, focus is an evergreen outline, and hover changes opacity so no second green enters the palette. The specific values are recorded as **Q13** in `docs/design.md` for approval, and may become named components later.
- **Reason:** Real pilot members sign in before any of these get designed, and inventing colors would be harder to undo than reusing tokens.

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
  - **Where:** the Linear project "Checklist" in the Housemate team (issue keys `HOU-`), with the labels Action, Decision and Review. Set up on 2026-09-17 with HOU-5 to HOU-29.
- **Reason:** The user wants to see at a glance what's waiting on them and how urgent it is, so they aren't a bottleneck.

### D-036 · The sign-in page design is approved
- **Status:** Approved · 2026-09-17 (user approval in chat, of the Paper boards "Sign-in · A1–A6 · Approved r1"). Answers design Q13 and supersedes D-033's values.
- **Decision:**
  - **Layout:** a 600px evergreen story panel explains Housemate (texting needs no sign-in, Housemate handles things, the web app shows everything), beside the sign-in form on the canvas. Chosen over a three-step layout and an example-conversation layout.
  - **Code step:** it signs in automatically when the sixth digit is entered. There's no submit button and no "Resend code". "Use a different number" stays.
  - **Controls:** the text field, primary button and text button are the first shared form controls, specified in `docs/design.md` §4. The field's resting border is `--color-muted` (4.9:1), chosen over line-strong (1.4:1) for visibility.
  - **Context from the user:** members text Housemate without ever signing in, because their number identifies them. The web sign-in is mostly used on desktop.
- **Reason:** The user reviewed and approved the mockups in Paper, as D-034 requires.
- **Built:** 2026-09-21, in Slice 0 step 4, together with the narrow and medium widths it was waiting on (D-056, HOU-32). The Impeccable finish review found the build faithful to the approved boards.

### D-037 · The web app meets WCAG 2.2 AA
- **Status:** Approved · 2026-09-17 (user answer during `/impeccable init`)
- **Decision:** Every web app screen meets WCAG 2.2 AA. That includes 4.5:1 contrast for text, 3:1 for controls and focus indicators, full keyboard use, and labelled form fields.
- **Reason:** The design system already checks colors against AA. This makes AA the standard for everything, not just the colors.
- **Also recorded:** the product record in `docs/product.md` gained Platform, Users, Positioning ("We own the mundane"), Operating context, Evidence on hand, Product principles and Accessibility sections.

### D-038 · The project docs are mirrored in Linear
- **Status:** Approved · 2026-09-17 (user instruction: "I want all of these docs to live in Linear as well. Anytime a markdown gets updated it should then get updated in Linear.")
- **Decision:**
  - **What's mirrored:** the nine project docs. They are `CLAUDE.md`, the five files in `docs/`, and `tasks/todo.md`, `tasks/lessons.md` and `tasks/handoff.md`.
  - **Where:** each is a document in the Linear project "Key Docs". `docs/linear-docs.json` records each file's document and the version last copied.
  - **Not mirrored:** tool-generated files (`apps/web/AGENTS.md`, `apps/web/CLAUDE.md`, Impeccable's surface briefs).
  - **The repo stays the source of truth,** because the docs are versioned with the code. Linear holds copies.
  - **Copies stay current.** Claude updates the Linear copy in the same turn a file changes.
  - **Edits made in Linear are kept.** Claude copies them into the repo before its next update, so they are never overwritten.
  - **How:** through the Linear MCP, with `scripts/linear-docs.sh` tracking which copies are stale.
- **Reason:** The user wants to read and follow the docs in Linear, next to the issues waiting on them (D-035).

### D-039 · Build work is tracked in Linear too
- **Status:** Approved · 2026-09-17 (user answer to open question 16, left in the Linear copy of `docs/open-questions.md`)
- **Decision:** Claude's own build work is tracked as Linear issues in the Housemate team, alongside the issues waiting on the user (D-035). `tasks/todo.md` stays the approved slice plan and the place where per-step results are written; Linear carries the issue-level view.
- **Reason:** The user wants one place to see what is being worked on, not only what is waiting on them.

### D-040 · Quiet hours are 9 PM to 7:30 AM
- **Status:** Approved · 2026-09-17 (user answer to open question 2, left in the Linear copy of `docs/open-questions.md`)
- **Decision:** The agent sends no unprompted text between 9 PM and 7:30 AM in the member's timezone. Replies are unaffected. Each unprompted text is logged with what triggered it, in the internal monitoring view.
- **Note:** `sendMessage` in `packages/core` still enforces the earlier 10 PM to 8 AM window, and its tests assert it. Changing it is messaging behavior, so it is planned before it is built (HOU-31).

### D-041 · Lucid is the architecture-diagram tool
- **Status:** Approved · 2026-09-17 (user answer to open question 15, left in the Linear copy of `docs/open-questions.md`). The user's words: "LUCID IS ARCHITECTURE TOOL OF CHOICE".
- **Decision:** Architecture diagrams are made in Lucid, through its MCP. The MCP was connected on 2026-09-17 (HOU-30), so diagrams can be made.

### D-042 · Team alerts move to Slack eventually
- **Status:** Approved · 2026-09-17 (user answer to open question 19, left in the Linear copy of `docs/open-questions.md`)
- **Decision:** Team alerts start as a text to team phone numbers listed in configuration, plus an entry in the internal monitoring view, and move to Slack later.

---

## Recorded 2026-09-21, from answers already given

D-043 to D-055 record answers the user gave in the Linear copy of `docs/open-questions.md` on 2026-09-17, either by marking a default **User agreed/approved** or by writing an answer in. They were in effect from that date; this is where they are written down.

### D-043 · What the task model's owners mean
- **Status:** Approved · 2026-09-17 (answer to open question 1)
- **Decision:** In the task model, `homeowner` is the member, `housemate` is the agent, and `vendor` is the service provider. **Team** is a fourth idea, not a task owner: the company's employees and contract workers, who do the human actions such as the weekly errand visits (D-027). Weekly visits are modeled within Errands.

### D-044 · Safety emergencies are escalated, not troubleshot
- **Status:** Approved · 2026-09-17 (answer to open question 3)
- **Decision:** For a gas smell, an electrical hazard, flooding, a break-in or anything like them, the agent stops troubleshooting and tells the member to contact emergency services or the utility right away.

### D-045 · What a member must give before a reminder is saved
- **Status:** Approved · 2026-09-17 (answer to open question 4)
- **Decision:** The timezone is inferred from the home address. If the date or time is missing, the agent asks one short question rather than guessing.

### D-046 · Reminders appear in both Schedule and To Do
- **Status:** Approved · 2026-09-17 (answer to open question 5)
- **Decision:** One reminder record, shown in both Schedule (Reminders category) and To Do.

### D-047 · Desktop-first, with mobile layouts coming
- **Status:** Approved · 2026-09-17 (answer to open question 6). The user added: "mobile layouts are coming, for awareness."
- **Decision:** The web app is designed desktop-first at 1440 × 900. Layouts stay usable down to `--breakpoint-lg` (1024px). Narrow layouts aren't designed by default, but they are coming, so nothing should be built in a way that makes them hard to add.
- **Note:** The sign-in page is the first place this bites. Its narrow and medium layouts were mocked up in Paper and approved on 2026-09-21 as D-056 (HOU-32), because D-034 requires anything the design system doesn't cover to be approved there first.

### D-048 · One member per home in the prototype
- **Status:** Approved · 2026-09-17 (answer to open question 7). The user's words: "this will not be part of the prototype but a later phase."
- **Decision:** The data model allows several members per home, but several members per home is not part of the prototype. It's a later phase.

### D-049 · Signing in is an invite plus a texted code
- **Status:** Approved · 2026-09-17 (answer to open question 8)
- **Decision:** Inviting a member creates their account. They sign in with a one-time code texted through Twilio Verify via Supabase Auth, and new sign-ups are disabled. Verify sends from Twilio's own registered senders, so sign-in shouldn't be blocked by our pending texting registration; confirm that during setup.

### D-050 · Someone who isn't invited gets one reply
- **Status:** Approved · 2026-09-17 (answer to open question 9)
- **Decision:** A text from a number that isn't invited gets one short reply saying Housemate is invite-only right now. There's no agent run, and the message is logged.

### D-051 · Opt-in, STOP/HELP and MMS media
- **Status:** Approved · 2026-09-17 (answer to open question 11)
- **Decision:** Twilio's standard STOP and HELP handling. Opt-in consent is recorded at invite. MMS media is stored in a private Supabase Storage bucket.

### D-052 · Which sensitive data Housemate stores
- **Status:** Approved · 2026-09-17 (answer to open question 12)
- **Decision:** Real contact details — name, phone number and address — are stored, protected by product invariant 6 and row-level security. Access codes and alarm codes are not stored. Card details live only at Stripe.
- **Note:** D-008, which covers what must never reach logs, fixtures or commits, is still to be discussed (HOU-23). It is followed in the meantime.

### D-053 · The design's task and vendor models are the starting data model
- **Status:** Approved · 2026-09-17 (answer to open question 13)
- **Decision:** The task model and vendor model in `docs/design.md` §6 are the starting point for the data model. Each schema is still presented for approval in its slice plan.

### D-054 · The repo is `johnrehealy/housemate_prototype`
- **Status:** Approved · 2026-09-17 (answer to open question 17; the repo was created the same day, HOU-6)
- **Decision:** Code lives in a private repo, `johnrehealy/housemate_prototype`, on the user's GitHub account. Claude works on a branch per change, and commits and pushes only when asked.

### D-055 · Fly.io hosts the agent worker
- **Status:** Approved · 2026-09-17 (answer to open question 18)
- **Decision:** The agent worker runs on Fly.io, with staging and production apps deployed by GitHub Actions on merge.
- **Note:** Nothing is deployable yet — `apps/worker` is a skeleton with no Dockerfile or `fly.toml`. Supabase stays the system of record, so no Fly Managed Postgres. Secrets go in with `fly secrets set`, never in the dashboard's env box. The deploy token still needs adding to GitHub (HOU-11).

### D-056 · The sign-in page's narrow and medium layouts are approved
- **Status:** Approved · 2026-09-21 (user approval in chat, of the Paper boards "Sign-in · A7–A9 · Approved r1"). Extends D-036 and partly answers design Q12.
- **Decision:**
  - **Below `--breakpoint-lg` (1024):** one column, no story panel. The lockup moves to the top of the form column and the invite note to the bottom of the page.
  - **`--breakpoint-lg` to `--breakpoint-xl`:** two columns with the story panel at 400px, keeping all three "How it works" rows.
  - **`--breakpoint-xl` (1280) and up:** the approved 600px panel from D-036.
  - Type is identical at every width; only the page frame changes. Values are in `docs/design.md` §4 under Sign-in page.
- **Reason:** D-036's boards only covered 1440 × 900, so the build had no approved narrow behavior. The user chose to design it in Paper rather than improvise it, as D-034 requires.
- **Note:** This covers the sign-in page only. Every other screen is still 1440-only, so Q12 stays open.

### D-057 · The sign-in page's copy is revised
- **Status:** Approved · 2026-09-22 (the user edited the copy on the Paper boards, then settled two inconsistencies between boards in chat). Changes D-036's and D-056's copy; layout, type and colour are unchanged.
- **Decision:**
  - **Story panel:** headline "Every home needs a Housemate."; lead "Repairs, services, errands and upkeep, all in one place. Tell Housemate what you need and it gets to work."; three new row bodies under the same titles.
  - **Invite note:** "Housemate is currently invite-only", everywhere the panel appears. A2 carried this; A3–A5 still had the longer note, and the user chose the short one.
  - **Narrow (below `--breakpoint-lg`), exactly as drawn on A7 and A8:** the code-step helper is "A code is on its way.", and there is no invite note. Wider widths keep "If (number) is on the invite list, a code is on its way."
- **Reason:** The user rewrote the copy in Paper, as D-034 requires.
- **Trade-off the user accepted:** on a phone, someone with an uninvited number is told a code is on its way, and nothing on the page explains why it never arrives. It still doesn't reveal who is in the pilot, because every number gets the same sentence.

### D-058 · How the messaging path checks, orders and simulates texts
- **Status:** Approved · 2026-09-22 (user approval of the Slice 0 step 5 plan)
- **Decision:**
  - **The SMS simulator page is dev tooling, not a designed surface.** No member sees `/dev/sms`, so it's built plain from existing tokens with no Paper mockup, as an exception to D-034. It returns a 404 in production and requires sign-in everywhere else.
  - **`TWILIO_AUTH_TOKEN` is required in every environment.** The Twilio webhooks check every request against it, and the simulator signs with it. Locally it's an obviously fake value.
  - **A text's delivery status never moves backwards.** Twilio's callbacks can arrive out of order, so `queued` → `sent` → `delivered` / `undelivered` / `failed` only moves forward, and the last three are final.
- **Reason:** The webhooks must refuse anything Twilio didn't sign, and the simulator has to go through that same check to be a real test of the path (D-009). A late "sent" overwriting "delivered" would show a member a delivered text as pending.

### D-059 · Coding agents can work in a Fly.io Sprite
- **Status:** Approved · 2026-09-22 (user approval of the dev Sprite plan). Extends D-032, which expected that "a full dev container may follow later".
- **Decision:**
  - **One persistent Sprite, `mcp-housemate-dev`,** in the user's Fly.io organization, is a cloud dev environment where Claude Code sessions work on the prototype. Claude creates and runs it through the Sprites MCP in restricted mode, which only allows names starting with `mcp-`.
  - **Outbound traffic is denied by default.** The allowlist is `scripts/sprite/network-policy.json`: GitHub, npm, Google Fonts, Playwright's downloads, the Ubuntu mirrors, Supabase's images and Anthropic. Twilio, Stripe, remote Supabase, Vercel and every vendor site are denied, so nothing run there can text a real phone or touch a real vendor.
  - **Only generated data.** The Sprite runs local Supabase and the seed script. No staging or production credentials go on it (invariant 6), and its URL stays private.
  - **GitHub access is a fine-grained token** for this repo only (Contents and Pull requests, 90 days), which the user enters. Agents there work on their own branches and open PRs; nothing merges without the user.
  - **Claude Code's own sandbox stays on inside the Sprite,** so a sandboxed command can't read the `gh` token.
  - **Setup is `scripts/sprite/bootstrap.sh`,** which is safe to rerun. A `base` checkpoint is taken once it passes.
- **Reason:** Agents can work away from the Mac on a hardware-isolated machine that holds no credential beyond a one-repo token, costs nothing while idle, and can be put back to a known state from a checkpoint.
- **Note:** Docker in a Sprite is undocumented. If local Supabase can't run there, the plan is revisited rather than worked around (HOU-45). Whether Sprites also host Housemate's per-task browser sandbox is open question 23, and one Sprite per coding task is deferred until this one has been used.

### D-060 · How the worker's automatic replies behave
- **Status:** Approved · 2026-09-22 (user approval of the Slice 0 step 6 plan). Refines D-050 and D-051.
- **Decision:**
  - **An automatic reply is sent at most once.** Each reply carries an idempotency key (`ack:<text>` or `invite-only:<number>`), and a retried job that finds its reply already saved sends nothing, even if that earlier send never heard back from Twilio. A missed reply stays visible as `queued`; a duplicate text can't be taken back.
  - **A number that isn't invited gets one invite-only reply, ever** (D-050), however often it texts. Every text is still stored.
  - **The two texts:** the acknowledgment, "Hey {first name} - got it. This is an automatic reply while Housemate is being set up.", on locally and on staging only; and the invite-only reply, "Hi - Housemate is invite-only right now, so I can't help with requests from this number."
  - **STOP and HELP texts are stored but never queued** (D-051): Twilio has already answered them, and nothing of ours should. START, YES and UNSTOP are ordinary texts, so a member's "Yes" always reaches the agent.
  - **`/dev/thread` is dev tooling** under D-058's exemption, like `/dev/sms`: plain, signed in, and a 404 in production.
- **Reason:** A retried job is the normal case once a worker can crash, and a member texted twice for one message loses trust faster than one who waits for a reply that stalled.

### D-061 · A public landing page at myhousemate.co goes live now
- **Status:** Approved · 2026-09-22 (user approval of the landing page plan, and answers in chat on go-live, audience and proof). Pulls the production half of Slice 0 step 8 forward.
- **Decision:**
  - **`/` is a public marketing page.** Signed-out visitors see it; signed-in members go straight to `/chat`, as they do from `/sign-in`. `/` and `/sign-in` are the only public pages.
  - **New visitors first.** The hero tells the story, and sign-in sits in the bar and at the close. There is no inline phone field.
  - **The proof is the product as designed.** Illustrations of the designed app areas, with example names and details and labelled as examples. No testimonials, pricing, members, press or claims that don't exist yet, and no privacy or terms link until a policy exists.
  - **It goes live now.** A production Supabase project (sign-ups off, site URL `https://myhousemate.co`) and a Vercel project deploying `main` from GitHub, with root `apps/web`, serving `myhousemate.co` with `www` redirecting to it. Until Twilio is set up (HOU-5), texting and code sign-in fail closed in production.
- **Reason:** The prototype needs a front door that explains Housemate to someone who hasn't been invited yet, modelled on muse.ai.
- **Note:** The page is designed in Paper first (D-034); the boards are waiting on review (HOU-48), and its larger hero type goes into `docs/design.md` only once they're approved. Going live waits on the Vercel connector (HOU-47) and the DNS records (HOU-49).

### D-062 · Members can save vendor logins in a vault the agent can't read
- **Status:** Approved · 2026-09-22 (the user's answer to the landing page critique: a credential store is really planned). Supersedes the "logins are handed to the member" line in `docs/product.md`, and extends D-025's fill pattern from cards to logins.
- **Decision:**
  - **Members can save vendor logins,** and they go into a credential vault that the agent's model never reads.
  - **The fill happens outside the model,** exactly as D-025's single-use card fill does: worker code injects the secret into the browser sandbox at the moment the form asks for it. The value never enters the agent's context, the transcript, the logs, or a screenshot.
  - **"Hidden from Housemate" means that,** and only that: hidden from the agent and from everything a person can read back. It is not a phrase about encryption at rest.
  - **CAPTCHAs are still handed to the member.** A vault doesn't solve a CAPTCHA.
  - **Until it's built,** the agent hands the login step to the member, as it does today.
- **Reason:** The landing page claims it, and a claim on a public page has to be something we're actually building. The mechanism already exists for cards under D-025, so logins extend a pattern rather than invent one.
- **Note:** This isn't in slices 0–7 and needs its own plan and slice (HOU-56). Until then the landing page is describing the designed product, which D-061 allows — but the panel must not imply the vault is working today, and the wording should be checked against that before launch.

### D-063 · How costs are recorded, and when the team is texted
- **Status:** Approved · 2026-09-22 (the user's answers to the Slice 0 step 7 plan, and its approval). Supersedes D-030's "per member": the rest of D-030 stands. Answers open question 22 (HOU-24).
- **Decision:**
  - **The $100 is the whole pilot's monthly budget,** not each member's. Budget months run in UTC. Going over texts the team once a month and never blocks anything. The `member_over_budget` alert kind stays in the schema for when budgets become per member.
  - **A text costs what Twilio actually charged.** The price is fetched from Twilio's Message resource about a minute after the text is handled, and asked again with the queue's backoff until Twilio has priced it. Twilio's status callback carries no price, so the build plan's "Twilio price from the status callback" couldn't be taken literally. The simulator prices every text at a fixed, fake $0.0079.
  - **Inbound texts are costed too.** Twilio charges for them, and leaving them out would understate the bill by about a third.
  - **Three things text the team** (`TEAM_ALERT_PHONES`), each once, ever:
    - going over budget: "Housemate alert: costs for September are $104.32, over the $100 budget. Nothing is blocked."
    - a job that failed every retry: "Housemate alert: a job failed every retry and has been parked - inbound_messages, job 42. It won't run again on its own."
    - a text with no delivery result 15 minutes after it was saved: "Housemate alert: a text from 15 minutes ago still has no delivery result. Message 3f9a2b, to (555) 019-0001. It may not have gone out."
  - **Team alerts ignore quiet hours.** They go to the team's own phones, and a failure at 3 AM is worth knowing about. Quiet hours still apply to every text a member gets.
- **Reason:** A budget that flags rather than blocks is only useful if the figure is real, and a stalled job or text is only recoverable if someone hears about it.

### D-064 · The ops cost view
- **Status:** Approved · 2026-09-23 (the user's answers to the Impeccable critique of the r1 boards: show the month and work the alert state out, keep three figures and fix the sign, and take everything in scope. Then "ok continue" on the r2 boards, HOU-55.)
- **Decision:**
  - **`/ops/costs` is staff only.** Anyone else gets a 404. The page reads through the server connection, which bypasses row-level security, so the check is in the page's code.
  - **It shows one budget month at a time,** with a stepper. It has three figures (spent; left of or over the budget; alerts), a budget bar, the month's alerts, and a by-member table.
  - **An alert's state is worked out, not stored.** A stuck text is Resolved once it has a delivery result. A failed job needs a look while it's still parked. Going over budget is Flagged. Nothing needs clearing by hand for the page to stay true.
  - **Alerts the team never got are called out** above the figures and listed first, because the page is the only place they show.
  - **The design is recorded** in `docs/design.md`, §4 "Ops cost view". It lists the three places the build differs from the boards, and why.
- **Reason:** The r1 boards scored 19/40 in the Impeccable critique. They were hard to read, and their alert list went stale unless someone cleared it by hand.
