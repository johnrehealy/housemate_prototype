# Housemate Prototype — Build Plan

## Context

The goal is a working prototype that a small group of real users can use the way they'd use the product, and give feedback on. Members text Housemate (SMS/RCS/MMS). A Claude agent, running on the server, handles repairs, services, errands and reminders. Everything the agent does shows up in real time in a web app, where members can see and correct it.

The repo today contains only documentation: `CLAUDE.md`, `docs/product.md`, `docs/design.md`, `docs/decisions.md` and `docs/open-questions.md`. This plan covers the whole build as a sequence of vertical slices. Each slice gets its own detailed plan in `tasks/todo.md` before it's implemented.

**Binding decisions:**
- **Channels:** SMS first, and all channels share one action layer (D-001 to D-003).
- **Agent:** Claude on the server (D-011).
- **Data:** Housemate's own records, which the agent can read (D-012).
- **Autonomy:** the agent acts on its own, but anything involving money needs a yes (D-013).
- **Vendors:** the agent contacts vendors itself, including via computer use (D-014), for real use on real vendor sites (D-020).
- **Payments:** the agent pays through Stripe after confirmation (D-023).
- **Hand-offs:** vendor accounts, logins and CAPTCHAs go to the member (D-024).
- **Conversations:** texts are sorted into conversations by topic (D-015).
- **Texting first:** proactive texts are narrowly scoped (D-016).
- **Voice:** sounds like a friend (D-017).
- **Corrections:** web corrections don't send a text (D-018).
- **Acceptance:** four scenarios define "done" (D-019).

**Answered while planning** (recorded in `docs/decisions.md` once this plan is approved):
- **Payments:** Housemate-funded single-use Stripe Issuing cards, each created after a hold on the member's saved card.
- **Stack:** TypeScript throughout: Next.js on Vercel, a TypeScript worker on a container host, Supabase.
- **Errands:** the Housemate team does the weekly visits, using an internal ops view.
- **Business entity:** Housemate isn't registered yet (no EIN). That gates live payments and standard texting registration.
- **Real data only.** Members are real users, so there's no dummy data in the product. Every home starts empty, with zero states in every area, and fills up through use. This replaces D-012's dummy data and withdraws D-021.
- **Pilot:** up to 10 members, invite-only.
- **Budget:** track costs first and estimate from real usage. The initial budget must not exceed **$100 per month per member**, and going over is flagged to the team, not blocked. *This plan reads the budget as per member. If $100 was meant for the whole pilot, correct it at approval; the alert threshold changes, nothing else.*
- **D-022 approved:** payment and submission checks are enforced in code, and web content is untrusted.

## Architecture

```
Member phone ──SMS/RCS/MMS──▶ Twilio ──webhook──▶ Next.js on Vercel ──enqueue──▶ Job queue (Postgres)
Member browser ◀─Realtime── Supabase (Postgres, Auth, Realtime, Storage) ◀── Application actions
                                                    ▲                               ▲
                                   Agent worker (container host) ── tool calls ─────┘
                                     ├─ Claude agent loop (Anthropic TS SDK tool runner)
                                     ├─ Browser sandbox for computer use (Chromium + virtual display)
                                     └─ Scheduler: wake_at timers, reminders, follow-ups
Stripe (Customers, payment holds, Issuing single-use cards) ◀── payment actions + webhooks
```

- **Web app and webhooks:** Next.js (App Router, TypeScript) on Vercel. The Tailwind theme is generated from the token block in `docs/design.md` §2.
- **Application action layer** (`src/actions/`): typed, zod-validated functions that are the *only* way to write data. The web UI, the SMS handler and the agent's tools all call them. Each action writes the record and an `activity_events` row (who did it, which channel, which message or agent run, and before/after values) in one database transaction. This implements invariants 1, 3 and 4.
- **Agent worker:** a long-running TypeScript service on a container host.
  - Why not Vercel: agent runs can span minutes, and computer use needs a real browser, which Vercel functions can't provide.
  - It consumes jobs from a Postgres-backed queue and runs the agent loop with the Anthropic TypeScript SDK tool runner on `claude-opus-5` with adaptive thinking. It keeps each home's conversation state in our database.
  - The agent's tools map one-to-one to application actions, plus computer use and web search.
  - Why not Managed Agents: our payment and submission checks, conversation state and audit trail need to live in our own code and database.
