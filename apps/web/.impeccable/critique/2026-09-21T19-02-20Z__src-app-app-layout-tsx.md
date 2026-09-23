---
target: the app shell
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/healyfamily/Documents/Prototype/apps/web/src/app/(app)/layout.tsx"
target_fingerprint: "sha256:6b553087fc0e6aa28268feb050f61f39f8a017d6fd3127bd5ac92632f5d95b0d"
target_path: /Users/healyfamily/Documents/Prototype/apps/web/src/app/(app)/layout.tsx
timestamp: 2026-09-21T19-02-20Z
slug: src-app-app-layout-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

Target: the authenticated app shell — `apps/web/src/app/(app)/layout.tsx`, `_components/nav.tsx`, `_components/destinations.ts`, `_components/placeholder.tsx` — framing all six destinations. Mode: **Operate**. Measured live at 1440 × 900, signed in, all six destinations walked.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Location is said three ways (ground, icon colour, `aria-current="page"`). System *activity* is said zero ways: no counts, no agent status, no `loading.tsx` anywhere. |
| 2 | Match System / Real World | 2 | Homeowner English in the nav, then every destination says "…arrives in a later slice." "Slice" is build-plan vocabulary shipped to a pilot member. |
| 3 | User Control and Freedom | 2 | Six destinations always reachable, but `/settings` ejects the member to Next's stock black 404 with no route home. No nav collapse. |
| 4 | Consistency and Standards | 3 | Nav geometry is pixel-exact to §4, but two focus languages live in one 64px band, and §1 says the utility bar spans both columns while the build ships two. |
| 5 | Error Prevention | 2 | The only button in the chrome is the one that ends the session, styled identically to the label beside it. No confirmation, no weight distinction. |
| 6 | Recognition Rather Than Recall | 3 | The strongest area: six destinations always visible, text + icon, nothing hidden. Deducted for six where the rule is ≤5, and zero page headings. |
| 7 | Flexibility and Efficiency | 1 | Nothing. No shortcuts, no palette, no search, no collapse. 7 tab stops total, no skip link. |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely restrained. But minimal and empty differ: the 1180 × 836 content frame holds one 13px grey sentence at y=472.5. |
| 9 | Error Recovery | 1 | Stock Next 404 on black. No `not-found.tsx`, `error.tsx` or `global-error.tsx` anywhere under `apps/web/src`. |
| 10 | Help and Documentation | 0 | None. §3 specifies `question` (Help) and `thumbs-up` (Feedback) for this chrome. Neither is built — in a 10-member feedback pilot. |
| **Total** | | **19/40** | **Poor** (top edge; 20 is Acceptable) |

The score is dominated by what the shell **doesn't carry yet** — help, error handling, efficiency, agent status — not by what it got wrong. What it built, it built correctly.

## Design Specificity Verdict

**The surface is authored for Housemate. The structure is category-interchangeable.**

**LLM assessment.** Swap the wordmark and rewrite six labels and this is Linear, Notion or Vercel: 260px left rail, 64px top bar, first name and Sign out top-right, content frame. Nothing in the composition says *an agent is working on your house and you came here to check on it.*

What does carry product character: the palette (`--color-canvas #FFFBF9` on `--color-nav #F5F3F1`, evergreen at 12.15:1 — a deliberate refusal of cool-grey SaaS, and the one thing on screen that reads domestic); the six household words and their glyphs ("Errands" with a basket, "Property" with buildings); Lato at 15/400/−0.01em; and one piece of real craft — the logo's left edge and every nav icon both land at x=24, which is what makes the rail read as one column instead of a logo parked above a list.

What is generic: the layout itself; a utility bar holding a non-interactive `<span>` reading "Sam" and a borderless "Sign out", for a product whose identity primitive is a *phone number*; and six equal doors with no counts, no state, no ranking.

**The biggest miss:** the most product-specific fact about Housemate — an agent is acting right now, may be blocked on you, may be about to spend money — has no representation anywhere in the chrome. The design system already owns the vocabulary (the agent gradient, five status token pairs, the 56px agent button) and the shell uses none of it.

