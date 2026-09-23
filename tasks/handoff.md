# Session handoff · 2026-09-23 (Slice 0 step 7 closed: costs, alerts and the ops cost view)

Context for picking this up in a fresh session. Durable knowledge lives in the
documents below; this file captures what a new session would otherwise have to
rediscover. Overwrite it; never append — **except** keep any "Landing page
(parallel session)" section another session has added, word for word.

## Read these first

1. `CLAUDE.md` — rules, stack, commands, sandbox notes.
2. **Linear, project "Checklist"** (team Housemate, keys `HOU-`). Check it
   at session start (D-035). Answers the user left there are recorded in the
   docs, then the issue is closed.
   **Also check project "Key Docs"** for docs the user edited in Linear
   (D-038, "Docs in Linear" in `CLAUDE.md`).
3. `docs/build-plan.md` — architecture and slices 0–7 (approved, D-031).
4. `tasks/todo.md` — the approved Slice 0 plan and the per-step results.
5. `tasks/lessons.md` — read every session.

## Where things stand

**Slice 0 steps 1–7 are closed.** Step 7 (cost tracking and alerts) finished
on 2026-09-23. Its decisions are **D-063** (how costs are recorded and when
the team is texted; the $100 is the whole pilot's, superseding that part of
D-030) and **D-064** (the ops cost view). Open question 22 is deleted, and
HOU-24, HOU-54 and HOU-55 are closed. The approved plan was
`~/.claude/plans/serialized-twirling-jellyfish.md`; the results are in
`tasks/todo.md`.

**Part B, built 2026-09-23 from the r2 Paper boards** (page "Ops", O1–O3 r2,
approved when the user said "ok continue"). `/ops/costs` is staff only: anyone
else gets a 404 from `requireStaff()` in `apps/web/src/lib/auth/session.ts`,
checked in the page rather than left to row-level security. `/ops` redirects
to it. One month at a time with a stepper (`?month=YYYY-MM`, never past the
current month), three figures and a budget bar, the month's alerts with a
state worked out from the data, and the by-member table. The written spec is
`docs/design.md` §4 "Ops cost view".

