# Waitlist alerts — the approved plan (2026-09-25)

An email and a Google Sheet row for every new waitlist signup, until the ops app
has a waitlist page. The user chose "Google only": an Apps Script attached to
the sheet adds the row and emails them from their own Gmail. This lives beside
`tasks/todo.md` rather than in it, because that file is slice 0's.

## Contracts

- `joinWaitlist` returns `{ joined: true, signupId, email, joinedAt }` or
  `{ joined: false }` (a repeat address).
- `WaitlistAlerts` (`packages/core/src/alerts`): `name: "apps-script" | "off"`,
  `joined(signup) → { ok: true } | { ok: false, reason }`, never throws.
  `createWaitlistAlerts(env)` is `off` unless both env keys are set.
- Webhook: `POST WAITLIST_ALERT_URL`, JSON
  `{ secret, event: "waitlist.joined", signupId, email, joinedAt }`. The script
  answers 200 with `{ ok: true }`, `{ ok: true, duplicate: true }` or
  `{ ok: false, error: "unauthorized" | "bad_request" }`. 10s timeout, one retry.
- Sheet "Housemate Alpha Waitlist", tab "Alpha Waitlist" (the user's names): Joined · Email · Signup ID ·
  Status · Notes. The script writes the first three, as plain text.
- Email: plain text to the sheet's owner, subject `New waitlist signup: <email>`.
- Env: `WAITLIST_ALERT_URL`, `WAITLIST_ALERT_SECRET` (32+ characters), both or
  neither, set in production only (sensitive).

## Steps

- [x] `joinWaitlist` returns `email` and `joinedAt`
- [x] `packages/core/src/alerts`: types, the Apps Script adapter, the no-op, the
      factory, an `./alerts` export
- [x] Env keys, the "both or neither" rule, `.env.example`
- [x] Web: `waitlistAlerts()` in `server-context.ts`; `after()` in
      `submitWaitlist` on `joined: true`, logging failures with the signup ID only
- [x] `scripts/waitlist-alerts/Code.gs` and its README
- [x] Unit, env and database tests
- [x] Local end to end against a slowed stub: one POST per new address, none for
      a repeat, the page answers first
- [x] typecheck, lint, test, test:db, format:check, `next build`, landing spec
- [x] The sheet, in **john@myhousemate.co**'s Drive, filled with the existing
      signups (the user's change of 2026-09-25)
- [x] Linear: the build issue, and a Checklist issue for the user's setup
- [ ] The user's setup (script, secret, deploy, Vercel env), then a live test
      from the site with a plus address
- [ ] Ship on the user's word; read the Vercel logs after the live test

## Results

- Unit 62/62 (alerts and env included), database 35/35, landing spec 14/14 with
  alerts off (no alert line in the server log).
- Local end to end, stub answering after 3s: one POST, body as specified, the
  secret present; none for the repeat; "Thanks" after ~0.1s. With the stub
  down: still thanked, and the log read
  `waitlist: alert failed { signupId, reason: 'network' }` with no address in
  the whole server log.
- The sheet: "Housemate Alpha Waitlist" in john@myhousemate.co's Drive
  (Google Workspace), with the header and both existing signups, times in
  America/New_York. The user had made an empty sheet of the same name and tab
  ("Alpha Waitlist"); the connector can't write into an existing sheet, so
  Claude created a filled one and the user deletes theirs. `Code.gs` follows
  the user's tab name. The created file's tab is "Untitled" until `setup` runs
  and renames it. An earlier empty sheet in the personal Drive
  (the personal Google account) is unused; trashing it was refused by the
  permission check, so the user deletes it too.
- Backfill: the user asked Claude to fill the sheet with everyone already on
  the list, replacing the plan's CSV step. 2 signups, both 2026-09-23, read
  from production once, at the user's request, only to write the sheet.
- Linear: HOU-70 (the build, blocked by HOU-69), HOU-69 (the user's setup,
  Checklist, High), and a note on HOU-50 that the privacy policy must name
  Google.
