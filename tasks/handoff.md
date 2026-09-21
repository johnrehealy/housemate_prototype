# Session handoff · 2026-09-21 (sign-in build, waiting on a design approval)

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
4. `docs/decisions.md` — D-001 to D-055. Binding.
5. `docs/open-questions.md` — unanswered questions and the defaults in effect.
6. `tasks/todo.md` — the Slice 0 plan with per-step results.
7. `tasks/lessons.md` — lessons already paid for.
8. `docs/product.md` (also Impeccable's PRODUCT.md) and `docs/design.md` (its
   DESIGN.md).

## Where things stand

**Slice 0 (foundation): steps 1–4 are built. The user gave the go-ahead. The
plan for the sign-in build is approved. It is now blocked on one design
approval, HOU-32.**

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

**Docs cleaned up, 2026-09-21.** Both docs had drifted from their own rules;
this is now the state to trust.
- **`docs/decisions.md`** is one numbered sequence, D-001 to D-055. The stale
  "Approved" / "Proposed" split is gone, because it had approved, withdrawn and
  undecided entries mixed under both headings; every entry carries its own
  status line instead. Nothing was renumbered.
- **D-043 to D-055 are new entries** that write down answers the user had
  already given on 2026-09-17 in the Linear copy of `docs/open-questions.md`,
  but which had never been recorded as decisions: the task model's owner
  terms, safety escalation, reminders, desktop-first with mobile coming, one
  member per home in the prototype, sign-in, uninvited texters, opt-in and
  media, sensitive data, the starting data model, the repo, and Fly.io.
  **D-047 is the one to know about:** desktop-first, and the user's own note
  that mobile layouts are coming.
- **`docs/open-questions.md` is down to three questions** — 10 (texting
  registration), 21 (is D-008 approved), 22 (is $100 per member or per pilot)
  — plus the business-registration blocker and a connector note. Answered
  questions were deleted, as that file's own rule says. **Numbers are never
  reused,** so "open question 16" still points at the same question.
- **Eight Checklist issues closed** as already answered. HOU-11 is now just
  the Fly.io deploy token, and HOU-33 is new for the team alert phone numbers.

**The logo landed, 2026-09-21.** The user supplied three SVGs and said to use
them in mockups and code. This is the only application code that changed today.

- **`brand/`** holds the three files exactly as supplied. Never edit them.
- **`apps/web/src/components/brand.tsx`** exports `Wordmark` and `Mark`, drawn
  in `currentColor`. **Use these in the app.** Generated from the source SVG by
  a throwaway script, not hand-typed, so the 900 glyph path values are exact.
- **Both text wordmarks are gone:** the sidebar bar in `(app)/layout.tsx` and
  the card in `sign-in-form.tsx` now render `<Wordmark className="h-5 w-auto
  text-evergreen" />`. Same 20px height as the text it replaced, so no layout
  moved. Measured: 163.22 × 20, 48.78px of slack in the 260px rail.
- **The viewBox is cropped to the artwork** (`10.84 7.06 905.52 110.95`). The
  supplied file pads the bottom by 24 of 140 units, which would make a set
  height lie about what you see. Confirmed against `getBBox()` in the browser.