**Deterministic scan.** `impeccable detect --json` returned **0 findings** on `src/app/(app)`, `src/components` and the whole of `src`, exit 0. That was verified as a real result, not a silent no-op: a probe file with deliberate anti-patterns fired `ai-color-palette` correctly, and `--no-config` gave the same empty result with no ignore file, no config and no DESIGN.md present. The reason is substantive — the shell consumes tokens exclusively through theme-bound Tailwind utilities (`bg-nav`, `text-evergreen`, `h-(--spacing-nav-h)`, `w-(--container-sidebar)`, `shadow-selected`), so there are no literals to catch. Coverage note: `nav.tsx` uses `px-[11px]` and the detector did not flag it — correct, since 11px is the documented spec value, but it means the CLI pass is not proving "no arbitrary values."

**Visual overlays.** Injection succeeded — `document.title` mutation and `<script>` append both passed preflight — and the overlay rendered on five views (`/chat`, `/todo`, `/schedule`, `/services`, `/property`). Each reported exactly one finding: `cream-palette`, flagging the page ground `rgb(255,251,249)`. **This is a false positive.** That is `#FFFBF9` = `--color-canvas`, one of 95 documented tokens, specified in `docs/design.md` line 24 and with its contrast pairs reproduced to within rounding by independent measurement. The rule exists because warm off-white is a recognised generic-AI tell, and the fair caveat is that "it's in our token file" proves the colour was *chosen*, not that it reads as distinctive — but on this evidence it is authored, not drifted. The live server was stopped and verified stopped; no source file was touched.

**Where the two assessments agree:** token and geometry fidelity is exact; focus handling is inconsistent across the shell. **Where the detector caught what the review didn't:** nothing material — its one finding is the false positive above. **Where evidence corrected a claim:** an instant read after Tab returns the Sign out ring as muted, because the button carries `transition-colors duration-120` and Tailwind's `transition-property` includes `outline-color`. The rule `.focus-visible\:outline-evergreen:focus-visible { outline-color: var(--color-evergreen) }` is present and correct; it settles to evergreen. **There is no defect there** — it is a measurement trap, recorded so it doesn't resurface as one.

## Overall Impression

The craft is real and the scope is thin. Every number that was specified was hit — sidebar 260px, nav item 40px tall and 2px apart, 12px list padding, 11px item padding, 12px icon gap, radius 8, selected ground `#FFFBF9` over a 1px `#ECE8E5` border with a 5% shadow, label held at `#49504E` in every state, 120ms ease-out. That is §4 reproduced without a single drift, and the mechanism behind it is right: `@theme static` with `--color-*: initial` clears Tailwind's default scales, so an off-system value literally cannot compile.

What's missing is everything the spec didn't cover. The single biggest opportunity: **the shell is the one surface every visit passes through, and it says nothing about the agent.** For a delegation product whose invariant is *money waits for a yes*, a member who opens the web app worried about a payment finds six equal doors, their own first name, and a way to leave. Until the chrome can say "nothing is waiting on you" or "one thing needs your yes," the SMS thread is strictly more informative than the web app — and a control surface nobody opens isn't trusted, it's ignored.

## What's Working

1. **Token and geometry fidelity, verified by measurement.** Independently reproduced: 260px sidebar, 40px items, 2px gaps, 8px radius, resting icon `#68706E` → selected `#14342F`, label unchanged in every state. Contrast measured against the doc's own claims and matching within rounding: body on nav **7.47:1** (doc 7.5), muted on canvas **4.94:1** (doc 4.9), muted icon on nav **4.59:1** (doc 4.6).
2. **The x=24 alignment of logo and nav icons.** Invisible, unmandated, and the reason the rail coheres. Evidence someone was looking, not just satisfying a table.
3. **The palette does the emotional work with almost nothing.** Two off-whites 1.08:1 apart and one green, no saturated accent anywhere in the chrome. For a product operating inside someone's house, that restraint is the right register.

## Priority Issues

