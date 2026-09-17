# Session handoff · 2026-09-17 (end of session)

Context for picking this up in a fresh session. Durable knowledge lives in the
documents below; this file captures what a new session would otherwise have to
rediscover.

## Read these first

1. `CLAUDE.md` — rules, stack, commands, sandbox notes.
2. **Linear, project "Checklist"** (team Housemate, keys `HOU-`). Check it
   at session start (D-035). Answers the user left there are recorded in the
   docs, then the issue is closed.
   **Also check project "Key Docs"** for docs the user edited in Linear
   (D-038, "Docs in Linear" in `CLAUDE.md`).
3. `docs/build-plan.md` — architecture and slices 0–7 (approved, D-031).
4. `docs/decisions.md` — D-001 to D-042. Binding.
5. `docs/open-questions.md` — unanswered questions and the defaults in effect.
6. `tasks/todo.md` — the Slice 0 plan with per-step results.
7. `tasks/lessons.md` — lessons already paid for.
8. `docs/product.md` (also Impeccable's PRODUCT.md) and `docs/design.md` (its
   DESIGN.md).

## Where things stand

**Slice 0 (foundation): steps 1–4 are built. The user asked Claude to stop and
wait for a go-ahead (HOU-7) before building the approved sign-in design.**

- **Steps 1–3: done.** Workspace and tooling; seven tables with row-level
  security, an append-only activity log and a 10-member cap; `defineAction`
  plus six actions, the Postgres job queue and the local seed.
- **Step 4: built and passing, but not closed.**
  - Built: phone-code sign-in, `activateMember`, protected routes and browser
    tests.
  - Approved since: the sign-in design, in Paper (D-036). The build doesn't
    match it yet.
- **Steps 5–9: not started.** Messaging webhook and simulator, worker, cost
  alerts, CI and deploys, docs.

**Test counts:** 43 unit, 31 database, 8 Playwright. All pass, with lint and
typecheck clean.

**Done on 2026-09-17, after the sign-in approval:**
- **Linear set up (D-035).**
  - Project "Checklist", with the labels Action, Decision and Review.
  - 25 issues, HOU-5 to HOU-29: 2 Urgent, 6 High, 8 Medium, 9 Low.
  - Backlog: HOU-20, HOU-22, HOU-29. Everything else is Todo.
  - HOU-1 to HOU-4 are Linear's own onboarding issues; leave them alone.
- **`/impeccable init` run.**
  - `docs/product.md` gained the schema stamp and new sections: Platform (web),
    Users, Positioning ("We own the mundane"), Operating context, Evidence on
    hand, Product principles, and Accessibility.
  - The user confirmed Users, Positioning and Accessibility.
  - D-037 records that the web app meets WCAG 2.2 AA.
- **Everything above is committed** (`92939d6`).
- **Docs mirrored in Linear (D-038), not committed yet.**
  - The nine project docs are documents in the Linear project "Key Docs".
    `docs/linear-docs.json` maps each file to its document.
  - `scripts/linear-docs.sh check` lists stale copies; `mark` records a copy.
  - The rule is under "Docs in Linear" in `CLAUDE.md`.
  - **Every edit to a mirrored file needs a Linear update in the same turn,**
    this file included.

**The user answered questions in Linear, 2026-09-17 evening.** Found by
comparing each document's `updatedAt` with the manifest, then reading the copy.

- **They renamed both projects:** "Waiting on you" → **Checklist**, "Prototype
  docs" → **Key Docs**. The docs and `docs/linear-docs.json` now use the new
  names.
- **`docs/open-questions.md`:** they marked most defaults approved in place, and
  answered Q1, Q2, Q6, Q7, Q15, Q16 and Q19. Copied back into the repo verbatim.
- **`docs/decisions.md`:** D-006, D-007 and D-009 approved; **D-008 is "I want to
  discuss this one further"** (HOU-23, retitled).
- **`docs/product.md`:** connectors to inbox, email and calendars are part of the
  product, not only the eventual one.
- **New decisions from those answers:** D-039 build work is tracked in Linear
  too, D-040 quiet hours are 9 PM–7:30 AM, D-041 Lucid for architecture
  diagrams, D-042 team alerts move to Slack later.
