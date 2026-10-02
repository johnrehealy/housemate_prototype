# Session handoff · 2026-09-23 (Slice 0 step 8 built and rehearsed locally; waiting on the user to push and set up staging)

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
4. `tasks/todo.md` — the approved Slice 0 plan, and "Step 8" for where this
   session got to.
5. `tasks/lessons.md` — read every session.

## Where things stand

**Slice 0 steps 1–7 and 9 are done. Step 8 (CI, deploys, staging) is built
and verified locally, and everything left in it waits on the user.** The user
said on 2026-09-23 to build the rest of Slice 0 and stop only when blocked;
the build issue is **HOU-64**.

- **`main` already holds PR #1 to #3** (steps 1–4 and the landing page), and
  production deploys it to myhousemate.co. Production's Vercel env vars are
  all set, for the production target only.
- **This branch merged `main` in** (`9c464cf`) and fixed the migration journal
  collision (HOU-59, closed): the waitlist migration was regenerated after
  `alert_kinds`, byte-identical, with its original file name.
- **Built in step 8** (`dc9c9a9`): `.github/workflows/ci.yml`;
  `scripts/ci/write-local-env.sh`; `apps/worker/Dockerfile` and
  `.dockerignore`; `apps/worker/fly.{staging,production}.toml`;
  `.github/workflows/deploy.yml` calling `deploy-environment.yml`. A preview's
  `PUBLIC_BASE_URL` now defaults to `https://$VERCEL_URL`, and the SMS
  simulator sends `x-vercel-protection-bypass` when
  `VERCEL_AUTOMATION_BYPASS_SECRET` is set.