**[P0] Every destination ships build-team vocabulary instead of a zero state.** All six render `placeholder.tsx` — one centred 13px `#68706E` sentence at y=472.5, identical on all six (`headings: 0`, `mainChildren: 1`). *Why it matters:* judged as a shipped state — which it is, for up to 10 invited members — the product tells the member it isn't finished, in a word taken from `docs/build-plan.md`. That contradicts `docs/product.md` voice ("talk like a person", "no corporate phrasing") and the prototype's own promise that each area shows a zero state. It also wastes the best onboarding surface the product has. *Fix:* delete `placeholder.tsx`; give each destination a zero state in the agent's voice that teaches the area and points back to SMS — Property: "Nothing in here yet. Text me a photo of anything in the house and I'll file it." *Command:* `/impeccable onboard`

**[P1] The utility bar was never designed, and the build improvised one.** Measured: `<header>` 64px, x=260, width 1180, `background-color: rgba(0,0,0,0)`, `border-bottom: 0px`, padding `0 28px`, containing two 13px `#68706E` things. `docs/design.md` §7 says plainly the shell's utility bar is "not represented anywhere yet". *Why it matters:* the most prominent interactive control in the app is the one that ends the session and it carries no more weight than the label beside it; with no ground and no hairline the bar isn't a bar, so 64px does no compositional work; and §3 specifies four chrome glyphs for this bar (`caret-down`, `question`, `thumbs-up`, `magnifying-glass`) that don't exist. *Fix:* mock it in Paper before any destination is built on top of it (D-034 requires this). Minimum: an account menu carrying the member's **phone number** — their actual identity here — with Sign out demoted into it, a help/feedback affordance, and the agent-status slot. *Command:* `/impeccable shape`

**[P1] Keyboard focus is inconsistent, off-system and unbypassable.** Measured by real Tab press: the six nav `<Link>`s have **no authored focus styling** and fall back to Chrome's `outline: auto 1px`, resolving to the OS accent colour (measured `rgb(229,151,0)` on this machine, so it varies per user). The Sign out button two landmarks away carries the system's own evergreen ring. 7 tab stops total; `document.querySelector('a[href^="#"]')` is false, so no skip link. *Why it matters:* D-037 commits to WCAG 2.2 AA, which includes 3:1 focus indicators and 2.4.1 Bypass Blocks; a keyboard user re-traverses six links before `<main>` on every route change. §4 already specifies the answer — "2px evergreen ring, 2px outside, with a canvas-colored gap". *Fix:* apply it to the `<Link>` in `nav.tsx`; add a visually-hidden skip link to `#main` (`.sr-only` is already compiled and unused). *Command:* `/impeccable harden`

**[P1] An unknown URL ejects the member out of Housemate entirely.** `/settings` renders Next's stock 404 — pure black, white Helvetica, no sidebar, no logo, no link back. No `not-found.tsx`, `error.tsx` or `global-error.tsx` exists under `apps/web/src`, so a thrown server error renders the same page. *Why it matters:* a stale link is plausible in a product whose primary channel is text messages, and the product appears to vanish. *Fix:* add `(app)/not-found.tsx` and `(app)/error.tsx` so the rail survives and the member keeps a route home, plus a root `not-found.tsx` in Housemate's palette. *Command:* `/impeccable harden`

**[P2] The shell carries no signal that the agent did anything.** No counts, no "Action Needed" badge, no "waiting on your yes", no last-synced state, no route back to the SMS thread. The nav row has a `flex-shrink: 0` leading icon slot and no matching trailing slot. *Why it matters:* this is the product-specific failure, not a generic one — `docs/product.md` positions the web app as the trusted control surface for an agent that acts alone, and invariant 7 says money waits for a yes. *Fix:* reserve the trailing fixed-width count slot in the 236px nav row **now**, mirroring the leading icon slot, so it can't be retrofitted inconsistently across six destinations later. The tokens already exist (`--color-status-action-*` at 5.80:1, the agent gradient). *Command:* `/impeccable shape`

## Persona Red Flags

**Alex (Impatient Power User).** Seven tab stops in the entire application. No keyboard shortcuts, no command palette, no search (`magnifying-glass` specified in §3, unbuilt), no nav collapse (`sidebar-simple` specified in §3, unbuilt). His fastest path to any destination is a mouse click on a 40px row, forever. He keeps using SMS and never opens the web app — so the correction surface goes unused by exactly the member most likely to correct things.

