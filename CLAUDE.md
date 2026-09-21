# Housemate Prototype

Housemate is a home-management product. A homeowner delegates repairs, services, errands, scheduling, and follow-up to an agent, and can see, understand, and correct everything the agent did. Housemate owns orchestration, organization, and the home's memory and context.

This prototype is a working web app plus SMS/RCS/MMS as the primary interaction channel. The web app is the trusted control surface for transcripts, records, corrections, and status.

Read before working:

- `docs/product.md` — product scope, how the agent behaves and sounds, and the six app areas
- `docs/design.md` — design system, tokens, components, and patterns (for any UI work)
- `docs/decisions.md` — approved decisions; these are binding
- `docs/open-questions.md` — unresolved questions and the defaults in effect until they're answered
- `tasks/lessons.md` — lessons from past corrections; review at the start of every session
- `docs/build-plan.md` — the approved build plan: architecture and slices 0–7
- `tasks/todo.md` — the approved plan for the current slice

## Product invariants

These hold regardless of channel or provider. Changing one requires an approved entry in `docs/decisions.md`.

1. **One action layer.** SMS, web, and future channels are thin adapters that call the same application actions. Channel code never writes to the database directly.
2. **One source of truth.** Supabase is the system of record. Every surface reads the same data, and a change from any channel appears everywhere in real time.
3. **Everything is traceable.** Each record stores its source: the message, user, or agent action that created or last changed it.
4. **Corrections don't erase.** Changes to agent-created records are kept as history, not silent overwrites, so the user can see what the agent did and what they changed.
5. **Providers are replaceable.** Twilio, Supabase, and Vercel sit behind our own interfaces. Product rules and data ownership don't depend on them.
6. **Home data is sensitive.** Access codes, alarm codes, addresses, and interior photos never appear in logs, seed data, test fixtures, or commits. Secrets live in environment variables, and `.env*` files are never committed. Members are real people: production data never leaves production, and development and tests use only generated data.
7. **Money needs a yes.** The agent acts on its own, except that anything involving or potentially involving a payment or fee (deposits, cancellation fees, accepting a quote) waits for the member's explicit confirmation.

## Stack

| Concern | Tool |
|---|---|
| Messaging (SMS/RCS/MMS) | Twilio |
| System of record, auth, realtime, file storage | Supabase |
| Hosting | Vercel, deploying from GitHub |
| Payments | Stripe (single-use Issuing cards, D-025) |
| Agent | Claude (`claude-opus-5`) via the Anthropic TypeScript SDK |
| Agent worker hosting | Container host (proposed: Fly.io) |
| Code | GitHub |
| Backlog | Linear |
| High-fidelity design | Paper desktop, through its MCP. Mockups are built and approved there (D-034); written specs live in `docs/design.md` |
| Pattern research | Mobbin |
| UI build review | Impeccable skill |
| Architecture diagrams | Lucid (D-041). |

TypeScript throughout (D-026): Next.js (App Router) on Vercel for the web app and webhooks; a TypeScript worker on a container host for agent runs, scheduling, and the browser sandbox; Tailwind themed from the `docs/design.md` tokens; Vitest and Playwright.

## Commands

| Command | What it does |
|---|---|
| `pnpm install` | Install dependencies. Runs outside the sandbox; see `tasks/lessons.md`. |
| `pnpm dev` | Run the web app and worker together |
| `pnpm build` | Production build |
| `pnpm lint` · `pnpm typecheck` | Static checks across every package |
| `pnpm test` | Unit tests |
| `pnpm test:db` | Database tests; needs local Supabase running |
| `pnpm format` · `pnpm format:check` | Prettier |
| `pnpm db:start` · `pnpm db:stop` | Local Supabase. Runs outside the sandbox (Docker). |
| `pnpm db:reset` | Rebuild the local database from migrations. Outside the sandbox. |
| `pnpm db:generate` | Generate a migration from the Drizzle schema |
| `pnpm db:seed` | Fill the local database with obviously fake data |

Run TypeScript entry points with `node --import tsx/esm <file>`, not the `tsx` command; see `tasks/lessons.md`.

## External services

This section governs how Claude operates on external services, not how the app integrates with them. App code calls provider APIs through their SDKs as normal.

- **Remote changes go through MCP.** Create, update, or delete resources in Twilio, remote Supabase projects, Vercel, Stripe, Linear, or GitHub only through that service's MCP. If the MCP is missing or lacks the operation, try the CLI or direct API call, if that fails stop and ask. Don't fall back to the browser.
- **Local work uses native tools.** Editing files, running tests, the local Supabase stack, local dev servers, and local git are all fine.
- **Deploys go through git.** Vercel deploys from GitHub. No CLI deploys.
- **Uncertain writes.** If an MCP write's result is unclear, inspect the resource through MCP before retrying. If it's still unknown, stop and report it rather than risk a duplicate.
- **Check connectors first.** Before planning work that depends on an external service, confirm its MCP is available and flag it if not.
- **Sandbox (D-032).** Shell commands run in Claude Code's sandbox, configured in `.claude/settings.json`.
  - Add a network domain or write path only when a task needs it, and say so when you do.
  - Docker and Supabase CLI commands need the Docker socket, so run them outside the sandbox one at a time, each through the permission check.

## How to work

### Plan, then build

