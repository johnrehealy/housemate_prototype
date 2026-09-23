---
version: 1
slug: "apps-web-src-app-auth-sign-in-sign-in-form-tsx"
primary_target: "apps/web/src/app/(auth)/sign-in/sign-in-form.tsx"
related_targets: ["apps/web/src/app/(auth)/sign-in/page.tsx","apps/web/src/app/(auth)/layout.tsx"]
---

# Sign-in surface brief

## Scope
- Route: `/sign-in`. Mode: Operate.
- Audience: invited pilot members, mostly on a desktop browser. Texting Housemate never needs a sign-in; the web app does.
- Job: sign in with a texted code. On a first visit, learn what Housemate is and what the web app is for.
- Constraints: `docs/design.md` tokens only. Invite-only, and the page never reveals whether a number is invited. The code step signs in on the sixth digit, with no button.
- Approval: the Paper mockup on the "Sign-in" page must be approved before the build changes (D-034).

## Direction contract
THESIS: The page explains Housemate before it asks for anything, refusing the lone centered login card.
OWN-WORLD: An evergreen panel with on-evergreen type and 16% on-evergreen hairlines, beside a canvas form column. 600px from --breakpoint-xl, 400px from --breakpoint-lg, gone below it (D-056). Lato on the token scale. 40px white fields whose resting border is --color-muted, not line-strong — docs/design.md §4 sets that deliberately, for the 3:1 a control needs to be found (muted is 4.9:1, line-strong 1.4:1). 40px evergreen buttons, rust blocked tokens for errors, Phosphor Regular 20px glyphs.
STORY: The member learns Housemate works by text and texting needs no sign-in, sees what the web app is for, then signs in with a code that completes itself.
FIRST VIEWPORT (1440, board A1): Left, the 600px evergreen panel: lockup top, 32px headline, 17px lead, three divided rows (text anytime, takes it from there, everything shows up here), invite note at the bottom. Right, a 360px form column centered in the canvas: 32px "Sign in", helper, labelled mobile field, full-width "Send code" button. At 1024 (A9) the panel is 400px and keeps all three rows; below --breakpoint-lg (A7/A8) the panel is gone, the lockup moves to the top of the form column and the invite note to the bottom of the page.
FORM: Evergreen panel, position 4 of 7 on the ranked list, surface seed key 1cac05c5 (roll ran offline). Signature interaction: the sixth digit signs the member in, and the line under the field turns into "Signing you in…" in place.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Whether the field, button and focus treatments become named components in `docs/design.md` (Q13).

## Closed
- **Field border contrast** — settled 2026-09-17 in `docs/design.md` §4 (D-036): the resting border is `--color-muted` at 4.9:1, chosen over line-strong at 1.4:1. Don't reopen it.
- **Narrow and medium widths** — settled 2026-09-21 (D-056), boards A7–A9.