**Sam (Accessibility-Dependent).** No bypass mechanism; six repeated nav links precede `<main>` on every route. Off-system focus ring on the primary navigation while the system's own answer exists and isn't applied. **Zero headings on every destination** — `querySelectorAll('h1,h2,h3,h4,h5,h6').length === 0` on all six, so heading navigation returns nothing and the only announcement of location is `<title>`. Client-side nav swaps `<main>` with no live region and no focus move. The primary nav is nested inside `<aside>`, exposed as `complementary → navigation "Main"`; `<aside>` means tangentially related, and this is the app's main navigation. Credit where due: `aria-current="page"` is correct, the wordmark carries `role="img"`, icons are `aria-hidden`, `lang="en"` is set, and every measured text/ground pair passes AA.

**Dana, the delegator** (project persona, from `docs/product.md` Users + Positioning). She texted about the AC an hour ago and opens the web app to find out what Housemate did, what it's waiting on, and what it will cost. The shell answers none of the three. It shows six equal doors, her first name, a way to leave, and "Chat arrives in a later slice." Nothing in the chrome connects to the thread she just came from. She closes the tab and goes back to texting.

**Marcus, the pilot member on his phone** (project persona, from the SMS-first channel model). He taps a link from a Housemate text. Measured at 390 × 844: the 260px sidebar takes **66.7%** of the viewport, the content column collapses to **130px**, "Sign out" wraps onto two lines. No collapse, no drawer, no breakpoint applied. Q12 correctly says no narrow layouts have been designed — but for an SMS-first product the phone is the likeliest first web touch, not an edge case.

## Minor Observations

1. **Nav hover is imperceptible** — `#FAF7F5` on `#F5F3F1` is **1.04:1**; the only hover feedback is the cursor. §4 already reserves a 1px transparent border box, so borrowing the selected state's `--color-line` on hover costs zero layout shift. Or decide hover carries nothing, and record that.
2. **The selected state's ground and border are near-invisible; the icon is load-bearing.** Selected ground vs nav **1.08:1**, border vs nav **1.10:1**, shadow at 5%. What identifies the current destination is the icon flipping 4.59:1 → 13.07:1. All three grounds sit far below the 3:1 non-text threshold — which is deliberate (§4: the label is `--color-body` in every state), but worth knowing before anyone proposes an icon-less nav.
3. **The utility bar contradicts its own spec.** §1: "64px, spanning both columns." Built as two separate 64px bands at `px-6` and `px-7` with no hairline at y=64 in either. They align, so it reads — but spec and build disagree.
4. **Trailing chrome optically misaligns by 12px.** Sign out's box right edge is at x=1412 (28px inset, correct), but `px-3` puts the *label* at x=1400 — 40px from the edge, where content will inset 28px.
5. **The 188px vertical rhythm has nowhere to live.** §1 makes it a Rule; the shell provides only the 64px bar, so six pages will each re-derive the other 124px. That is how sibling screens drift, and §1 also says they must stack identically.
6. **`--container-shell: 1440px` is defined and never applied.** At 1920px the content column measures 1660px, a width no approved mockup covers.
7. **No `loading.tsx` anywhere**, so client-side route changes have no pending state. Invisible today; visible the moment a destination fetches.
8. **No `<h1>` on any destination** — which is also exactly where the 188px rhythm would begin.

## Questions to Consider

- If the web app is the trusted control surface for an agent that acts on its own, why does the shell never once mention the agent? What would the rail look like if one slot were permanently reserved for "what Housemate is doing right now"?
- The member's identity here is a **phone number**. Why does the chrome show a first name and a sign-out button — the two things a phone-first member needs least?
- If a member only ever opened the web app when something needed their yes, would this shell still be recognisable as the same product?
- Six destinations at identical weight asserts all six matter equally on every visit. They don't. What actually breaks if the rail is ranked, grouped or stateful instead of flat?
- The design system owns an agent gradient, five status colour pairs and a 56px agent button. The shell uses none of them. If the system's most product-specific tokens have no home in the surface every visit passes through, are they in the wrong place — or is the shell?
