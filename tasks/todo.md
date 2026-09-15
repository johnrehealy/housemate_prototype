# Current Plan: Slice 0 — Foundation

**Status:** Approved · 2026-09-15 · In progress
**Build plan:** `docs/build-plan.md` (D-031)

## Goal

Build the skeleton every later slice depends on:
- **Messaging path:** a text comes in (through the local simulator), is stored, is picked up by the worker, and gets a reply. Both messages show up in the web app in real time.
- **Web app:** invited members sign in with a phone code and see the app shell.
- **Data foundations:** row-level security, the activity log and cost tracking are in place and tested.

**Not in this slice:**
- The Claude agent
- The designed Chat UI
- Zero-state designs
- Reminders, Stripe and computer use

No member gets invited to production in this slice.

## Prerequisites

**On this Mac** (checked 2026-09-15). Node 24 and git are installed.
- **Docker runtime (you install): required.** Docker Desktop or OrbStack runs the local Supabase stack.
- **pnpm (Claude sets up):** enabled through Corepack, which ships with Node.
- **Supabase CLI (Claude sets up):** installed as a project dev dependency, with no global install.
- **Not needed locally:** GitHub, Vercel and Fly CLIs. Deploys go through git, and remote changes go through MCP.

**Accounts and connectors (you).** None of these block steps 1–7, which run locally. They're needed for step 8.
- **GitHub:** connect the GitHub MCP, or create a private `housemate-prototype` repo.
- **Supabase:** an organization, plus the Supabase MCP. Claude creates the staging and production projects through it.
- **Vercel:** account linked to GitHub, plus the Vercel MCP.
- **Twilio:** account, a Verify service (for sign-in codes), one phone number, and the Twilio MCP. Start sole-proprietor 10DLC registration now (open question 10).
- **Fly.io:** account, with an API token saved as a GitHub Actions secret for worker deploys.
- **Anthropic API key:** not needed until Slice 1.

## Technical decisions for this slice (approve with the plan)

- **Monorepo** with pnpm workspaces: `apps/web`, `apps/worker`, `packages/core`, and `supabase/` (plus the existing `docs/` and `tasks/`).
- **Database access:**
  - Actions use Drizzle ORM over a direct Postgres connection, so each write and its activity event commit in one transaction.
  - The browser uses supabase-js for sign-in, realtime and reads, all under row-level security.
  - Schema and policies are defined in Drizzle, which generates SQL migrations into `supabase/migrations`; the Supabase CLI applies them.
- **Queue and scheduling:** Supabase Queues (pgmq) for jobs, including delayed jobs, and Supabase Cron for recurring checks. No extra infrastructure.
- **Environments:** local, staging and production. Production stays empty until members are invited.
- **Worker hosting:** Fly.io, deployed by GitHub Actions on merge (open question 18).
- **Styling:**
  - Tailwind v4 with the 95 tokens from `docs/design.md` §2 in `@theme`. The token names already follow Tailwind v4's theme namespaces; confirm the spacing names generate utilities during setup.
  - Lato through `next/font`, and Phosphor icons.

## Repo layout

```
apps/web/                  Next.js App Router
  app/(auth)/sign-in/      phone code sign-in
  app/(app)/layout.tsx     shell: 260px nav + 64px utility bar
  app/(app)/{chat,todo,schedule,services,errands,property}/
  app/api/twilio/inbound/  inbound texts (signature-checked)
  app/api/twilio/status/   delivery status + price callbacks
  app/dev/sms/             SMS simulator (local and staging only)
apps/worker/               queue consumer, scheduler, health check; Dockerfile, fly.toml
packages/core/             actions, Drizzle schema, domain types, SMS provider adapters
supabase/                  config, migrations, local-only seed script
.github/workflows/         ci.yml, deploy.yml
```

## Schema

| Table | Key columns | Notes |
|---|---|---|
| `homes` | name, address, timezone | |
| `members` | user_id → auth.users, home_id, phone (E.164, unique), first/last name, role (`member`/`staff`), status (`invited`/`active`/`removed`), sms_consent_at | A database check caps active members at 10 |
| `conversations` | home_id, subject, status, last_message_at | |
| `messages` | home_id, member_id, conversation_id (nullable until assigned), direction, channel (`sms`/`web`), author (`member`/`agent`/`system`), body, media, provider_sid (unique), delivery_status | Unique provider_sid makes inbound handling idempotent |
| `activity_events` | home_id, entity_type, entity_id, action, before, after, actor_type, actor_id, source_type, source_id | Append-only: no update or delete permissions |
| `usage_costs` | home_id, member_id, kind (`claude`/`twilio`), amount_usd, ref_type, ref_id, occurred_at | A monthly per-member view sits on top |
| `alerts` | kind, member_id, detail, notified_at, resolved_at | |