- **New issues:** HOU-30 (connect Lucid, Checklist) and HOU-31 (build work:
  change the quiet-hours window in `sendMessage`, which still enforces
  10 PM–8 AM and has tests asserting it).
- **Check the Key Docs project this way at every session start:** `updatedAt`
  more than a minute past the manifest's `linearUpdatedAt` means the copy may
  have been edited. A bump alone isn't an edit — read the copy and compare.

## What's next (only once the user says go, HOU-7)

1. **Plan the build of the approved sign-in design.**
   - Automatic sign-in on the sixth digit is a behavior change, so the plan
     needs approval. Log it as a Review issue.
   - Take the values from Paper with `get_computed_styles`: the "Sign-in" page
     of the file "Diligent meadow", boards A1–A6 "Approved r1". Specs are in
     `docs/design.md` §4 (Form controls, Sign-in page).
2. **Build it and update the e2e tests.** Check against WCAG 2.2 AA (D-037).
3. **Finish the Impeccable steps.** Run `impeccable detect`, then the
   `impeccable-finish-reviewer` and `impeccable-documenter` subagents. The
   direction contract is
   `apps/web/.impeccable/surfaces/apps-web-src-app-auth-sign-in-sign-in-form-tsx.md`.
4. **Close step 4** with the Impeccable review of the app shell.
5. **Step 5 · Messaging path:** Twilio inbound and status routes with signature
   validation, the simulator page and CLI, and enqueueing jobs.
6. **Before step 8:** `supabase/config.toml` carries three deliberately
   local-only settings: `[auth.sms.test_otp]`, placeholder Twilio credentials,
   and a 1-second code throttle. Staging and production are configured
   separately and must never inherit them.

## Waiting on the user

- **Allowing the docs Stop hook, asked in chat, not in Linear.**
  - Claude Code's auto-mode check refused Claude's edit to
    `.claude/settings.json` as self-modification. A Linear issue for it
    wasn't created: the attempt failed, and the follow-up lookup was
    refused by the same check.
  - The hook runs `"$CLAUDE_PROJECT_DIR/scripts/linear-docs.sh" stop-hook` as
    a `Stop` hook with a 10-second timeout.
  - It has been tested by piping hook input in by hand.
  - **Until it's allowed,** run `scripts/linear-docs.sh check` by hand before
    ending any turn that touched docs.

Everything else is in Linear. **Most urgent:**
- **HOU-5:** Twilio and 10DLC registration, which takes weeks.
- **HOU-6:** GitHub. There is no remote backup yet.
- **HOU-7:** the go-ahead to continue.

When a new need comes up, create an issue there rather than asking only in
chat.

## Using Impeccable

- **Run the launcher from `apps/web`.**
  `/Users/healyfamily/.claude/skills/impeccable/scripts/impeccable context`
  From the repo root it stops with TARGET_SELECTION_REQUIRED (apps web, worker
  and core). Only web has UI.
- **Its PRODUCT.md and DESIGN.md resolve to `docs/product.md` and
  `docs/design.md`,** because the macOS filesystem ignores case.
- **Two warnings are expected.**
  - **"surface brief orphaned":** a false alarm. The brief's target path is
    relative to the repo root, but run from `apps/web` it resolves as
    `apps/web/apps/web/...`. `sign-in-form.tsx` exists.
  - **"buildPath unset":** only matters with image generation, which Claude
    Code doesn't have here, so nothing is recorded.
- **Live mode (`/impeccable live`) is not configured.** Setting it up edits app
  code, so it needs its own go-ahead.
- **Impeccable's install is gitignored:** `.claude/skills/impeccable`,
  `.claude/agents/impeccable-*.md`, and `.claude/settings.local.json` (its
  hooks). Reinstall with `npx impeccable install`. Its Stop hook runs a design
  pass of up to 30 seconds after every turn (HOU-25).

## Using Paper

- **Paper Desktop must be running** with a file open. Its MCP is at
  `http://127.0.0.1:29979/mcp`, registered at user scope.
- **Call `get_guide({ topic: "paper-mcp-instructions" })` once per session,**
  then `get_basic_info`. Call `get_font_family_info` before styling type.
  Lato weights: 100, 300, 400, 700 and 900.
