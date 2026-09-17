# Open Questions

Each question lists the default Claude works from until it's answered, or marks it **Blocking** if no safe default exists. When a question is answered, record the answer in `docs/decisions.md` and delete it here.

Design-specific questions (typography, surfaces, toolbars, calendar edge cases, etc.) are tracked separately in `docs/design.md` §7.

## Blockers

- **Business registration: only needed for live payments.** Housemate isn't a registered business yet, and doesn't need to be while the idea is being tested. Texting testers works with a sole-proprietor 10DLC registration, and payments are built and tested in Stripe test mode. Register the business before turning on live payments (D-025) or outgrowing sole-proprietor texting limits.

## 1. The agent

**1. Does `owner: housemate` in the task model mean the agent?** The design's task model has `homeowner`, `housemate` and `vendor` owners, and the team also does weekly errand visits (D-027).
*Default:* `housemate` means the agent. Weekly visits are modeled within Errands, not as a task owner.

**2. Quiet hours and monitoring for unprompted texts.** When must the agent not text first, and how does the team review unprompted texts?
*Default:* No unprompted texts between 10 PM and 8 AM in the member's timezone. Each unprompted text is logged with what triggered it, in the internal monitoring view.

**3. Safety emergencies.** Which situations must the agent escalate instead of troubleshooting, such as a gas smell, electrical hazard, flooding or break-in?
*Default:* Stop troubleshooting and tell the member to contact emergency services or the utility right away.

## 2. First scenario: reminder by text

**4. What must a member provide before a reminder is saved?**
*Default:* Infer the timezone from the home address. Ask one short question if the date or time is missing.

**5. Where do reminders appear:** Schedule, To Do, or both?
*Default:* One reminder record, shown in both Schedule (Reminders category) and To Do.

## 3. Platform

**6. Does the web app need to work on phones?** The design system is specified for a 1440 × 900 desktop.
*Default:* Desktop-first. Keep layouts usable down to the `--breakpoint-lg` token (1024px), and don't design narrow layouts yet.

## 4. Users and identity

**7. Can a home have several members,** such as partners? Do they share an SMS thread?
*Default:* The data model allows several members per home; the first slices support one.

**8. How do members sign in to the web app?**
*Default:* Inviting a member creates their account. They sign in with a one-time code texted through Twilio Verify via Supabase Auth, and new sign-ups are disabled. Verify sends from Twilio's own registered senders, so sign-in shouldn't be blocked by our pending texting registration (confirm during setup).

**9. What happens when someone who isn't invited texts the Housemate number?**
*Default:* One short reply saying Housemate is invite-only right now. No agent run, and the message is logged.

## 5. Messaging

**10. Texting registration without an EIN.** Carriers block texts from unregistered numbers, so texting real phones waits on registration. A sole-proprietor 10DLC registration (one number, low volume) may cover a pilot of up to 10 members; confirm current requirements. RCS brand verification comes later.
*Default:* Start sole-proprietor registration now, build and test with the local simulator, and move to standard registration once the business is registered.

**11. Opt-in, STOP/HELP handling, and MMS media storage and retention.**
*Default:* Twilio's standard STOP/HELP handling; opt-in consent recorded at invite; media stored in a private Supabase Storage bucket.

## 6. Data

**12. Which sensitive data may be stored, and how is it protected?** Real names, phone numbers and addresses arrive with the first member.
*Default:* Store real contact details under invariant 6 and row-level security. Don't store access codes or alarm codes. Card details live only at Stripe.

**13. Adopt the design's task model and vendor model** (`docs/design.md` §6) as the starting data model?
*Default:* Use them as the starting point and present each schema for approval in its slice plan.

**14. Approve or reject proposed decisions D-006 to D-009** in `docs/decisions.md`.
*Default:* Follow them until told otherwise.

## 7. Tools and workflow

**15. Lucid or Miro for architecture diagrams?** Lucid is listed but not connected; Miro is connected.

**16. Should Claude track its own build work in Linear too?** Claude already creates issues for everything waiting on the user (D-035).
*Default:* No. Build work is tracked in the slice plan in `tasks/todo.md`.

**17. Git setup:** repository name and GitHub org, and how much commit and push autonomy Claude has.
*Default:* A private `housemate-prototype` repo on your GitHub account; a branch per change; commit and push only when asked.

**18. Worker hosting.** Which container host runs the agent worker?
*Default:* Fly.io, with staging and production apps deployed by GitHub Actions on merge.

**19. Where should team alerts go** (a member over budget, worker errors, a failed payment)?
*Default:* A text to team phone numbers listed in configuration, plus an entry in the internal monitoring view.

**20. Missing connectors.** As of 2026-09-17, Linear, Paper, Miro, Google Drive and Chrome are connected. Twilio, Supabase, Vercel, Stripe, GitHub and Mobbin MCPs are still needed, plus access to the worker host, and each is a Linear issue (HOU-6, HOU-8 to HOU-10, HOU-14, HOU-26). Remote actions that depend on them are blocked until then.
