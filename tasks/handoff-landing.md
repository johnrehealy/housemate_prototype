# Handoff — the myhousemate.co landing page

**A deliberate one-off departure from `CLAUDE.md`.** The handoff normally lives in
`tasks/handoff.md` and is overwritten. That file holds slice 0's handoff, it is
mirrored to a Linear document, and a second session works from it — so overwriting
it from here would clobber their continuity record in Linear and guarantee a merge
conflict. The landing work keeps its own file instead. Fold this into
`tasks/handoff.md` once slice 0 has rebased onto `main`.

Two lessons below (the blank full-page captures, and `cover` ranges that never
finish) belong in `tasks/lessons.md`, and so does a third: **reproduce a failed
build before diagnosing it** — an error code alone produced a wrong diagnosis here
(see "Going live"). They are held here for the same reason: that file is mirrored
and the other session appends to it too.

## Where things stand

**The page is live at `https://myhousemate.co`.** DNS points at Vercel, and TLS
is issued (HOU-49, closed). Tracked as HOU-46; going live as HOU-61, which stays
open until the Supabase sign-up setting and the waitlist check are done.

- [PR #1](https://github.com/johnrehealy/housemate_prototype/pull/1) (slice 0's
  sign-in and app shell) merged as `acce099`, then
  [PR #2](https://github.com/johnrehealy/housemate_prototype/pull/2) (this page),
  retargeted to `main`, merged as `eb80410`. Both merge commits, not squash.
- [PR #3](https://github.com/johnrehealy/housemate_prototype/pull/3) (the title
  fix) merged as `05ecd06`. Its production deploy,
  `dpl_5uToRFEB5jcvVVGgSKyw3mx94gcR`, is **READY** and aliased to
  `myhousemate.co` and `www.myhousemate.co`. It is the first build with all five
  secrets, and production's title reads "Housemate" (checked at the edge).
- Production database: schema applied and verified.

The approved plan is `~/.claude/plans/sprightly-puzzling-fairy.md`. The approved
design is the Paper file "Diligent meadow", page "Landing" (`p-6-0`): hero H3/H1/H2,
rotation H4, panels P1–P7, motion M1, narrow N1. `johnrehealy/housemate_dotcom`
exists and is still empty; what it is for is undecided.

## Repo state

Worktree `.worktrees/landing`, on **`site/landing-ribbon-rotation`**, branched
from `main` @ `05ecd06` (PR #3, the title fix, is merged). **Uncommitted, not
pushed** — the user's 2026-09-23 feedback, items 1 and 2:

- `ribbon.tsx` — "Join the waitlist" now comes before "Sign in", so "Sign in"
  holds the bar's right edge. The hidden button keeps its space, and with "Sign
  in" first that space sat outside it, which is why it looked like it hovered.
  At rest this now matches board H3.
- `globals.css`, `panel.tsx`, `page.tsx`, `(site)/layout.tsx` — the ribbon's
  waitlist button waits until P1 is fully on screen. P1 (`.hm-first-panel`)
  publishes a view timeline `--hm-first-panel`, inset by the bar;
  `timeline-scope` on `.hm-site` lets the ribbon see it. The fade covers the
  last 48px before `entry 100%`, so "Learn more" (which lands P1 exactly there)
  arrives with the button present. Reduced motion keeps the timing and drops the
  8px rise (`hm-ribbon-late-still`).
- `copy.ts`, `hero.tsx`, `globals.css` — item 3, the rotation (HOU-62, decided:
  option A, 2s hold unchanged). New phrases in `HERO.phrases`. `--text-hero` is
  `min(70px, 4.35vw)` (one line from md up: 63px at 1440, 45px at 1024) and
  `--text-hero-narrow` is `min(32px, 8.5vw)` (two lines below md). The slot is
  `h-[2lh] md:h-[1lh]`, the phrases `md:whitespace-nowrap`, and the hero's
  600px column is gone because the longest phrase needs the full width.
- `landing.spec.ts` — the ribbon test, run with and without reduced motion:
  hidden at 0 and at 200px, visible after "Learn more", "Sign in" last. And a
  fit test: every phrase inside its slot at ten widths from 320 to 1920. 12/12
  pass against a production build on :3002.
- This file.

Measured in the browser pane: hidden until 48px before P1 lands, 0.50 at 24px,
1.00 on landing, at 1024×768 (P1 taller than the view) and 1440×1200 (P1
shorter, so "fully on" means fully visible). Paper's P1–P7 ribbons are reordered
to match, and M1 row A is rewritten.

Screenshots with the rotation frozen, at 1440, 1024, 390 and 320, match the H4 r3
board, which now records the decision. Waiting on the go-ahead to commit, push,
PR and merge all three items.

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

1. On the go-ahead: commit the three changes (ribbon order, ribbon timing,
   rotation), push, PR to `main`, merge (merge commit), then check production:
   the title, the new phrases, and the ribbon at the edge.
2. HOU-62 is closed. If a phrase is ever added or lengthened, re-measure it
   against `--text-hero`; the fit test will catch it if not.
3. Submit **one** waitlist address the user chooses, and confirm a row plus its
   `activity_events` entry. That is production data, so no test addresses. Asked;
   waiting on the address. Status is on HOU-61.
4. HOU-59 is now slice 0's to finish. See above.
5. The Impeccable finish review's design-level findings are HOU-60.

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

- **The go-ahead to ship** the ribbon and rotation changes (see "Repo state").
- **Which address to use** for the one production waitlist check.
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
