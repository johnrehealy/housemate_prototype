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

### A live region has to be live before the text it announces arrives
- **Why:** the sign-in code step renders hint, working and error in one `<p>`, and only the working branch carried `role="status"`. React reuses the DOM node, so the region became live in the same commit that set its text — which NVDA and VoiceOver treat as initial content and don't announce. "Signing you in…" was silent. Nothing in the markup looked wrong; the Impeccable finish review caught it. Found on 2026-09-21.
- **Applies when:** any status or alert message that shares a slot with another message. Put the role on the element from the first render, so the update is a content change rather than the region's birth. Announcing an error is the exception that can rely on focus instead, because the field is focused and `aria-describedby` points at the same line.

### Read an authored `::selection` rather than photographing it
- **Why:** a review flagged the code field's selection band as the wrong grey. It wasn't: a headless browser paints its own colour for a selection in an unfocused window. `getComputedStyle(el, "::selection").backgroundColor` returns the real rule — and Tailwind v4 emits an opacity modifier as `oklab(...)`, not `rgba(...)`, which is what the assertion has to expect. Found on 2026-09-21.
- **Applies when:** any check of selection, caret or other chrome-owned colours, and any Playwright assertion on a Tailwind colour carrying a `/n` opacity modifier.

### Mirroring a doc means reading it off disk at save time, and checking that the save moved `updatedAt`
- **Why:** a subagent asked to mirror `CLAUDE.md` rebuilt the file from its own context instead of reading it, so it sent the previous revision. `save_document` accepted it, `scripts/linear-docs.sh mark` then recorded the **repo file's** hash, and `check` reported green while Linear held week-old wording. The one signal was that the save response's `updatedAt` never moved, and that got rationalised as "Linear doesn't bump it for identical content". Found on 2026-09-22, in the first run of the `mirror-docs` skill. The same session had earlier dropped the post-save read as a redundant optimisation — it was the thing that would have caught this.
- **Applies when:** every mirror. Read the file at the moment you save it, never from context, a diff or an earlier read; and treat an `updatedAt` that doesn't advance as a save that didn't land, not as a no-op. `check` compares the repo file with the manifest and never re-reads Linear, so it can't see this class of drift at all.

### A mirror held back because "Linear has text the repo lacks" needs a fresh read before you believe it
- **Why:** on 2026-09-22 the mirror subagent refused to save `tasks/todo.md`, reporting a whole results section present only in Linear. The section had in fact been written to the repo file minutes earlier, in the same turn that spawned the agent: it had read the file before those writes landed and compared Linear against the stale copy. Taking the report at face value would have meant hand-copying the file's own content back into it.
- **Applies when:** any hold-back the mirroring subagent reports. It's the right instinct, and the guard against overwriting the user's own Linear edits, so keep it — but check the named lines in the repo file yourself first. If they're there, say so and send the agent back to re-read and save, rather than reconciling anything.

### Don't hand files between sandboxed and unsandboxed commands through `$TMPDIR`
- **Why:** a proxy backup written to `$TMPDIR` from a sandboxed command couldn't be restored by the unsandboxed Playwright run that followed. The two get different `$TMPDIR` values, so the restore failed with "No such file or directory", and the reverted file sat in the tree until a sandboxed command restored it. Found on 2026-09-22.
- **Applies when:** any temporary file that crosses the sandbox boundary, typically a backup made before an outside-the-sandbox build or test run. Use the session's absolute scratchpad path, or do the restore in a command that runs in the same mode as the one that made the backup.

### A Realtime channel that says "subscribed" may not be listening to Postgres
- **Why:** `/dev/thread` subscribed to `postgres_changes` on `messages` and reached `SUBSCRIBED`, but no change ever arrived. The join had gone out before the browser client loaded the member's session, so it carried only the publishable key; Realtime couldn't apply row-level security to that, refused the Postgres binding (logged only as a `subscription_errors` counter), and never retried it when the real token followed. `realtime.subscription` was empty — that was the tell. A hand-built join carrying the member's JWT got "Subscribed to PostgreSQL" at once. Found on 2026-09-22.
- **Applies when:** any browser subscription to `postgres_changes` on a table under row-level security. `await supabase.realtime.setAuth()` before `.subscribe()`, and pass `config: { postgres_changes_options: { wait: true } }` so `SUBSCRIBED` means the binding is registered. To debug, check `realtime.subscription` for rows before suspecting the publication or the policies.

### Two branches that each add a migration collide in Drizzle's journal; regenerate the later one at merge
- **Why:** `site/landing` and `slice-0/foundation` both took index 3 in `supabase/migrations/meta/_journal.json`, with snapshots that each claimed the same parent, so `drizzle-kit generate` would refuse the merged folder. The SQL files themselves didn't conflict. Fixed on 2026-09-23 by setting the later branch's migration aside, regenerating it against the merged schema, and giving it back its original file name and timestamp once its SQL came out byte-identical — so every database applies the files in the same order. HOU-59.
- **Applies when:** merging any branch that added a migration while another branch did too. Supabase applies files by name, so keep the names; only the journal entry and the snapshot need rebuilding. Finish with `pnpm db:generate` reporting no changes, and `pnpm db:reset` plus `pnpm test:db`.

### The Supabase MCP's `apply_migration` records its own version, not the file's
- **Why:** production's five migrations were applied through the MCP on 2026-09-23 and recorded as `20260923162541` and so on, with the file's full name in `name`. `supabase db push`, which the deploy workflow uses, matches remote history against file timestamps, so it would see five unknown remote versions and refuse to run.
- **Applies when:** any migration applied to a hosted project. Let the deploy workflow apply them. If the MCP had to, align `supabase_migrations.schema_migrations` afterwards (version = the file's timestamp, name = the rest), and check with `list_migrations`.