- **Scheduler:** delayed queue jobs handle `wake_at`, reminder delivery and follow-ups. Quiet hours are enforced in the send action, not the prompt.
- **Local SMS simulator:** a dev-only page and CLI that posts to the same inbound handler and captures outgoing texts. It's how SMS flows are verified (D-009).

## Build slices

Each slice ends in something demonstrable, and each gets a detailed plan and approval before implementation.

**Slice 0 — Foundation**
- Git repo and GitHub remote; Next.js scaffold; lint, typecheck and Vitest in CI; Vercel preview deploys.
- Supabase local stack and remote project; core schema: `homes` (address, timezone), `members`, `conversations`, `messages`, `activity_events`; row-level security so members only see their own home.
- **Data separation:** production starts empty. Development and tests use a local seed script that never runs against production, and production data is never copied into development.
- Invite-only phone sign-in (Supabase phone one-time code, with an allowlist capped at 10 members) and an app shell matching the design system: 260px nav, utility bar.
- **Zero states:** the design system has one only for Errands. Each area's zero state is designed and built in the slice that first delivers that area, using a Mobbin reference and an Impeccable review.
- **Cost tracking from day one:** each agent run records Claude token cost (including computer use) and Twilio message cost against the member. Crossing $100 in a calendar month alerts the team.
- Worker skeleton with queue, Twilio inbound webhook with signature check, outbound send action, SMS simulator.
- Fill in the Commands section of `CLAUDE.md`.

**Slice 1 — Scenario 1: reminder by text**
- **Text flow:** an inbound text starts an agent run, which picks a conversation by topic. The agent asks one clarifying question if needed, then calls `createReminder`, and the reminder is delivered on time.
- **Web:** the Chat conversation view (realtime), To Do list, a basic Schedule week view, and a reminder detail page showing where it came from, with a correction form and history. Corrections don't send a text.
- **Agent quality:** a voice system prompt from `docs/product.md`, and an eval set of scripted texts graded on outcome and tone.

**Slice 2 — Scenario 4: property item from a photo**
- MMS media stored privately in Supabase Storage.
- Claude reads the photo and calls `addPropertyItem`, then confirms back in voice.
- Property page (list and detail with correction); Chat > Files.
- Property layout isn't in the design system, so it gets a Mobbin reference and an Impeccable review.

**Slice 3 — Scenario 3: errand by text**
- Errands schema (delivery/pickup/activity; items; status) and home visits.
- Errands page: zero state, Next, All with count summary, and errand rows.
- The agent creates errands from texts.
- An internal ops view where the team sees upcoming visits and errand requests and updates their status.

**Slice 4 — Scenario 2a: AC repair, up to the vendor hand-off**
- Vendors, service visits, and Services Active/Inactive/Find.
- The agent looks up equipment in Property and service history, searches the web for known issues and recalls, and troubleshoots in voice.
- If it can't book, it hands the member the vendor's contact details and links (D-014).
- Follow-up texts after appointments (D-016).

**Slice 5 — Scenario 2b: booking on real vendor sites**
- A browser sandbox container per task, driven by computer use. Screenshots are kept for audit, with payment steps redacted.
- **Test fixtures:** tests and evals run against a local fake vendor site. Only members' real agent runs in production touch real vendor sites.
- **Booking rules:** bookings with a deposit or cancellation fee need confirmation first. Accounts, logins and CAPTCHAs are handed to the member (D-024).
- The booked visit lands in Schedule and Services.