- **`create_artboard` ignores left/top.** Move the artboard afterwards with
  `update_styles`.
- **Take values into code with `get_computed_styles` or `get_jsx`,** never by
  reading a screenshot. Call `finish_working_on_nodes` when done, and never
  show node ids to the user.
- **Don't take specs from other boards** in the file. Only
  `docs/design.md` and approved Claude mockups count.

## Repo state

- **Branch `slice-0/foundation`.** There is no git remote, and the repo email
  is set locally to john.re.healy@gmail.com.
- **Gitignored:** `.env*` and `apps/web/e2e/.auth/` (a real session token).
- **Tracked:** `apps/web/.impeccable/` (the sign-in surface brief).
- **Uncommitted:** the docs mirror and the answers copied back from Linear.
  - Changed: `CLAUDE.md`, `docs/decisions.md`, `docs/open-questions.md`,
    `docs/product.md` and this file.
  - New: `scripts/linear-docs.sh` and `docs/linear-docs.json`.

## Compaction routine

- **Auto-compaction fires late.** It's set to 400k tokens
  (`autoCompactWindow`) but last fired at 463,636, because long turns
  overshoot. The transcript's `compact_boundary` entries show when it fires.
- **Overwrite this file** at the end of every step, after any decision, and
  before anything that will fill context.
- **After a compaction,** read this file first and continue from "What's
  next".

## Environment facts

- **The sandbox is on (D-032).** Run these **outside** it, one at a time:
  - `pnpm add` and any other install;
  - every `docker` and Supabase CLI command;
  - **anything that runs `next build`**, including `pnpm test:e2e`. The
    sandbox's TLS proxy breaks `next/font`'s fetch of Lato.
  - When Slice 1 starts, add the Anthropic API domain to the allowlist.
- **Run TypeScript as `node --import tsx/esm <file>`.** The `tsx` command
  opens a socket the sandbox blocks.
- **Local Supabase** runs in Docker Desktop as project `Prototype`.
  - Ports: API 54321, database 54322, Studio 54323.
  - Config changes need `supabase stop && supabase start`.
  - To settle a config question, read the auth container's settings:
    `docker exec supabase_auth_Prototype env | grep -i sms`.
- **`.env.local` is at the repo root and gitignored.** `apps/web/.env.local`
  is a symlink to it.
- **Linear MCP:** the claude.ai Linear connector works (team id
  `7d810437-c5b9-4649-a348-cd4459dcfdd5`). The separate
  `plugin:product-management:linear` server needs OAuth and isn't used.
- **The GitHub plugin connector failed to connect** ("Incompatible auth
  server"). See HOU-6.

## Conventions worth keeping

- **Migrations:** Drizzle generates schema migrations into
  `supabase/migrations` (`pnpm db:generate`). Write policies, grants and
  triggers by hand with `drizzle-kit generate --custom`. Pause a second
  between generating two, because Supabase versions them by timestamp.
- **Database tests** run in transactions that roll back. Seed rows are
  committed, so phone numbers must not overlap:
  - security tests: `+1555010xxxx`
  - action tests: `+1555020xxxx`
  - the seed: `+1555019xxxx`
- **Prove security tests can fail** before trusting them.
- **A `"use server"` file may only export async functions.** Put types and
  constants in a sibling module.
- **Browser tests use a production build.** They sign in once
  (`apps/web/e2e/auth.setup.ts`), because Supabase throttles code requests.
  `pnpm test:e2e` needs a reset, seeded database.
- **Auth is checked twice:** in `apps/web/src/proxy.ts`, and by
  `requireMember()` in every page.
- **Design tokens** live in `apps/web/src/app/globals.css` under
  `@theme static`. Verify UI with computed styles.

## Known gaps and risks

- **`next build` needs the network** for Google Fonts. CI will too, unless the
  font is self-hosted with `next/font/local`.
- **Deleting a member's data** collides with the append-only activity log.
  Slice 7 needs a controlled, audited path.
- **Outbound texts can't carry photos yet.** Slice 2 needs that.
- **The Property area has no design.**
- **The budget is read as $100 per member per month** (HOU-24).
- **Real-site computer use (Slice 5) can't be fenced by code.** Bookings that
  carry a fee but take no payment rely on the agent's instructions plus an
  audit review.
