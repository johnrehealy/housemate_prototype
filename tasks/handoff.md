# Session handoff · 2026-09-21 (Slice 0 step 4 closed)

Context for picking this up in a fresh session. Durable knowledge lives in the
documents below; this file captures what a new session would otherwise have to
rediscover. Overwrite it; never append.

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

**Slice 0 step 4 is closed.** Both halves landed this session: the approved
sign-in design is built, and the Impeccable review of the app shell has been
run and reported. Steps 1–4 are ticked. **Step 5, the messaging path, is
next.**

**The Impeccable finish review of the sign-in came back faithful**, and its
four material fixes are all closed — see the step 4 results in `tasks/todo.md`.
The one real defect was a live region that only became live in the same commit
as its text, so "Signing you in…" was never announced; it is now a lesson.

**A7–A9 were approved by the user and recorded as D-056.** Below
`--breakpoint-lg` the sign-in is one column with no story panel; from
`--breakpoint-lg` the panel is 400px and keeps all three "How it works" rows;
from `--breakpoint-xl` it is the approved 600px panel. Type is identical at
every width — only the page frame changes. The Paper boards are renamed
"Approved r1" and HOU-32 is closed.

## Repo state

Branch `slice-0/foundation`, based on `main`, open as
[PR #1](https://github.com/johnrehealy/housemate_prototype/pull/1). Commit
`a2cb458` carries the A7–A9 approval and the build it unblocked; a second
commit carries the finish review's fixes. `main` is never worked on directly.

What the change contains:

| Area | What |
|---|---|
| `docs/design.md` | §1 Breakpoints states the sign-in's three widths; §4 Sign-in page gained "Narrow and medium"; the message-line offset corrected to 8px; the panel's max-widths and the `readOnly` substitution recorded; Q12 marked partly answered. |
| `docs/decisions.md` | **D-056**; D-036 now records the sign-in as built rather than pending. |
| `tasks/todo.md` | Step 4 ticked, with result blocks for the sign-in build, the shell review and the finish review. |
| `tasks/lessons.md` | Three new lessons: the `@housemate/core` subpath import, live regions, and reading `::selection`. |
| `packages/core` | `formatUsPhone` with tests, exported from the barrel **and** a new `./phone` subpath. |
| `apps/web/src/app/(auth)/` | `layout.tsx` is a full-height flex row; `page.tsx` renders the panel plus the form side; `story-panel.tsx` is new; `sign-in-form.tsx` rewritten; `notice` dropped from `state.ts` and `actions.ts`. |
| `apps/web/e2e/` | `sign-in.spec.ts` and `support.ts` updated for auto-submit; new three-width, no-button and working-state tests; `capture.spec.ts` writes the review screenshots. |
| `playwright.config.ts` | A `capture` project, gated on `CAPTURE=1` so it stays out of the normal run and CI. |
| `apps/web/.impeccable/` | The shell critique snapshot, the six render captures, five Paper comps, and a refreshed surface brief. |

## What's next

1. **Slice 0 step 5, the messaging path** — Twilio inbound and status routes
   with signature validation, the simulator page and CLI, and job enqueueing.
2. **The shell review's findings are HOU-34 to HOU-38**, not fixed here. Each
   needs a Paper mockup first (D-034), and none is part of the sign-in build.
3. **HOU-39** — on the code step, the pointer lands on "Use a different
   number" where "Send code" just was, so an impatient second click throws the
   code away. Both boards draw it that way, so it needs a Paper mockup.

## Waiting on the user

- **HOU-34** (P0) — zero states to replace "…arrives in a later slice." on all
  six destinations. Needs a Paper mockup.
- **HOU-35** (P1) — design the shell's utility bar in Paper. `docs/design.md`
  §7 says it is "not represented anywhere yet", and the build improvised one.
- **HOU-36** (P1) — keyboard focus: the nav has no authored ring and there is
  no skip link. A WCAG 2.2 AA gap against D-037.
- **HOU-37** (P1) — an unknown URL renders Next's stock black 404.
- **HOU-38** (P2) — reserve the nav's trailing state slot before six
  destinations are built on it.
- **HOU-39** (P3) — the sign-in's two overlapping controls, above.
- **HOU-11** — the Fly deploy token still needs adding to GitHub.
- **HOU-33** — team phone numbers still need to go in `.env.local`.
- **HOU-23** — D-008 is still marked Proposed, pending the user's discussion.

## Environment facts that were expensive to learn

- **`pnpm install` and `pnpm build` run outside the sandbox.** `next/font`
  downloads Lato at build time and the sandbox's network filter breaks it even
  with the Google Fonts domains allowed. `pnpm exec playwright test` builds
  first, so it needs the same. `lint`, `typecheck` and `test` are fine inside.
- **A client component must not import from the `@housemate/core` barrel** —
  it reaches the Twilio SDK and `next build` fails resolving Node built-ins.
  `pnpm typecheck` passes anyway, so **typecheck is not evidence that a client
  component compiles.**
- **`h-full` on a flex child of an auto-height parent collapses it** to its
  content height, overriding the row's stretch. This cost a rebuild.
- **Measurements can agree with the spec while the render is wrong.** The
  panel's lockup drew centred, because `w-auto` on an `<svg>` gets stretched by
  the flex column and `preserveAspectRatio` centres the artwork inside the
  stretched box — while `getBoundingClientRect()` still reported the box at the
  left padding. `self-start` fixes it. **Take a screenshot; don't trust
  geometry alone.**
- **Browser-pane screenshots of this app render unreliably** (wrong scale,
  clipped). Use `javascript_tool` + `getBoundingClientRect()` for numbers, and
  **Playwright** for pictures — `CAPTURE=1 pnpm exec playwright test
  --project=capture` writes them to `apps/web/.impeccable/review/`.
- **A transient state is photographed by holding the response open**, with
  `page.route` delaying the POST to `/sign-in`. That is how A4 ("Signing you
  in…") is both captured and asserted, always with a wrong code so nothing
  signs in.
- **Tailwind v4 emits a `/n` opacity modifier as `oklab(...)`,** not `rgba`, so
  a Playwright colour assertion has to expect that. `--color-evergreen` at 12%
  is `oklab(0.299134 -0.0389275 -0.00135583 / 0.12)`.
- **The local test code is `123456`**, from `[auth.sms.test_otp]` in
  `supabase/config.toml`. `psql` is **not installed** on this machine, so read
  seeded values from config and migrations rather than querying.
- **Driving a React input from the browser pane** needs the native setter;
  `form_input` and keyboard typing both fail silently:
  ```js
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(el, '5550190001');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  ```
  Select by `#phone` / `#code`; `querySelector('input[name]')` returns Next's
  hidden `$ACTION_REF_1`.
- **Playwright and the preview server both use port 3000**, so only one can
  run at a time. Stop the preview before running the suite.
- **Paper's `find_nodes`, `get_basic_info` and friends need `fileId`** in this
  build. The Sign-in page is `4-0` in file `Diligent meadow`
  (`01M2G0KC27F2PP2R60GJ60ZJ99`). `export` writes to `~/Downloads`, and that
  folder can be read but **not** deleted from, so copy rather than move.

## Conventions worth keeping

- **Every mirrored doc that changes is copied to Linear in the same turn**,
  then `scripts/linear-docs.sh mark`, and `check` before the turn ends. Send
  the file verbatim; never `patch`, and never improve the wording on the way.
- **Remote changes go through MCP.** If the MCP can't do it, try the CLI or a
  direct API call; if that fails, stop and ask. Never fall back to the browser.
- **Work on a branch, never `main`.** Commit only when asked; push only when
  asked.
- **Anything the design system doesn't cover is mocked in Paper first**
  (D-034). A markdown description is not a design proposal.
- **The Impeccable `critique` needs two isolated subagents**, A and B. Running
  them inline requires a `⚠️ DEGRADED` banner as the report's first line.
- **The Impeccable finish reviewer refuses to verdict without captures on
  disk**, and it is right to — that refusal is what surfaced the centred
  lockup. Capture first, then ask for the review.

## Known gaps

- **`impeccable-documenter` was deliberately not run.** It writes a
  `DESIGN.md`, and D-010/D-034 make `docs/design.md` the design system. A
  second one would need the user's approval.
- **Narrow layouts exist for the sign-in page only.** Every other screen is
  1440-only, and at 390px the shell's 260px rail takes 67% of the viewport.
  Q12 stays open.
- **Two `CONTEXT_STALE` findings from the Impeccable launcher**, both benign:
  `config-build-path-unset` (no image generation is available here) and
  `surface-brief-orphaned` (an artefact of running the launcher from
  `apps/web`).
