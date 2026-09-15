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

### Run TypeScript through tsx's loader, not its command-line wrapper
- **Why:** The `tsx` command opens a local socket for its own internal messaging, and the sandbox blocks listening on sockets, so it fails with `EPERM ... listen`. Found while running the seed script on 2026-09-15.
- **Applies when:** Any script or service run with `tsx`, including the worker's dev script. Use `node --import tsx/esm <file>` instead.

### Package installs run outside the sandbox
- **Why:** The sandbox's network filtering breaks pnpm's downloader with an "invalid peer certificate" error, though `curl` to the same registry works. Found on 2026-09-15.
- **Applies when:** `pnpm add` or any install. Run it outside the sandbox, which goes through the normal permission check. Everything else (lint, typecheck, tests, builds) runs inside the sandbox.
