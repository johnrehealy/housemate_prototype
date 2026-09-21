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

**22. Is the $100 budget per member or for the whole pilot?** D-030 records $100 per member per month.
*Default:* Per member. Cost tracking and the over-budget alert are built to that. If it means the whole pilot, only the alert threshold changes. (HOU-24)

## Connectors

As of 2026-09-21 the MCPs for Linear, Paper, Supabase, Vercel, Stripe, Twilio, Mobbin, Lucid, Google Drive and Chrome are all connected (HOU-6, HOU-8 to HOU-10, HOU-14, HOU-26, HOU-30 are closed). Two caveats:

- **Twilio's MCP is documentation-only.** It searches and retrieves Twilio's docs; it can't create an account, a number, a Messaging Service or a Verify service. Account setup is manual, by the user (HOU-5).
- **GitHub's MCP doesn't connect.** Its endpoint returns HTTP 400. The `gh` CLI is used instead, which is allowed by the CLAUDE.md rule that a CLI or direct API call may stand in for a missing MCP.