- Plan non-trivial work in plan mode and get approval before implementing. Non-trivial means any of: a schema change, a new or changed application action, messaging behavior, auth or permissions, a new dependency, or work spanning more than one app area.
- Save the approved plan to `tasks/todo.md` as a checklist, and tick items off only once verified.
- Present data contracts (tables, action inputs and outputs, message formats) as part of the plan, before implementing them.
- If implementation diverges from the plan, stop and re-plan instead of improvising.

### Build in vertical slices

Each slice crosses the layers it needs (UI, action, data, integration) and ends in something demonstrable. Keep changes focused, reversible, and independently verifiable. Touch only what the slice needs, and make each change as simple as it can be.

### Bugs

- **Fix without asking:** bugs in code from the current task, and clear defects (a failing test, a crash, a typo) whose fix doesn't meet the non-trivial bar above.
- **Plan first:** anything whose fix is non-trivial. Diagnose the root cause, then propose the fix.
- Always fix the root cause, not the symptom.

### Verify before calling anything done

- Nothing is done until it's demonstrated: tests pass, logs are clean, and the behavior has been exercised end to end.
- Verify SMS flows with the local SMS simulator, which sends messages through the same handler as the Twilio webhook. Testing on a real phone is a separate manual step for the user, so say when a change needs one.
- The agent uses real vendor websites. Tests and development runs must never submit a booking, form, payment or message to a real vendor. Real-world actions happen only when the user is actually using the prototype.
- Check UI in the browser against the design system.
- Before presenting, ask whether a staff engineer would approve it. If a solution feels hacky, find the clean version. Don't over-engineer simple fixes.

### Keep evidence separate

In plans and summaries, label what is **evidence** (observed or tested), **assumption**, **recommendation**, and **decision** (approved by the user). Only approved decisions go in `docs/decisions.md`.

### Don't make the user a bottleneck

- Log every action or question you need from the user as a Linear issue (D-035) in the "Checklist" project, with priority set by urgency. Don't leave a request only in chat.
- Track build work in Linear too (D-039). `tasks/todo.md` stays the approved slice plan and holds the per-step results.
- Check those issues at the start of each session, and close them once they're resolved.

### Docs in Linear

- **The project docs are mirrored in Linear (D-038)**, as documents in the Linear project "Key Docs". `docs/linear-docs.json` lists each mirrored file, its Linear document, and the version last copied. The repo file is the source of truth.
- **Copy every change in the same turn.** When a mirrored file changes, however it changed, save the whole file to its document with the Linear MCP's `save_document`, under a first line saying which repo file it mirrors. Then run `scripts/linear-docs.sh mark <path> <id> <url> <updatedAt>`.
- **Before finishing a turn that touched docs,** run `scripts/linear-docs.sh check`. It lists every copy that's out of date.
- **Don't overwrite the user's edits.** Before saving, compare the document's `updatedAt` with the manifest's `linearUpdatedAt`. Linear bumps `updatedAt` a few seconds after each save, so record the value from a `get_document` after saving. If Linear's is more than a minute newer, read the copy and compare it with the repo file: the user may have edited it there, and opening a document can also bump the timestamp on its own. Copy any real edit into the repo file first. Linear rewrites some markdown (`*` bullets, extra blank lines), so carry the edit over by hand rather than replacing the file. Check the whole project for such edits at the start of each session too.
- **To mirror a new file,** add it to `docs/linear-docs.json` with a title.

### Subagents

Use subagents for broad read-only research and for genuinely independent parallel work, one task each. Don't use them for implementation that depends on decisions made in the main conversation, because they start without that context.

## Lessons and memory

- `tasks/lessons.md` is the only home for project lessons. It's versioned with the code.
- After a user correction, add a lesson: the rule, what went wrong, and when it applies. Record corrections and non-obvious findings, not routine tasks.
- Review lessons at session start. Merge or prune stale entries so the file stays short.
- Lessons refine how to work but never override this file or `docs/decisions.md`. Propose changes to those instead of making them.
- Auto-memory may suggest improvements, but project rules live in the repo and change only with the user's approval.

## Context and handoffs

- Auto-compaction is on for this project (`.claude/settings.json`), set to fire at roughly 40% of the context window.
- `tasks/handoff.md` is the session handoff. **Overwrite it; never append.**
- **Keep it current instead of waiting for compaction.** Rewrite it at the end of every step or slice, after any decision or correction, and before anything that will fill context (long test output, large files, wide searches). Compaction can arrive with no warning, and a stale handoff is worse than none.
- **After a compaction, read `tasks/handoff.md` first**, then carry on from its "What's next" section.
- It should cover: where things stand, repo state including uncommitted work, environment facts that were expensive to learn, conventions worth keeping, the next moves, what's waiting on the user, and known gaps. Point at the durable docs rather than repeating them.

## Design

- `docs/design.md` is the design system. Build from it. Changes to it need the user's approval.
- **Visual design happens in Paper (D-034).** Anything the design system doesn't cover is mocked up in Paper, through the Paper MCP, and approved there before it's built. A description in markdown is not a design proposal.
- **Use the `/impeccable` command for design work.** The user invokes it; carry out the work it directs.
- Create mockups in Paper and read back your own work to iterate and to carry exact values into code. **Don't take specs from the rest of the Paper file** — other boards aren't a source of truth, and that is all the earlier "disregard Paper" rule meant.
- Items marked **Open** in `docs/design.md` are unresolved. Raise them in the plan and propose an option rather than choosing silently.
- For anything the design doesn't cover, research patterns in Mobbin where it's connected, propose the approach, and review the build with Impeccable before presenting it.

## Git

- Work on a branch, never directly on `main`.
- Commit only when asked, and only after the change is verified. Push only when asked.
