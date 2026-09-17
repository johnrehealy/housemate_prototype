# Session handoff · 2026-09-17

Context for picking this up in a fresh session. Durable knowledge lives in the
documents below; this file captures what a new session would otherwise have to
rediscover.

**Impeccable and the Paper MCP are installed and load at session start.** The
session after the 2026-09-17 restart confirmed both: `impeccable` is in the
skill list and the `mcp__paper__*` tools are available.

## Read these first

1. `CLAUDE.md` — rules, stack, commands, sandbox notes.
2. `docs/build-plan.md` — architecture and slices 0–7 (approved, D-031).
3. `docs/decisions.md` — D-001 to D-034. Binding.
4. `docs/open-questions.md` — unanswered questions and the defaults in effect.
5. `tasks/todo.md` — the Slice 0 plan with per-step results.
6. `tasks/lessons.md` — lessons already paid for.
7. `docs/product.md`, `docs/design.md` — product scope and the design system.

## Where things stand

**Slice 0 (foundation), steps 1–4 built. Step 4 has two things outstanding:
a Paper mockup of sign-in for approval, and the Impeccable review of the shell.**

- **Steps 1–3 — done.** Workspace and tooling; seven tables with row-level
  security, an append-only activity log and a 10-member cap; `defineAction`
  plus six actions, the Postgres job queue and the local seed.
- **Step 4 — built and passing, not yet approved.** Phone-code sign-in,
  `activateMember`, protected routes, browser tests. Detail in `tasks/todo.md`.
- **Steps 5–9 — not started.** Messaging webhook and simulator, worker, cost
  alerts, CI and deploys, docs.

**Test counts:** 43 unit, 31 database, 8 Playwright. All pass, with lint and
typecheck clean.

## What's next

1. **Design the sign-in page properly (D-034).** The page is built, but its
   field, button, focus and hover treatments are **not approved** — they were
   proposed as prose in `docs/design.md` Q13 and refused. They need a Paper
   mockup the user can look at.
   - Design work goes through `/impeccable`; Claude carries out the work it
     directs.
   - Build the comp from the 95 tokens in `docs/design.md`, not from scratch.
   - Paper's canvas is HTML/CSS, so `write_html` puts real editable nodes on it.
2. **Then the Impeccable review of the shell**, and step 4 closes.
3. **Step 5 · Messaging path:** Twilio inbound and status routes with signature
   validation, the simulator page and CLI, and enqueueing jobs.
4. **Before step 8:** `supabase/config.toml` carries three deliberately
   local-only settings — `[auth.sms.test_otp]`, placeholder Twilio credentials,
   and a 1-second code throttle. Staging and production are configured
   separately and must never inherit these.

## Using Paper (new)

- **Paper Desktop is installed and running**; opening a file starts its MCP on
  `http://127.0.0.1:29979/mcp`. Verified live: `paper-desktop` v0.5.10.
- Registered with `claude mcp add paper --transport http
  http://127.0.0.1:29979/mcp --scope user`, which wrote to `~/.claude.json`.
- **The server's own instructions, to follow when it's available:**
  - Call `get_guide({ topic: "paper-mcp-instructions" })` once per session
    before any other Paper tool.
  - `get_basic_info` first for artboards and dimensions; `get_selection` for
    what the user is looking at.
  - `get_font_family_info` before any typographic styling.
  - `write_html` adds roughly one visual group per call; prefer
    `duplicate_nodes` + `update_styles` + `set_text_content` over rewriting.
  - `get_screenshot` to review after meaningful changes.
  - `finish_working_on_nodes` when done. Never show raw node ids to the user.
  - Pull exact values back into code with `get_jsx` / `get_computed_styles`,
    never by reading colors off a screenshot.

## Repo state

- Branch `slice-0/foundation`. Step 4 and the 2026-09-17 docs changes are
  committed. `.env*` and `apps/web/e2e/.auth/` are gitignored.
- **Impeccable's install is gitignored, not committed:** about 14MB in
  `.claude/skills/impeccable` (including a `darwin-arm64` binary), four
  `.claude/agents/impeccable-*.md` files, and `.claude/settings.local.json`
  (which holds its hooks). Reinstall with `npx impeccable install`.
