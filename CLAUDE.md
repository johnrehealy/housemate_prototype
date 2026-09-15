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
| High-fidelity design | Paper, for the user's visual review only. Claude doesn't use it; specs live in `docs/design.md` |
| Pattern research | Mobbin |
| UI build review | Impeccable skill |
| Architecture diagrams | Unresolved — see open questions |

TypeScript throughout (D-026): Next.js (App Router) on Vercel for the web app and webhooks; a TypeScript worker on a container host for agent runs, scheduling, and the browser sandbox; Tailwind themed from the `docs/design.md` tokens; Vitest and Playwright.

## Commands

Fill in when the app is scaffolded: install, dev server, local Supabase, SMS simulator, tests, lint, typecheck.

## External services

This section governs how Claude operates on external services, not how the app integrates with them. App code calls provider APIs through their SDKs as normal.

- **Remote changes go through MCP.** Create, update, or delete resources in Twilio, remote Supabase projects, Vercel, Stripe, Linear, or GitHub only through that service's MCP. If the MCP is missing or lacks the operation, stop and ask. Don't fall back to the browser, a CLI, or direct API calls.
- **Local work uses native tools.** Editing files, running tests, the local Supabase stack, local dev servers, and local git are all fine.
- **Deploys go through git.** Vercel deploys from GitHub. No CLI deploys.
- **Uncertain writes.** If an MCP write's result is unclear, inspect the resource through MCP before retrying. If it's still unknown, stop and report it rather than risk a duplicate.
- **Check connectors first.** Before planning work that depends on an external service, confirm its MCP is available and flag it if not.

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

### Subagents

Use subagents for broad read-only research and for genuinely independent parallel work, one task each. Don't use them for implementation that depends on decisions made in the main conversation, because they start without that context.

## Lessons and memory

- `tasks/lessons.md` is the only home for project lessons. It's versioned with the code.
- After a user correction, add a lesson: the rule, what went wrong, and when it applies. Record corrections and non-obvious findings, not routine tasks.
- Review lessons at session start. Merge or prune stale entries so the file stays short.
- Lessons refine how to work but never override this file or `docs/decisions.md`. Propose changes to those instead of making them.
- Auto-memory may suggest improvements, but project rules live in the repo and change only with the user's approval.

## Design

- `docs/design.md` is the design system. Build from it. Changes to it need the user's approval.
- Don't read or build from the Paper file. It's only for the user's visual review.
- Items marked **Open** in `docs/design.md` are unresolved. Raise them in the plan and propose an option rather than choosing silently.
- For anything the design doesn't cover, research patterns in Mobbin, propose the approach, and review the build with Impeccable before presenting it.

## Git

- Work on a branch, never directly on `main`.
- Commit only when asked, and only after the change is verified. Push only when asked.