- **The logic lives in `@housemate/core/costs`** (`packages/core/src/costs/`):
  `getCostReport` (the queries), `alerts.ts` (derived state, who was reached,
  grouping a sweep's stuck sends into one row, and every alert's wording),
  `copy.ts` (the page's sentences), `month.ts` (UTC budget months and dates)
  and `money.ts`. The page files only lay it out. `BUDGET_TIMEZONE` now lives
  beside `MONTHLY_BUDGET_USD` in `packages/core/src/config.ts`.
- **Three things differ from the boards, on purpose,** and `docs/design.md`
  records them: a stuck send says "delivered since" rather than a delivery
  time (none is stored); the "Not a member" note says texts "to and from"
  outside numbers (the team's alert texts land in that row); and the notice
  has a "no team numbers are set" variant.
- **Verified:** lint, typecheck and format pass; 114 unit, 66 database and 21
  Playwright tests pass, twice in a row. Screenshots of an over-budget month,
  an empty month and the current month matched O2, O3 and O1, using demo rows
  that were removed afterwards.

**A parallel session ("Landing Page", HOU-46)** is building a marketing page
for myhousemate.co on branch `site/landing`, in its own worktree. It edits
`docs/decisions.md`, `tasks/todo.md`, `docs/design.md` and `docs/product.md`
in place, and keeps its own section at the end of this file. Its branch changes
`apps/web/src/proxy.ts` and `apps/web/src/app/page.tsx`, which may conflict
with this branch when they merge. **Re-read any shared doc just before editing
it, and take new D-numbers at write time** (the next free one is D-065 as of
this writing).

**The dev Sprite (D-059, HOU-45)** still waits on the user connecting the
Sprites MCP (HOU-41). The checklist is in `tasks/todo.md` under "Dev Sprite
for coding agents".

## Repo state

Branch `slice-0/foundation`, open as
[PR #1](https://github.com/johnrehealy/housemate_prototype/pull/1). The last
pushed commit is `8daaddb`. **Everything below is uncommitted**; commit only
when the user asks.

| Area | What |
|---|---|
| Ops cost view (step 7B) | New: `packages/core/src/costs/` (with `month`, `alerts`, `copy` unit tests and `report.db.test.ts`), `apps/web/src/app/ops/{layout,page}.tsx`, `apps/web/src/app/ops/costs/{page,tables}.tsx`, `apps/web/e2e/ops.spec.ts`. Changed: `packages/core/package.json` (the `./costs` export), `config.ts`, `actions/{check-pilot-budget,index}.ts`, `scripts/seed-local.ts` (a staff member), `lib/auth/session.ts` (`requireStaff`), `e2e/{support,auth.setup}.ts`, `playwright.config.ts` (a `staff` project), `supabase/config.toml` (a second test code). |
| Costs and alerts (step 7A) | New: `packages/core/src/actions/{raise-alert,check-pilot-budget}.ts`, `packages/core/src/jobs/{message-cost,sweep-stuck-sends,index}.ts`, `packages/core/src/actions/alerts.test.ts`, `packages/core/src/jobs/message-cost.db.test.ts`, migrations `20260922160000_message_costs_queue.sql` and `20260922193304_alert_kinds.sql`. Changed: `sms/{types,twilio-provider,simulator-provider}.ts`, `queue/jobs.ts`, `actions/{outbound,record-inbound-message,record-usage-cost,errors,index}.ts`, `db/schema.ts`, `config.ts`, `apps/worker/src/index.ts`, and the provider and action tests. |
| Worker (step 6) | `packages/core/src/queue/{consumer,index}.ts`, `jobs/inbound-message.ts`, `actions/{outbound,send-invite-only-reply}.ts`, `sms/webhooks.ts` (`optOutOf`); migrations `20260922142151_message_idempotency.sql` and `20260922142200_dead_letter_queue.sql`. `apps/worker/src/{index,health}.ts`. In `apps/web`: `app/dev/thread/`, `lib/supabase/client.ts`, `e2e/messaging.spec.ts`. Also `playwright.config.ts` and `.claude/launch.json` (a `worker` entry). |
| Messaging (step 5) | `packages/core/src/sms/{webhooks,simulate-inbound}.ts` and their tests; `signTwilioRequest`; `updateMessageStatus`; `getSmsThread`; `packages/core/scripts/simulate-sms.ts`. In `apps/web`: `api/twilio/{inbound,status}`, `lib/twilio-webhook.ts`, `dev/sms/`, the proxy matcher. Both `package.json` files and `.env.example`. |
| Sign-in copy (D-057) | `story-panel.tsx`, `page.tsx`, `sign-in-form.tsx`, `e2e/sign-in.spec.ts`, the seven captures. |
| Docs | `CLAUDE.md`, `docs/design.md` (§4 "Ops cost view"), `docs/decisions.md` (D-057 to D-064, D-030's status), `docs/open-questions.md` (Q22 gone), `tasks/todo.md`, `tasks/lessons.md`, this file. The Impeccable critique of the r1 boards is `apps/web/.impeccable/critique/2026-09-23T14-07-10Z__apps-web-src-app-ops-costs.md`. |
| Dev Sprite (D-059) | `scripts/sprite/network-policy.json` and `scripts/sprite/bootstrap.sh` (untracked). |
| Mirroring | `docs/linear-docs.json`, plus the **untracked** `.claude/agents/` and `.claude/skills/`. Whether those are committed is the user's call. |

`.env.local` (git-ignored) holds a fake `TWILIO_AUTH_TOKEN` and two fake
`TEAM_ALERT_PHONES` numbers. The local database holds the seeded member Sam
Sample (`+15550190001`) and **a seeded staff member, Olly Ops
(`+15550190002`, no home)**, plus texts and cost rows from Playwright and the
by-hand checks. The alerts table and the queues are empty; the demo rows used
for the screenshots were removed and the removal checked.

## What's next

1. **An Impeccable finish review of `/ops/costs`, if the user wants one.**
   It wasn't run; it's the user's to invoke (`/impeccable polish` or a
   critique of the build). The build was checked against the boards by hand.
2. **Step 8: CI, deploys and staging.** It will need HOU-52's answer (the
   opt-out keywords) and should record a member's STOP as consent withdrawn
   before real members arrive.
3. **The dev Sprite, once HOU-41 is done.** Pick up at the first unticked
   item in `tasks/todo.md` → "Dev Sprite for coding agents". Docker spike
   first; if `dockerd` won't run as a Sprite service, stop and re-plan.
4. **The shell review's findings, HOU-34 to HOU-38.** Each needs a Paper
   mockup first (D-034).
5. **HOU-39.** The pointer lands on "Use a different number" where "Send
   code" just was.

## Waiting on the user

- **HOU-44** — whether to commit and push the Slice 0 work. Steps 5–7 are all
  uncommitted, and the Sprite only sees what's pushed; `8daaddb` is the last
  push.
- **HOU-52** (low) — yes or no on trimming Twilio's opt-out keywords to STOP,
  STOPALL and UNSUBSCRIBE, so "Cancel" about an appointment doesn't opt a
  member out. Needed by step 8.
- **HOU-41** — connect the Sprites MCP, and install the `sprite` CLI.
- **HOU-42** — a fine-grained GitHub token, entered with `gh auth login` on
  the Sprite.
- **HOU-43** — sign Claude Code in on the Sprite.
- **HOU-34** (P0) — zero states for the six destinations. Paper mockup.
- **HOU-35** (P1) — the shell's utility bar. Paper mockup.
- **HOU-36** (P1) — keyboard focus: no authored nav ring, no skip link.
- **HOU-37** (P1) — an unknown URL renders Next's stock 404. `/ops` for a
  non-staff member shows the same stock page.
- **HOU-38** (P2) — reserve the nav's trailing state slot.
- **HOU-39** (P3) — the sign-in's two overlapping controls.
- **HOU-11** — the Fly deploy token still needs adding to GitHub.
- **HOU-33** — the real team phone numbers (`.env.local` has fakes).
- **HOU-23** — D-008 is still marked Proposed.

## Environment facts that were expensive to learn

- **Signing in as staff locally needs the second test code.**
  `supabase/config.toml` `[auth.sms.test_otp]` now lists `15550190002`
  as well; a number missing there fails with `sms_send_failed 422`. A change
  to `config.toml` only takes effect after `pnpm db:stop` and `pnpm db:start`
  (outside the sandbox; the data is kept). On a fresh machine, run
  `pnpm db:seed` so Olly Ops exists.
- **Playwright saves two sessions:** `apps/web/e2e/.auth/member.json` and
  `staff.json`. Both hold real session tokens, are git-ignored, and must never
  be committed. The `staff` project runs only `ops.spec.ts`.
- **Picture a page that needs a signed-in staff member** with a small
  Playwright script that loads `staff.json` as its `storageState`, not the
  browser pane (sign-in codes aren't typed there).
- **Phone-number blocks for generated data:** seed `019`, database suites
  `010`–`050`, `060` (the cost report) and `070`, browser tests `08x`. Take an
  unused block for a new suite.
- **The worker runs with `preview_start worker`** (`.claude/launch.json`),
  because listening on a port is blocked in the sandbox. Its log is
  `preview_logs`. `curl http://127.0.0.1:8080/health` works from the sandbox.
- **Playwright starts both the web app and the worker**, or reuses whatever
  is on 3000 and 8080. Stop the previews first to test a fresh start.
- **Stopping a preview can take a few seconds to free its port.** Check with
  `lsof -iTCP:8080 -sTCP:LISTEN` (outside the sandbox) before starting
  Playwright.
- **To simulate a crashed worker,** take a job with
  `select * from pgmq.read('inbound_messages', 5, 1)` and don't delete it: it
  comes back after 5 seconds as the next attempt.
- **`pgmq.read_with_poll` with a poll time of 0 never reads**; the consumer
  uses `pgmq.read` for that case.
- **A queue's table is `pgmq.q_<name>`.** The cost report reads the
  dead-letter tables directly, from a fixed list of names, never from an
  alert's own text.
- **A queued payload read through the app's own database client is an
  object**, though the raw `postgres` client returns it as a string. A
  dead-letter record whose `job` looks double-encoded was enqueued that way,
  not mangled by the consumer.
- **`activity_events` refuses deletes**, even on the server connection, so
  probe rows in it can't be tidied away. That's the append-only trigger doing
  its job.
- **Hand-written SQL into enum columns needs a cast** (`'twilio'::usage_kind`,
  `'send_stuck'::alert_kind`).
- **Realtime:** a browser channel can report `SUBSCRIBED` with no Postgres
  binding. `realtime.subscription` shows whether one exists, and the Realtime
  container's log (`docker logs supabase_realtime_Prototype`, outside the
  sandbox) only counts `subscription_errors`. See `tasks/lessons.md`.
- **Local user JWTs are ES256**, and the browser's publishable key isn't a
  JWT at all.
- **Sandboxed and unsandboxed commands have different `$TMPDIR`s.** Don't
  pass a file between them that way (see `tasks/lessons.md`).
- **Checking the database without `psql`:** run a small `.mjs` that imports
  from `./src/db/index.ts` inside `packages/core`, run it with
  `node --import tsx/esm`, and delete it afterwards.
- **The SMS simulator needs the app running:** `preview_start` "web" (a
  production build, so run `pnpm build` or Playwright first), then `pnpm sms`.
- **Run Playwright from the repo root.** Run from `apps/web` it finds no
  config and every test fails with "Cannot navigate to invalid URL".
- **`pnpm install`, `pnpm build` and `pnpm exec playwright test` run outside
  the sandbox.** `next/font` downloads Lato at build time. `lint`,
  `typecheck`, `test` and `test:db` are fine inside.
- **Playwright's `getByText("…")` is a case-insensitive substring match.**
  Pass `{ exact: true }` when a shorter string ends a longer one. A test that
  sends a text should tag its body uniquely, because the local thread keeps
  every earlier run's messages.
- **A client component must not import from the `@housemate/core` barrel** —
  use a subpath such as `@housemate/core/phone`.
- **Theme gotchas:** `text-sm` is weight 700, so body copy at that size is
  `text-sm font-normal`. A border sits outside a fixed height unless the
  height is on the bordered element itself.
- **`Intl` in en-GB writes "Sept"** for September's short name; the costs
  module takes the short month from en-US and the rest from en-GB.
- **Browser-pane screenshots of this app render unreliably.** Use
  `javascript_tool` for numbers and Playwright for pictures:
  `CAPTURE=1 pnpm exec playwright test --project=capture`.
- **Signing in from the browser pane:** set the inputs with the native value
  setter plus an `input` event; the local code is `123456`.
- **Paper calls need `fileId`.** File `Diligent meadow`
  (`01M2G0KC27F2PP2R60GJ60ZJ99`), Sign-in page `4-0`, Ops page `p-7-0`. Pass
  the page id explicitly: the user is usually looking at the Landing page, and
  a page-scoped call with no id lands wherever they are.
- **Ops page board map:** r1 row at y 0 (x 0 / 1520 / 3040), r2 row at
  y 1160 in the same columns — O1 r2 `C08-0`, O2 r2 `C6I-0`, O3 r2 `CCK-0`.
  r2 is the approved one.
- **Phosphor icon paths for Paper** come straight from the installed package:
  `node_modules/.pnpm/@phosphor-icons+react@*/node_modules/@phosphor-icons/react/dist/defs/<Name>.es.js`,
  the `"regular"` entry's `d` attribute, on a 256 viewBox.
- **The lockup goes into Paper as a file,**
  `paper-asset:///Users/healyfamily/Documents/Prototype/apps/web/public/brand/housemate-lockup-evergreen.svg`,
  at 163 × 20.
- **A mirror whose Linear `updatedAt` doesn't advance didn't land.** Don't
  `mark` it.

## Conventions worth keeping

- **Every mirrored doc that changes is copied to Linear in the same turn**,
  then `mark`ed, and `check` runs before the turn ends. Verbatim; never
  `patch`, never reword.
- **Remote changes go through MCP.** If the MCP can't, try the CLI or a direct
  API call; if that fails, stop and ask. Never the browser.
- **Work on a branch, never `main`.** Commit and push only when asked.
- **Anything the design system doesn't cover is mocked in Paper first**
  (D-034). Dev tooling pages (`/dev/*`) are exempt (D-058, D-060); `/ops/*`
  is not.
- **Logs carry IDs, outcomes and error names only** — never a text's body or
  a phone number.
- **Alerts and costs are staff-only** under row-level security, and the page
  checks the role too. Every probe row from a by-hand check is removed once
  it's proved its point.
- **Staff-only pages answer anyone else with a 404,** not a redirect or a
  "forbidden", so they don't reveal that they exist.

## Known gaps

- **Staff sign-in lands on `/chat`,** like a member's, and nothing links to
  `/ops`. Staff type the address. Worth settling when there's more than one
  ops page.
- **Claude token costs aren't tracked yet.** There's no agent until Slice 1;
  the `claude` usage kind and the view's split columns are ready and appear
  once a month has any.
- **Alerts can't be resolved by a person.** The view works the state out from
  the data (D-064); no surface acts on one.
- **Agent runs will outlast the worker's 30-second visibility window.** Slice
  1 needs a longer window or a heartbeat.
- **`impeccable-documenter` was deliberately not run** — `docs/design.md` is
  the design system (D-010, D-034).
- **Narrow layouts exist for the sign-in only.** Q12 stays open; `/ops/costs`
  is desktop only.

## Landing page (parallel session)

Session "Landing Page", HOU-46, D-061. The checklist is in `tasks/todo.md` under "Landing page"; the plan is `~/.claude/plans/sprightly-puzzling-fairy.md`.

- **Where it stands (2026-09-22):** boards L1 (desktop 1440) and L3 (narrow 390) are on the Paper page "Landing" in Diligent meadow. L2 was dropped. The user is now redesigning the page panel by panel. The hero r2 boards read H3 (the "Join the waitlist" button) → H1 (the email bar) → H2 (thanks), with H5 as the alpha-email outcome and H4 the rotation spec; the rotating line loops with no pause control, a deliberate WCAG 2.2.2 exception. Six story panels P1–P6 sit in a row beneath them and replace L1's middle sections. All wait on HOU-48; the demo video and team photo are placeholders (HOU-53). **Next:** with P1–P6 revised, rebuild the L1 full-page board from the approved hero and panels, then do the narrow 390 versions. No code yet. The waitlist needs a table and an action, so its build needs a plan and changes D-061 ("no inline field").
- **Going live** is blocked on the Vercel connector: it signs in as the user (Hobby) but gets a 403 on team `john-h-housemate`, and `list_teams` is empty (HOU-47). Then DNS at Namecheap (HOU-49). No production Supabase project exists yet; check the cost through the MCP before creating one.
- **Board map on the Paper page "Landing" (2026-09-22):** row 1 at y 0 is the hero flow, left to right — H3 step 1 (button), H1 step 2 (email bar), H2 step 3 (thanks), H5 step 3b (alpha email), H4 rotation spec. Row 2 at y 1100 is P1–P6. L1 and L3 (the old full page) sit at x 0 and x 1520 and are superseded from the hero to "A real team visits"; the close, "We own the mundane.", still stands.
- **The user's eight notes of 2026-09-22 are all applied to P1–P6, and HOU-48 records the revision.** (1) P1 is a centered panel: heading and lead centered over a 1080-wide nav card holding a white composer pill. (2) The evergreen ribbon (lockup + "Sign in", 64px, `padding: 0 120px`) is cloned onto every panel; in the build it is one sticky bar, not six. (3) Every panel artboard is 1440×900. (4) P2's phone is rebuilt to the exact L1 spec (372×700, padding 10, radius 52, screen radius 42), and P3 and P5 are clones of it. (5) Every headline is Lato 700. (6) P3 is that phone with an inline "Browser" card — `hvac-service.example.com`, three visit times with 9:30 chosen, and an "Open browser" action; the old desktop browser window is deleted. (7) Every body is `text-wrap: pretty`, so no line ends on a single word; P4's "done." now reads "it done." (8) P5 is an approval sheet over the thread, the thread dimmed to 0.45 behind it and doubling as the timeline. P6's modal gained a canvas ground card so it carries the same weight. Shared shell: artboard column → ribbon → `Panel body` row, `padding: 0 120px`, `gap: 96`, `align-items: center`; copy column 420 fixed, visual column flex 1. Panels alternate canvas/nav grounds and left/right visuals.
- **A second round of notes, 2026-09-22, also applied.** The user dropped two photographs on the Paper canvas and they are now placed: the under-sink leak is P2's photo bubble (200×150, radius 18), and the package pickup fills P4's panel, absolutely positioned behind the "Monday visit" chip — `position: absolute` does work in Paper, which is how a caption sits over an image. The phone threads are `justify-content: flex-start` (top-aligned), the phone bezels are `#CFC8C3` with a `#B3ABA5` hairline and `0 20px 44px rgba(20,52,47,0.12)`, the screens carry a `rgba(20,52,47,0.10)` inner hairline, and the ribbon now holds two 150×36 buttons: "Sign in" (outlined) and "Join the waitlist" (canvas fill, evergreen 700 label). **Unasked addition, flagged to the user:** a Messages-style composer ("Text Message" + a send button) at the bottom of P2's and P3's phones, because top-aligning left the lower half empty and the stated intent was "look like a real thread". P5 has the approval sheet there instead.
- **Both photographs need clearing before they are committed (HOU-53).** The package photo shows a legible house number, "1028", and the sink photo is an interior — product invariant 6 keeps addresses and interior photos out of commits. **Cleared 2026-09-22: the user says both photographs are staged and fine to publish**, so the house number and the interior shot are closed. The loose end left in HOU-53 is that invariant 6's letter still says no interior photos or addresses in commits, and these will be committed as site assets — worth a one-line decision saying the invariant governs real member data, not staged marketing photography.
- **Third round, 2026-09-22: bezel, motion and the close.** The bezels were tried in polished black and the user rejected it ("way too harsh"), so they are back to the muted gray of round two — `#CFC8C3`, 1px `#B3ABA5`, `0 20px 44px rgba(20,52,47,0.12)`, screens with a `rgba(20,52,47,0.10)` inner hairline. Don't re-darken them. **New board `BDM-0` · P7 · Close** at x 11110, y 1100: evergreen, ribbon, roof mark, "Let Housemate take it / from here." at 52/60 (light + regular), a lead about being invite-only in alpha, the "Join the waitlist" button matching the hero's (52px, radius 14, padding 32, canvas), and a 72px footer with "© 2026 Housemate". **New board `BEA-0` · M1 · Scroll motion spec** at x 9590, y 0: seven motions A–G, all opacity and ≤24px vertical moves, built on CSS scroll-driven animations (`animation-timeline: view()` / `scroll()`) with an `@supports` fallback to the finished state, which is what muse.ai itself does (verified by reading its stylesheets: it uses `scroll()` for its sticky header, no GSAP, no Framer). M1 carries one open question: Firefox has no scroll timelines, so it gets the page still unless the user wants an IntersectionObserver fallback.
- **Impeccable `/critique`, 2026-09-22, and the fixes the user chose.** Snapshot: `.impeccable/critique/2026-09-22T20-20-27Z__ign-file-01m2g0kc27f2pp2r60gj60zj99-p-6-0-2c29d592.md` (15/32, heuristics 7 and 10 `n/a` on a Persuade surface, 3 P0 and 2 P1). What it found and what was done:
  - **P0 · H5 was a stale duplicate** — its button was *named* "Button · Get started" but read "Join the waitlist", and "A Housemate is waiting for you." was missing, so the recognised-member outcome didn't exist. Rebuilt: `AOX-0` is an 88px column, gap 8, holding a check-circle + "A Housemate is waiting for you." (20/28) and a real "Get started" button.
  - **P0 · P6 claimed a credential store that no doc backed.** The user's answer: it is really planned. Recorded as **D-062**, and `docs/product.md` lines 34 and 93 now say so instead of contradicting it. D-062 also fixes what "hidden from Housemate" has to mean — worker code injects the secret into the sandbox at fill time, exactly as D-025 does for cards, so it never enters the model's context. **Still to settle before launch:** the vault isn't in slices 0–7, so P6's wording must not imply it works today. The feature is HOU-56.
  - **P0 · P5's dimmed thread failed contrast** — the thread at 0.45 opacity measured 2.47, 2.58 and 1.85:1. The user chose blur plus a scrim: `BG4-0` (a `rgba(255,251,249,0.52)` absolute overlay) sits at index 2 of the screen, and the thread and contact bar carry `filter: blur(3px)` at full opacity. Nothing legible is left behind glass, so the thread is unambiguously decorative — M1's row D now says it is `aria-hidden` and not focusable.
  - **P1 · the ribbon's "Sign in" border** measured 2.70:1. Raised to `rgba(255,251,249,0.42)` on all seven boards.
  - **P1 · P7's footer** was 4.48:1 and had no links. Now `#FFFBF996` with a `space-between` row and Privacy / Terms / Contact at `#FFFBF9C4`. **Those three pages don't exist** and `docs/product.md` says not to invent them — launch is blocked on HOU-50, or the links come out.
  - **Left as is on the user's instruction:** the rotating line in H4 ("Keep it exactly as is"), so the WCAG 2.2.2 pause objection stands and lives in HOU-48.
  - **Deferred, not in the chosen scope:** the waitlist's loading / invalid / duplicate / failure states, the 18px hero jump between H3 and H1 (`ANU-0` would need `height: 88px`), alt text for the two photographs, the narrow-390 layouts for P1–P7 and M1, the service-area gate, and recording the 32/700/40 marketing heading as a display scale in `docs/design.md`.
  - **How the review ran:** two isolated sub-agents, one reading the boards and one measuring in the browser. The detector pass is weak evidence, not a clean bill — a seeded 6-defect control file caught only 1.
- **Paper quirk (new):** `create_artboard` creates on the *currently active* page, not the page you were last reading. P7 and M1 were silently made on the Ops page and had to be moved with `move_nodes` to `root_node_p-6-0`. Check the parent after creating an artboard.
- **Fourth round, 2026-09-22: H5 deleted, serif headlines, and the narrow board.** The user dropped the alpha branch, so **H5 is deleted** — every email now gets the same thanks and nothing on the page reveals who is on the alpha list. **Panel headlines P1–P7 are DM Serif Text 400** at the user's instruction; it has one weight, so the older "headlines semibold" note no longer applies to panels, and `docs/design.md` §1 now carries the rule (serif for headings on the public site only, Lato everywhere in the app). The hero stays Lato Light — flagged to the user as a choice, not an oversight. **New board `BTD-0` · N1 · narrow 390** at x 0, y 2200: the whole page top to bottom. The phones (`APT-0`, `AVS-0`, `AYC-0`) and the P4 photo are clones, so they stay in step with the desktop boards; P6's logins modal is rebuilt at 342 because a 560 clone can't shrink, with the "Hidden from Housemate" chip moved onto its own line. The footer has no links, per D-061 and HOU-50.
- **Paper quirks (new):** `create_artboard` ignores `x`/`y` in `styles` and auto-places the board — **move it afterwards with `update_styles` using `left`/`top`**, not `x`/`y`, which silently do nothing on an artboard. `write_html` takes `targetNodeId` plus `mode: "insert-children"`, not `parentId`. `update_styles` takes `updates: [{nodeIds: [...], styles}]` — `nodeId` singular is rejected. `get_font_family_info` takes `familyNames` as an array.
- **The build is planned and approved** (`~/.claude/plans/sprightly-puzzling-fairy.md`, rewritten 2026-09-22). It waits on the user approving N1 and the desktop boards (HOU-48). Two traps it records: `/brand/*` and any photograph in `public/` are behind the proxy's matcher, so a signed-out visitor's images redirect to sign-in; and `landing.spec.ts` matches no Playwright project unless it's added to the `signed-out` `testMatch`.
- **Paper quirk:** `update_styles` won't clear `paddingInline` once a node has it. Rebuild the wrapper (a new frame, `move_nodes` the children in, delete the old one).
- **Production env:** signed-out paths need only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the full server env won't validate in production until Twilio exists (HOU-5).
