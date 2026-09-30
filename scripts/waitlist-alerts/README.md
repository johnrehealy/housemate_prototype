# Waitlist alerts

Every new address on the landing page's waitlist is emailed to the owner and
added as a row to the owner's Google Sheet. The web app does the posting
(`packages/core/src/alerts`); `Code.gs` here is the Apps Script that receives
it. It's a stopgap until the ops app has a waitlist page.

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

## Limits

- Apps Script can send about 1,500 emails a day from a Workspace account (about
  100 from a personal Gmail). Past that, the row is still added and the app
  logs `waitlist: alert failed` with `reason: "email_failed"`.
- A failed alert isn't retried later. The Vercel logs show the signup ID of
  each one that failed, and the table in Supabase has every signup.
