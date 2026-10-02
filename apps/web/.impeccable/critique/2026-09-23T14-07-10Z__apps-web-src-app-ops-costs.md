---
target: Ops cost boards O1–O3 (Paper, page Ops)
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/healyfamily/Documents/Prototype/apps/web/apps/web/src/app/ops/costs"
timestamp: 2026-09-23T14-07-10Z
slug: apps-web-src-app-ops-costs
---
Method: dual-agent (A: design-review sub-agent · B: detector-and-evidence sub-agent). Both were interrupted by a session restart and resumed from their own transcripts; they never saw each other's output.

Target: the Paper boards Ops · O1 (a normal month), O2 (over budget), O3 (empty month) on page "Ops" of Diligent meadow — the first design of /ops/costs. No implementation exists yet.

## Design health: 19/40 — Poor

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Spend is clear; alerts have no open/resolved state; O2's bar looks the same at 101% as at 300% |
| 2 | Match with the real world | 2 | "parked", "Queue message_costs, job 156", "Slice 1", "Team texted · 2" are the system's words |
| 3 | User control and freedom | 3 | Read-only with a simple month stepper; no "back to this month" |
| 4 | Consistency and standards | 2 | Count summary used against its meaning; the middle figure means opposite things on O1 and O2; counts disagree |
| 5 | Error prevention | 2 | O2's "$16.76" reads as money left — "Over" is a grey 14px label under a 36px number |
| 6 | Recognition rather than recall | 2 | "· 2" assumes you know how many team phones exist; "Slice 1" assumes the build plan |
| 7 | Flexibility and efficiency | 1 | No link from a member to their texts, or from an alert to the message it names |
| 8 | Aesthetic and minimalist design | 2 | Calm, but one fact appears three times; a whole column of $0.00 on O1 |
| 9 | Error recovery | 1 | Alerts exist for this, and they name the mechanism, not the consequence or the next step |
| 10 | Help and documentation | 2 | O3's empty states are good; the notes explain policy rather than the numbers |
| | Total | 19/40 | Poor — the spending half alone would score in the high 20s; the alerts half pulls it down |

## Design specificity