- Impeccable's `Stop` hook runs a design pass of up to 30 seconds after every
  turn.
- No git remote yet. Repo email is set locally to john.re.healy@gmail.com.

## Compaction routine

- Auto-compaction fires at roughly 40% of the context window
  (`.claude/settings.json`).
- **Overwrite this file** at the end of every step, after any decision, and
  before anything that will fill context. A stale handoff is worse than none.
- After a compaction, read this file first and continue from "What's next".

## Environment facts

- **Sandbox is on** (D-032). Run these **outside** it, one at a time: `pnpm add`
  and any install, all `docker` and Supabase CLI commands, and **anything that
  runs `next build`** — the sandbox's TLS proxy breaks `next/font`'s fetch of
  Lato from Google Fonts, which includes `pnpm test:e2e`.
  - **Add the Anthropic API domain** to the allowlist when Slice 1 starts.
- **Run TypeScript as `node --import tsx/esm <file>`.** The `tsx` command opens
  a socket the sandbox blocks.
- **Local Supabase** runs in Docker Desktop, project name `Prototype`. Ports:
  API 54321, database 54322, Studio 54323. Config changes need
  `supabase stop && supabase start` to reach the containers.
- **`.env.local` is at the repo root and gitignored.** `apps/web/.env.local` is
  a **symlink** to it, because Next reads env files from the app directory.
- **Reading the auth container's env settles Supabase config questions:**
  `docker exec supabase_auth_Prototype env | grep -i sms`. Guessing at
  `config.toml` keys wasted several restarts; that command ended it.

## Conventions worth keeping

- **Migrations:** Drizzle generates schema migrations into `supabase/migrations`
  (`pnpm db:generate`); policies, grants and triggers are hand-written via
  `drizzle-kit generate --custom`. Supabase versions them by timestamp, so pause
  a second between generating two.
- **Database tests** run in transactions that roll back. Seed rows are
  committed, so phone numbers must not overlap: security tests `+1555010xxxx`,
  action tests `+1555020xxxx`, the seed `+1555019xxxx`.
- **Prove security tests can fail** before trusting them.
- **A `"use server"` file may only export async functions.** Types and constants
  go in a sibling module; nothing catches this until runtime.
- **Browser tests** use a production build, not `next dev`, and sign in once
  (`apps/web/e2e/auth.setup.ts`) because Supabase throttles code requests per
  number. `pnpm test:e2e` needs a reset, seeded database.
- **Auth checks happen twice:** `apps/web/src/proxy.ts` for the cheap redirect,
  `requireMember()` next to the data in every page.
- **Design tokens** live in `apps/web/src/app/globals.css` under `@theme static`.
  Verify UI with computed styles, not by eye.

## Waiting on the user

- **Approval of the sign-in design**, once its Paper mockup exists (D-034).
- **Team phone numbers** for alerts (open question 19).
- **Connectors:** Supabase, Vercel, GitHub, Twilio, Stripe, Linear and Mobbin
  are all unconnected, plus a Fly.io account. Needed for step 8; Mobbin blocks
  the pattern research CLAUDE.md asks for.
- **Twilio sole-proprietor 10DLC registration**, so texts reach real phones.
- **A logo asset.** The sidebar shows the word "Housemate" as a placeholder.
- **Business registration** is only needed before live payments (Slice 6).

## Known gaps and risks

- **`next build` needs the network** for Google Fonts. CI will too, or the font
  gets self-hosted with `next/font/local`.
- **Impeccable's image generation doesn't support Claude Code** (Codex/Cursor
  only, else an `OPENAI_API_KEY` with its own billing). Paper's HTML canvas
  makes raster comps unnecessary, so this shouldn't matter.
- **Deleting a member's data** collides with the append-only activity log;
  Slice 7 needs a controlled, audited path.
- **Outbound texts can't carry photos yet.** Slice 2 needs that.
- **The Property area has no design.**
- **The budget is read as $100 per member per month.** If it meant the whole
  pilot, only the alert threshold changes.
- **Real-site computer use (Slice 5) can't be fenced by code.** Bookings that
  carry a fee but take no payment rely on the agent's instructions plus an
  audit review.
