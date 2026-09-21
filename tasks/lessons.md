# Lessons

Review at the start of every session. Add a lesson after any user correction or non-obvious finding. Merge duplicates and delete lessons that no longer apply, so this file stays short.

Lessons refine how to work. They never override `CLAUDE.md` or `docs/decisions.md`.

**Entry format:**

```
### Short rule, stated as an instruction
- **Why:** what went wrong, and the date
- **Applies when:** the situations this rule covers
```

---

### Design choices need a visual mockup to review, not a written description
- **Why:** The sign-in page's field, button, focus and hover treatments were proposed as prose in `docs/design.md` (Q13) and refused: "I will not approve any design choices from a markdown only." The user reviews design visually, in a design tool. Found on 2026-09-17.
- **Applies when:** Anything the design system doesn't already cover. Mock it up in Paper for approval before building (D-034), and use the `/impeccable` command for design work. A screenshot of the finished build is not a substitute for a comp to review.

### Run TypeScript through tsx's loader, not its command-line wrapper
- **Why:** The `tsx` command opens a local socket for its own internal messaging, and the sandbox blocks listening on sockets, so it fails with `EPERM ... listen`. Found while running the seed script on 2026-09-15.
- **Applies when:** Any script or service run with `tsx`, including the worker's dev script. Use `node --import tsx/esm <file>` instead.

### Supabase reads a `"0s"` duration as unset, not as "no wait"
- **Why:** Setting `[auth.sms] max_frequency = "0s"` to remove the local sign-in throttle made it *longer*: a zero duration falls back to a 60-second default, and codes were refused with "you can only request this after 59 seconds". `"1s"` is how to make it short. Found on 2026-09-15.
- **Applies when:** Any duration in `supabase/config.toml`. Related: the throttle is per phone number, so browser tests sign in once and reuse the session (`apps/web/e2e/auth.setup.ts`) instead of signing in per test.

### A `"use server"` file may only export async functions
- **Why:** The sign-in actions file also exported the form's initial-state object. `tsc`, ESLint and `next build` all passed, and every request that touched the module then failed at runtime with "A 'use server' file can only export async functions, found object." Found on 2026-09-15.
- **Applies when:** Any file with `"use server"`. Keep types, constants and anything else in a sibling module and import them.

### Run browser tests against a production build, not `next dev`
- **Why:** `next dev` watches the whole workspace, ran out of file descriptors (`EMFILE: too many open files`), and kept deleting `.next/dev` and restarting until Playwright timed out. The system's `maxfiles` soft limit is 256. Found on 2026-09-15.
- **Applies when:** Any Playwright run. `playwright.config.ts` builds and starts the app instead, which is also what staging and CI serve.

### Installs and `pnpm build` run outside the sandbox
- **Why:** The sandbox's network filtering breaks fetchers that aren't plain `curl`. pnpm's downloader fails with "invalid peer certificate", and `next build` fails on "Failed to fetch Lato from Google Fonts" — even with `fonts.googleapis.com` in `allowed_domains`, where `curl` to that exact URL returns 200. `next/font` downloads Lato at build time, so any build needs the real network. Found on 2026-09-15 and 2026-09-21.
- **Applies when:** `pnpm add`, any install, and `pnpm build` (so also `pnpm exec playwright test`, which builds first). Run those outside the sandbox, one at a time, through the normal permission check. `pnpm lint`, `pnpm typecheck` and `pnpm test` run inside it fine.

### Mirror a doc to Linear by sending the whole file, never by patching it
- **Why:** two failures. `save_document`'s `patch` was rejected three times because Linear rewrites `-` bullets to `*`, rewraps paragraphs and turns issue keys like `HOU-30` into mention markup, so anchors containing any of those never match. And tightening the wording while composing a copy left the Linear version saying things the repo file didn't — `scripts/linear-docs.sh mark` only hashes the repo file, so `check` reported "matches" and never saw it. Found on 2026-09-18 and 2026-09-21.
- **Applies when:** every `save_document` call for a file in `docs/linear-docs.json`. Read the file, send its content verbatim, and don't improve it on the way past.

### A client component imports from a `@housemate/core` subpath, never the barrel
- **Why:** `sign-in-form.tsx` imported `formatUsPhone` from `@housemate/core`. The barrel re-exports `./sms`, which reaches `twilio-provider.ts`, so `next build` failed resolving Node built-ins for the browser bundle. `pnpm lint` and `pnpm typecheck` both passed — only the build caught it. Found on 2026-09-21.
- **Applies when:** any `"use client"` file that needs something from `packages/core`. Import from a narrow subpath (`@housemate/core/phone`), adding one to the package's `exports` if it doesn't exist. Server files may use the barrel. The corollary: typecheck passing is not evidence that a client component compiles — run `pnpm build`.