- **On evergreen the logo is `--color-on-evergreen` (#FFFBF9), not the
  #FFFFFF** the supplied white file carries — pure white reads cold beside our
  warm text. `currentColor` makes this automatic. **Flagged for the user on
  HOU-32**; they may want the true white.
- **`apps/web/public/brand/*.svg`** are flat per-ground copies for `<img>`,
  Paper and anything needing a URL, generated from the component.
- **`apps/web/src/app/icon.svg`** is a new favicon: the mark in on-evergreen on
  an evergreen square. `apps/web/src/app/favicon.ico` is still there and still
  wins for `/favicon.ico`; deleting it wasn't asked for.
- **All eleven Paper boards** on the Sign-in page carry the lockup now, placed
  as `<img src="paper-asset://…/apps/web/public/brand/…">` at 163 × 20. That
  includes the approved A1–A6, which keep their "Approved r1" names because the
  user asked for the change directly.
- **Recorded** in `docs/design.md` §3 under a new "Logo" heading, with a note
  under Sign-in page, and mirrored to Linear.
- **Not verified:** the app shell in a browser, which needs a signed-in session.
  Only the sidebar geometry was measured, not a real render.

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
- **Docs mirrored in Linear (D-038).**
  - The nine project docs are documents in the Linear project "Key Docs".
    `docs/linear-docs.json` maps each file to its document.
  - `scripts/linear-docs.sh check` lists stale copies; `mark` records a copy.
  - The rule is under "Docs in Linear" in `CLAUDE.md`.
  - **Every edit to a mirrored file needs a Linear update in the same turn,**
    this file included.
  - **`mark` only hashes the repo file,** so if the Linear copy is given text
    the repo file doesn't have, `check` will never notice. Save exactly what
    the file says.
  - **Patching a Linear copy is unreliable.** Linear rewrites `-` bullets to
    `*`, rewraps paragraphs and turns issue keys into mention markup, so
    `patch` anchors that contain any of those fail. Send the whole file.

**The user answered questions in Linear, 2026-09-17 evening.** Found by
comparing each document's `updatedAt` with the manifest, then reading the copy.

- **They renamed both projects:** "Waiting on you" → **Checklist**, "Prototype
  docs" → **Key Docs**. The docs and `docs/linear-docs.json` now use the new
  names.
- **`docs/open-questions.md`:** they marked most defaults approved in place, and
  answered Q1, Q2, Q6, Q7, Q15, Q16 and Q19. Copied back into the repo verbatim,
  and recorded as decisions in the 2026-09-21 cleanup.
- **`docs/decisions.md`:** D-006, D-007 and D-009 approved; **D-008 is "I want to
  discuss this one further"** (HOU-23, retitled).
- **`docs/product.md`:** connectors to inbox, email and calendars are part of the
  product, not only the eventual one.
- **Check the Key Docs project this way at every session start:** `updatedAt`
  more than a minute past the manifest's `linearUpdatedAt` means the copy may
  have been edited. A bump alone isn't an edit — read the copy and compare.

## What's next

**Blocked on HOU-32: the user approving the narrow and medium sign-in boards.**
Nothing in the build starts until they do, because D-034 says anything the
design system doesn't cover is approved in Paper first.

1. **HOU-32.** Three boards are drawn in Paper, file "Diligent meadow", page
   "Sign-in", built only from existing tokens:
   - **A7 · Narrow, phone step** (390 × 844) — no story panel; wordmark at the
     top, 56px down to a 360px form column with 24px gutters, invite note
     pinned to the bottom in `--color-muted`.
   - **A8 · Narrow, code step** — the same frame with "Enter your code", the
     six-digit field, the hint line and the text button, cloned from A3.
   - **A9 · Medium** (1024 × 768) — the story panel narrowed to 400px with
     40px side padding. The three "How it works" rows fit unchanged, so
     nothing is dropped. This differs from the approved plan, which proposed
     dropping them; keeping them reads better.
   - One rule for the build: panel hidden below 1024, 400px from 1024, 600px
     from 1280.
2. **Once approved:** record it in `docs/design.md` §4 under Sign-in page and
   against Q12 in §7, and mirror `docs/design.md` to Linear in the same turn.
3. **Then build**, following the approved plan (saved at
   `~/.claude/plans/serialized-twirling-jellyfish.md`, and summarised below).
   Nothing has been written to `apps/` yet.
   - `packages/core/src/phone.ts` gains `formatUsPhone`, exported from
     `index.ts`, with tests. The code-step helper needs the national format.
   - `(auth)/layout.tsx` becomes a full-height flex row, no padding.
   - New `sign-in/story-panel.tsx` (server component): 600px, evergreen,
     `padding: 22px 64px 56px`, `<Wordmark className="h-5 w-auto" />` (it
     inherits on-evergreen from the panel) / headline group / three rows /
     invite note. Phosphor `DeviceMobile`, `Wrench`, `CheckCircle` at 20px in
     on-evergreen 74%; hairlines `#FFFBF929`; lead and row bodies `#FFFBF9BD`;
     invite note `#FFFBF99E`.
   - `sign-in-form.tsx` is rewritten: heading group, visible 13/19 labels,
     40px fields with a muted resting border, the inline message line, and
     **auto-submit on the sixth digit**.
   - **Auto-submit decisions:** two sibling forms, so the code form has no
     submit button and Enter still works with JavaScript off, with "Use a
     different number" in its own form carrying `restart=1`; `readOnly` plus
     `aria-disabled` rather than `disabled` while signing in, so focus isn't
     thrown away; the approved hint "You'll be signed in as soon as all six
     digits are in." is what satisfies WCAG 3.2.2, so it ships with the
     behavior.
   - `state.ts` drops `notice`; `actions.ts` drops `CODE_SENT`.
   - e2e: `signIn()` stops clicking "Sign in"; the helper wording changes to
     "is on the invite list"; add a test that the code step has no submit
     button, and one for the story panel and the field's resting border.
4. **Then the Impeccable steps.** `impeccable detect`, then the
   `impeccable-finish-reviewer` and `impeccable-documenter` subagents. The
   direction contract is
   `apps/web/.impeccable/surfaces/apps-web-src-app-auth-sign-in-sign-in-form-tsx.md`.
5. **Close step 4** with the Impeccable review of the app shell.
6. **Step 5 · Messaging path:** Twilio inbound and status routes with signature
   validation, the simulator page and CLI, and enqueueing jobs.
7. **Before step 8:** `supabase/config.toml` carries three deliberately
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
- **HOU-32:** approving the A7–A9 sign-in boards. The build is blocked on it.
- **HOU-5:** Twilio and 10DLC registration, which takes weeks. Twilio's MCP is
  documentation-only, so the account work is the user's to do.
- **No remote backup yet.** The repo exists (HOU-6, closed), but no git remote
  is configured and nothing has been pushed.

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
- **Clone instead of rewriting.** `<x-paper-clone node-id="..." style="..." />`
  inside `write_html` reuses an approved node exactly, with style overrides.
- **Don't take specs from other boards** in the file. Only
  `docs/design.md` and approved Claude mockups count.

## Repo state

- **Branch `slice-0/foundation`.** There is no git remote, and the repo email
  is set locally to john.re.healy@gmail.com.
- **Gitignored:** `.env*` and `apps/web/e2e/.auth/` (a real session token).
- **Tracked:** `apps/web/.impeccable/` (the sign-in surface brief).
- **Last commit:** `f0a3050`, the repo name and the sign-in build plan.
- **Uncommitted, two batches, neither asked for yet:**
  - The 2026-09-21 docs cleanup — `docs/decisions.md`, `docs/open-questions.md`,
    `docs/linear-docs.json`, `tasks/todo.md`, `tasks/lessons.md` and this file.
  - The logo — new `brand/`, `apps/web/public/brand/`,
    `apps/web/src/components/brand.tsx`, `apps/web/src/app/icon.svg`, plus
    edits to `(app)/layout.tsx`, `sign-in-form.tsx` and `docs/design.md`.
- **The sign-in build has still not started.** The logo is the only application
  code that has changed since `f0a3050`.

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
- **The GitHub plugin connector failed to connect** (HTTP 400 at
  `api.githubcopilot.com`). The `gh` CLI is used instead, called as
  `/opt/homebrew/bin/gh` with `dangerouslyDisableSandbox: true`, because
  `~/.config/gh` is read-denied in the sandbox.
- **Every other MCP is connected:** Linear, Paper, Supabase, Vercel, Stripe,
  Twilio, Mobbin, Lucid, Google Drive and Chrome. **Twilio's is
  documentation-only** — two tools, search and retrieve — so it can't create a
  number, a Messaging Service or a Verify service.

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