**Row-level security:**
- Members can read only their own home's homes, conversations, messages and activity events.
- `usage_costs` and `alerts` are staff-only.
- Browsers have no write access at all. Every write goes through a server-side action.

## Action layer

- **`defineAction` wrapper:** takes a zod input schema, an actor (who) and a source (which channel or message). It runs the handler in a transaction and writes the `activity_events` row in that same transaction.
- **Slice 0 actions:**
  - `inviteMember`: creates the home, auth user and member row, and enforces the 10-member cap.
  - `recordInboundMessage`: idempotent on provider_sid; enqueues a job.
  - `sendMessage`: takes kind `reply` or `proactive`. Proactive texts are blocked from 10 PM to 8 AM in the home's timezone.
  - `updateMessageStatus`.
  - `recordUsageCost`: raises one alert per member per month when the $100 budget is crossed (D-030).
- **SMS provider interface** with two implementations: Twilio, and a simulator for local development and tests. Environment config chooses between them.

## Steps

Each step ends with its check.

- [x] **1. Repo and tooling.** Git init, pnpm workspaces, strict TypeScript, ESLint, Prettier, Vitest, `.gitignore` (including `.env*`), `.env.example`.
  *Check:* `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
- [x] **2. Local database, schema and security.** (Seed script moved to step 3.) Supabase init, Drizzle schema, migrations. A seed script that generates fake data and refuses to run against anything but the local database.
  *Check:* `supabase db reset` applies cleanly. Security tests prove that member A can't read member B's home, browsers can't write, and activity events can't be edited or deleted.
- [ ] **3. Action layer.** `defineAction`, the Slice 0 actions, and the SMS provider interface.
  *Check:* integration tests against the local database prove that:
  - each action writes exactly one activity event;
  - a failure rolls back both the record and the event;
  - a duplicate inbound message is ignored;
  - an 11th member invite is rejected;
  - a proactive text at 11 PM is blocked.
- [ ] **4. Web app shell and sign-in.** Next.js, Tailwind theme from the design tokens, Lato, Phosphor; nav item states per `docs/design.md` §4; 64px utility bar; the six routes with temporary placeholder content; phone code sign-in (local test code; Twilio Verify in staging); protected routes.
  *Check:* Playwright signs in, moves between all six destinations, and asserts sidebar width, nav item height, colors and selected state against the design spec. Impeccable review of the shell.
- [ ] **5. Messaging path.** Twilio inbound and status routes with signature validation; the simulator page and a CLI; enqueueing jobs.
  *Check:* a request with an invalid signature gets a 403 and a valid one is accepted. A simulated text is stored and its job enqueued.
- [ ] **6. Worker.** A pgmq consumer with retries, a dead-letter queue, delayed jobs, graceful shutdown and a health check.
  - A temporary acknowledgment reply stands in for the agent; it's on in local and staging, and off in production.
  - Non-invited numbers get one invite-only reply (open question 9).
  - A minimal, unstyled thread view proves realtime.

  *Check:*
  - A simulator text leads to a reply that appears in the simulator and the thread view within a few seconds.
  - Killing the worker mid-job leads to a retry with no duplicate reply.
  - A non-invited number gets exactly one reply.
- [ ] **7. Cost tracking and alerts.** Twilio price from the status callback goes into `usage_costs`; a monthly per-member view; a team alert by text to the configured team numbers (open question 19).
  *Check:* a test crossing $100 creates exactly one alert and one team notification for that member and month.
- [ ] **8. CI, deploys and staging.**
  - GitHub Actions: lint, typecheck, unit tests, database tests against Supabase in CI, Playwright.
  - Vercel: previews per pull request, production on main.
  - Supabase: staging and production projects, with migrations applied on merge.
  - Fly.io: staging and production workers.

  Needs the accounts and connectors above.
  *Check:*
  - A pull request shows green CI and a preview URL.
  - The simulator loop works on staging.
  - You sign in to staging with a real phone code.
  - Real-phone texting waits on 10DLC registration.
- [ ] **9. Docs.** Fill in the Commands section of `CLAUDE.md`, record any new decisions, and add lessons from corrections.

## Done when

- CI is green, and the simulator loop and sign-in work locally and on staging.
- Security, activity-log, idempotency, member-cap, quiet-hours and cost-alert tests all pass.
- Production exists but has no members.

## Defaults this slice relies on

These come from `docs/open-questions.md`; say if any should change.
- **8. Sign-in:** invite creates the account; code texted via Twilio Verify; sign-ups disabled.
- **9. Non-invited texters:** one invite-only reply, no agent run.
- **17. Repo:** private `housemate-prototype`; branch per change; commit and push only when asked.
- **18. Worker hosting:** Fly.io.
- **19. Team alerts:** a text to team phone numbers, which you'll need to provide, plus the monitoring view.

## Results

**Step 1 (done, 2026-09-15).** pnpm workspace with `apps/web`, `apps/worker` and `packages/core`. `pnpm lint`, `pnpm typecheck`, `pnpm test` (5 environment-config tests) and `pnpm format:check` all pass.
- Vitest is pinned to 5.0.0, because pnpm's release-age policy rejects 5.0.1 (published the same day). esbuild is allowed to run its install script.
- The web typecheck runs `next typegen` first, so Next's route types exist.

**Step 2 (done, 2026-09-15).**
- **Local Supabase:** runs in Docker Desktop. Config changes: browser roles get no table access by default (`auto_expose_new_tables = false`), sign-ups are off, and Supabase's own seeding is off.
- **Migrations:**
  - `20260915205225_init_schema.sql` is generated by Drizzle from `packages/core/src/db/schema.ts`: seven tables, each with row-level security enabled.
  - `20260915205227_security.sql` is hand-written: helper functions in a non-exposed `private` schema, select-only grants for signed-in users, and read policies scoped to the member's home, with staff-only costs and alerts.
  - The same file also adds realtime on messages and conversations, an append-only trigger on `activity_events`, and the 10-member cap trigger.
  - Both apply cleanly with `supabase db reset`.
- **Database tests:** 10 tests (`pnpm test:db`), each in a transaction that's rolled back.
  - Members see only their own home.
  - Invited members see their own row only.
  - Signed-out visitors are denied.
  - Members can't insert, update or delete.
  - Costs and alerts are staff-only.
  - Staff see every home, including texts from unknown numbers.
  - The activity log can't be updated or deleted, even by the server.
  - The cap allows 10, excludes removed members and staff, and blocks reactivation.
  - Phones must be E.164, and non-staff need a home.
- **Proof the tests catch regressions:** with four protections broken (messages policy opened, both triggers dropped, insert granted), exactly the six tests covering them failed. After `supabase db reset`, all 10 pass again.
- **Local guard:** `assertLocalDatabase` refuses any non-local connection without echoing the URL. Test helpers use it. 3 unit tests, 25 unit tests in total.
- **Moved to step 3:** the local seed script, so it creates data through `inviteMember` rather than direct inserts.
- **Open (Slice 7):** the append-only activity log will need a controlled, audited path for deleting a member's data on request.

**Step 4 (shell done; sign-in, Playwright and Impeccable review wait on the database).**
- **Build:** `next build` passes. All 95 tokens are emitted as CSS variables (`@theme static`), and Tailwind's default scales are cleared, so no non-design colors exist.
- **Browser check at 1440×900:**
  - Sidebar 260px `#F5F3F1`; utility bar 64px; canvas `#FFFBF9`.
  - Nav items 40px tall, 2px apart, radius 8px, 11px padding.
  - Selected item: canvas fill, `#ECE8E5` border and `0 1px 2px rgba(20,52,47,.05)` shadow.
  - Icons: 20px, evergreen when selected, muted otherwise.
  - Labels: body color in every state, Lato 15/400/20/−0.01em.
  - Hover: `#FAF7F5` with a 120ms transition.
  - Clicking moves the selected state. No console or server errors.
- **Open:** the brand mark is a text placeholder ("Housemate"), because no logo asset exists in the repo yet. The utility bar is empty until its contents are specified.

**Step 3 (texting provider done; database actions wait on Docker).**
- `packages/core/src/sms`: the texting provider interface, a Twilio provider (sends through a Messaging Service with a status callback), a simulator provider, and `createSmsProvider` choosing between them.
- `isValidTwilioSignature` for webhook checks.
- The environment config now requires Twilio credentials when Twilio is the provider, and treats blank values as missing.
- 18 core tests pass. The signature tests check against Twilio's documented signing scheme computed independently of the SDK, and cover a missing signature, a changed body, a different URL and a wrong token.