**Slice 6 — Payments** (built in Stripe test mode; live payments wait on business registration and Issuing approval)
- Members save a card through Stripe during onboarding; card data lives only at Stripe.
- `requestPayment` creates a pending request and texts the amount, vendor and reason. The member replies yes by text, or approves on the web.
- **Server-side approval check.** Server code, not the model, checks the approval. It then:
  1. places a hold on the member's card;
  2. creates a single-use Stripe Issuing card for exactly that amount;
  3. fills the card into the vendor's checkout from worker code, so the card number never enters the model's context or its screenshots.
- A Stripe authorization webhook declines anything that doesn't match an approved request. Afterwards the member's hold is captured for the actual amount, the card is closed, and a receipt is attached to the record.
- Follow-up texts for payment problems.

**Slice 7 — Pilot readiness**
- Invites and onboarding (opt-in consent text, address, card).
- Feedback capture: the design system's thumbs-up in the web app, plus texted feedback.
- Internal monitoring: agent runs, proactive-text log, payment requests, errors, and cost per member against the $100/month budget, with over-budget members flagged.
- Messaging compliance live (verified number, STOP/HELP), terms and privacy policy links, and member data export and delete.

## Start now (long lead times, alongside Slice 0)

- **Business and EIN: on the critical path.** Stripe Issuing and standard texting registration both need them.
- **Twilio:** until there's an EIN, a sole-proprietor 10DLC registration (one number, low volume) may be enough for a small pilot; confirm current requirements. Once the business is registered, move to toll-free verification (2–3 weeks) or standard 10DLC. Either route needs a website, privacy policy and opt-in wording.
- **Stripe:** open the account now and build Slice 6 in test mode. Apply for Issuing once the business is registered.
- **Anthropic API:** an organization and API key for the worker.
- **Container host:** an account for the worker.
- **MCP connectors** for Supabase, Vercel, Stripe, GitHub, Linear and Twilio. Per CLAUDE.md, remote changes without these are blocked.

## Risks and things to fix in the docs

- **Real data from day one.** Real names, phone numbers, addresses and home details arrive with the first member. Invariant 6, row-level security and the dev/production data separation must be in place in Slice 0, before any member is invited.
- **Bookings with fees but no payment at booking** can't be blocked by the card mechanism. They rely on the agent's instructions, plus an audit log review of every real-site submission during the pilot.
- **Money flow.** With Housemate-funded single-use cards, money moves from the member to Housemate to the vendor. That's fine for a small pilot, but check with counsel before scaling.
- **Cost.** Computer use with Opus 5 is token-heavy, and booking tasks are the most likely to push a member past $100/month. Slice 1 cost data gives the first estimate. If projections exceed the budget, flag it before Slice 5, with options such as lower effort for routine turns or tighter screenshot sizes.
- **No registered business yet.** Slices 0–5 can be built regardless, but real members can't be texted at volume or charged until registration and approvals are done. Start those now.

## Verification (every slice)

- **Tests:** Vitest unit tests for every action, including that an activity event is written; database tests for row-level security; Playwright for web flows.
- **Agent evals:** a scenario eval run through the SMS simulator, graded on outcome, the money rule, and voice.
- **Safety:** tests and development runs never submit to real sites (CLAUDE.md). The Slice 5 and 6 fixtures cover booking and payment end to end.
- **Staging:** deploy to staging. The user does a real-phone check for anything texted.

## Open questions

The remaining questions in `docs/open-questions.md` keep their defaults. Each slice plan will raise any that block it.

## First steps after approval

1. Update the docs:
   - **decisions.md:** record the planning answers (payments, stack, errands team, entity status, real data with zero states, pilot size, budget). Mark D-022 approved, D-021 withdrawn, and D-012's dummy-data clause replaced.
   - **product.md:** update the dummy-data line.
   - **open-questions.md:** remove the answered questions.
2. Write the detailed Slice 0 plan (files, schema, commands, verification) to `tasks/todo.md` for approval before any code is written.
