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
- **GitHub:** connect the GitHub MCP, or create a private `housemate_prototype` repo.
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
- [x] **3. Action layer.** (Includes the seed script moved from step 2.) `defineAction`, the Slice 0 actions, and the SMS provider interface.
  *Check:* integration tests against the local database prove that:
  - each action writes exactly one activity event;
  - a failure rolls back both the record and the event;
  - a duplicate inbound message is ignored;
  - an 11th member invite is rejected;
  - a proactive text at 11 PM is blocked.
- [x] **4. Web app shell and sign-in.** Next.js, Tailwind theme from the design tokens, Lato, Phosphor; nav item states per `docs/design.md` §4; 64px utility bar; the six routes with temporary placeholder content; phone code sign-in (local test code; Twilio Verify in staging); protected routes.
  *Check:* Playwright signs in, moves between all six destinations, and asserts sidebar width, nav item height, colors and selected state against the design spec. Impeccable review of the shell.
- [x] **5. Messaging path.** Twilio inbound and status routes with signature validation; the simulator page and a CLI; enqueueing jobs.
  *Check:* a request with an invalid signature gets a 403 and a valid one is accepted. A simulated text is stored and its job enqueued.
- [x] **6. Worker.** A pgmq consumer with retries, a dead-letter queue, delayed jobs, graceful shutdown and a health check.
  - A temporary acknowledgment reply stands in for the agent; it's on in local and staging, and off in production.
  - Non-invited numbers get one invite-only reply (open question 9).
  - A minimal, unstyled thread view proves realtime.

  *Check:*
  - A simulator text leads to a reply that appears in the simulator and the thread view within a few seconds.
  - Killing the worker mid-job leads to a retry with no duplicate reply.
  - A non-invited number gets exactly one reply.
- [x] **7. Cost tracking and alerts.** Twilio price from the status callback goes into `usage_costs`; a monthly per-member view; a team alert by text to the configured team numbers (open question 19). **As built (D-063, D-064):** the price is fetched, since the callback carries none; the budget is the whole pilot's; the view is `/ops/costs`. See "Step 7" below.
  *Check:* a test crossing $100 creates exactly one alert and one team notification for that member and month.
- [ ] **8. CI, deploys and staging.** In progress; see "Step 8" below.
  - GitHub Actions: lint, typecheck, unit tests, database tests against Supabase in CI, Playwright.
  - Vercel: previews per pull request, production on main.
  - Supabase: staging and production projects, with migrations applied on merge.
  - Fly.io: staging and production workers.

  Needs the accounts and connectors above.
  **Pulled forward (D-061):** the production Supabase project and the production Vercel project, with the domain, are set up now for the landing page. See "Landing page" below.
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

## Decisions this slice relies on

These were open questions when the slice was planned. They were all answered on
2026-09-17 and are now recorded in `docs/decisions.md`.
- **D-049 · Sign-in:** invite creates the account; code texted via Twilio Verify; sign-ups disabled.
- **D-050 · Non-invited texters:** one invite-only reply, no agent run.
- **D-054 · Repo:** private `johnrehealy/housemate_prototype`; branch per change; commit and push only when asked.
- **D-055 · Worker hosting:** Fly.io. The deploy token still needs adding to GitHub (HOU-11).
- **D-042 · Team alerts:** a text to the team phone numbers, plus the monitoring view, moving to Slack later. The numbers still need to go in `.env.local` (HOU-33).
- **D-047 · Desktop-first,** usable to 1024px, with mobile layouts coming. This is why the sign-in build waited on HOU-32, answered on 2026-09-21 as **D-056**: the sign-in page now has approved narrow and medium layouts.

## Dev Sprite for coding agents (D-059, HOU-45)

Approved 2026-09-22, alongside Slice 0. One persistent Fly.io Sprite, `mcp-housemate-dev`, where Claude Code sessions work on the prototype. Whether Sprites also host Housemate's browser sandbox is open question 23.

- [x] **Repo files.** `scripts/sprite/network-policy.json` (deny by default) and `scripts/sprite/bootstrap.sh`. Both pass a syntax check and Prettier, and neither has run on a Sprite yet.
- [ ] **Sprites MCP connected** — HOU-41, the user's.
- [ ] **Create the Sprite and apply the policy first.** npm must be reachable and Twilio refused.
- [ ] **Docker spike.** `dockerd` as a Sprite service, then `docker run hello-world`. **Gate:** if Docker won't run, stop and re-plan.
- [ ] **gh signed in** with the fine-grained token — HOU-42, the user's.
- [ ] **Run the bootstrap** through the MCP.
- [ ] **Verify on the Sprite:** lint, typecheck, test, test:db, Playwright, then `claude -p` once Claude Code is signed in (HOU-43).
- [ ] **Take the `base` checkpoint.**
- [x] **Docs.** D-059, open question 23, CLAUDE.md "The dev Sprite", this section, the handoff; mirrored to Linear.

**Waiting on the user:** HOU-41, HOU-42 and HOU-43, and the decision in HOU-44 on whether to commit and push the Slice 0 work first, since the Sprite only sees what's pushed.

## Landing page (D-061, HOU-46)

Approved 2026-09-22. A public page at `/` on myhousemate.co, built in a worktree on `site/landing`, and put live now. The plan is `~/.claude/plans/sprightly-puzzling-fairy.md`.

