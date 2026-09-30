# Handoff — the myhousemate.co landing page

**A deliberate one-off departure from `CLAUDE.md`.** The handoff normally lives in
`tasks/handoff.md` and is overwritten. That file holds slice 0's handoff, it is
mirrored to a Linear document, and a second session works from it — so overwriting
it from here would clobber their continuity record in Linear and guarantee a merge
conflict. The landing work keeps its own file instead. Fold this into
`tasks/handoff.md` once slice 0 has rebased onto `main`.

Two lessons below (the blank full-page captures, and `cover` ranges that never
finish) belong in `tasks/lessons.md`, and so do two more: **reproduce a failed
build before diagnosing it** — an error code alone produced a wrong diagnosis here
(see "Going live") — and **this theme resets Tailwind's colour and radius
scales** (`--color-*: initial`, `--radius-*: initial` in `globals.css`), so
`text-white`, `rounded-2xl` or `rounded-3xl` compile to nothing, with no build or
lint error: round 4 shipped white-less bubbles and square cards until a capture
showed them. Use tokens or arbitrary values, and look at a render. They are held
here for the same reason: that file is mirrored and the other session appends to
it too.

## Where things stand

**The page is live at `https://myhousemate.co`.** DNS points at Vercel, and TLS
is issued (HOU-49, closed). Tracked as HOU-46; going live was HOU-61, closed
2026-09-23: sign-ups are off, and the user's own live waitlist sign-up stored its
row and its `activity_events` entry (checked read-only on production).

