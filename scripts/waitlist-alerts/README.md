# Waitlist alerts and member emails

`Code.gs` here is the Apps Script attached to the owner's Google Sheet. The web
app posts three kinds of request to it (`packages/core/src/apps-script.ts`):

- **A new waitlist entry** (`waitlist.joined`): emailed to the owner and added
  as a row to the sheet.
- **A let-in email** (`member.let_in`, E1): "A spot opened up", with the
  person's Get started link, sent when staff let someone in on `/ops/waitlist`.
- **A sign-in code** (`member.code`, E2): sent for Supabase's Send Email hook
  to members who sign in by email (D-073).

The two member emails come from john@myhousemate.co, as "John at Housemate" and
"Housemate". They touch no sheet row, and the script never logs their link or
code. Their layout is in `docs/design.md` under Emails, and their logo is
served by the web app (`apps/web/public/brand/housemate-lockup-evergreen.png`).

Supabase's `waitlist_signups` table stays the record. The sheet is a copy for
keeping track, and it holds real people's addresses: share it only with people
who should see the list.

## Setting it up

You need the "Housemate Alpha Waitlist" Google Sheet in the owner's Drive: the
john@myhousemate.co Google Workspace account, so the alerts come from, and go
to, that address.

1. In the sheet, open **Extensions → Apps Script**. Replace everything in
   `Code.gs` with this folder's `Code.gs`, and save. Choose `setup` in the
   function menu and press **Run**. Approve the permissions it asks for (the
   sheet, and sending email as you). It names the tab **Alpha Waitlist** (if no tab has that name yet), writes the
   header row `Joined · Email · Signup ID · Status · Notes` and freezes it.
2. Make the shared secret on your own computer:

   ```bash
   openssl rand -hex 32
   ```

   In Apps Script, open **Project Settings → Script properties** and add
   `SECRET` with that value.
3. Optional: to email more people than yourself, add `NOTIFY_TO` with a
   comma-separated list of addresses.
4. **Deploy → New deployment → Web app.** Execute as **Me**; who has access
   **Anyone**. Copy the web app URL. Opening it in a browser should say
   "Housemate waitlist alerts are running." If the menu only offers anyone
   within myhousemate.co, the Workspace's Drive sharing settings don't allow
   sharing outside the organisation, and an admin has to allow it (Admin
   console → Apps → Google Workspace → Drive and Docs → Sharing settings).
5. In Vercel, add two **Production** environment variables, marked sensitive:
   `WAITLIST_ALERT_URL` (the web app URL) and `WAITLIST_ALERT_SECRET` (the same
   secret). A deploy after that picks them up.
6. To bring in everyone who joined before this existed: in Supabase's Table
   Editor, export `waitlist_signups` as CSV and paste its rows into the sheet
   (`created_at` under Joined, `email` under Email, `id` under Signup ID).

"Anyone" means anyone with the URL can reach the script, which is why it
refuses any request without the secret. Keep the URL and the secret out of
chat, commits and tickets.

## Changing the script

Edit `Code.gs` here first, then paste it into the sheet and use **Deploy →
Manage deployments → Edit → New version**. Editing the existing deployment
keeps its URL, so Vercel needs no change.

Until the new version is deployed, the script refuses the events it doesn't
know with `bad_request`. For the member emails that means ops shows the
let-in link to copy instead, and an emailed sign-in code doesn't arrive.

## Limits

- Apps Script can send about 1,500 emails a day from a Workspace account (about
  100 from a personal Gmail), shared by the alerts and the member emails. Past
  that, a new entry's row is still added and the app logs `waitlist: alert
  failed` with `reason: "email_failed"`; a let-in email shows its link on ops
  to copy; and a code email fails, so the member is asked to try again.
- A code has to arrive within Supabase's five-second limit for the Send Email
  hook, so the web app waits at most 4.5 seconds for the script and never
  retries a member email.
- A failed alert isn't retried later. The Vercel logs show the signup ID of
  each one that failed, and the table in Supabase has every signup.
