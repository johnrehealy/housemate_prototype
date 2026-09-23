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

**The page is on `main` and deployed to production, and serves on `myhousemate.co`
at Vercel's edge. It is not reachable by the public yet only because DNS still
points at Namecheap parking** (HOU-49). Tracked as HOU-46; going live as HOU-61.

- [PR #1](https://github.com/johnrehealy/housemate_prototype/pull/1) (slice 0's
  sign-in and app shell) merged as `acce099`, then
  [PR #2](https://github.com/johnrehealy/housemate_prototype/pull/2) (this page),
  retargeted to `main`, merged as `eb80410`. Both merge commits, not squash.
- Production deploy of `eb80410`: **READY**, aliased to `myhousemate.co` and
  `www.myhousemate.co`.
- Production database: schema applied and verified.
- All five secrets are now in Vercel, but `eb80410`'s deploy predates them. The
  title fix's merge redeploys production and picks them up. Until that deploy is
  live, the waitlist submit fails in production.

The approved plan is `~/.claude/plans/sprightly-puzzling-fairy.md`. The approved
design is the Paper file "Diligent meadow", page "Landing" (`p-6-0`): hero H3/H1/H2,
rotation H4, panels P1–P7, motion M1, narrow N1. `johnrehealy/housemate_dotcom`
exists and is still empty; what it is for is undecided.

## Repo state

Worktree `.worktrees/landing`, on **`site/landing-followups`**, branched from
`main` @ `eb80410`. It carries the title fix:

- `apps/web/src/app/(site)/page.tsx` — `title: { absolute: "Housemate" }`. The
  root layout's `"%s · Housemate"` template made production's title
  **"Housemate · Housemate"** (observed on the deployed page).
- `apps/web/e2e/landing.spec.ts` — asserts the title. The landing spec passes 9/9
  against a fresh production build.

The user said to ship it: commit, push, PR to `main`, merge with a merge commit.
Merging redeploys production.

`site/landing` carries two unpushed handoff-only commits (`9da2dfb`, `d410bc8`).
This file supersedes both, so that branch can be deleted.

**The other session.** The main checkout is on `slice-0/foundation` @ `8daaddb`
with ~83 uncommitted paths, untouched. The repo doesn't auto-delete merged
branches, so `origin/slice-0/foundation` still exists. When slice 0 next syncs it
must rebase onto `main`, which now also contains this page, and re-sequence its four
unpushed migrations after the waitlist pair (HOU-59).

## Environment facts that cost time to learn

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
- **Testing production before DNS moves:** pin the domain to Vercel's edge —
  `curl --resolve myhousemate.co:80:76.76.21.21 http://myhousemate.co/`. HTTPS
  fails the handshake until DNS points at Vercel, because no certificate is issued
  before then. The `*.vercel.app` URLs are behind Vercel Authentication, and the
  connector's `web_fetch_vercel_url` is denied (HOU-47), so this is the only way in.
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

1. Once the title fix's production deploy is READY: check production's `<title>`
   reads "Housemate".
2. Submit **one** waitlist address the user chooses, and confirm a row plus its
   `activity_events` entry. That is production data, so no test addresses.
3. Once DNS moves (HOU-49): check `https://myhousemate.co` serves over TLS, and that
   `www` redirects.
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

**Domains.** `myhousemate.co` and `www.myhousemate.co` (308 → apex) are attached and
verified. Through Vercel's edge (`--resolve …:76.76.21.21`, over HTTP):

- `/` 200 — the landing page: hero, six panels, close, OG tags.
- `/sign-in` 200.
- `/site/leak-under-sink.png` 200 `image/png`.
- `/chat` 307 → `/sign-in`.
- `www` 308 → `https://myhousemate.co/`.

**The Vercel connector is still half-scoped** (HOU-47): unscoped calls work, and
team-scoped ones (build logs, authenticated fetch) 403.

## Waiting on the user

- **HOU-49 — DNS at Namecheap.** Apex `A` → `76.76.21.21` (tested: it serves this
  project) and `www` `CNAME` → `cname.vercel-dns.com`. Remove the parking records.
  Vercel's Domains page shows the values it currently recommends.
- **Which address to use** for the one production waitlist check.
- **HOU-5 — Twilio carrier registration (10DLC).** The credentials are in, which is
  all the waitlist needs; texting real numbers still waits on registration.
- **Supabase Auth settings:** turn sign-ups off, and set the site URL to
  `https://myhousemate.co`. The Supabase connector has no tool for either.
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
