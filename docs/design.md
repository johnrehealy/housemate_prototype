# Housemate Design System

## About this file

- **This file is the design source of truth for building.** Paper is for the user's visual review only.
- **Source:** the "Housemate Design System" page of the Paper file, **ART-2026-003 · Proposed r1 · 11 September 2026**, exported 15 September 2026. Nothing else in the Paper file is a source, and Paper isn't consulted again. The design system is maintained in this file from here on.
- **Labels used below:**
  - **Rule:** stated as a rule in the spec.
  - **Observed:** measured from a mockup; the behavior isn't established.
  - **Open Qn:** conflicts with another source or is undefined. See [Open design questions](#7-open-design-questions).
- The spec treats unresolved conflicts as evidence, not rules. When building something marked Open, raise it in the plan and propose an option instead of choosing silently.

---

## 1. Foundations

Reference frame: desktop at **1440 × 900**. The sidebar is 260px, and content is inset 28px on each side, leaving a **1124px** content area.

### Color: grounds

| Token | Value | Use |
|---|---|---|
| `--color-nav` | `#F5F3F1` | Left navigation ground |
| `--color-canvas` | `#FFFBF9` | Main area; selected nav item |
| `--color-nav-hover` | `#FAF7F5` | Nav hover; the exact midpoint of nav and canvas |
| `--color-surface` | `#FFFFFF` | The only pure white. Spec I says "composer only" (**Open Q2**) |
| `--color-line` | `#ECE8E5` | Hairlines and resting borders |
| `--color-line-strong` | `#DDD7D3` | Border on hover |

### Color: ink

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--color-evergreen` | `#14342F` | Brand ink: mark, avatar, send, greeting | |
| `--color-heading` | `#2A312F` | Card headings, user name | |
| `--color-body` | `#49504E` | Body and nav labels | 7.5:1 on nav, 8.0:1 on canvas |
| `--color-muted` | `#68706E` | Secondary text, placeholders, resting icons | 4.6:1 on nav, 4.9:1 on canvas |
| `--color-on-evergreen` | `#FFFBF9` | Text and icons on evergreen fills | |

### Color: status

**Rule:** there are four statuses and one attention label. Action Needed is *attention*, derived from other fields (see [Task model](#task-model)). The others are stored *statuses*.

| Label | Kind | Foreground / background | Contrast | Meaning |
|---|---|---|---|---|
| Action Needed | attention | `#8F3F33` on `#F6E3DE` (`--color-status-action-*`) | 5.80:1 | The owner is the homeowner and the task isn't done. Shown in the Brief view only. |
| Blocked | status | `#7E3A34` on `#F5E2DE` (`--color-status-blocked-*`) | 6.62:1 | Waiting on a person or a payment. Same rust family as Action Needed. |
| In Progress | status | `#42624A` on `#E7EFE6` (`--color-status-progress-*`) | 5.81:1 | Housemate is actively working on it. |
| Not Active | status | `#5F6664` on `#F0EDEB` (`--color-status-idle-*`) | 5.05:1 | Never started, or punted; `wake_at` distinguishes the two. |
| Done | status | `#4F6470` on `#E4EAEE` (`--color-status-done-*`) | 5.11:1 | Complete. The coolest color in the palette, so finished work recedes. |

### Color: errand types

Type chips use an outlined style (see [Chips](#chips)).

| Type | Text | Outline |
|---|---|---|
| Delivery | `#2E5C58` | `#A1B3B1` |
| Pickup | `#7A5316` | `#C3AF93` |
| Activity | `#6B5346` | `#BCAFA8` |

### Color: file types

**Rule:** these are the only decorative (non-semantic) colors in the system. They appear only on the file sheet: never on pills or rows. The glyph and label always share the color.

| Token | Value | Contrast on sheet |
|---|---|---|
| `--color-file-pdf` | `#A8322A` | 6.66:1 |
| `--color-file-doc` | `#2C5F91` | 6.66:1 |
| `--color-file-xls` | `#2E6B47` | 6.34:1 |
| `--color-file-ppt` | `#9C5518` | 5.64:1 |

### Color: calendar events

| Category | Fill | Foreground | Outline |
|---|---|---|---|
| Services | `--color-status-progress-bg` | `--color-status-progress-fg` | `#B6C5B7` |
| Actions | `--color-status-action-bg` | `--color-status-action-fg` | `#D7B2AB` |
| Reminders | `#F4E8D9` | `#7E5219` | `#D1BB9F` |
| Personal | `--color-status-idle-bg` | `--color-status-idle-fg` | `#C4C4C2` |

Each outline is its fill mixed 30% toward its foreground.

### Color: agent

- **Agent gradient:** `linear-gradient(135deg, #14342F, #357F6B)` (`--color-agent-from` / `--color-agent-to`). **Rule:** at most one agent-gradient element per screen (see [Agent button](#agent-button)).
- **Recurring:** `--color-recurring` is an alias of `--color-evergreen`.
- **Favorite:** the service tile spec references `--color-favourite` (an alias of evergreen), but the token doesn't exist in the register (**Open Q10**). Red is deliberately unused, because rust already means Action Needed and Blocked.

### Typography

**Font:** Lato, which ships in weights 300, 400, 700 and 900 only. **Rule:** there is no 500 or 600, so hierarchy comes from size and color first. Bold is used only for tile headings and avatar initials.

| Token | Size / weight / line height / tracking | Use |
|---|---|---|
| `--text-display` | 32px / 400 / 52px / −0.022em | Greeting only (**Open Q1**: Errands also uses it for headlines) |
| `--text-lead` | 17px / 400 / 26px / −0.01em | Greeting subtitle; note bar |
| `--text-base` | 16px / 400 / 24px / −0.01em | Composer input and placeholder |
| `--text-label` | 15px / 400 / 20px / −0.01em | Nav labels, tabs |
| `--text-sm` | 14px / 700 / 20px / −0.005em | Tile headings, user name |
| `--text-xs` | 13px / 400 / 19px / 0em | Tile body, section labels |
| `--text-2xs` | 12px / 400 / 16px / 0em | Address, avatar initials. The smallest size allowed. |
| `--text-metric` | 36px / 300 / 44px / −0.022em | Count summary numbers (**Open Q1**) |

- **Rule:** italic is reserved for the service tile's usage line and appears nowhere else.
- The type scale uses two values with no matching token: 20px line height and −0.005em tracking.

### Metrics

| Element | Value |
|---|---|
| Sidebar | 260px, fixed, never fluid |
| Top (utility) bar | 64px, spanning both columns |
| Nav item | 40px tall, 2px apart |
| Icon | 20px (**Open Q3**: 28px exception on category tiles) |
| Hit target | 36px square for bare icon buttons |
| Thread column | 660px max, centered |
| Radius | sm 6 · md 8 · lg 12 · xl 14 · full 9999 |
| Composer elevation | `0 1px 3px rgba(20,52,47,.05)` |
| Selected-state shadow | `0 1px 2px rgba(20,52,47,.05)` |

### Vertical rhythm

**Rule:** content starts at 188px on every destination.

| Band | Height | Token |
|---|---|---|
| Utility bar | 64px | `--spacing-bar` |
| Tab ribbon | 48px (16px above labels) | `--spacing-tabbar` |
| Note / controls row | 76px | `--spacing-toolbar` |

- 64 + 48 + 76 = 188, which leaves **712px** of content at 900px viewport height.
- **Example:** Files spends exactly 712px: 4 rows at 166px plus 3 gaps at 16px. The grid meets the viewport edge, which signals there's more below.
- **Rule:** sibling screens must stack identically.
- **Open Q5:** archive copy elsewhere says content starts at 113px with the first month rule at 212px, and Errands measures a 49px ribbon.

### Breakpoints and containers

| Token | Value |
|---|---|
| `--breakpoint-sm` / `md` / `lg` / `xl` | 640 / 768 / 1024 / 1280px |
| `--container-sidebar` | 260px |
| `--container-thread` | 660px |
| `--container-shell` | 1440px |

No narrow layouts have been designed (**Open Q12**).

---

## 2. Token register

These are all 95 live Paper tokens, captured 11 September 2026. The register records what exists; it doesn't settle how tokens are used.

```css
:root {
  /* Grounds and ink */
  --color-evergreen: #14342F;
  --color-nav: #F5F3F1;
  --color-canvas: #FFFBF9;
  --color-nav-hover: #FAF7F5;
  --color-surface: #FFFFFF;
  --color-line: #ECE8E5;
  --color-line-strong: #DDD7D3;
  --color-body: #49504E;
  --color-heading: #2A312F;
  --color-muted: #68706E;
  --color-on-evergreen: #FFFBF9;

  /* Status and agent */
  --color-status-action-bg: #F6E3DE;
  --color-status-action-fg: #8F3F33;
  --color-status-blocked-bg: #F5E2DE;
  --color-status-blocked-fg: #7E3A34;
  --color-status-progress-bg: #E7EFE6;
  --color-status-progress-fg: #42624A;
  --color-status-done-bg: #E4EAEE;
  --color-status-done-fg: #4F6470;
  --color-status-idle-bg: #F0EDEB;
  --color-status-idle-fg: #5F6664;
  --color-agent-from: #14342F;
  --color-agent-to: #357F6B;
  --color-recurring: var(--color-evergreen);

  /* Files */
  --color-file-pdf: #A8322A;
  --color-file-doc: #2C5F91;
  --color-file-xls: #2E6B47;
  --color-file-ppt: #9C5518;

  /* Calendar events */
  --color-event-services-bg: var(--color-status-progress-bg);
  --color-event-services-fg: var(--color-status-progress-fg);
  --color-event-actions-bg: var(--color-status-action-bg);
  --color-event-actions-fg: var(--color-status-action-fg);
  --color-event-reminders-bg: #F4E8D9;
  --color-event-reminders-fg: #7E5219;
  --color-event-personal-bg: var(--color-status-idle-bg);
  --color-event-personal-fg: var(--color-status-idle-fg);
  --color-event-services-line: #B6C5B7;
  --color-event-actions-line: #D7B2AB;
  --color-event-reminders-line: #D1BB9F;
  --color-event-personal-line: #C4C4C2;

  /* Errand types */
  --color-type-pickup-fg: #7A5316;
  --color-type-pickup-line: #C3AF93;
  --color-type-delivery-fg: #2E5C58;
  --color-type-delivery-line: #A1B3B1;
  --color-type-activity-fg: #6B5346;
  --color-type-activity-line: #BCAFA8;

  /* Typography */
  --font-sans: Lato;
  --text-display: 32px;
  --text-lead: 17px;
  --text-base: 16px;
  --text-label: 15px;
  --text-sm: 14px;
  --text-xs: 13px;
  --text-2xs: 12px;
  --text-metric: 36px;
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-bold: 700;
  --tracking-display: -0.022em;
  --tracking-tight: -0.01em;
  --tracking-normal: 0em;
  --tracking-wide: 0.04em;
  --leading-display: 52px;
  --leading-lead: 26px;
  --leading-body: 24px;
  --leading-snug: 19px;
  --leading-flat: 16px;

  /* Breakpoints and containers */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --container-sidebar: 260px;
  --container-thread: 660px;
  --container-shell: 1440px;

  /* Spacing and dimensions */
  --spacing-icon: 20px;
  --spacing-hit: 36px;
  --spacing-nav-h: 40px;
  --spacing-bar: 64px;
  --spacing-row: 52px;
  --spacing-fab: 56px;
  --spacing-icon-lg: 28px;
  --spacing-tile: 150px;
  --spacing-tabbar: 48px;
  --spacing-toolbar: 76px;
  --spacing-file-card: 166px;
  --spacing-file-panel: 168px;
  --spacing-hour: 60px;
  --spacing-gutter: 64px;
  --spacing-dayhdr: 48px;
  --spacing-legend: 64px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 14px;
  --radius-full: 9999px;
}
```

---

## 3. Elements

### Iconography

**Phosphor Regular.** Two sizes (**Open Q3**):

- **20px, chrome:** nav, toolbars, table rows, board cards, the favorite heart. Any icon that sits beside a label.
- **28px, category tile** (`--spacing-icon-lg`): the only exception. On a Services tile the glyph *is* the content. **Rule:** there's no third size. If a glyph needs to be bigger than 20px to read, a label should be doing that job.
- Brand marks are sized independently.

**Chrome glyphs**

| Function | Glyph | Function | Glyph |
|---|---|---|---|
| Chat | `chat` | Help | `question` |
| To Do | `list-checks` | Search | `magnifying-glass` |
| Schedule | `calendar-blank` | Attach | `paperclip` |
| Services | `wrench` | Voice | `microphone` |
| Errands | `basket` | Send | `arrow-right` |
| Property | `buildings` | Account menu | `caret-down` |
| Collapse nav | `sidebar-simple` | Filter | `funnel-simple` |
| Feedback | `thumbs-up` | Vendors tile | `paint-brush` |
| Stand-in tile | `user` | Troubleshoot tile | `warning` |

**Category glyphs.** The catalogue has 24 categories with 24 distinct glyphs. **Rule:** no glyph repeats. An earlier 12-category mapping is a subset with identical glyphs (**Open Q4**: which count governs).

| Category | Glyph | Category | Glyph |
|---|---|---|---|
| Air Duct Cleaning | `fan` | Locksmith | `key` |
| Appliance Repair | `washing-machine` | Mold Remediation* | `virus` |
| Carpet Cleaning | `spray-bottle` | Painting | `paint-roller` |
| Chimney Sweep | `fire` | Pest* | `bug` |
| Deck & Patio | `stairs` | Plumbing* | `drop` |
| Electrical* | `lightning` | Pool Maintenance* | `swimming-pool` |
| Flooring* | `squares-four` | Roof & Gutter* | `house-line` |
| Garage Door | `garage` | Security Systems | `security-camera` |
| Handyman* | `hammer` | Snow Removal | `snowflake` |
| Heating/Air* | `wind` | Solar | `solar-panel` |
| Housecleaning* | `broom` | Window & Door | `door` |
| Interior Design* | `armchair` | Landscaping* | `tree` |

\* Also in the earlier 12-category set.

### Chips

- **Status chip:** filled pill, 26px tall, 11px horizontal padding, 13/400/18 text. In Progress, Action Needed and Done use their status tokens. **Observed:** "Scheduled" is drawn neutral, with no token assigned. The Errands status column mixes status and attention (**Open Q6**).
- **Type chip:** outlined pill, 26px tall, 10px horizontal padding, 13/400/18 text, using the `--color-type-*` tokens.

### Visit actions

**Observed:**
- **Enable Home Visits:** 250 × 36px.
- **Request errand:** 36px tall, 20px side padding.
- Both use an evergreen fill, on-evergreen text and `radius-md`.
- **Skip Visit:** a neutral 36px text action with 12px side padding.
- Paired actions sit 8px apart.

Focus, disabled, loading, confirmation and completion states aren't shown. What each action does is **Open Q7**.

---

## 4. Components

### Navigation item

| State | Background | Border | Icon | Other |
|---|---|---|---|---|
| Default | transparent | 1px transparent (reserves the box) | `--color-muted` | |
| Hover | `--color-nav-hover` | — | — | `transition: background 120ms ease-out` |
| Selected | `--color-canvas` | 1px `--color-line` | `--color-evergreen` | Shadow `0 1px 2px rgba(20,52,47,.05)` |

- **Anatomy:** 40px tall, radius 8px, padding `0 11px`. Icon slot 20×20 with `flex-shrink: 0`; 12px gap. Label 15/400/−0.01em. List gap 2px; list padding 12px.
- **Rule:** the label is `--color-body` in every state. State is shown only through ground, border and icon.

### Tab bar

- **Active tab:** `--color-heading` text with a 2px `--color-evergreen` underline.
- **Resting:** `--color-muted`. **Hover:** `--color-body`.
- 15/400/−0.01em, 30px between tabs.
- The hairline spans the full width; tabs are inset 28px.
- **In a conversation:** the ribbon shows a back arrow instead of tabs, at the same 48px height with the same hairline.

### Range filter (segmented control)

- Options: 1D · 7D · 30D · 90D · All.
- Track: `--color-nav`, 3px padding, `radius-md`. Size 280 × 36, the same footprint as the search bar.
- **Rule:** the selected segment reuses the selected nav item exactly (canvas fill, 1px line, `0 1px 2px` shadow). It's deliberate reuse, not a second selection pattern.

### Search bar

280 × 36, built on `--color-surface` with a hairline, because it's a text input like the composer. The recessed `--color-nav` track belongs only to segmented controls.

### Agent button

- 56px (`--spacing-fab`), filled with the agent gradient. The mark reaches 7.7:1 contrast near the center and 4.64:1 at the sage corner.
- **Rule:** used only to show the agent is present, at most once per screen. Never used on owner avatars, which stay solid `--color-evergreen`.

### Composer

- **New conversation:** 660 × 114, two lines of input. **Continuing a conversation:** 660 × 79, one line.
- Both use `--container-thread` width. **Rule:** width carries the continuity, so starting and continuing a conversation feel like the same input.
- Input and placeholder use `--text-base`, with placeholder "Chat with Housemate…". Elevation `0 1px 3px rgba(20,52,47,.05)`.
- Controls: attach (`paperclip`), voice (`microphone`), send (`arrow-right`). **Rule:** send stays solid `--color-evergreen` so the agent gradient appears only once per screen.
- **Find composer** (earlier Services version, **Open Q4**): the Chat composer without attach and voice, with placeholder "Housemate will provide top recommendations…". Radius, border, shadow and send button are unchanged.

### Note bar (earlier version, **Open Q4 / Q5**)

64px tall, `--text-lead` 400 in `--color-body`, for example "Vendors you have **not** used within the past year". Bold weight carries the negation. Add and filter controls sit on the right as 36px targets. The later spec uses the 76px toolbar instead (see [Toolbar](#toolbar)).

### Service tile

269 × 150. Surface: `--color-surface` with a 1px `--color-line` border and `radius-lg`. Content is centered on both axes. 28px category glyph.

| State | Treatment |
|---|---|
| Resting | Name 15/700; usage line 13/400 *italic* in `--color-muted`, e.g. "Used 1 time in past year" |
| Hover | Ground `--color-nav-hover`; border `--color-line-strong`. No lift or scale: the tile is a destination, not a button. |
| Favorited | Filled heart, 20px, `--color-favourite`, inset 14px from the top and right |
| Inactive | Usage line omitted, never shown as "Used 0 times". Height stays 150 so the grid doesn't shift between tabs. No heart. |

**Rule:** the tile never changes across the Active, Inactive and Find tabs. Active adds the usage line and heart; Inactive and Find omit both.

### Board card and column

- **Expanded card:** icon (representing the task's subject, not its status), title, and body 13/19 in `--color-muted`.
- **Collapsed card:** icon and title on one row with a caret on the right. Same padding, no body.
- **Column:**
  - The header sits outside the container: 14/700, with the count in `--color-muted`.
  - The container is `--color-nav`, `radius-lg`, 12px padding, 12px between cards.
  - Columns use `flex: 1`, a 240px minimum width and 16px gaps, so four fit at 1440px.
- Cards use `--color-surface` (**Open Q2**).

### File cards

- **Document sheet:** a 76 × 96 frame. Glyph and label use the file type color.
- **Image files (JPG/PNG):** a full-bleed preview with no glyph or label, in the same 76 × 96 frame with unchanged border, radius and shadow. Implement by swapping an `svg` for an `img`.
- **Rule:** each card states the file type exactly once. Documents show it on the sheet, so the metadata line reads "2.4 MB · Aug 22". Images have no room for a label, so their metadata reads "JPG · 3.1 MB · Aug 20".
- Card height: `--spacing-file-card` 166px. Preview images in mockups are deliberately as heavy as real photos.

### Count summary

**Observed** in Errands > All:
- Three equal segments, for example All 18 · Requested 8 · Done 10.
- **Track:** 1124 × 110, nav ground, `radius-lg`, 4px padding and 4px gaps.
- **Segments:** 102px tall, 20px side padding, 6px between label and number. Label 14/400/20; number 36/300/44 in evergreen, −0.022em.
- **Selected segment:** canvas fill, line border, `radius-md`, `0 1px 2px` evergreen shadow at 5%.

Whether segments act as filters, and what counts as Requested, is **Open Q8**.

### Conversation

- **User message:** `--color-nav` bubble, `radius-lg`, max width 480, right-aligned.
- **Housemate reply:** plain text on the canvas. **Rule:** a bubble means *you*. No avatars: there are only two parties, and the side shows which.
- **Attachment:** the slim variant, not the Files-page row, e.g. "Roof replacement quote · 2.4 MB · Filed to Documents". The glyph uses the `--color-file-*` token.
- **Suggestions:** 34px outlined pills, e.g. "Get a second quote". Outlined because a suggestion isn't a primary action. One may carry a sparkle glyph for an agent action. A trailing circle button regenerates the set.
- **Toolbar:** the note slot holds the conversation's generated subject, and a history control replaces the filter.
- Thread, attachments and composer all share `--container-thread` width.

### Errand row

**Observed** in Errands > Next and All:

| Lane | Width |
|---|---|
| Errand (subject icon 20px + 12px gap + label) | flexible (428px in Next, 417px in All) |
| Items | 108px |
| Type | 112px |
| Status | 148px |
| Date | 128px |
| Actions | 116px |

- **Row:** 52px tall (`--spacing-row`), 12px side padding, 12px gaps. Body 14/400/20, −0.005em.
- **Header:** 36px plus a 1px hairline. The "Add errand…" row is 38px.
- **Hover:** nav-hover ground, `radius-md`, with edit / bell / trash controls in 36px targets. Other rows reserve the same action lane. When controls appear (hover, focus or selection) is **Open Q8**.
- The Items column holds counts, bags, parcels, checks or currency. Don't restrict it to integers.

### Upcoming-visit summary

**Observed** in Errands > Next:
- A centered 1124 × 169 block, placed after the tabs with 40px top padding.
- **Text:** "Your next home visit is scheduled for **Monday, September 14th**". Both parts are 32/52/−0.022em; the date is 700 weight and the statement 400.
- The action group (Request errand, Skip Visit) starts 24px below.
- A 48px spacer separates the block from the list toolbar.
- The "no upcoming visit" and "visit with no errands" states aren't shown.

---

## 5. Patterns

### Grid

- `grid grid-cols-4 gap-4`: a 1124px content area with three 16px gaps gives 269px columns.
- Tiles set their width explicitly so a short final row keeps the column widths.
- **Ordering:** Active sorts by usage descending, with ties alphabetical. Inactive is alphabetical.

### Toolbar

**Rule:** one layout, three control sets. The row is always 76px, with an optional description on the left and controls on the right. The trailing control depends on what the destination needs.

| Destination | Controls | Why |
|---|---|---|
| To Do (Brief, List, Board) | Add + range filter. No description, no filter icon. | Scoped by time |
| Services | Description + add + filter | Earlier spec says no scoping (**Open Q4**) |
| Chat > Files and Previous | Description + add + filter + search bar | Archives outgrow the viewport; scoped by text |

- The range filter and search bar share a 280 × 36 footprint, so they can swap without reflow. They aren't interchangeable in meaning.
- **Later Services version** (**Open Q4**):
  - Active and Inactive use add + filter + search.
  - Find replaces add with chat: you can't add a vendor you haven't chosen yet. The note reads "Find a service provider". 24 categories, alphabetical.
- **Errands toolbar (observed):** description on the left; plus, filter, crossed-calendar and search icons on the right, each 36px with 2px gaps. Search is an icon here, not the 280px bar.

### Month rule

- Anatomy: caret · label · count · hairline, e.g. "AUGUST (7)".
- Used in Chat > Previous and Chat > Files, with newest items first inside each group.
- **Rule:** Files and Previous must stack identically. Near-misses in alignment look worse than obvious differences. **Open Q5:** 113px / 212px start values.

### Errands collection

**Observed:**
- **Next:** six rows for the next visit.
- **All:** eighteen rows, eight unfinished followed by ten Done.
- **Order:** unfinished items by date ascending, then completed items by date descending. Tie-breaking isn't specified.
- **All layout:** 1113px wide with 28px left and 39px right padding, a clipped 565px viewport and a separate 6px scrollbar. Sticky headers and scroll behavior need confirmation (**Open Q8**).

### Calendar

**Grid**
- Content starts at 188px. 900 − 188 = 712; the day header takes 48 (`--spacing-dayhdr`) and the legend 64 (`--spacing-legend`), leaving **600px**.
- **Week and Day:** ten 60px hours (`--spacing-hour`), showing 8 AM–5 PM, with other hours scrolling.
- **Month:** five 120px rows. Six-week months aren't specified (**Open Q11**).
- **Hour gutter:** 64px (`--spacing-gutter`). The seven day columns split the remaining 1060px (≈151px each).
- **Rule:** hour labels sit at the *top* of the hour they name. Centering them clips the first label.
- The scroll indicator hugs the viewport edge and spans only the grid, not the legend.

**Event block**
- Fill plus a 1px `--color-event-*-line` outline, and nothing else: no left accent rule.
- **Geometry:** inset 4px each side; height = duration × 60 − 4; `radius-sm`; padding 5px vertical, 9px horizontal.
- **Text:** title 13/700; time 12/400 at 80% opacity. Both use the category foreground color.
- Events under an hour drop the time; a 30-minute block is 26px tall and shows only the title. Both spans need `flex-shrink: 0`.

| View | Block layout |
|---|---|
| Month | Single line, no time. Up to three chips per cell, then a muted "+N more". |
| Week | Title above time; time dropped for events under an hour. |
| Day | Title left, time right, on one row. |

**Rule:** fill, outline, radius and height math are identical across views.

**Day header**
- Name and number together in one label, 14/400 `--color-heading`, e.g. "Mon 7".
- **Today:** `--color-nav` ground, `--color-line` hairline, `radius-md`, 30px tall. It's quiet on purpose: today is a fact, not a status.
- The current-time rule is evergreen.

**Month cell**
- 120px tall, ≈151px wide, with hairlines on the left and top.
- The date pill sits top-left; today uses the Week header's pill.
- Days outside the month show their number in `--color-muted`; nothing else changes.

**Toolbar and legend**
- **Left:** the range (e.g. "September 7 – 13, 2026"), previous/next carets and a Today button act as one unit. Today is a bordered text button, not an icon. The month is written out because this is the only place the view names it.
- **Right:** add + label + search ("Search the calendar"). Editing categories sits beside adding events.
- **Legend:** Services · Actions · Reminders · Personal, below the grid. Each swatch is a miniature event block. **Rule:** the legend has no controls.
- **Open Q11:** the example shows a filter that the toolbar prose omits.

### Home-visit introduction (zero state)

**Observed:**
- Shared 260px rail and 64px utility bar; no local tabs.
- Content is centered in the remaining 1180 × 836 area, with 28px horizontal and 40px bottom padding.
- Headline 32/400/52 in evergreen; subtitle 17/400/26 in muted.
- **Three preparation steps** in an 839px row: equal widths, 24px horizontal padding, 12px icon-to-text gap, 1px separators.
  1. **Request errand:** "Pick what you need from the list, or describe it in your own words."
  2. **Prepare pickup:** "Bag the laundry, box the returns, and label anything that needs a receipt."
  3. **Leave at front door:** "Leave it inside the front door by 9am. Your Housemate takes it from there."

The 9am cutoff and access rules aren't confirmed (**Open Q9**).

---

## 6. Semantics

These describe behavior and data from the original spec sheets. They're design evidence, **not an approved data model**. Adopting them is an open question in `docs/open-questions.md`.

### Task model

**Stored fields**

| Field | Values | Meaning |
|---|---|---|
| `status` | `not_active` · `in_progress` · `blocked` · `done` | The only status field. Board columns map to it 1:1. |
| `owner` | `homeowner` · `housemate` · `vendor` | Who holds the next action; this determines attention. |
| `wake_at` | timestamp or null | Set by the bell control. Punting, pausing and reminding are one mechanism. |

**Derived attention**, evaluated top to bottom:

1. `status = done` → **Done**
2. `status = not_active` and `wake_at` is set → **For Awareness**
3. `owner = homeowner` → **Action Needed**
4. Otherwise → **For Awareness**

**Snooze loop:** the bell sets `wake_at`, and the task shows as For Awareness (out of the Action Needed count, still visible). When the wake time passes, `wake_at` clears and the task returns to Action Needed on its own. Without rule 2, a punted task would keep showing as Action Needed.

**Open Q6 / Q10:** how Errands statuses map to this model, and whether waking changes `owner` or `status`.

### Vendor model

**Rule:** the entity is a *vendor*, not a category.

| Field | Meaning |
|---|---|
| `vendor.category` | A category slug. A category is a grouping, not something you use or favorite directly. |
| `vendor.usesPastYear` | Integer; 0 means the vendor has gone quiet. The only sort signal. |
| `category.favourite` | Boolean that drives the heart. Set on the category. |

- **Active tab:** categories with a vendor where `usesPastYear > 0`. The tile count is the sum of uses.
- **Inactive tab:** categories with a vendor where `usesPastYear = 0`. No count shown.
- A category appears on **both** tabs when it has vendors on both sides. A plumber you call monthly and one you haven't used since 2024 are two vendors.
- **Open Q10:** whether favorites belong to the vendor or the category.

---

## 7. Open design questions

From ART-2026-003. None has a recorded answer.

- **Q1 · Typography scope.** The shell labels 32px "greeting only" and lists seven sizes. Errands uses 32px for headlines and 36/300/44 for count tiles, and older guidance says five sizes. Which scale and role limits apply?
- **Q2 · Surface scope.** The spec says pure white is composer-only, but board cards, service tiles and the search bar all use it. Which components may use `--color-surface`?
- **Q3 · Icon exceptions.** Spec I says 20px with no exceptions; Services adds 28px category icons, and brand marks have their own sizes. Should the rule distinguish UI icons (20), category icons (28) and brand marks?
- **Q4 · Toolbar and catalogue versions.** The earlier Services spec has no search, a Find composer and 12 categories. The later one has search on all tabs, chat instead of add on Find, and 24 categories. Which governs?
- **Q5 · Vertical rhythm.** The shared rule is 188px. Archive copy says 113px and 212px, and Errands measures a 49px ribbon plus custom stacks. Which are intended exceptions, and which are errors?
- **Q6 · Errands status and attention.** Errands shows In progress, Action needed, Scheduled and Done. To Do stores four statuses and derives attention. Does Errands share the To Do model, and what counts as Requested?
- **Q7 · Enable, request and skip.** What follows Enable Home Visits and Request errand? Does Skip Visit cancel one visit, defer its errands or change the recurring schedule? What confirmation, success, undo and failure states apply?
- **Q8 · Counts, list controls and ordering.** Do the count tiles filter the list? How are counts, sorting, ties, dates and timezones defined? What do the crossed-calendar, filter and search icons open? When do row controls appear, and how do they work with the keyboard?
- **Q9 · Home-visit operations.** Is the weekly cadence fixed? Is "inside the front door by 9am" a confirmed rule? What eligibility, pricing, instructions, receipts and cash-handling constraints apply?
- **Q10 · Favorite and model precision.** `--color-favourite` is referenced but doesn't exist. The prose favorites vendors, but the field is `category.favourite`. Does waking a snoozed task change its owner or status, or only clear `wake_at`?
- **Q11 · Calendar edge cases.** How are six-week months, overlapping events, all-day events, very short events and "+N more" overflow handled? Is the toolbar filter shown in the example supported?
- **Q12 · Missing states.** Nothing yet covers narrow layouts, long or translated text, loading and retry, empty filters, absent visits, keyboard focus, screen-reader names, error recovery or cross-channel updates. Which should be designed next?
- **Q13 · Sign-in, text fields and buttons** (raised while building, not from ART-2026-003). The system has no sign-in page, no text field outside the composer and search bar, no button, and no focus treatment. Slice 0 needed all four, so it built them from existing tokens rather than inventing colors:
  - **Field:** follows the search bar — 36px, `--color-surface`, 1px `--color-line`, `radius-md`, `--text-base`, placeholder in `--color-muted`.
  - **Primary button:** `--color-evergreen` fill, `--color-on-evergreen` label in `--text-label`, 40px tall (the nav item height), `radius-md`.
  - **Focus:** 2px `--color-evergreen` outline, offset 2px.
  - **Button hover:** opacity to 90%, so no second green enters the palette. Disabled is 60%.

  Are these right, and should they become named components with their own tokens?

**Not represented anywhere yet:** sign-in and the authenticated shell's utility bar, activation eligibility and pricing, the errand request form, edit/remove/reminder outcomes, skip confirmation, empty filters, loading and errors, narrow layouts, keyboard and focus, long content, receipt and cash handling, timezone/cutoff/access rules, and cross-channel sync.