- [x] **Boards in Paper,** page "Landing": L1 desktop 1440 and L3 narrow 390. L2 (the inline phone field) was dropped when you chose new visitors first.
- [x] **Redesign panel by panel,** at the user's request (2026-09-22). Hero boards H3 → H1 → H2, rotation spec H4, story panels P1–P6, close panel P7, scroll-motion spec M1.
- [x] **Impeccable critique** of the boards, and the fixes the user chose: H5 rebuilt, P5's dimming replaced with blur plus a scrim, the ribbon's Sign in border and P7's footer raised to contrast, and the credential store recorded as D-062 (HOU-56).
- [x] **H5 deleted** (2026-09-22). The alpha branch is dropped: every email gets the same thanks, so there is no way to probe who is on the alpha list. This closes HOU-48's question 2 and question 3.
- [x] **Panel headlines set in DM Serif Text** (2026-09-22, the user's instruction), on P1–P7. One weight only, 400, so the earlier "headlines semibold" note no longer applies to them. Recorded in `docs/design.md` §1.
- [x] **Narrow board N1 · 390** — the whole page top to bottom: ribbon, hero, P1–P7 and the footer. The phones sit at their real 372px with 9px margins; everything else keeps 24px gutters. P6's logins modal is rebuilt at 342 with the "Hidden from Housemate" chip on its own line.
- [ ] **Boards approved** — HOU-48, the user's. It also settles the marketing type scale (70/76 and 40/48 hero, 52/60 and 34/42 close, 32/40 and 26/34 panel headings).
- [ ] **Build,** to the plan of 2026-09-22 (`~/.claude/plans/sprightly-puzzling-fairy.md`):
  - [ ] `waitlist_signups` table, its hand-written security migration, and the `joinWaitlist` action with an `emailAddress` primitive.
  - [ ] The `(site)` route group replacing `app/page.tsx`, the waitlist form, and `proxy.ts` allowing `/` **and the public asset paths** — `/brand/*` and the photographs are behind the proxy today, so a signed-out visitor's images would redirect to sign-in.
  - [ ] `landing.spec.ts`, added to the `signed-out` project's `testMatch` or it never runs; database tests for the action; captures at 1440 and 390.
- [ ] **Verify:** lint, typecheck, test, build and Playwright; `impeccable detect` and the finish review; the approved values into `docs/design.md`.
- [ ] **Vercel connector re-authorized** for `john-h-housemate` — HOU-47, the user's.
- [ ] **Production Supabase:** cost check first, migrations, sign-ups off, site URL `https://myhousemate.co`.
- [ ] **Vercel project and env,** production branch `main`. Merging PR #1 and then the landing PR waits for you to ask.
- [ ] **Domain:** `myhousemate.co` with `www` redirecting; you set the DNS at Namecheap (HOU-49).
- [ ] **Live check:** the deployment is READY, the page loads over HTTPS, "Sign in" reaches `/sign-in`, sending a code fails with the existing error line, and the runtime logs are clean.

**Waiting on the user:** HOU-47, HOU-48, HOU-49, and HOU-50 (a privacy policy; until one exists, the page has no link).

## Step 7 — cost tracking and alerts (approved 2026-09-22)

Approved with three answers: the real Twilio price rather than an estimate; the
$100 budget is the **whole pilot's**, not each member's; and the cost view is a
designed internal view, so it stops for approval in Paper.

**Part A — costs and alerts**

- [x] `priceOf` on the SMS provider: Twilio fetches the Message resource (its price is negative, and a non-USD price is refused); the simulator returns a fixed fake $0.0079.
- [x] `alert_kind` gains `pilot_over_budget` and `send_stuck`; new `message_costs` and `message_costs_dead` queues.
- [x] A `message_costs` job is queued in the same transaction that saves a text — outbound when it's sent, inbound when it's stored. Delayed 60s with Twilio, 0 with the simulator.
- [x] The handler asks for the price; "not priced yet" is retried by the consumer, and after about 10 minutes the job is dead-lettered.
- [x] `recordUsageCost`, `raiseAlert` (texts every `TEAM_ALERT_PHONES` number once, ignoring quiet hours) and `checkPilotBudget` ($100 a month, UTC, flagged not blocked).
- [x] The worker: the second queue, an alert on a dead-lettered job, and a 5-minute sweep for texts still `queued` after 15 minutes.
- [x] Tests: the unit and database ones from the plan. (The plan's Playwright tests are all `/ops/costs`, so they belong to Part B.)

**Part B — the internal cost view**

- [x] Paper boards on a new "Ops" page, desktop 1440: the month against the budget, the per-member table, recent alerts. Boards **O1** (a normal month), **O2** (over budget, with Claude costs) and **O3** (an empty month).
- [x] Run the boards through the Impeccable critique (the user found r1 confusing) and redraw them as **r2**, below r1 on the same page.
- [x] **Stop for the user's approval in Paper.** Asked as HOU-55, for r2; taken as approved on "ok continue" (2026-09-23). The build issue is HOU-54.
- [x] Build `/ops/costs`, staff only, and add the seed's staff member.
- [x] Record the approved design in `docs/design.md`, and review the build.

*Check:* a text costs a row within seconds; crossing the budget texts the team exactly once for the month; a dead-lettered job and a stuck send each raise one alert; `/ops/costs` shows the month's per-member totals to staff and 404s for anyone else.


## Step 8 — CI, deploys and staging (2026-09-23)

Started on the user's instruction of 2026-09-23 to build the rest of Slice 0 and stop only when blocked. It builds step 8 as the Slice 0 plan above describes it; the choices it makes inside that plan are marked **recommendation** until the user confirms them.

**Evidence, at the start:**
- PR #1 to #3 are merged: `main` holds steps 1–4 and the landing page. Production deploys `main` on Vercel, and production's Vercel env vars are all set, **for the production target only**. Preview has none, and a preview can't build without the two `NEXT_PUBLIC_SUPABASE_*` values, so every preview build fails today.
- One Supabase project exists, production (`Housemate`, us-west-2). Its five migrations were applied through the MCP, which records apply-time versions (`20260923162541` …), not the file timestamps `supabase db push` expects.
- **The repository is public.** D-054 says private.
- No Fly CLI, no Fly MCP and no Fly account connection; `gh` is signed in, but its token can't read or write Actions secrets.

**Plan:**
- [x] **Merge `main` in** and give the two branches one migration history (HOU-59): the waitlist migration regenerated after `alert_kinds`, its SQL byte-identical and its file name kept. 114 unit, 70 database and 31 Playwright tests pass on the merged tree.
- [x] **CI** (`.github/workflows/ci.yml`), on every pull request and push to `main`: format, lint, typecheck and unit tests; then local Supabase on the runner, database tests, the seed and Playwright. `scripts/ci/write-local-env.sh` writes `.env.local` from `.env.example` and the runner's own local keys. Nothing reaches a hosted project or Twilio.
- [x] **The worker's image** (`apps/worker/Dockerfile`, `.dockerignore`): production dependencies of the worker and core only, no `.env` file. Run locally against local Supabase it answered a simulated text, costed both texts, and stopped on SIGTERM with exit 0.
- [x] **Fly configs** for `housemate-worker-staging` (simulator, acknowledgment on) and `housemate-worker-production` (Twilio), one 512 MB shared machine each in `sea`, a health check on `/health` and no public service.
- [x] **Deploy workflow** (`.github/workflows/deploy.yml` calling `deploy-environment.yml`), on every merge to `main`: staging, then production; each applies migrations with `supabase db push --include-all` and then deploys its worker. Whatever isn't configured is skipped with a notice in the run's summary.
- [x] **Previews as staging** (recommendation): every non-`main` branch deploys to Vercel's Preview environment, whose env vars point at the staging project. A preview's `PUBLIC_BASE_URL` defaults to the deployment's own address, and the SMS simulator carries Vercel's protection-bypass header, so the simulator loop works behind Vercel Authentication.
- [ ] **A pull request with green CI.**
- [ ] **The staging Supabase project.** Creating it ($0 a month) was refused by the permission classifier: **HOU-63**, the user's.
- [ ] **Production's migration history aligned** with the file names, so the deploy workflow can take over from the MCP.
- [ ] **Preview env vars, GitHub environment secrets, and the Fly apps.** Secret writes are the user's.
- [ ] **Staging checks:** the simulator loop on a preview, and signing in with a real code (needs Twilio, HOU-5).

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

**Step 3 (done, 2026-09-15).**
- **`defineAction`:** validates input, runs the handler in a transaction, and writes activity events in that same transaction, stamped with who acted and which channel it came from.
- **Actions:** `inviteMember`, `recordInboundMessage`, `sendMessage`, `updateMessageStatus`, `recordUsageCost`.
- **Queue:** jobs go in Postgres (`pgmq`), added inside the caller's transaction, so nothing is queued unless the change that caused it is saved.
- **Seed script:** creates fake data through the real actions, refuses any non-local database, and is a no-op on a second run.
- **Tests:** 40 unit and 27 database tests. The database ones prove:
  - an invite creates the home, member and their events;
  - the pilot cap is refused and the sign-in account is removed again;
  - a duplicate phone saves nothing at all;
  - repeated inbound webhooks are ignored, and queue no second job;
  - texts from unknown numbers are stored without a home and never queued;
  - Housemate won't text first during quiet hours but still replies;
  - a provider failure marks the text failed;
  - costs record once, and crossing the budget raises exactly one alert per member per month, counted in the home's timezone.

**Deviations from the step's plan, all deliberate:**
- **An invite writes two events,** not one: the home created and the member invited.
- **`updateMessageStatus` writes no event.** Delivery updates arrive several per text, and the message row carries its own delivery state.
- **Sending media is not supported yet.** Outbound texts are text-only until Slice 2 needs photos.
- **The sign-in account is created before the transaction,** since it's a network call, and is deleted again if saving the member fails.

**Environment lessons (recorded in `tasks/lessons.md`):** run TypeScript with `node --import tsx/esm`, not the `tsx` command, which the sandbox blocks; package installs run outside the sandbox. Also: seed rows are committed, so test phone numbers must stay clear of the seed's.

**Step 4 (done, 2026-09-21).** The shell shipped on 2026-09-15; the approved
sign-in design and both Impeccable reviews landed on 2026-09-21. The two blocks
below record it in the order it happened.

- **Sign-in:** `/sign-in` takes a phone number, texts a code, and verifies it, both steps as server actions through `@supabase/ssr` so the session cookie is set server-side. An uninvited number gets the same answer as an invited one, so the page can't be used to learn who is in the pilot.
- **`activateMember`:** invited → active on first sign-in, with one activity event. It runs on every sign-in, so an already-active member is left alone and writes nothing. A removed member is refused. The seed no longer shortcuts this: seeded members stay invited and activate by signing in.
- **Protection, two layers:** `apps/web/src/proxy.ts` does the cheap cookie check and redirect, and `requireMember()` runs next to the data in the layout and all six pages, because a layout can't stop nested segments from rendering.
- **Local codes:** `[auth.sms.test_otp]` in `supabase/config.toml` answers a fixed code without calling a provider, so development and tests never send a text. Phone auth only turns on when an SMS provider is enabled, so Twilio is enabled there with obviously fake credentials. Proven: an uninvited number asking to create an account is still refused (`signup_disabled`), and no stray account appears.
- **Verified:** lint, typecheck, 43 unit tests, 31 database tests, and 8 Playwright tests all pass. The browser tests sign in, move between all six destinations, and assert sidebar width, bar height, nav item size, colors, selected state and shadow against `docs/design.md`.
- **Design:** the system has no sign-in page, field or button, and Mobbin's MCP isn't connected, so it's built only from existing tokens, with the choices recorded as **Q13** in `docs/design.md` for approval.
- **Sign-out is local-scoped**, so signing out of one browser doesn't end the member's sessions everywhere.
- **Sign-in design approved in Paper, 2026-09-17 (D-036).** Recorded in `docs/design.md` §4 under Form controls and Sign-in page. The current build does **not** match it yet.
- **Note for a new machine:** `apps/web/.env.local` is a symlink to the repo-root `.env.local`, because Next reads env files from the app directory.

**Step 4, the approved sign-in (2026-09-21).** Built to `docs/design.md` §4 Form controls and Sign-in page, from Paper boards A1–A9 (D-036 and D-056).

- **The page frame:** `(auth)/layout.tsx` is a full-height flex row on canvas, and the page owns its own frame at every width. Three widths, all measured live against the boards and exact:
  - **1440:** story panel 600 × 900, padding 22/64/56, three rows, invite note 56px off the bottom, form column 360px at x=840.
  - **1024:** panel 400 × 768, padding 22/40/40, all three rows kept, form side padding 40px, field 360px at x=532.
  - **390:** panel hidden, lockup at (24, 22) 20px tall with 56px to the heading, field 342px at x=24, invite note 32px off the bottom, no horizontal scroll.
- **`story-panel.tsx`** is a server component. Its headline is a `<p>`, not a heading, because it precedes the page's `<h1>` in the DOM and an `h2` there would imply a structure the page doesn't have.
- **`sign-in-form.tsx`** carries visible labels, the field/button/message classes as local constants (§7 Q13 leaves their tokens open, so they stay local rather than becoming a package on the way past), and **automatic sign-in on the sixth digit**.
- **Auto-submit, and the three decisions it forced:**
  1. **Two sibling forms.** The code form holds only the input, so implicit submission still posts it with JavaScript off, and "Use a different number" can't be what Enter reaches. It carries `restart=1` in its own form.
  2. **`readOnly` while signing in,** not `disabled`, which would drop the field out of the tab order and throw away focus mid-flow. It ships with no `aria-disabled`: the field is still focusable and its value is still submitted, so calling it disabled would be untrue. The restart button uses a real `disabled`.
  3. **Submitting from an effect, not `onChange`,** so the DOM value is the stripped one when the form is read — a pasted "123 456" would otherwise post with its space. The last-submitted guard stops a rejected code resubmitting itself, and clears when the digits drop below six so the same code can be retyped.
- **WCAG 2.2 AA:** auto-submit is a change of context on input (3.2.2), allowed because the member is told first — so the hint "You'll be signed in as soon as all six digits are in." ships with the behavior, not as decoration. The error line is `role="alert"`, the working line `role="status"`, and the field carries `aria-invalid` and `aria-describedby`.
  - **The hint carries `role="status"` too** (added after the finish review). React reuses one `<p>` across hint and working line, so a role arriving with "Signing you in…" would make the region live in the same commit as its text — the classic live-region miss, silent in NVDA and VoiceOver. Live from the first render, the swap is an ordinary content change.
- **`formatUsPhone`** was added to `packages/core/src/phone.ts` with its own tests, and exported at a new `@housemate/core/phone` subpath. **The client must import from that subpath, never the package barrel:** the barrel reaches `twilio-provider.ts`, and `next build` fails resolving Node built-ins for the browser bundle. `pnpm typecheck` does not catch this — only the build does.
- **A `h-full` on the story panel collapsed it to 571px.** An explicit `height: 100%` resolves against an auto-height parent and falls back to content height, overriding the flex row's stretch. Removing it is the fix; the row stretches it to 900 on its own.
- **Verified:** `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, 45 unit tests, `pnpm build` and **11 Playwright tests** all pass. The browser tests assert the three widths, the resting *and* focused field borders, that the code step has no "Sign in" button, that filling six digits submits on its own, that the digits stay focused after a wrong code, and the whole working state.
- **The autofocused field caught a wrong test, not a wrong build:** A1 focuses the field on load, so the border drawn at 1440 is evergreen. The test now asserts both states, blurring in between.

**Step 7, Part A (done, 2026-09-22).** Costs and alerts, built to the approved plan. Its decisions are **D-063**.

- **The price is fetched, not read from a callback.** Twilio's status callback carries only the standard properties plus `MessageStatus` and `ErrorCode` — checked in Twilio's docs — so `SmsProvider.priceOf(providerSid)` asks for the Message resource instead. Twilio reports a price as a negative string, which is stored as a positive amount; a price in another currency is refused rather than recorded wrong; an unpriced message returns null. The simulator returns a fixed, obviously fake $0.0079.
- **Every text is costed, inbound as well as outbound.** A `message_costs` job is queued inside the transaction that saves the text — from `setDeliveryResult` when a send comes back, and from `recordInboundMessage` before the opt-out return — delayed 60s with Twilio (the price isn't there straight away) and 0 with the simulator.
- **The handler** (`packages/core/src/jobs/message-cost.ts`) reloads the message, asks for its price, and raises `price_pending` when there isn't one yet, so the consumer's own backoff retries it for about 10 minutes before dead-lettering it. The cost is keyed on the provider's SID, so the same text costed twice writes one row.
- **`recordUsageCost` is record-only now.** Step 3's version also did the per-member budget check; that half moved to `checkPilotBudget`, which sums **all** costs since the UTC month start against `MONTHLY_BUDGET_USD` ($100) and raises `pilot_over_budget` once a month. `member_over_budget` stays in the enum, unused, for when budgets become per member.
- **`raiseAlert`** inserts the alert (the unique `dedupe_key` makes "once" a database guarantee), then texts each `TEAM_ALERT_PHONES` number through `insertOutbound` under the key `alert:<dedupeKey>:<phone>`, with no home and no member. Quiet hours don't apply: these are operational, they go to the team's own phones, and a 3 AM failure is worth knowing about. `notified_at` is set once at least one text has gone.
- **The worker** takes the second queue after the inbound one (poll 0, so a price lookup never delays a reply), alerts `worker_error` on a dead-lettered job, and every 5 minutes sweeps for outbound texts still `queued` after 15 minutes, alerting `send_stuck` once each, at most 10 a sweep. **Nothing is resent** — a duplicate text is worse than a gap.
- **Verified:** `pnpm lint`, `pnpm typecheck` and `pnpm format:check` pass; **88 unit tests**, **62 database tests** and **18 Playwright tests** pass.
- **By hand, against the running worker:**
  - A simulated exchange costed $0.0079 a text within a second or two, inbound and outbound, attributed to the member; a stranger's text was costed with no member.
  - A forced $150 cost raised exactly one `pilot_over_budget` alert (`over-budget:2026-09`, notified) and texted both fake team numbers with the approved copy. A further cost raised nothing.
  - A deliberately broken job was retried five times, dead-lettered, and raised one `worker_error` alert with two team texts.
  - A text planted 20 minutes old and still `queued` was found by the 5-minute sweep and raised one `send_stuck` alert: "a text from 23 minutes ago still has no delivery result. Message 9a0b0d, to (555) 080-0001."
  - Every probe row was removed afterwards, except the append-only activity events, which the database refuses to delete — as it should.
- **Not a defect:** a dead-letter record whose `job` looked double-encoded came from the probe that planted it, not from the consumer. Read through the app's own client a queued payload is an object, so the record nests properly.
- **Nothing left the machine:** the provider is the simulator throughout, so no Twilio call was made and no real number was texted.

**Step 7, Part B (done, 2026-09-23).** Tracked as **HOU-54**; the design approval was **HOU-55**. Its decision is **D-064**, and the design is in `docs/design.md` §4 "Ops cost view".

- **Researched first** (Mobbin, web): the useful shape for a spend view at this size is a slim budget bar with "X of $Y", a right-aligned money table with a total row, and no charts. OpenAI Platform and Cofounder both keep the budget as a bar rather than a graph; LangChain's Fleet puts the month's headline figures in a strip, which is our Count summary already.
- **Three boards on the Paper page "Ops"** in Diligent meadow, desktop 1440: **O1** a normal month, **O2** the budget crossed in a later month where Claude costs exist, **O3** an empty month. Everything is built from existing tokens.
- **Reused, not invented:** the Count summary track (1124 × 110, nav ground, `radius-lg`, 4px padding and gaps, label 14/400 over 36/300 evergreen) for the month's three figures, and the Errand row (52px rows, a 36px header with a hairline, 12px side padding and gaps) for the per-member table and the alerts list.
- **Proposed, and needing the user's yes:**
  1. **The view sits outside the member shell** — no 260px sidebar, just the 64px bar with the lockup and "Ops" — so a staff destination never appears in a member's navigation. The content column stays 1124px, so every measurement in the system still holds.
  2. **Content starts at 140px, not 188px**, because there is no tab ribbon.
  3. **A budget bar:** 6px, full width, `--color-line` track, evergreen fill, rust (`--color-status-action-fg`) once the budget is crossed. The one new element.
  4. **Money right-aligned**, a bold (`--text-sm`) total row, and a Claude column reading $0.00 until Slice 1.
  5. **"Unknown numbers" is its own row**, so texts from numbers we don't know are counted without being folded into a member.
  6. **No phone numbers in the alerts list.** The team's text names the recipient; the list names only the message.
- **Superseded by r2 (2026-09-23).** The user found r1 confusing. The Impeccable critique scored it 19/40. The findings, most serious first:
  - The alerts had no scope and no state: the top said "1 alert" over a list of three, two of them from August.
  - The top strip said one fact three ways, and O2's middle figure flipped meaning.
  - The bar couldn't show an overage.
  - The alert copy described machinery.
  - A money table carried a dead Claude column.
  - The page had no frame.

  The critique is saved at `apps/web/.impeccable/critique/`.
- **The user's answers (2026-09-23):**
  - Alerts show only the month you're viewing, with a state worked out from the data (no schema change, nobody resolves anything).
  - Keep the three figures, but make "over" unmistakable.
  - Fix every finding.
- **r2, on the same page below r1**, proposes:
  - **The frame.** A 48px ribbon with a single "Costs" tab, so content starts at 188px like every destination. The bar is aligned to the 1124px column.
  - **Alerts.** They come above the member table, scoped to the month, open first. The chips read Needs a look, Resolved and Flagged. The copy leads with what happened to a person or number, and IDs come second. "Team not reached" is a rust notice above the figures, and O3 links to September's still-open alert.
  - **The figures.** O2's middle figure is "Over the $100 budget · +$16.76" in rust. The bar rescales, with a $100 mark and the overage in rust past it.
  - **The member table.** One Cost column until agent costs exist, then Twilio / Claude / Total under a "Cost" group label. "Not a member" replaces "Unknown numbers". Avatars are solid evergreen. The Total row is set off by a heading-colour rule, not bold. There's one left edge and a fixed-width month label.
  - **Kept on purpose:** cents.
  - **For the build only:** several stuck sends from one sweep are grouped into one row.
- **Built (2026-09-23), after "ok continue" on r2:**
  - **`@housemate/core/costs`** (`packages/core/src/costs/`): `getCostReport(db, { month, now })` returns the month's figures, the by-member rows and a "Not a member" row, the alerts table and the open alerts from earlier months. Its copy (`copy.ts`), the month helpers and money formatting sit beside it so they're unit-tested with the data.
  - **Alert state is worked out, not stored.**
    - A `send_stuck` alert is Resolved once its text is `sent` or `delivered`.
    - A `worker_error` alert needs a look while its job is still in `pgmq.q_<queue>_dead`; the parked job also names the text it was about.
    - `pilot_over_budget` is Flagged.
    - A null `notified_at` is "Not reached". Counting the saved `alert:<key>:` texts tells "every text failed" from "no team numbers are set".
    - Stuck sends raised within a minute of each other came from one sweep, and share a row.
  - **`requireStaff()`** (`apps/web/src/lib/auth/session.ts`) 404s anyone who isn't an active staff member. The page reads through the server connection, so this is the check. `/ops` redirects to `/ops/costs`.
  - **`apps/web/src/app/ops/`**: the staff shell (utility bar and single-tab ribbon) and the page (the stepper, the notice, the figures, the budget bar and both tables), built from the r2 boards' exact values read back from Paper.
  - **Seed:** a staff member, Olly Ops, +15550190002, checked on its own so an existing local database gains one without a reset. That number is also in `[auth.sms.test_otp]`, so it can sign in locally. **Local Supabase needed a restart to pick that up** (`pnpm db:stop && pnpm db:start`; the data is kept).
  - **Fixed on the way:** `MONTHLY_BUDGET_USD` was defined twice (in `config.ts` and `check-pilot-budget.ts`), and `BUDGET_TIMEZONE` now lives beside it in `config.ts`. An unused import in `message-cost.db.test.ts` was failing lint. The schema's comment on `member_over_budget` cited D-062, which the landing page session took; it now cites D-063.
- **Built differently from the boards, on purpose** (recorded in `docs/design.md` and on HOU-55):
  - **"delivered since"**, not "delivered at 14:47": a text's delivery time isn't stored.
  - **"texts to and from numbers outside the pilot"**: the team's own alert texts have no member, so they're in that row too.
  - **A second reason in the notice:** "no team numbers are set".
- **Verified:**
  - `pnpm lint`, `pnpm typecheck` and `pnpm format:check` pass.
  - **114 unit tests** pass (26 new: months and their edges, each alert state, the approved copy, sweep grouping and reading order).
  - **66 database tests** pass (4 new: sums by member across a month's edges; each alert's state from what happened since; a failed team text versus no numbers; and open alerts from earlier months with the stepper's ends).
  - **21 Playwright tests** pass, twice in a row (3 new: a staff sign-in in setup; a member gets a 404 at `/ops` and `/ops/costs`; a simulated exchange raises the seeded member's text count on the page by two, at a non-zero cost).
- **Checked against the boards** at 1440, through Playwright with the saved staff session. A generated demo month, June 2026, showed the over-budget, unreached, grouped and split-table states against O2. July showed the empty month with the earlier-alert link against O3, and September showed the one-column table against O1. The only difference was a 64px bar that measured 65 with its hairline, now fixed. The demo rows were deleted afterwards and the deletion checked.
- **Not done:** an Impeccable finish review of the build. It's the user's to invoke (`/impeccable polish` or a critique of `/ops/costs`).

**Step 6 (done, 2026-09-22).** Built to the approved plan; its decisions are **D-060**.

- **Schema:** `messages.idempotency_key` (unique), and a dead-letter queue, `inbound_messages_dead`, with the same revokes as the main queue.
- **The consumer** (`packages/core/src/queue/consumer.ts`): `processNextJob` reads one job with a 30s visibility window, deletes it on success, backs off 5s × 2^(attempt−1) up to 5 minutes on a failure, and after 5 attempts moves it to the dead-letter queue with the error's name and code (send and delete in one transaction). A job read more than 5 times is dead-lettered without running. `pgmq.read_with_poll` never reads when its poll time is 0, so a zero poll uses `pgmq.read`.
- **The job handler** (`packages/core/src/jobs/inbound-message.ts`) reloads the text: an uninvited sender gets `sendInviteOnlyReply`, a member gets the acknowledgment when `ACK_REPLY_ENABLED`, and a removed member gets nothing. Each reply's activity event points at the text it answers.
- **Actions:** `sendMessage` takes `idempotencyKey` and `author`, and returns `duplicate`; `sendInviteOnlyReply` is new; `recordInboundMessage` now queues uninvited texts and never queues STOP or HELP (`optOut`, from Twilio's `OptOutType` or its default keywords).
- **The worker** (`apps/worker`): loops `processNextJob`, logs JSON with job IDs and outcomes only, serves `GET /health` on `PORT` (default 8080: 200 while the loop turned over in the last 30s, else 503), and on SIGTERM or SIGINT finishes the job in hand and exits 0. `pnpm --filter @housemate/worker start`, or `preview_start worker`.
- **`/dev/thread`:** the home's texts through the member's own session, updated by Realtime `postgres_changes`. **Found while testing:** the channel's join went out before the browser client had loaded the member's token, so Realtime refused the Postgres binding while still reporting the channel as subscribed, and no change ever arrived. The client now awaits `supabase.realtime.setAuth()` before joining, and asks Realtime to confirm the binding (`postgres_changes_options: { wait: true }`) before it shows "live".
- **Playwright** starts the worker as a second web server, waits on `/health`, and stops it with SIGTERM.
- **Verified:**
  - `pnpm lint`, `pnpm typecheck` and `pnpm format:check` pass.
  - **80 unit tests** pass (13 new: the opt-out keywords, including "Yes" and "Cancel my appointment", and the backoff schedule).
  - **53 database tests** pass (15 new: the consumer's success, backoff, dead-letter, crash and delay paths; one reply for a job run twice; one invite-only reply for two texts; nothing when the acknowledgment is off; STOP and HELP not queued; "Yes" queued).
  - **18 Playwright tests** pass (1 new, 2 reworked): a text from `/dev/sms` now also gets its acknowledgment; a fresh uninvited number texting twice gets exactly one reply; and, new, `/dev/thread` shows a new text and its reply with no reload.
- **By hand:**
  - `/health` answered 200, and other paths 404.
  - **Crash:** with the worker stopped, a text's job was taken with `pgmq.read` (visibility 5s) and left undeleted. The restarted worker ran it as attempt 2 and sent exactly one acknowledgment.
  - **`kill -9` mid-job:** the worker was killed after reading a new text's job and before replying. Restarted, it ran the job as attempt 2: one acknowledgment, the queue empty, `/health` 200.
  - **SIGTERM:** logged `worker.stopping` and `worker.stopped`, and exited 0 once its current poll ended (under 2s).
  - The worker's log held job IDs, attempts and outcomes only.
- **Nothing left the machine:** the provider is the simulator.
- **Carried forward:**
  - **Step 8:** trim the Messaging Service's opt-out keywords to STOP, STOPALL and UNSUBSCRIBE, so "Cancel" about an appointment doesn't opt a member out, then trim the parser's fallback list to match (Checklist issue).
  - **Before real members:** record a member's STOP as consent withdrawn. Twilio already blocks sends to them.
  - **Step 7:** alert on dead-lettered jobs and on replies stuck at `queued`.
  - **Slice 1:** agent runs will need a longer visibility window or a heartbeat.

**Step 5 (done, 2026-09-22).** Built to the approved plan; its three decisions are **D-058**.

- **Routes:** `POST /api/twilio/inbound` and `POST /api/twilio/status`. Each is a few lines of glue (`apps/web/src/lib/twilio-webhook.ts`) around channel-neutral handlers in `packages/core/src/sms/webhooks.ts`, which check the signature, parse Twilio's parameters and call the actions.
  - **Signatures** are checked with `TWILIO_AUTH_TOKEN` against `PUBLIC_BASE_URL` plus the path, not `request.url`, which behind Vercel's proxy may not be the URL Twilio signed. A body that isn't a form reads as no parameters, so it fails with a 403 rather than a 500.
  - **Inbound:** 403 unsigned or tampered; 400 with no `MessageSid` or a non-E.164 `From`/`To`; 200 with empty TwiML once stored or when it's a repeat; 500 if the action fails. A media item with no URL is skipped rather than losing the text.
  - **Status:** Twilio's ten statuses map to our five, and anything else is acknowledged unstored. An unknown `MessageSid` gets a 200, because a retry can't fix it. **One deliberate deviation from the plan:** an unexpected failure (the database down) gets a 500 rather than the plan's "always 200", so it shows in Twilio's debugger instead of vanishing.
  - **Logging** carries the `MessageSid`, the outcome, and the error's name and code only. The message is left out, because database errors can quote the values they were given.
- **The proxy skips `/api/twilio/`.** Proven by breaking it: with the exclusion removed, all four webhook browser tests fail with a 307 to sign-in.
- **`updateMessageStatus` never moves a status backwards** (D-058). It uses a conditional update, and returns `applied: false` when it would.
- **The simulator** signs a Twilio-shaped request and posts it to the real inbound route (`simulateInboundSms` in `packages/core/src/sms/simulate-inbound.ts`), so a simulated text runs the same code as a real one, signature check included. Simulated IDs start `SIM`.
  - **The page:** `/dev/sms` sends as any number (by default, the signed-in member) and shows that number's thread, refreshing every 2 seconds. It's read on the server connection, because row-level security would hide uninvited senders' texts. It returns a 404 in production.
  - **The CLI:** `pnpm sms "text"`, or `pnpm sms --from "(555) 999-9999" "text"`, needs the web app running.
- **`TWILIO_AUTH_TOKEN` is required everywhere.** A fake value is in `.env.example`, and was added to `.env.local`.
- **Verified:**
  - `pnpm lint`, `pnpm typecheck` and `pnpm format:check` pass.
  - **67 unit tests** pass, 22 of them new: the parsers, the status mapping, signing, and the 403/400 paths proven never to touch the database.
  - **38 database tests** pass, 7 of them new. They cover a member's text stored with one job, an uninvited text stored with no home and no job, a bad signature storing nothing, a repeat adding nothing, and a late "sent" leaving "delivered" alone.
  - **17 Playwright tests** pass, 6 of them new. They cover the four webhook responses with no session, and the simulator page for an invited and an uninvited sender.
- **By hand, on the running app:**
  - `pnpm sms` from the seeded member and from `(555) 999-9999` stored two texts and added exactly one `inbound_messages` job, for the member.
  - `curl` with a forged signature got a 403, a JSON body a 403, and a GET a 405.
  - The server log was empty.
- **Nothing left the machine:** the provider is the simulator, and every inbound request is a POST to localhost.
- **Carried to step 6:** a `STOP` or `HELP` text is stored and queued like any other, so the acknowledgment reply must not answer it (D-051). The jobs queued by tests and manual checks sit in the local queue until the worker exists; `pnpm db:reset` clears them.

**Step 4, the sign-in copy revision (2026-09-22, D-057).** The user rewrote the copy on boards A1 and A7 in Paper.

- **Panel:** new headline, lead and three row bodies; the row titles are unchanged. The invite note is now "Housemate is currently invite-only" at every width it appears.
- **Narrow, drawn as the user chose:** below `--breakpoint-lg` there is no invite note at all, and the code step's helper is the short "A code is on its way." The wide helper still names the number. Neither form confirms that a number is invited.
- **Recorded:** `docs/design.md` §4 Sign-in page and D-057, including the trade-off the user accepted — on a phone, an uninvited visitor is told a code is on its way.
- **Verified:** `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and all **11 Playwright tests** pass; the captures in `apps/web/.impeccable/review/` were retaken. The uninvited-number test now also checks the short helper at 390px, and the three-width test checks that the note is shown wide and absent narrow. `getByText` matches substrings case-insensitively, so the short helper is matched with `{ exact: true }` — otherwise it also finds the hidden wide sentence, which ends the same way.

**Step 4, the Impeccable finish review of the sign-in (2026-09-21).** Run against the surface brief, the five Paper comps and six captures, then re-run with the A4 capture added.

- **Fidelity faithful.** Across five render/comp pairs the differing pixels are 0.2–1.7% of frame, all text antialiasing and 1px line-box rounding, with no structural band anywhere. Type, material and ground all match; the panel samples `#14342F` against a comp export that had drifted to `#1C332F`, so the build is the one on the token.
- **Persistence passes** and the ceiling is reached. The only headroom named is that the step change from "Sign in" to "Enter your code" happens instantly — which is what §4 specifies, so it is unused device, not a miss.
- **Four material fixes, all closed in the same turn:**
  1. **The live-region miss** above — the real defect, and the reason this review was worth running.
  2. **A4 shipped with no evidence.** It now has a capture (`code-working.png`) and a test asserting the `--color-nav`/`--color-line` field, retained focus, the status role and the disabled restart button. Both hold the action's response open with `page.route`, using a wrong code, so nothing is ever signed in.
  3. **The selection colour was a headless artifact, not a defect.** `::selection` resolves to `oklab(0.299134 -0.0389275 -0.00135583 / 0.12)` — `#14342F` at 12%, exactly as §4 says. A headless window paints its own grey for an unfocused selection, which is what the screenshot showed. The test now reads the rule.
  4. **D-036's "Still to do" was false** and mirrored to Linear. It is now a "Built" line.
- **Two asides worth keeping.** The `@phosphor-icons/react` barrel tree-shakes cleanly in the client bundle — only the three glyphs used appear, in a 10KB chunk — so it needs no follow-up. And the underline on "Use a different number" in the captures is hover, not a style bug: the pointer parks on "Send code" and that lands inside the restart button on the next step. Logged as **HOU-39**, because an impatient second click would throw the code away.

**Step 4, the Impeccable review of the shell (2026-09-21).** Run as two isolated assessments per the skill's hard invariant: A (design review) and B (detector plus browser evidence). Full report in `apps/web/.impeccable/critique/2026-09-21T19-02-20Z__src-app-app-layout-tsx.md`.

- **Score 19/40, "Poor"** — dominated by what the shell doesn't carry yet (help, error handling, efficiency, agent status), not by what it got wrong. Every specified number was hit.
- **Deterministic scan: 0 findings**, verified real by probing the detector with a deliberate anti-pattern first. The in-page detector's one finding, `cream-palette` on `#FFFBF9`, is a false positive: that is `--color-canvas`, a documented token.
- **Findings are logged as HOU-34 to HOU-38** rather than fixed here, because each needs a Paper mockup first (D-034) and none is part of the sign-in build.
- **Not run: `impeccable-documenter`.** It writes a `DESIGN.md`, and this project makes `docs/design.md` the design system by D-010 and D-034. Creating a second one would need the user's approval, so it was skipped deliberately rather than silently.
- **Measurement trap worth keeping:** reading a focus ring's `outline-color` immediately after Tab returns the pre-transition colour, because Tailwind's `transition-property` includes `outline-color`. It is not a defect.

**Step 4, earlier (shell only).**
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