Review: under the Housemate tokens this is the standard usage page — number strip, progress bar, table, event list. Swap the logo and it is any API billing page, which is where the Mobbin research came from. What's Housemate's own is the voice ("What the pilot is spending", "Unknown numbers", "flagged, never blocked", O3's empty states). Missing: the founder's questions — are we on pace to cross $100, what's driving it, does anything need me right now. The layout answers "how much" in 36px and leaves "does anything need me" to a 13px list at the bottom.

Deterministic scan: `impeccable detect --json apps/web/src/app` exited 0 with no findings across 29 files, but cannot see these boards (Paper only; /ops/costs has no markup). The measured pass read the Paper nodes: every colour is a token; all text contrast passes AA (tightest: muted on nav, 4.59:1); every number reconciles (rows sum to totals, spent + left = $100, the 55px fill is 4.9%). The confusion is framing, scope and copy, not arithmetic. It also caught system deviations the review missed (see the last priority issue).

Visual overlays: none — no rendered page to inject into.

## Overall impression

The spending table is well built and the empty month is the best board. The page can't answer "does anything need me?", and the top strip states one fact three ways while its middle figure changes meaning between states. Biggest opportunity: lead with one sentence that says where the month stands and whether anything is wrong.

## What's working

1. Voice: "What the pilot is spending"; O3's "the next text lands here about a minute after it's sent".
2. The member table: right-aligned money in fixed lanes that align across header, rows and total (measured); sorted by spend; a clear total row; strangers' texts never land in a member's total.
3. Restraint: no charts, one new element, tokens only, no phone numbers, rust only for "over" and "not reached".

## Priority issues

[P0] Alerts have no scope and no state, so "does anything need me?" can't be answered.
- Why: O1 shows "Alerts this month 1" above "RECENT ALERTS (3)", two dated 31 August on a September board; O3 (1 October) shows "(0)" though O1's rule would list September's. No row says whether the problem is still happening; every row has the same icon. O2's "Team not reached" — an alert nobody has seen — is 13px on the bottom row, below the 900px fold.
- Fix: one scope; open/resolved state with open first; "Team not reached" as a rust notice above everything; the alert count moves from the money strip to the alerts heading.
- Command: /impeccable clarify, then /impeccable layout

[P1] The top strip says one fact three times, and the bar can't show an overage.
- Why: spent, left and percentage are one fact. On O2 the middle figure flips to "Over … $16.76" with only a grey label to say so. The bar is clamped at full width, so 117% looks like 100%. The Count summary is for parallel counts that split one set, not three unlike figures.
- Fix: one display-size headline ("$4.87 of $100 so far in September" / "$116.76 — $16.76 over the $100 budget"); a bar with a 100% mark the overage runs past; pace ("on pace for about $6") in the freed space.
- Command: /impeccable distill

[P1] Alert copy describes the machinery, not the consequence.
- Why: "A price lookup failed every retry and is parked. Queue message_costs, job 156" never says the total is understated; "Message 9a0b0d" doesn't say whose text; "Team texted · 2" makes you count phones. The product voice says the result, not the process.
- Fix: impact first, ID second as a link — "A reply to Maya hasn't been confirmed delivered (15 min) · 9a0b0d →"; "One text's price couldn't be fetched, so September is short about 1¢." "Team texted" alone; "Team not reached" as the exception.
- Command: /impeccable clarify

[P2] The table puts a count beside money and carries dead weight.
- Why: "Texts" (count) flush against "Twilio" (dollars); O1's Claude column is $0.00 throughout with a "Slice 1" footnote; "BY MEMBER (4)" heads five rows; "Unknown numbers" also reads as "numbers of unknown value".
- Fix: keep the vendor names (they match the invoices) under a "Cost" group label; hide Claude until it has a value; rename to "Not a member"; drop the count.
- Command: /impeccable clarify

[P2] The page has no frame, and drifts from the system.
- Why: logo at x 28, content at 158; three left text edges; 17px title smaller than the numbers. Measured: the total row is bold (reserved for tile headings and initials); its rule uses the hover token; member avatars are pale though avatars are solid evergreen; the month stepper is a fourth, undefined toolbar set, and "next month" is disabled by colour alone; the rust is documented as the member-facing Action Needed colour.
- Fix: align the bar to the content column; a real "Costs" title; one left edge; conform to each token or record each deviation in docs/design.md on approval.
- Command: /impeccable layout, then /impeccable polish

## Persona red flags

Jordan (second team member, first look): "Texts | Twilio" — is Twilio a count? "Team texted · 2" — two what? "parked", "job 156", "Slice 1". "1" alert above "(3)". "(4)" above five rows. "Resets 1 January" on O2 suggests the money spent resets.

Alex (founder, daily): "Message 9a0b0d" and "job 4120" are dead text; member rows don't open their texts; no pace, no comparison with last month, no open-only view, no jump back to this month.

Sam (keyboard, low vision): the disabled "next month" arrow differs by colour alone; the arrows are icon-only; O3's empty bar is a 1.18:1 track, reading as a stray hairline; an over-budget bar is the same shape as an at-budget one.

## Minor observations

- Ten stuck-send alerts can arrive at once; no cap or grouping.
- "Today, 09:12" is UTC; for a US reader in the evening, "Today" is the wrong day.
- A month before the pilot would show O3's "the month has just turned over".
- The previous-month arrow drifts 16px between boards as the label resizes.
- Peer sections spaced 40px and 32px; O3's gap before alerts is 32px vs 64px on O1/O2.
- "$95.13 left" is false precision.
- On O2, "Unknown numbers" shows Claude $0.00; "—" is more honest.
- O2's first alert repeats the strip above it.
- Layer names are stale: every member row "Row · Maya Alcott", every alert row "Row · Stuck send".

## Questions to consider

- If the founder read one sentence here, what would it be? Why isn't that the headline?
- Is this one page or two — "needs you" and "costs"?
- When the texted alert fails, this page is the last channel. Should "Team not reached" take over until acknowledged — and who acknowledges an alert?
- When Claude is 90% of spend, is splitting by member still the useful breakdown?