- [PR #1](https://github.com/johnrehealy/housemate_prototype/pull/1) (slice 0's
  sign-in and app shell) merged as `acce099`, then
  [PR #2](https://github.com/johnrehealy/housemate_prototype/pull/2) (this page),
  retargeted to `main`, merged as `eb80410`. Both merge commits, not squash.
- [PR #3](https://github.com/johnrehealy/housemate_prototype/pull/3) (the title
  fix) merged as `05ecd06`. Its production deploy,
  `dpl_5uToRFEB5jcvVVGgSKyw3mx94gcR`, is **READY** and aliased to
  `myhousemate.co` and `www.myhousemate.co`. It is the first build with all five
  secrets, and production's title reads "Housemate" (checked at the edge).
- [PR #4](https://github.com/johnrehealy/housemate_prototype/pull/4) (ribbon
  order, ribbon timing, the H4 r3 rotation) merged as `7116d6b`. Its production
  deploy, `dpl_7Pzc5yivUVskwwmXfchtXgvm2dQb`, is **READY** and aliased to both
  domains. Checked live in headless Chromium, with and without reduced motion:
  the six phrases, "Sign in" last, the ribbon button hidden at 0 and 200px and
  shown after "Learn more", every phrase fitting at 390/768/1024/1440, h1
  62.64px at 1440. No form was submitted.
- [PR #5](https://github.com/johnrehealy/housemate_prototype/pull/5) (round 4:
  the user's ten notes and the round-4 boards) merged as `440c6db`. Production
  deploy `dpl_9bv2YuiH54njK6oH3aMk4wGh7KMH` is **READY** and aliased to both
  domains. Checked live in headless Chromium at 1440 and 390, with and without
  reduced motion: panel headings 40px / 28px in evergreen, green sent bubbles,
  the P3 browser window, no sideways scroll, and the ribbon button hidden over
  the hero and shown after "Learn more" (at 390 it never shows: it is `sm` and
  up). No form was submitted. HOU-67 closed.
- [PR #7](https://github.com/johnrehealy/housemate_prototype/pull/7) (two nits:
  the hero phrases lose their full stops; the close reads "Every home deserves a
  Housemate" with no alpha line) merged as `c644362`. Production deploy
  `dpl_6WN29iNiNGvbJvYJSPkQjsm6Myni` is **READY** and aliased to both domains.
  Checked live in headless Chromium: the close heading is one line at 640, 1024
  and 1440 (52px from lg), two at 320 (28.8px) and 390 (34px), "Join the
  waitlist" follows it, no "alpha" in the close, no full stops on the phrases,
  no sideways scroll. No form was submitted. Its preview failed with
  `BUILD_UTILS_SPAWN_1`, as every preview does (no preview environment).
- [PR #8](https://github.com/johnrehealy/housemate_prototype/pull/8) (the hero
  cycles through the five jobs without "a Housemate"; P4 drops "AI") merged as
  `0cdd11d`. Production deploy `dpl_8tx2woupL6gABEsfPp3mPGcxMaVu` is **READY**.
  Checked live in headless Chromium at 1440 and 390: five phrases in order,
  1.62s each above half opacity, no overlap; reduced motion holds on "someone
  to call the plumber"; P4's new sentence; no sideways scroll. No form was
  submitted.
- Production database: schema applied and verified.

The approved plan is `~/.claude/plans/sprightly-puzzling-fairy.md`. The approved
design is the Paper file "Diligent meadow", page "Landing" (`p-6-0`): hero H3/H1/H2,
rotation H4, panels P1–P7, motion M1, narrow N1. `johnrehealy/housemate_dotcom`
exists and is still empty; what it is for is undecided.

## Repo state

Worktree `.worktrees/landing`, on **`site/waitlist-alerts`**, branched from
`main` @ `0cdd11d` (PR #8 merged, production READY and checked live).
**Uncommitted:** the waitlist alerts (below) and this file's record of PR #8.
`site/landing-round-4`, `site/landing-next`, `site/landing-next-2` and
`site/landing-next-3` are merged or empty and can be deleted.

**Waitlist alerts (2026-09-25), built and verified locally, not committed.**
Approved plan and results: `tasks/todo-waitlist-alerts.md`. Each new signup
posts, after the page answers, to an Apps Script in the user's "Housemate
waitlist" sheet, which adds a row and emails them (`packages/core/src/alerts`,
`scripts/waitlist-alerts`). Off unless `WAITLIST_ALERT_URL` and
`WAITLIST_ALERT_SECRET` are both set. HOU-70 is the build; **HOU-69 is the
user's setup** (script, secret, Vercel variables, backfill), which must happen
before the merge and ends with a live test from a plus address. The decision
to record once slice 0 rebases: "Until the ops app has a waitlist page, new
signups are copied to the owner's Google Sheet and emailed, through an Apps
Script behind the `WaitlistAlerts` interface." Known gaps: no rate limit on the
form (Gmail caps alerts at ~100/day); a failed alert isn't retried later; and
env validation is fail-fast, so a half-set pair (URL without secret) makes the
waitlist form answer "couldn't save" until fixed — the live test catches it.

What PR #8 shipped (the user's second pair of nits of 2026-09-24):

- The hero's rotation drops "a Housemate" and cycles through the five jobs
  only (`copy.ts`). A screen reader's heading, and reduced motion's still
  frame, are now "Every home needs someone to call the plumber".
- **The `hm-phrase` keyframes were written for exactly six phrases** (4/6/15/17%
  of a count × 2.45s cycle), despite a comment saying the list could change
  length freely. They are rescaled for five (4.8/7.2/18/20.4%), which keeps
  the live rhythm to the millisecond, and the comment now says a new count
  needs rescaling. Sampled through the Web Animations API: five phrases in
  order, 1.62s each above half opacity, no overlap. That rhythm (≈1.3s hold,
  0.3s fades, a 0.54s empty line) is not the H4 board's "2s hold, 450ms
  swap"; it has been that way since the first build and wasn't changed here.
- P4's last sentence no longer mentions AI: "Your Housemate plans it and the
  local team gets it done."
- Paper: hero r4 (rotating line), r4 P4 (body) and H4 r3 (the sequence, now
  five with no full stops, the loop and reduced-motion notes, and the 390
  examples) updated.
- Verified: typecheck, lint, prettier, unit tests, `next build`, landing spec
  14/14 against the production build (`next start -p 3002`).

What PR #7 shipped (the user's two nits of 2026-09-24):

- The six rotating hero phrases lose their full stops (`copy.ts`).
- The close reads "Every home deserves a Housemate" — the hero's two tones, on
  one line from sm up and two below — with the alpha lead removed, so the
  button follows the heading. `--text-close-narrow` is now `min(34px, 9vw)` so
  "Every home deserves" holds one line down to 320. A new test checks the line
  count at 320–1920. Paper's P7 and "Hero r4 · H3 · Evergreen" boards are
  updated to match.
- Verified: typecheck, lint, prettier, 45 unit tests, `next build`, landing
  spec 14/14 against the production build (`next start -p 3002`).

What round 4 built, for reference (the user's ten notes of 2026-09-24, and the
round-4 boards they edited in Paper and approved with the **evergreen hero**
and the new P3 wording):

- **Item 2, the ribbon's guardrail.** The user's rule: never push the same
  action twice on one screen. The ribbon's "Join the waitlist" shows only
  between the hero and the close: it arrives over the hero's last 48px
  (`--hm-hero`, `exit calc(100% - 48px)` to `exit 100%`) and leaves as the
  close arrives (`--hm-close`, `entry 0%` to `entry 48px`, `hm-ribbon-leave`,
  fill forwards so it only applies once reached). `timeline-scope` names both.
  Without scroll timelines or `timeline-scope` (Firefox) the button is not
  shown at all.
- **Item 7, the 70% line rule.** `text-balance` plus
  `_components/fit-copy.tsx`, which narrows each `data-fit-copy` paragraph 4px
  at a time until every line is ≥70% of its width (never below 60% of the
  column). The page's first client script beyond the form.
- **Items 3, 4 and the hero board.** Mark 56px lg / 36px narrow; mark → headline
  48 / 36; headline → button 56 / 44. "Learn more" pinned `bottom-8` / `bottom-6`,
  15px at 74%. From lg the content is centred on the whole screen, bar included
  (extra bottom padding = the bar), which puts the mark at y 274 as on the board.
- **Items 1, 5, 6, 8, 9, the panels (boards "r4 · P1–P6").** Headings 40/46
  −0.015em in evergreen (narrow 28/34). Tokens `--shadow-float` and
  `--shadow-lift` in `globals.css`. Phones are a hairline + float shadow,
  372×700, radius 48, iOS SMS colours (`#34C759`/white sent, `#E9E9EB`/`#1C1C1E`
  received — the platform's, deliberately not tokens). P2's photo breaks out
  84px right; P3 is `browser-window.tsx` with a text notification; P4 bleeds
  (`bleed` in `copy.ts`); P5's approval card sits outside the phone, anchored
  40px above its foot; P6 is a lone card with the one-time card lifted 56/44px.
- **Layout.** Copy and visual sit side by side from **xl (1280)**, not lg: the
  wider visuals don't fit beside the copy at 1024. Each panel carries the
  board's `column` and `measure` (`copy.ts`); the copy runs to the measure only
  from 1440, because at 1280 P5's card came within 7px of its copy.

**Verified before merge (evidence).** Typecheck, lint, prettier, 45 unit tests;
`next build`; landing spec 13/13 against the production build; no sideways
scroll at any width 320–1920; at 1440 the mark and every panel heading land on
the board's coordinates; captures at 1440, 1280, 1024 and 390 reviewed.

`site/landing` carries two unpushed handoff-only commits (`9da2dfb`, `d410bc8`).
This file supersedes both, so that branch can be deleted.

**The other session.** The main checkout is on `slice-0/foundation` @ `8daaddb`
with ~83 uncommitted paths, untouched. The repo doesn't auto-delete merged
branches, so `origin/slice-0/foundation` still exists. When slice 0 next syncs it
must rebase onto `main`, which now also contains this page, and re-sequence its four
unpushed migrations after the waitlist pair (HOU-59).

## Environment facts that cost time to learn

- **The browser pane can't screenshot while it's hidden**, and it can't run page
  tools on a `file://` page. Screenshots come from a headless Playwright script
  (`node --input-type=module -e` from the worktree root, importing
  `@playwright/test`). To measure type, load the Google Fonts CSS into
  `https://example.com` in a pane tab and measure spans there. Python's
  fontTools can't read the build's `.woff2` without Brotli.
- **Playwright's config is at the repo root**, so run it from the worktree root,
  not `apps/web` ("Project(s) signed-out not found").
- **Port 3000 is the other session's server**, running from the main checkout. A
  preview started here binds nothing and you end up looking at _their_ build.
  `preview_start` resolves `.claude/launch.json` from the main checkout, so it can
  never serve this worktree. Serve it by hand (`pnpm exec next start -p 3002` from
  `apps/web`), and give Playwright `PLAYWRIGHT_PORT`.
- **`pnpm build` and Playwright must run outside the sandbox.** `next/font/google`
  fetches Lato and DM Serif Text at build time and the sandbox refuses both hosts;
  `allowed_domains` does not help.
- **The sandbox can't write the shared `.git/config`**, so `git switch -c` from a
  remote branch fails while setting upstream. Use `--no-track`, and set upstream on
  push outside the sandbox.
- **Full-page Playwright screenshots of this page come out blank** unless reduced
  motion is on: the capture resizes the viewport to the document height, so every
  scroll-driven animation stays pinned to its opening keyframe.
  `landing-capture.spec.ts` sets `reducedMotion: "reduce"` for this reason.
- **The browser pane sometimes screenshots blank** right after a resize or navigate.
  Measure with `javascript_tool` rather than trusting a blank image.
- **This Mac's resolver cached Namecheap's parking IP** (`162.255.119.105`) after
  DNS moved, so a plain `curl https://myhousemate.co` times out here while the
  public resolvers are right. Check with `dig @1.1.1.1`, and pin with
  `curl --resolve myhousemate.co:443:76.76.21.21` until the cache clears. The
  `*.vercel.app` URLs are behind Vercel Authentication, and the connector's
  `web_fetch_vercel_url` is denied (HOU-47).
- **zsh doesn't word-split `$VAR`**, so a string of `--resolve` flags in one
  variable reaches curl as a single argument. Use a bash script or an array.
  macOS's `openssl x509` has no `-ext`; use `-text` and grep.
- **The Vercel connector can list and read deployments but not their build
  logs** (403 on the `housemate` scope, HOU-47). A preview build fails with
  `BUILD_UTILS_SPAWN_1` in `buildStep` after ~20s because previews have no
  environment; compare against an earlier preview rather than guessing.
- **Supabase's public auth settings** are readable with the publishable key:
  `GET https://xowuqiewsstnxtpwfrke.supabase.co/auth/v1/settings` with an
  `apikey` header. It shows `disable_signup` and which providers are on. It does
  not show the Site URL.
- `.env.local` was copied in from the main checkout. It is local-only fake data.

## Conventions worth keeping

- The phone renderings are pictures, not the product: the whole `Phone` is
  `aria-hidden`, because each panel's heading and body already say what it shows.
- `text-sm` is **700** in this design system. Anything that should read regular at
  14px needs `font-normal` explicitly.
- Motion ranges end inside `entry`, never at a `cover` percentage. The last section
  on the page cannot reach high cover values, and its animation would never finish.
- Nothing on the page names a real vendor, brand, price or customer, and the footer
  carries no link to a page that does not exist.
- Production migrations go through the Supabase MCP named with the file's **full
  tag** (`20260915205225_init_schema`), so each remote row traces back to its file.
  The versions are MCP-assigned (`2026092316…`), not the file timestamps, so
  don't point `supabase db push` at production without `migration repair` first.

## What's next

Waitlist alerts: the sheet is done — "Housemate Alpha Waitlist" in
john@myhousemate.co's Drive (the Drive connector is now signed in as that
account), filled with both existing signups. Next is HOU-69, the user's setup
(script, secret, deploy, Vercel variables), then commit, ship on the user's
word, and read the Vercel logs after their live test. The connector can create
files but can't write into an existing sheet (`update_file` is title and folder
only).

One open offer: the rotation's rhythm doesn't match H4's "2s hold, 450ms swap"
(see above); the user was told and hasn't asked for it. Carried over:

1. The decision "never the same action twice on one screen" goes into
   `docs/decisions.md` once slice 0 has rebased (that file is mirrored and the
   other session edits it). So do the new marketing values in `docs/design.md`
   §1 — panel headings 40/46 and 28/34, the two shadows, the iOS bubble colours
   — which is HOU-59's doc carry-over.
2. The round-4 boards are still named "Proposed" in Paper.

Muse captures are in the session scratchpad (`muse/`), not the repo.

Older items: HOU-59 is slice 0's; HOU-60 holds the finish review's design
findings.

## Going live — the state on 2026-09-23

**Evidence.** Everything here was read back from the providers or tested.

**Vercel.** Project `housemate_prototype`, `prj_WdzTatD61W4BOUfKx2vCtSrWygDq`, team
`housemate` (`team_tqEo49byAubYHLwLKjWbLnSm`), hobby plan, Node 24.x,
`framework: "nextjs"`, `rootDirectory: "apps/web"`. Vercel Authentication covers
everything except custom domains.

**Why the first deploy failed** (`dpl_784Dwf…`, `main` @ `d8f59f0`,
`ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`). There were two causes. First, the project was
imported with no framework and no root directory. Second, `next build` itself needs
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: without them,
prerendering `/property` throws in `publicSupabaseConfig()`. Reproduced from a clean
`git archive` with no env (exit 1) and with the eight non-secret values (exit 0). An
earlier version of this file blamed the worker from the error code alone; the worker
has no `build` script.

**Env vars set** (production target only): `APP_ENV`, `PUBLIC_BASE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`ACK_REPLY_ENABLED=false`, `SMS_PROVIDER=twilio`, `TEAM_ALERT_PHONES` (empty).
**Secrets, all set (sensitive, production only):** the user entered `DATABASE_URL`
(the **transaction pooler**, port 6543 — the DB client sets `prepare: false` for it,
and the direct connection is IPv6-only, which Vercel can't reach) and the three
Twilio values. `SUPABASE_SECRET_KEY` came from the Supabase↔Vercel integration,
which also added vars the app doesn't read (`POSTGRES_*`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`). If the database password is reset, the
integration updates `POSTGRES_*` but **not** `DATABASE_URL`, which must be
re-entered by hand. **Preview deploys will fail to build,** because nothing is set
for the preview target. That is deliberate: previews must not point at production (invariant
6). They need a staging Supabase project of their own.

**Production database** (`xowuqiewsstnxtpwfrke`). Five migrations applied, in order:
`init_schema`, `security`, `queue`, `waitlist_signups`, `waitlist_security`.
Verified:

- Both regex checks (E.164 and email) accept and reject correctly.
- Every `public` table has RLS on, with 8 policies.
- `anon` has no grants on `public`.
- The three triggers are present (`activity_events` append-only and no-truncate,
  plus the member cap).
- The `pgmq` queue `inbound_messages` exists, and realtime publishes `messages` and
  `conversations`.
- `waitlist_signups` has 0 rows.

The security advisor flags `public.rls_auto_enable()` as executable by `anon`. That
function is **Supabase's own**, not ours: it returns `event_trigger` and backs the
platform's `ensure_rls` event trigger, and Postgres refuses direct calls to trigger
functions. Left alone.

**Domains.** DNS at Namecheap: apex `A` → `76.76.21.21` only, `www` `CNAME` →
`cname.vercel-dns.com`, identical at 1.1.1.1 and 8.8.8.8. Let's Encrypt
certificates for both names, expiring 2026-12-22 and renewed by Vercel. Over HTTPS
with verified certificates:

- `/` 200, title "Housemate". The landing page: hero, six panels, close, OG tags.
- `/sign-in` 200.
- `/site/leak-under-sink.png` 200 `image/png`.
- `/chat` 307 → `/sign-in`.
- `https://www` 308 → `https://myhousemate.co/`. `http://` 308 → `https://`.
- HSTS `max-age=63072000`.

**Supabase Auth, read from `/auth/v1/settings`:** `disable_signup: true` (off
since 17:58 UTC; it read `false` before the user saved it). Only the `email`
provider is enabled; `phone` is off. The Site URL can't be read from there; the
user reports it set to `https://myhousemate.co`.

**Home network:** the AT&T gateway (`192.168.1.254`) cached the old parking A
record for its remaining TTL after DNS moved, so the user's own browser still
reached Namecheap parking after the switch.

**The Vercel connector is still half-scoped** (HOU-47): unscoped calls work, and
team-scoped ones (build logs, authenticated fetch) 403.

## Waiting on the user

- **HOU-5 — Twilio carrier registration (10DLC).** The credentials are in, which is
  all the waitlist needs; texting real numbers still waits on registration.
- **Production sign-in doesn't work yet, by design.** It texts a code through
  Supabase's `phone` provider, which is off, and Supabase has no SMS provider set.
  Turning it on means Twilio creds in Supabase Auth and 10DLC (HOU-5), plus
  inviting members. That's slice 0's work, not the landing page's.
- **HOU-57** — P6's unbacked promises. **HOU-50** — privacy, terms, contact.
  **HOU-53** — the demo video.

## Known gaps

- The two photographs are ~2MB PNGs. `next/image` serves optimised WebP/AVIF at
  request time, so only repo size is affected.
- The waitlist submit goes through `actionContext()`, which builds the **full**
  server env — hence the Twilio requirement above.
- Firefox has no scroll timelines and deliberately gets the page fully still (M1's
  open question, answered with its stated default).

## The Impeccable finish review

Run after the build, and reported `disposition: fix` with eight material fixes.

**Four were defects and are fixed**, each with a test where one made sense: the
close's call to action now lands on a focused field; "Learn more ↓" is a real link;
the hero no longer shifts 13px on success; and the page has `openGraph`/`twitter`
metadata. It has **no preview image**, because that is a design and goes through
Paper first.

**Four are changes to approved boards, so they are HOU-60, not code**: empty-looking
visuals on P1/P3/P6, the page's single rhythm across ~5,000px, `$89` doing three
jobs, and the phones' untokenised greys and heavy shadows. One finding came from a
mistake in the reviewer's brief (P4 is a contained card on the board, not
full-bleed). The review also caught the missing marketing type scale in
`docs/design.md`, which is HOU-59's doc carry-over.
