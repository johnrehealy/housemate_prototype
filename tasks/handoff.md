# Session handoff · 2026-09-15

Context for picking this up in a fresh session. Durable knowledge lives in the
documents below; this file captures what a new session would otherwise have to
rediscover.

## Read these first

1. `CLAUDE.md` — rules, stack, commands, sandbox notes.
2. `docs/build-plan.md` — architecture and slices 0–7 (approved, D-031).
3. `docs/decisions.md` — D-001 to D-032. Binding.
4. `docs/open-questions.md` — unanswered questions and the defaults in effect.
5. `tasks/todo.md` — the Slice 0 plan with per-step results.
6. `tasks/lessons.md` — environment lessons already paid for.
7. `docs/product.md`, `docs/design.md` — product scope and the design system.

## Where things stand

**Slice 0 (foundation), steps 1–3 done, step 4 partly done.**

- **Step 1 · Repo and tooling — done.** pnpm workspace: `apps/web` (Next.js 16),
  `apps/worker` (skeleton that only logs), `packages/core` (everything shared).
- **Step 2 · Database and security — done.** Seven tables, row-level security,
  hand-written policies, append-only activity log, 10-member cap. 27 database
  tests, proven to fail when the protections are removed.
- **Step 3 · Action layer — done.** `defineAction` plus five actions, the
  Postgres job queue, and the local seed script. 40 unit tests.
- **Step 4 · Shell — partly done.** The app shell, design tokens and navigation
  are built and checked in the browser. Sign-in, Playwright and the Impeccable
  review are still to do.
- **Steps 5–9 — not started.** Messaging webhook and simulator, worker, cost
  alerts, CI and deploys, docs.

## Repo state

- Branch `slice-0/foundation`, two commits: `2491f28` (scaffold), `0a64645`
  (database, security, sandbox).
- **Step 3 is uncommitted** — actions, queue, seed, time helpers, auth adapter,
  the queue migration, and doc updates. Committing it is the obvious first move.
- No git remote yet. Repo email is set locally to john.re.healy@gmail.com.

## Environment facts

- **Sandbox is on** (`.claude/settings.json`, D-032). Writes are limited to the
  project plus package caches; SSH, AWS, GitHub CLI and Docker credentials are
  unreadable; network is npm, GitHub, Google Fonts and localhost.
  - **Outside the sandbox** (each through the permission check): `pnpm add` and
    any install, all `docker` commands, and all Supabase CLI commands.
  - **Add the Anthropic API domain** to the allowlist when Slice 1 starts.
- **Run TypeScript as `node --import tsx/esm <file>`.** The `tsx` command opens
  an internal socket the sandbox blocks. This will bite the worker's dev script.
- **Local Supabase** runs in Docker Desktop under project name `Prototype`
  (containers are `supabase_db_Prototype` and so on). Ports: API 54321,
  database 54322, Studio 54323.
- **`.env.local` exists at the repo root and is gitignored.** Regenerate it from
  `pnpm exec supabase status -o env` (see the generated file's own header).
- Docker's CLI is installed system-wide, so no `PATH` juggling is needed.

## Conventions worth keeping

- **Migrations:** Drizzle generates schema migrations into `supabase/migrations`
  (`pnpm db:generate`); policies, grants and triggers are hand-written through
  `drizzle-kit generate --custom --name <name>`. Supabase uses the file's
  timestamp as its version, so two migrations generated in the same second
  collide — pause a second between them.
- **Database tests** run inside transactions that roll back. Seed rows are
  committed, so phone numbers must not overlap: security tests use
  `+1555010xxxx`, action tests `+1555020xxxx`, the seed `+1555019xxxx`.
- **Test helpers** live in `packages/core/src/db/testing.ts`: `withRollback`,
  `actAs` / `actAsAnon` (row-level security), `expectDbError` (savepoints).
- **The fake auth service** in the action tests inserts inside a savepoint, so a
  failure behaves like a failed network call rather than poisoning the
  transaction.
- **Prove security tests can fail.** Before trusting them, break the protection
  and watch the right tests fail (done in step 2; repeat for new ones).
- **Design tokens** are in `apps/web/src/app/globals.css` under `@theme static`,
  and Tailwind's defaults are cleared. Verify UI with computed styles in the
  browser against `docs/design.md`, not by eye.
- **Next.js 16:** `next typegen` runs before `tsc` (already in the typecheck
  script), and middleware is called "proxy". `apps/web/AGENTS.md` is regenerated
  by `next dev`; leave it in place.

## What's next (step 4)

1. Commit step 3.
2. **Sign-in:** Supabase phone one-time codes through Twilio Verify. Inviting
   already creates the account, so sign-in uses "don't create users" and
   sign-ups stay disabled in `supabase/config.toml`.
3. **Add an `activateMember` action** (invited → active) for first sign-in. The
   seed script currently shortcuts this with a direct update; replace that.
4. **Protect the app routes**, then Playwright coverage for sign-in and moving
   between the six destinations, plus an Impeccable review of the shell.
5. Open question 8 in `docs/open-questions.md` holds the sign-in defaults.

## Waiting on the user

- **Team phone numbers** for alerts (open question 19).
- **Accounts and connectors:** Supabase, Vercel, GitHub, Twilio, Stripe and
  Linear MCPs are all still unconnected, plus a Fly.io account. Needed for
  step 8, not before.
- **Twilio sole-proprietor 10DLC registration**, so texts can reach real phones.
- **A logo asset.** The sidebar shows the word "Housemate" as a placeholder.
- **Business registration** is only needed before live payments (Slice 6).

## Known gaps and risks

- **Deleting a member's data** will collide with the append-only activity log;
  Slice 7 needs a controlled, audited path.
- **Outbound texts can't carry photos yet.** Slice 2 needs that.
- **The Property area has no design**; it needs a Mobbin reference and an
  Impeccable review when built.
- **The budget is read as $100 per member per month.** If it was meant for the
  whole pilot, only the alert threshold changes.
- **Real-site computer use (Slice 5) can't be fenced by code.** Bookings that
  carry a fee but take no payment rely on the agent's instructions plus an audit
  review.
