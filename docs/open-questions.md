# Open Questions

Each question lists the default Claude works from until it's answered, or marks it **Blocking** if no safe default exists. When a question is answered, record the answer in `docs/decisions.md` and delete it here. Numbers are never reused, so a reference like "open question 16" keeps pointing at the same question even after it's deleted.

Design-specific questions (typography, surfaces, toolbars, calendar edge cases, etc.) are tracked separately in `docs/design.md` §7.

Everything waiting on the user is also a Linear issue in the "Checklist" project (D-035).

## Blockers

- **Business registration: only needed for live payments.** Housemate isn't a registered business yet, and doesn't need to be while the idea is being tested. Texting testers works with a sole-proprietor 10DLC registration, and payments are built and tested in Stripe test mode. Register the business before turning on live payments (D-025) or outgrowing sole-proprietor texting limits (HOU-27).

## Still open

**10. Texting registration without an EIN.** Carriers block texts from unregistered numbers, so texting real phones waits on registration. A sole-proprietor 10DLC registration (one number, low volume) may cover a pilot of up to 10 members; confirm current requirements. RCS brand verification comes later.
*Default:* Start sole-proprietor registration now, build and test with the local simulator, and move to standard registration once the business is registered. (HOU-5)
*What it costs, from Twilio's own pricing, 2026-09:* about $40 up front, $3.15 a month fixed, and roughly $0.012–0.013 per outbound segment, plus about $0.058 per sign-in through Verify — around $35–60 a month for a 10-member pilot at moderate use. Campaign vetting takes 10–15 days. A trial account can't do it: it caps at 5 verified recipients and is template-only.

**21. Is D-008 approved?** D-008 keeps access codes, alarm codes, addresses and interior photos out of logs, seed data, test fixtures and commits. The user asked to discuss it further rather than approving it.
*Default:* Follow it. It's also product invariant 6 in `CLAUDE.md`, and it's followed throughout the build. (HOU-23)

**23. Should Housemate's per-task browser sandbox run on Sprites?** Slice 5 gives each booking task its own browser sandbox. Fly.io Sprites are a candidate: one hardware-isolated microVM per task, checkpoints for a clean browser image, a network policy per task, and per-second billing that stops while idle. To check then: whether a new Sprite can be made from a checkpoint (the docs don't say), how long one takes to start, and how D-025's card fill from worker code and the screenshot redaction fit. One Sprite per coding task (D-059) is the same question for development, deferred until the single dev Sprite has been used.
*Default:* Decide in the Slice 5 plan. The worker itself stays on Fly.io as D-055 says.

**24. Is staging Vercel's previews, pointed at a staging Supabase project?** Slice 0 step 8 needs a staging environment, and the plan names its parts without saying how they fit. Production's web app already deploys `main` on Vercel.
*Default (built 2026-09-23, under the user's instruction to finish Slice 0 without stopping):* Staging is every non-`main` branch's Vercel preview, with the Preview environment's variables pointing at a "Housemate Staging" Supabase project, plus a staging worker on Fly (`housemate-worker-staging`) running `main`'s code. Every merge to `main` applies migrations to staging and then production, and deploys each worker after its database (`.github/workflows/deploy.yml`). Previews stay behind Vercel Authentication, so the SMS simulator sends Vercel's protection-bypass header to reach its own webhook, and a preview's `PUBLIC_BASE_URL` is its own address. The alternative is a fixed `staging` branch on its own domain, which Twilio could reach once texting is live. (HOU-63)

## Connectors

As of 2026-09-21 the MCPs for Linear, Paper, Supabase, Vercel, Stripe, Twilio, Mobbin, Lucid, Google Drive and Chrome are all connected (HOU-6, HOU-8 to HOU-10, HOU-14, HOU-26, HOU-30 are closed). Three caveats:

- **Twilio's MCP is documentation-only.** It searches and retrieves Twilio's docs; it can't create an account, a number, a Messaging Service or a Verify service. Account setup is manual, by the user (HOU-5).
- **The Sprites MCP isn't connected yet** (HOU-41). Until it is, nothing on the dev Sprite (D-059) can be created or changed.
- **GitHub's MCP doesn't connect.** Its endpoint returns HTTP 400. The `gh` CLI is used instead, which is allowed by the CLAUDE.md rule that a CLI or direct API call may stand in for a missing MCP.
- **`gh` can't touch Actions secrets.** Its fine-grained token gets a 403 listing them, so GitHub environment secrets are the user's to set (found 2026-09-23).
- **Fly.io has no MCP here, and no `fly` CLI is installed.** Creating the worker apps and their deploy tokens is the user's (HOU-11).
- **Claude Code's permission classifier refuses some remote writes** even through an MCP: creating a Supabase project, SQL that changes production, and `git push`. Those go to the user as Checklist issues (found 2026-09-23).