- **Verified:** a clean checkout run exactly as CI runs it (fresh install,
  fresh Supabase with the workflow's excluded services, `CI=1`) passes 117
  unit, 70 database and 31 browser tests. The worker image, run against local
  Supabase, answered a simulated text, costed both texts and exited 0 on
  SIGTERM.
- **How staging works is open question 24**, with the built design as its
  default: Vercel previews pointed at a "Housemate Staging" Supabase project,
  plus a staging worker on Fly running `main`.

**A parallel session ("Landing Page", HOU-46)** works in the worktree
`.worktrees/landing`, now on `site/landing-ribbon-rotation` with **PR #4 open
against `main`**. Its handoff is `tasks/handoff-landing.md`, which asks to be
folded into this file once slice 0 has rebased onto `main`. That's left for
when its PR #4 is merged, because that session is still active. It holds three
lessons meant for `tasks/lessons.md` for the same reason. **Re-read any shared
doc just before editing it, and take new D-numbers at write time** (D-065 and
open question 25 are the next free ones).

**The dev Sprite (D-059, HOU-45)** still waits on the Sprites MCP (HOU-41).

## Repo state

Branch `slice-0/foundation`. **Four commits are unpushed** (`82d7319` steps 5–7,
`9c464cf` the merge of `main`, `dc9c9a9` step 8, and the docs commit after it).
`origin/slice-0/foundation` is still at `8daaddb`, which was merged as PR #1.
**Claude's `git push` was refused by the permission classifier**; HOU-44 asks
the user to push or allow it. Merging to `main` stays the user's.

Still untracked, deliberately: `.claude/agents/` and `.claude/skills/` (the
user's call), and `.impeccable/` at the root (the landing session's critique
and the hook's cache).

`.env.local` (git-ignored) holds a fake `TWILIO_AUTH_TOKEN` and two fake
`TEAM_ALERT_PHONES`. **The local database was rebuilt from scratch** during the
CI rehearsal on 2026-09-23 and holds only the seed (Sam Sample `+15550190001`,
Olly Ops `+15550190002`) plus the rows the rehearsal's tests left.

## What's next

1. **Once the branch is pushed (HOU-44):** open the pull request with
   `gh pr create` (outside the sandbox; the GitHub MCP doesn't connect), then
   watch CI with the ccd_pr tools or `gh run watch`. The first real run may
   need small fixes: action versions, pnpm 12 in `pnpm/action-setup`, or
   `supabase start` timing on the runner. The Vercel preview will fail to
   build until Preview has env vars (HOU-65), so it's expected to fail and
   isn't a CI failure.
2. **Once the staging project exists (HOU-63):** read its URL and publishable
   key through the Supabase MCP for HOU-65's table. Apply the nine migrations
   there — through the MCP if the pipeline isn't on `main` yet, then align its
   history with HOU-65 §1's SQL (Claude may be refused again; see Environment
   facts). Then run `get_advisors` for security.
3. **Once HOU-65 and HOU-11 are done:** prove the simulator loop on a preview
   (text in through `/dev/sms`, reply from the staging worker) and a first
   `deploy.yml` run on `main` (it can be started by hand with
   workflow_dispatch). Then tick step 8.
4. **Signing in to staging with a real code** waits on Twilio Verify (HOU-5).
5. **Before real members:** record a member's STOP as consent withdrawn, and
   HOU-52's keyword trim. Neither is in Slice 0.
6. Then the shell review's findings (HOU-34 to HOU-39) and Slice 1's plan.

## Waiting on the user

- **HOU-44** (Urgent) — push `slice-0/foundation`, or allow Claude to.
  Everything else in step 8 follows from it.
- **HOU-63** (High) — create the staging Supabase project ($0 a month), or
  allow Claude to.
- **HOU-65** (High) — production's migration history (one SQL statement),
  Vercel Preview env vars and protection bypass, GitHub environment secrets,
  and staging's Auth settings.
- **HOU-11** (High) — the two Fly apps, their secrets and deploy tokens.
- **HOU-66** (High) — the repo is public; D-054 says private.
- **HOU-5** (Urgent) — Twilio. Blocks real-phone sign-in and the production
  worker.
- **HOU-52** (low) — the opt-out keywords.
- **HOU-41, HOU-42, HOU-43** — the dev Sprite.
- **HOU-34 to HOU-39** — the shell review's findings.
- **HOU-33** — the real team phone numbers. **HOU-23** — D-008's status.

## Environment facts that were expensive to learn

- **Claude Code's permission classifier refuses these, even through an MCP:**
  the Supabase MCP's `create_project` ("Modify Shared Resources"), an
  `execute_sql` UPDATE on production, and `git push`. The landing session
  found Vercel env-var writes refused the same way. Don't retry or route
  around them; they go to the user as Checklist issues.
- **The Vercel MCP works without a team slug.** Passing
  `slug: "john-h-housemate"` or the team id returns 403; the project is
  `prj_WdzTatD61W4BOUfKx2vCtSrWygDq` ("housemate_prototype"), and deployment
  build logs (`list_deployment_events`) are 403 either way.
- **A preview can't build without `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`**, and every Vercel variable today
  targets production only. That's why the `site/landing-followups` preview
  failed.
- **The Supabase MCP's `apply_migration` records its own version**, not the
  file's timestamp (see `tasks/lessons.md`). Production's five show as
  `20260923162541`…; HOU-65 §1 holds the fix.
- **`create_project`'s region list has no us-west-2**, though production is
  there; the dashboard has it.
- **The Supabase CLI isn't logged in,** so Auth settings on hosted projects
  (sign-ups off, site URL) are dashboard work for the user.
- **`gh` is signed in as johnrehealy but can't read or write Actions
  secrets** (403). It runs outside the sandbox, because it reads its config
  from `~/.config/gh`.
- **`git fetch` and `git push` use SSH**, so they run outside the sandbox.
- **Rehearsing CI locally:** `git worktree add --detach .worktrees/<name>
  HEAD`, `pnpm install --frozen-lockfile`, `pnpm exec supabase stop
  --no-backup` in the main checkout, then in the worktree `pnpm exec supabase
  start -x …` (the list in `ci.yml`), `scripts/ci/write-local-env.sh`,
  `pnpm test:db`, `pnpm db:seed`, `CI=1 pnpm exec playwright test`. Afterwards
  stop the stack, remove the worktree, and `pnpm exec supabase start` from the
  main checkout. It wipes local data (all generated).
- **Testing the worker image:** `docker build -f apps/worker/Dockerfile -t
  housemate-worker:local .`, then `docker run -d -p 18080:8080 --env-file
  .env.local -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres
  -e SUPABASE_URL=http://host.docker.internal:54321 housemate-worker:local`,
  with the web app running for `pnpm sms`.
- **Signing in as staff locally needs the second test code** in
  `supabase/config.toml`; a change there takes a `db:stop` and `db:start`.
- **Playwright saves two sessions**, `apps/web/e2e/.auth/member.json` and
  `staff.json`: real tokens, git-ignored, never committed.
- **Phone-number blocks for generated data:** seed `019`, database suites
  `010`–`050`, `060` and `070`, browser tests `08x`, the simulator unit test
  `099`.
- **The worker runs with `preview_start worker`**; Playwright starts both the
  web app and the worker, or reuses what's on 3000 and 8080.
- **`pnpm install`, `pnpm build`, Playwright, Docker and the Supabase CLI run
  outside the sandbox.** `lint`, `typecheck`, `test` and `test:db` are fine
  inside.
- **A client component must not import from the `@housemate/core` barrel.**
- **Theme gotchas:** `text-sm` is weight 700; body copy at that size is
  `text-sm font-normal`.
- **Paper:** file `Diligent meadow` (`01M2G0KC27F2PP2R60GJ60ZJ99`), Sign-in
  page `4-0`, Ops page `p-7-0`. Always pass the page id.
- **A mirror whose Linear `updatedAt` doesn't advance didn't land.**

## Conventions worth keeping

- **Every mirrored doc that changes is copied to Linear in the same turn**,
  then `mark`ed, and `check` runs before the turn ends.
- **Remote changes go through MCP**, a CLI or a direct API call; never the
  browser.
- **Work on a branch, never `main`.** Commit only when asked or when the
  user's instruction covers it; pushing and merging are the user's unless they
  say otherwise.
- **Scan every commit for secrets and real phone numbers before making it**:
  the repository is public.
- **Anything the design system doesn't cover is mocked in Paper first**
  (D-034); `/dev/*` is exempt, `/ops/*` isn't.
- **Logs carry IDs, outcomes and error names only.**
- **Staff-only pages answer anyone else with a 404.**

## Known gaps

- **The production worker can't run until Twilio exists** (HOU-5): production
  is `SMS_PROVIDER=twilio`, and the env check refuses to start without its
  credentials. Its deploy is skipped until its token is set.
- **Staff sign-in lands on `/chat`,** and nothing links to `/ops`.
- **Claude token costs aren't tracked yet** (Slice 1).
- **Alerts can't be resolved by a person;** their state is worked out
  (D-064).
- **Agent runs will outlast the worker's 30-second visibility window.** Slice
  1 needs a longer window or a heartbeat.
- **Narrow layouts exist for the sign-in and the landing page only.** Q12
  stays open.

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
