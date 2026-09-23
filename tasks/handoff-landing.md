# Handoff — branch `site/landing`

**A deliberate one-off departure from `CLAUDE.md`.** The handoff normally lives in
`tasks/handoff.md` and is overwritten. That file holds slice 0's handoff, it is
mirrored to a Linear document, and a second session is working from it right now —
so overwriting it here would have clobbered their continuity record in Linear and
guaranteed a merge conflict. This branch gets its own file instead. `tasks/handoff.md`
is untouched on both branches. Fold this back into it once the branches converge.

Two lessons below (the blank full-page captures, and `cover` ranges that never
finish) belong in `tasks/lessons.md`. They are held here for the same reason: that
file is mirrored and the other session may be appending to it too.

## Where things stand

The landing page is **built, verified, committed and pushed**. It is
[PR #2](https://github.com/johnrehealy/housemate_prototype/pull/2), based on
`slice-0/foundation` rather than `main` so the diff is just the two landing
commits — which also means **it has to merge after slice 0**. Tracked as HOU-46,
which carries the full status; this file covers what a next session needs.

The user asked for this to go to `johnrehealy/housemate_dotcom` and then chose the
prototype repo instead, once it was clear the branch carries the whole monorepo.
`housemate_dotcom` exists and is still empty; what it is for is undecided.

The approved plan is `~/.claude/plans/sprightly-puzzling-fairy.md`. The approved
design is the Paper file "Diligent meadow", page "Landing" (`p-6-0`): hero H3/H1/H2,
rotation H4, panels P1–P7, motion M1, narrow N1.

## Repo state

Branch `site/landing` in the worktree `.worktrees/landing`, pushed to `origin`.
Two commits: `993bfa1` the data layer, `377bd8e` the page.

**New:** `apps/web/src/app/(site)/` (page, layout, actions, state, waitlist-form,
and `_components/` — copy, ribbon, hero, panel, close, phone, demo-frame,
familiar-thread, browser-thread, team-photo, approval-thread, saved-logins);
`apps/web/public/site/` (two photographs); `apps/web/e2e/landing.spec.ts`,
`landing-signed-in.spec.ts`, `landing-capture.spec.ts`;
`packages/core/src/email.ts`, `src/actions/join-waitlist.ts`; two migrations
(`20260922233413_waitlist_signups.sql`, `20260922233500_waitlist_security.sql`).

**Changed:** `globals.css` (marketing type tokens, `--font-serif`, and the motion
block at the end), `proxy.ts` (`isPublicPath` now allows `/` and the public asset
prefixes), `playwright.config.ts` (landing specs added to the projects, plus a
`PLAYWRIGHT_PORT` override), `schema.ts`, `shared.ts`, both barrels,
`packages/core/package.json` (an `./email` export), the two db test files,
`.gitignore` (the Impeccable hook cache).

**Deleted:** `apps/web/src/app/page.tsx`, which used to redirect `/` to `/chat`.

## Environment facts that cost time to learn

- **Port 3000 is the other session's server**, running from the main checkout. A
  preview started here binds nothing and you end up looking at *their* build, which
  is why `/` appeared to redirect to `/sign-in`. `preview_start` resolves
  `.claude/launch.json` from the main checkout, so it can never serve this worktree.
  Serve it by hand instead: `pnpm exec next start -p 3002` from `apps/web`, then
  open `http://localhost:3002`. Playwright takes `PLAYWRIGHT_PORT=3002`.
- **`pnpm build` must run outside the sandbox.** `next/font/google` fetches Lato and
  DM Serif Text at build time and the sandbox refuses both hosts; adding them to
  `allowed_domains` does not help.
- **Full-page Playwright screenshots of this page come out blank** unless reduced
  motion is on. A full-page capture resizes the viewport to the document height, so
  nothing is ever "entering" it and every scroll-driven animation stays pinned to
  its opening keyframe. `landing-capture.spec.ts` sets `reducedMotion: "reduce"`
  for exactly this reason.
- **The browser pane sometimes screenshots blank** right after a resize or navigate.
  It is a render-timing artifact, not the page. Measure with `javascript_tool`
  (computed opacity, `scrollWidth`) rather than trusting a blank image.
- `.env.local` was copied in from the main checkout. It is local-only fake data and
  the file says so.

## Conventions worth keeping

- The phone renderings are pictures, not the product: the whole `Phone` is
  `aria-hidden`, because each panel's heading and body already say what it shows.
- `text-sm` is **700** in this design system. Anything that should read regular at
  14px needs `font-normal` explicitly.
- Motion ranges end inside `entry`, never at a `cover` percentage. The last section
  on the page cannot reach high cover values, and its animation would never finish.
- Nothing on the page names a real vendor, brand, price or customer, and the footer
  carries no link to a page that does not exist.

## What's next

1. The Impeccable finish review is done; its four defects are fixed and its four
   design-level findings are HOU-60. See the last section.
2. PR #2 is open and awaiting review. Nothing has been merged.
3. Going live: see the section below. The order is fixed by what the build needs:
   **env vars → production migrations → merge #1 → retarget #2 to `main` → merge #2
   → verify the deploy → attach the domain**. The first two steps are blocked on the
   classifier, and on the user for the secrets. Tracked in HOU-61.
4. HOU-59: see "HOU-59 is narrower than it looked" below. The three doc edits in the
   slice-0 tree still need carrying across whichever way it goes.

## Going live — the state on 2026-09-23

**Evidence.** Everything here was read back from the providers, not assumed.

**The site is not live.** `myhousemate.co` A-records to `162.255.119.105`, Namecheap's
parking IP; the nameservers are still `dns1/dns2.registrar-servers.com` and `www`
is a CNAME to `parkingpage.namecheap.com`. HTTPS returns nothing.

**Vercel.** The project exists: `housemate_prototype`,
`prj_WdzTatD61W4BOUfKx2vCtSrWygDq`, under the team `housemate`
(`team_tqEo49byAubYHLwLKjWbLnSm`), hobby plan, Node 24.x. SSO protection is on for
everything except custom domains, so the `*.vercel.app` URLs need a Vercel login and
the real domain will be public.

**Its first production deploy failed, for two reasons.** `dpl_784Dwf…`, from `main`
@ `d8f59f0`, `errorCode: ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`,
`Command "pnpm run build" exited with 1`.

1. **The project settings.** It was imported with `framework: null` and no root
   directory, so Vercel ran the repo-root `pnpm -r --if-present build`. **Fixed**:
   `framework: "nextjs"`, `rootDirectory: "apps/web"`, set through the Vercel MCP.
   (An earlier version of this file blamed the worker. Wrong: the worker has no
   `build` script, so the recursive run only ever ran `next build` in `apps/web`.)
2. **`next build` itself needs two env vars.** Reproduced from a clean
   `git archive` of `origin/site/landing` with no `.env` files, `CI=1 VERCEL=1`,
   under `env -i`: **exit 1**, prerendering `/property` —
   `publicSupabaseConfig()` in `src/lib/public-env.ts` throws, reached through
   `(app)/layout.tsx` → `lib/auth/session.ts`. The same export with the eight
   non-secret values below: **exit 0**, 12 routes, `/` dynamic. The build log for
   `d8f59f0` itself is behind the 403, so this is the reproduced cause on the tree
   being deployed, not proven for that exact commit.

**So `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be
set before `main` builds**, and a merge before then is a guaranteed failed
production deploy. Next inlines `NEXT_PUBLIC_*` at build time, and the proxy throws
on every request without them, so setting them afterwards needs a rebuild anyway.

No pre-build of `@housemate/core` is needed: it exports TypeScript source
(`"." : "./src/index.ts"`) and `apps/web/next.config.ts` sets
`transpilePackages: ["@housemate/core"]`. The DB client sets `prepare: false`, so
`DATABASE_URL` should be Supabase's **transaction pooler** (port 6543). The direct
connection is IPv6-only, and Vercel can't reach it.

**Environment variables are not set.** `filter_project_envs` returns `[]`. Writing
them through the MCP was refused twice by Claude Code's auto-mode classifier as a
secret-store write, including after the user asked for the blockers to be fixed.
The secrets are the user's to enter in any case. The full production set, from
`packages/core/src/env.ts`:

| Key | Value | Secret |
|---|---|---|
| `APP_ENV` | `production` | no |
| `PUBLIC_BASE_URL` | `https://myhousemate.co` | no |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xowuqiewsstnxtpwfrke.supabase.co` | no |
| `SUPABASE_URL` | same as above | no |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_HsyCZ6IqlC_lTSJHXcTK2w_qK_uAI3B` | no, public by design |
| `ACK_REPLY_ENABLED` | `false` | no — `env.ts` rejects `true` in production |
| `SMS_PROVIDER` | `twilio` | no — `env.ts` rejects the simulator in production |
| `TEAM_ALERT_PHONES` | empty | no |
| `DATABASE_URL` | production Postgres URL | **yes** |
| `SUPABASE_SECRET_KEY` | | **yes** |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_MESSAGING_SERVICE_SID` | | **yes** |

The Twilio trio is required even though the landing page never sends a text: the
waitlist submit calls `actionContext()`, which builds the whole server env, and
`env.ts` requires all three whenever `SMS_PROVIDER` is `twilio` — which production
forces. That is the known gap listed further down.

**The production database is empty.** `list_tables` on `xowuqiewsstnxtpwfrke`
(project "Housemate", `ACTIVE_HEALTHY`, us-west-2) returns `[]` for `public`, and
`list_migrations` returns `[]`. Applying `20260915205225_init_schema` through the
Supabase MCP was **refused by the classifier as a production deploy**, so nothing
was applied. The five to apply, in order, are exactly the files on
`origin/site/landing`: `init_schema`, `security`, `queue` (needs `pgmq`, available
on hosted Supabase), `waitlist_signups`, `waitlist_security`. All are additive, and
none needs to run outside a transaction. Use each file's full tag as the migration
name, so every remote row traces back to its file. Sign-ups still need turning off
and the site URL needs the real domain. Neither has a Supabase MCP tool, so both
are the user's to set in the dashboard.

**HOU-59 is narrower than it looked.** On origin there is no collision:
`slice-0/foundation` has journal idx 0–2 and this branch adds 3–4. The clash is only
with the other session's **unpushed** migrations: `20260922142151_message_idempotency`,
`…142200_dead_letter_queue`, `…160000_message_costs_queue` and `…193304_alert_kinds`,
untracked in the main checkout. **Whichever lands second re-sequences.** If this
merges first, slice 0 regenerates its four after the waitlist pair when it rebases
onto `main`, rather than this branch regenerating two.

**The code is not on `main`.** Two pull requests have to land in order:
[#1](https://github.com/johnrehealy/housemate_prototype/pull/1)
`slice-0/foundation → main`, then
[#2](https://github.com/johnrehealy/housemate_prototype/pull/2)
`site/landing → slice-0/foundation`. Both are `MERGEABLE`/`CLEAN`, with no CI
configured. Until both merge, a production deploy builds `main`, where
`apps/web/src/app/page.tsx` still redirects `/` to `/chat`. **Merge with merge
commits, not squash:** the main checkout sits on `slice-0/foundation` @ `8daaddb`
with 83 uncommitted paths, and a squash would leave that branch diverged from
`main`. After #1, retarget #2's base to `main` rather than merging it into
`slice-0/foundation`, so the other session's branch is never moved under it. **Not
merged yet, deliberately:** without the two `NEXT_PUBLIC_*` values the build is
proven to fail.

**The Vercel connector is only half-scoped.** It authenticates as the personal user
`johnrehealy-7327` and unscoped reads work (`list_projects`, `get_project`,
`list_deployments`, `get_deployment`, `update_project`), but anything explicitly
scoped to the `housemate` team 403s with *"You must re-authenticate to this
scope"* — including `get_team` and `list_deployment_events`, so **build logs cannot
be read through the MCP**. That is the remaining half of HOU-47.

## Waiting on the user

- **HOU-57** — P6 promises no ads, no data selling and no referral fees. Nothing
  backs it. The user said they would take this one.
- **HOU-50** — privacy, terms and contact. The user said they would take this too.
- **HOU-53** — the demo video. P1 ships an honest empty frame until it exists.

## Known gaps

- The two photographs are ~2MB PNGs. `sips` cannot convert them here: it writes
  through the real macOS temp directory, which the sandbox blocks. `next/image`
  serves optimised WebP/AVIF at request time, so page weight is fine and only repo
  size is affected.
- The waitlist submit goes through `actionContext()`, which builds the **full**
  server env. It needs the Twilio values present in production even though it never
  sends a text. Narrowing that would mean changing `server-context.ts`, which the
  other session has uncommitted.
- Firefox has no scroll timelines and deliberately gets the page fully still. That
  was M1's open question, answered with its stated default.

## The Impeccable finish review

Run after the build, and reported `disposition: fix` with eight material fixes.

**Four were defects and are fixed**, each with a test where one made sense:
1. The close's "Join the waitlist" landed on the hero's *closed* button — a 6,000px
   scroll back up and then a second click before there was anywhere to type.
   `waitlist-form.tsx` now opens the bar on the `#waitlist` hash, so the jump lands
   on a focused field. Covered by a Playwright test.
2. "Learn more ↓" was a `<p>`. It carries a label and an arrow and sits at the fold,
   so it read as a control that did nothing. Now an `<a href="#built">` with a focus
   ring, and every panel section gained `scroll-mt-(--spacing-bar)` so anchors land
   below the sticky ribbon. Covered by a test.
3. The hero shifted 13px at the moment of success, because the joined state collapses
   a 52px control row to a 26px line. `min-h-13` on the `#waitlist` wrapper holds it.
4. No social preview at all on a page that spreads by being pasted into messages.
   `openGraph`/`twitter` metadata added. **No preview image** — that is a design, so
   it goes through Paper first.

**Four are changes to approved boards, so they are HOU-60, not code.** Empty-looking
visuals on P1/P3/P6, the page's single rhythm across ~5,000px, `$89` doing three
different jobs, and the phones' untokenised greys and heavy shadows.

One finding was based on a mistake in the brief I gave the reviewer: it called P4
"full-bleed", but board AS7-0 draws a contained rounded card and the build matches
the board. Recorded in HOU-60 as a proposal to change the board, not a defect.

The review also independently caught the missing marketing type scale in
`docs/design.md` — already HOU-59.
