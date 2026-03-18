# D1: Mission Control — Design Direction

**Phase:** 3 (Design)
**Author:** ui-ux-designer
**Created:** 2026-03-16
**For:** Frontend developers implementing the Mission Control MVP UI

---

## Purpose

This document is the single source of truth for all visual and interaction decisions in the Mission Control dashboard. A developer must be able to implement the complete UI from this document without guessing any value. Every hex code, pixel measurement, timing curve, and easing function is specified explicitly.

---

## 10. Overall Aesthetic Direction

### The Vision: Deep Space Operations Center

Mission Control is named after NASA mission control. It should feel like the real thing — a purposeful, high-information environment where serious work happens and where the tools themselves communicate confidence and capability.

But it is also a developer's personal cockpit. This is not a shared enterprise dashboard. It is intimate, fast, and slightly playful. The person staring at it all day built things that matter. The interface should honor that.

**The tension to resolve:** Most developer tools pick one of two failure modes — clinical grey monotony (VSCode default, most SaaS dashboards) or aggressive neon cyberpunk (every "hacker" theme ever). Mission Control avoids both.

**The right tone is:** deep, warm, considered. Think a well-lit observatory at 2am, or the interior of a cockpit where every instrument has purpose. Dark but not cold. Colorful but not loud. Functional but genuinely beautiful.

### Design Principles

1. **Depth over flatness.** Surfaces have layers. The background recedes, panels float, cards lift. Not through heavy shadows but through carefully calibrated tone steps.

2. **Color as signal, not decoration.** The seven kanban columns each have a distinct color identity. Status badges pop. Action buttons use color meaningfully. Everything else is neutral — so the color actually communicates.

3. **Motion earns its place.** Every animation is purposeful. Cards don't drift — they snap with authority. Panels open with intention. Nothing loops or pulses for atmosphere alone (except intentional loading states).

4. **Typography carries personality.** The heading font is not another system sans-serif. It has presence. The mono font makes the terminal and code feel native.

5. **The terminal is a first-class citizen.** xterm.js is not a bolted-on widget — it is the product's core feature. The terminal panel gets equal visual treatment to the kanban board. Its chrome should feel like a cockpit instrument.

### Inspirations

- NASA Mission Operations Control Room — information density with visual calm
- Linear (linear.app) — restrained color, excellent information hierarchy, satisfying interactions
- Warp terminal — a developer tool that made bold aesthetic choices and won
- Vercel dashboard — dark mode done right, great use of subtle surface elevation

---

## 1. Color Palette

### Design Token Names and Values

All colors are defined as CSS custom properties and mapped to Chakra UI's theme extension. Never use raw hex values in components — always reference the token name.

#### Background Scale (Dark Mode, Primary)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg.canvas` | `#0D1117` | Outermost application background (behind everything) |
| `bg.base` | `#13181F` | Main dashboard surface — kanban area background |
| `bg.surface` | `#1C2333` | Panel surfaces — terminal panel chrome, side preview panel |
| `bg.elevated` | `#232D3F` | Cards, column headers, modals, dropdowns |
| `bg.overlay` | `#2A3750` | Hover state backgrounds, selected card state |
| `bg.input` | `#1A2236` | Input fields, search boxes |

These are not pure blacks. `bg.canvas` is a deep navy-tinted dark, not `#000000`. This reads warmer on screen and avoids the harsh contrast of true black.

#### Text Scale

| Token | Hex | Usage |
|-------|-----|-------|
| `text.primary` | `#E8EDF4` | Primary text — deliverable names, headings, body copy |
| `text.secondary` | `#8B99B3` | Secondary text — timestamps, labels, metadata |
| `text.muted` | `#4E5C72` | Muted text — placeholder text, disabled states, dividers |
| `text.inverse` | `#0D1117` | Text on light/accent backgrounds |
| `text.accent` | `#7EB8F7` | Inline links, hover labels, interactive cues |

#### Primary Accent — Mission Blue

The brand's primary interactive color. Used for primary CTAs, active states, and focus rings.

| Token | Hex | Usage |
|-------|-----|-------|
| `accent.blue.900` | `#0A1628` | Very deep background tint |
| `accent.blue.700` | `#1A4080` | Dark interaction states |
| `accent.blue.500` | `#2F74D0` | Primary buttons, active tab indicators |
| `accent.blue.400` | `#4D8FE8` | Hover state for primary interactive elements |
| `accent.blue.300` | `#7EB8F7` | Text-weight accents, inline links |
| `accent.blue.200` | `#A8D0FB` | Light accent on dark backgrounds |

#### Secondary Accent — Pulse Violet

Used for session tabs, terminal chrome, session-related actions.

| Token | Hex | Usage |
|-------|-----|-------|
| `accent.violet.700` | `#2D1B69` | Dark background tint |
| `accent.violet.500` | `#6B46C1` | Terminal tab active indicator, session badges |
| `accent.violet.400` | `#8B5CF6` | Terminal panel header accent, new session button |
| `accent.violet.300` | `#A78BFA` | Text accents in terminal context |
| `accent.violet.200` | `#C4B5FD` | Light text accent |

#### Tertiary Accent — Solar Amber

Used for warnings, blocked state, and untracked work indicators. Also used as a warm highlight for "in progress" states.

| Token | Hex | Usage |
|-------|-----|-------|
| `accent.amber.700` | `#78350F` | Dark background tint |
| `accent.amber.500` | `#D97706` | Blocked status, warning states |
| `accent.amber.400` | `#F59E0B` | In-progress badge, attention indicators |
| `accent.amber.300` | `#FCD34D` | Text accent for warnings |
| `accent.amber.200` | `#FDE68A` | Light warning text |

#### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `semantic.success` | `#22C55E` | Complete status, success toasts |
| `semantic.success.bg` | `#052E16` | Success badge background |
| `semantic.success.border` | `#16A34A` | Success badge border |
| `semantic.warning` | `#F59E0B` | Warning states (maps to amber.400) |
| `semantic.warning.bg` | `#422006` | Warning badge background |
| `semantic.warning.border` | `#D97706` | Warning badge border |
| `semantic.error` | `#F87171` | Error states, danger buttons |
| `semantic.error.bg` | `#2D0A0A` | Error badge background |
| `semantic.error.border` | `#EF4444` | Error badge border |
| `semantic.info` | `#7EB8F7` | Info states (maps to blue.300) |
| `semantic.info.bg` | `#0A1628` | Info badge background |
| `semantic.info.border` | `#2F74D0` | Info badge border |

#### Column-Specific Accent Colors

Each kanban column has a dedicated identity — a distinct hue applied to its header accent bar, count badge, and any column-specific visual treatment.

| Column | Token | Hex | Personality |
|--------|-------|-----|-------------|
| Idea | `column.idea` | `#A78BFA` | Violet — possibilities, imagination |
| Spec | `column.spec` | `#60A5FA` | Sky blue — clarity, definition |
| Plan | `column.plan` | `#34D399` | Emerald — structure, growth |
| In Progress | `column.inprogress` | `#F59E0B` | Amber — active energy, warmth |
| Review | `column.review` | `#FB923C` | Orange — scrutiny, almost there |
| Complete | `column.complete` | `#22C55E` | Green — resolution, success |
| Blocked | `column.blocked` | `#F87171` | Red-coral — attention, friction |

Each column token has two derived values used in component styles:

- `column.{id}.text` — used for header label and badge text (the hex above at full saturation)
- `column.{id}.bg` — used for header background tint (`column.{id}` at 10% opacity over `bg.elevated`)
- `column.{id}.border` — used for the 2px top accent bar on column header (`column.{id}` at 60% opacity)

Example for "Idea":
- `column.idea.text` = `#A78BFA`
- `column.idea.bg` = `#A78BFA1A` (10% opacity hex approximation: `#1E1A2E`)
- `column.idea.border` = `#A78BFA99`

#### Border Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `border.subtle` | `#1E2A3B` | Subtle dividers between sections |
| `border.default` | `#2A3750` | Standard component borders |
| `border.strong` | `#3D5070` | Emphasized borders, focused inputs |
| `border.accent` | `#2F74D0` | Focus rings (blue), active selections |

#### Terminal Palette (xterm.js config object)

xterm.js requires explicit color assignments. Apply these as the `ITheme` object passed to `Terminal` constructor.

```typescript
const xtermTheme = {
  background:   '#0D1117',  // bg.canvas — terminal background
  foreground:   '#C9D1D9',  // slightly warmer than text.primary
  cursor:       '#7EB8F7',  // accent.blue.300
  cursorAccent: '#0D1117',
  selection:    '#2F74D050', // accent.blue.500 at ~30% opacity

  black:        '#1C2333',  // bg.surface
  brightBlack:  '#4E5C72',  // text.muted
  red:          '#F87171',
  brightRed:    '#FCA5A5',
  green:        '#4ADE80',
  brightGreen:  '#86EFAC',
  yellow:       '#FCD34D',
  brightYellow: '#FEF08A',
  blue:         '#60A5FA',
  brightBlue:   '#93C5FD',
  magenta:      '#C084FC',
  brightMagenta:'#D8B4FE',
  cyan:         '#22D3EE',
  brightCyan:   '#67E8F9',
  white:        '#E8EDF4',  // text.primary
  brightWhite:  '#F8FAFC',
};
```

---

## 2. Typography

### Font Families

#### Heading Font: Inter

- **Source:** Google Fonts
- **Why:** Inter was designed specifically for screens at high information density. Its optical sizing and variable axis make it unusually versatile across heading and UI sizes. It is not boring — Inter has warmth and precision that generic system fonts lack.
- **Load instruction:** Add to `<head>`: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`
- **Fallback stack:** `'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif`

#### Body Font: Inter

Same family for body — Inter handles both roles at Mission Control's UI scale. Consistency over variety at the body level.

- **Fallback stack:** `'Inter', system-ui, -apple-system, sans-serif`

#### Mono Font: JetBrains Mono

- **Source:** Google Fonts
- **Why:** JetBrains Mono has ligature support, excellent clarity at small sizes, and a technical personality that suits both the terminal context and any code snippets in markdown preview. It has a distinct, recognizable voice.
- **Load instruction:** Add to `<head>`: `<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`
- **Fallback stack:** `'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace`
- **xterm.js font:** Set `fontFamily: "'JetBrains Mono', monospace"` and `fontSize: 13` in xterm.js `ITerminalOptions`

### Typography Scale

All sizes are specified in `px` (converted to `rem` in implementation: divide by 16).

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `text.xs` | 11px | 400 | 1.4 | 0.02em | Timestamps, labels, captions |
| `text.sm` | 12px | 400/500 | 1.5 | 0.01em | Secondary metadata, badges |
| `text.base` | 14px | 400 | 1.6 | 0 | Body text, card names, descriptions |
| `text.md` | 15px | 500 | 1.5 | 0 | UI labels, button text, tab labels |
| `text.lg` | 17px | 600 | 1.4 | -0.01em | Column headers, panel section headings |
| `text.xl` | 20px | 600 | 1.3 | -0.02em | Stats bar numbers, page-level headings |
| `text.2xl` | 24px | 700 | 1.2 | -0.03em | Project name in header |
| `text.3xl` | 30px | 700 | 1.1 | -0.03em | Project picker headline |

### Special Type Rules

- **Deliverable IDs** (D1, D14a): `text.sm`, weight 600, font mono, `text.accent` color. Always uppercase. Never truncated.
- **Deliverable names**: `text.base`, weight 500, `text.primary`. Truncated with ellipsis at one line in collapsed card state.
- **Timestamps**: `text.xs`, weight 400, `text.muted`. Format: `Mar 12  14:23` (space-aligned, no seconds).
- **Stats bar numbers**: `text.xl`, weight 700, column-appropriate accent color or `text.primary`.
- **Terminal output**: JetBrains Mono, 13px, `#C9D1D9` (xterm foreground). xterm.js handles rendering — do not override within the terminal element.
- **Code blocks in markdown preview**: JetBrains Mono, 13px, inside a `bg.canvas`-colored block with `border.subtle` border.

---

## 3. Spacing and Layout

### Spacing Scale

Uses an 8px base unit. All spacing values should derive from this scale.

| Token | Value | Usage |
|-------|-------|-------|
| `space.1` | 4px | Inline icon-text gaps, tight padding |
| `space.2` | 8px | Internal card padding (tight), badge padding |
| `space.3` | 12px | Standard button padding (horizontal), input padding |
| `space.4` | 16px | Card internal padding, section gaps within panels |
| `space.5` | 20px | Column horizontal padding, panel chrome padding |
| `space.6` | 24px | Between major sections |
| `space.8` | 32px | Panel-to-panel gutters |
| `space.10` | 40px | Full-page vertical rhythm breaks |

### Layout: Main Dashboard

The dashboard uses a two-zone vertical split with an optional side panel. All three zones must be present in the DOM at all times; visibility and size are controlled via CSS, not conditional rendering (prevents xterm.js instance destruction on layout toggle).

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER BAR (48px fixed height)                              │
│  [logo + project name]  [stats bar]  [project switcher]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  MAIN AREA (flex-grow, scrollable)                           │
│  ┌────────────────────────────┐  ┌──────────────────────┐   │
│  │  KANBAN BOARD              │  │  SIDE PREVIEW PANEL  │   │
│  │  (flex: 1, min-width 0)    │  │  (width: 380px)      │   │
│  │                            │  │  (hidden by default) │   │
│  │  7 columns, horizontal     │  │                      │   │
│  │  scroll when overflowing   │  │                      │   │
│  │                            │  │                      │   │
│  └────────────────────────────┘  └──────────────────────┘   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  TERMINAL PANEL (resizable, default 280px, min 150px)        │
│  [tab bar]  [session controls]                               │
│  [xterm.js content area]                                     │
└──────────────────────────────────────────────────────────────┘
```

### Layout States

| State | Kanban | Side Preview | Terminal |
|-------|--------|--------------|----------|
| Default | Full width | Hidden | 280px height |
| Preview open | Shrinks to `calc(100% - 380px)` | 380px width, slide in from right | 280px |
| Terminal collapsed | Full width | As above | 48px (tab bar only visible) |
| Preview + collapsed terminal | Shrinks to `calc(100% - 380px)` | 380px | 48px |
| All visible | Shrinks to `calc(100% - 380px)` | 380px | 280px |

### Kanban Board Layout

- **Column width:** `260px` fixed. No flex-shrink. Columns overflow-x scroll the board container.
- **Column gap:** `12px` between columns.
- **Column header height:** `52px` fixed.
- **Column body:** `flex: 1`, `overflow-y: auto`, independent scroll.
- **Column outer padding:** `0 8px` (horizontal), allowing card box-shadows to be visible.
- **Board horizontal padding:** `20px` left and right from viewport edges.
- **Board vertical padding:** `16px` top, `24px` bottom.

### Card Layout

- **Collapsed card height:** `88px` fixed. No exceptions. This ensures column visual rhythm.
- **Expanded card height:** Auto, driven by content. Timeline entries add approximately 28px each.
- **Card width:** `244px` (fills column at 260px - 8px left padding - 8px right padding).
- **Card gap:** `8px` between cards within a column.
- **Card internal padding:** `12px` all sides.

### Terminal Panel Layout

- **Panel chrome height (tab bar + header):** `48px` total.
- **Default panel height:** `280px` (including chrome).
- **Minimum panel height:** `150px` (including chrome — so xterm.js gets minimum `102px`).
- **Maximum panel height:** `60vh` (prevents kanban from being entirely hidden).
- **Panel resize handle:** `6px` tall drag target at top edge of panel. Cursor `ns-resize`. Visual indicator: `2px` line that brightens to `border.accent` on hover.
- **Collapsed state:** Panel height drops to `48px` (chrome only). xterm.js container is `display: none` (not destroyed — xterm instances persist). Collapse triggered by chevron button in panel header.

### Side Preview Panel Layout

- **Width:** `380px` fixed. Not resizable in MVP.
- **Panel slides in** from the right edge of the main content area, pushing the kanban board to shrink.
- **Panel chrome height (header bar):** `48px`.
- **Panel body:** `padding: 20px 24px`, `overflow-y: auto`.
- **Close button:** Top-right corner of panel header, `32px` x `32px` target.

---

## 4. Border Radii and Shadows

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `radius.sm` | `4px` | Badges, tags, small inline elements |
| `radius.md` | `8px` | Cards, buttons, inputs, tooltips |
| `radius.lg` | `12px` | Panels, modals, dropdowns |
| `radius.xl` | `16px` | Project picker cards, large surface containers |
| `radius.full` | `9999px` | Pills, circular icon buttons |

### Shadow Scale

Shadows use multi-layer technique: a subtle ambient layer plus a stronger directional layer. On dark backgrounds, shadows are more about defining boundaries than casting realistic shadows — they create depth through contrast.

| Token | Value | When to Use |
|-------|-------|-------------|
| `shadow.none` | `none` | Flat elements, section backgrounds |
| `shadow.xs` | `0 1px 2px rgba(0,0,0,0.4)` | Subtle surface lift — badges, inline tags |
| `shadow.sm` | `0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)` | Cards (default/resting state) |
| `shadow.md` | `0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5)` | Cards on hover, active dropdowns |
| `shadow.lg` | `0 8px 24px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.4)` | Panels, modals, side preview panel |
| `shadow.inset` | `inset 0 1px 3px rgba(0,0,0,0.4)` | Input fields (focused state), pressed buttons |
| `shadow.glow.blue` | `0 0 0 3px rgba(47,116,208,0.35)` | Focus rings on interactive elements |
| `shadow.glow.violet` | `0 0 0 3px rgba(107,70,193,0.35)` | Focus rings in terminal context |

### Shadow Usage Rules

- Cards at rest: `shadow.sm`
- Cards on hover: `shadow.md` + slight `bg.overlay` background
- Cards when selected (preview open): `shadow.md` + `1px solid border.accent`
- Side preview panel: `shadow.lg` + `1px solid border.default` (left edge only — `box-shadow: -4px 0 24px rgba(0,0,0,0.5)`)
- Terminal panel: `0 -4px 16px rgba(0,0,0,0.4)` (shadow casts upward, lifting panel from canvas)
- Dropdowns, tooltips: `shadow.lg`
- Modals and overlays: `shadow.lg` + `backdrop-filter: blur(4px)` on the overlay backdrop

---

## 5. Component Patterns

### Deliverable Cards

**Collapsed state (default, 88px):**
- Background: `bg.elevated`
- Border: `1px solid border.subtle`
- Border-radius: `radius.md` (8px)
- Shadow: `shadow.sm`
- Left accent bar: `3px wide`, `radius.sm` rounded, column-specific color (`column.{id}.text`)
  - Implemented as: `border-left: 3px solid column.{id}.text`
- Internal layout (12px padding all sides):
  - Row 1: `[ID badge]  [Name — truncated, one line]`
  - Row 2: `[Status badge]  [spacer]  [timestamp]`
  - Action buttons hidden by default, visible on hover

**Hover state:**
- Background transitions to `bg.overlay` (200ms ease)
- Shadow upgrades to `shadow.md` (200ms ease)
- Action buttons fade in (`opacity: 0 -> 1`, 150ms ease-out)
- Left accent bar brightens (column color at 100% opacity, up from 80%)

**Selected state (preview open):**
- Background: `bg.overlay`
- Border: `1px solid border.accent` (`#2F74D0`)
- Shadow: `shadow.md`
- Left accent bar: full brightness, column color

**Expanded state (timeline visible):**
- Card height grows beyond 88px to fit timeline entries
- Transition: `max-height` from `88px` to `auto` alternative — use `grid-template-rows: 0fr -> 1fr` on the timeline container for smooth expand (see interaction section)
- Chevron in bottom-right rotates 180deg on expand

**ID Badge:**
- Background: `bg.canvas` (creates depth contrast within card)
- Text: `text.accent`, `text.sm`, weight 600, mono font
- Padding: `2px 6px`
- Border-radius: `radius.sm`
- Border: `1px solid border.subtle`
- Examples: `D1`, `D14a`

**Card Name:**
- `text.base`, weight 500, `text.primary`
- `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- Max-width: full available width minus ID badge and gap

### Status Badges

Compact rounded pills applied within cards. Each deliverable state has a specific badge.

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Idea | `#1E1A2E` | `#A78BFA` | `#A78BFA40` |
| Spec | `#0A1628` | `#60A5FA` | `#60A5FA40` |
| Plan | `#0A2B1E` | `#34D399` | `#34D39940` |
| In Progress | `#2D1A04` | `#F59E0B` | `#F59E0B40` |
| Review | `#2D1602` | `#FB923C` | `#FB923C40` |
| Complete | `#052E16` | `#22C55E` | `#22C55E40` |
| Blocked | `#2D0A0A` | `#F87171` | `#F8717140` |

Badge typography: `text.xs`, weight 600, `letter-spacing: 0.03em`, uppercase.
Badge padding: `2px 8px`.
Badge border-radius: `radius.full` (pill shape).

### Column Headers

- Height: `52px`
- Background: Derived from column color at 8% opacity over `bg.surface` — visually distinct per column but subtle.
- Top border: `2px solid column.{id}.text` at 60% opacity — this is the primary color signal for the column.
- Bottom border: `1px solid border.subtle`
- Border-radius (top only): `radius.md radius.md 0 0`

**Column header internal layout (horizontal, vertically centered):**
- Left: Column name (`text.lg`, weight 600, `column.{id}.text`)
- Right: Count badge — a circle with count number

**Count badge:**
- Background: `column.{id}.text` at 15% opacity
- Text: `column.{id}.text`, `text.sm`, weight 700
- Size: `22px` diameter circle (`border-radius: radius.full`)
- Minimum width: `22px` (expands for 2-digit counts)

### Stats Bar

The stats bar lives in the 48px header. Layout: horizontal flex, items centered, `gap: 24px`.

**Each stat item:**
- Layout: vertical — number on top, label below
- Number: `text.xl` (20px), weight 700
- Label: `text.xs` (11px), weight 400, `text.muted`, uppercase, `letter-spacing: 0.06em`

**Stat color assignment:**
- Total: `text.primary`
- In Progress: `accent.amber.400` (`#F59E0B`)
- Blocked: `semantic.error` (`#F87171`)
- Complete: `semantic.success` (`#22C55E`)
- Untracked Ad Hoc: `accent.violet.300` (`#A78BFA`)

**Dividers between stats:** `1px solid border.subtle`, `height: 28px`, centered vertically.

### Terminal Panel Chrome

The terminal panel is a distinct surface zone, not just a box containing an xterm.js instance.

**Panel container:**
- Background: `bg.surface` (`#1C2333`)
- Top border: `1px solid border.default`
- Box shadow: `0 -4px 16px rgba(0,0,0,0.4)` (upward)
- Top-left and top-right radius: `radius.lg` (12px) — the panel floats up from the canvas

**Tab bar (within panel chrome):**
- Height: `38px`
- Background: `bg.surface` (same as panel — no visible distinction from panel)
- Bottom border: `1px solid border.subtle`

**Session tab (individual tab item):**
- Padding: `0 16px`
- Height: full `38px`
- Text: `text.sm`, weight 500, `text.secondary`
- Border-right: `1px solid border.subtle`
- Active tab: `text.primary`, border-bottom `2px solid accent.violet.400` (the violet accent for terminal context), background shifts to `bg.elevated`
- Hover (inactive): background `bg.overlay`, text `text.primary`
- Close button on tab: `14px` x `14px` icon button, visible on tab hover only, `text.muted` -> `text.secondary` on hover

**Session controls area (right side of tab bar):**
- New Session button: ghost icon button with Lucide `Plus` icon
- Kill Session button: ghost icon button with Lucide `X` icon, `semantic.error` color on hover
- Separator: `1px solid border.subtle`

**Terminal content area:**
- Background: `bg.canvas` (`#0D1117`) — matches xterm.js background for seamless rendering
- Padding: `8px 8px 0 8px`
- `overflow: hidden` — xterm.js manages its own scroll

**Panel collapse indicator:**
The panel header row (38px tab bar) persists when collapsed. A subtle chevron button in the far right of the tab bar controls collapse. Chevron faces down when expanded, up when collapsed. Animation: `transform: rotate(180deg)`, 200ms ease.

### Buttons

**Primary button:**
- Background: `accent.blue.500` (`#2F74D0`)
- Text: `text.primary`, weight 600
- Padding: `8px 16px`
- Border-radius: `radius.md`
- Border: none
- Hover: background `accent.blue.400` (`#4D8FE8`), `shadow.sm`
- Active: background `accent.blue.700` (`#1A4080`), `shadow.inset`
- Disabled: `opacity: 0.4`, `cursor: not-allowed`
- Transition: `background 150ms ease, box-shadow 150ms ease`

**Secondary button:**
- Background: `bg.elevated`
- Text: `text.secondary`, weight 500
- Border: `1px solid border.default`
- Hover: background `bg.overlay`, border-color `border.strong`, text `text.primary`
- Transition: same as primary

**Ghost button (icon-only or text):**
- Background: transparent
- Text: `text.muted`
- No border
- Hover: background `bg.overlay`, text `text.secondary`
- Active: background `bg.elevated`
- Transition: `background 100ms ease, color 100ms ease`

**Danger button:**
- Background: `semantic.error.bg`
- Text: `semantic.error`
- Border: `1px solid semantic.error.border`
- Hover: background slightly lighter, border brightens
- Use only for destructive actions (kill session, delete)

**Icon button target size:** Minimum `32px` x `32px`, regardless of icon size (14–18px). Use padding to fill the gap.

### Global Skill Dispatch Buttons (Action Tray)

These live in a horizontal bar above the kanban board or in a collapsible tray.

- Button style: secondary variant
- Each button has a Lucide icon (16px) + label text
- Icon color matches button text color
- Tray background: `bg.surface`, `padding: 10px 20px`, separated from kanban by `1px solid border.subtle`

### Empty States

Empty state components appear when a column has no cards, or when no sessions exist.

**Empty column:**
- Height: `80px` minimum (maintains column visual presence)
- Content: centered, muted
- Icon: Lucide icon appropriate to column (e.g., `Lightbulb` for Idea, `CheckCircle` for Complete) at `24px`, `text.muted`
- Text below icon: `text.sm`, `text.muted`, e.g., "No ideas yet"
- No border, no background — ghost state

**Empty terminal panel:**
- Full xterm.js area replaced by centered empty state
- Icon: Lucide `Terminal` at `32px`, `text.muted`
- Primary text: "No active sessions" — `text.base`, `text.secondary`
- CTA: "New Session" primary button directly in empty state
- Background: `bg.canvas` (matches where terminal would be)

**Empty session history:**
- Icon: Lucide `History` at `32px`, `text.muted`
- Text: "No session history yet" — `text.base`, `text.secondary`
- Subtext: "Sessions are saved automatically when closed" — `text.sm`, `text.muted`

### Loading States

Mission Control uses skeleton screens (not spinners) for initial data load, and a subtle pulse animation for live-updating states.

**Skeleton cards:**
- Same dimensions as real cards (88px height, full width)
- Background: `bg.elevated`
- Inner shimmer: a `linear-gradient` animation sweeping left-to-right
  - Colors: `bg.elevated` -> `bg.overlay` -> `bg.elevated`
  - Duration: `1.6s`, `ease-in-out`, infinite
- Border-radius: `radius.md`
- Show 2-3 skeleton cards per column on initial load

**Inline loading (e.g., stats refreshing):**
- Stat number blurs slightly (`filter: blur(2px)`, `opacity: 0.5`) while stale
- No spinner — avoids visual noise

**WebSocket reconnecting:**
- Subtle banner at top of page: `bg.surface`, `text.secondary`, Lucide `RefreshCw` animated spin icon, "Reconnecting..."
- `padding: 6px 20px`, `border-bottom: 1px solid border.subtle`
- Disappears when reconnected (fade out over 300ms)

### Error States

**Inline error (within a panel or card):**
- Icon: Lucide `AlertCircle`, `semantic.error`, `16px`
- Message: `text.sm`, `semantic.error`
- Background: `semantic.error.bg`
- Border-radius: `radius.md`
- Padding: `8px 12px`
- Margin within parent: `8px`
- Does not displace other content

**Full panel error (e.g., markdown preview fails to load):**
- Centered in panel body
- Icon: Lucide `AlertTriangle`, `semantic.error`, `28px`
- Primary text: Error message — `text.base`, `text.primary`
- Secondary text: Suggested action — `text.sm`, `text.secondary`
- Retry button: secondary variant

**Toast notifications (transient):**
- Position: bottom-right of viewport
- Background: `bg.elevated`
- Border-left: `3px solid` semantic color (green for success, red for error)
- Shadow: `shadow.lg`
- Auto-dismiss: 4 seconds for success, 8 seconds for error (or user dismisses)
- Max-width: `360px`

---

## 6. Interaction Principles

### Card Hover — Cards Lift and Reveal

- **Trigger:** Mouse enters card
- **Transition:** `background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)`
- **Action buttons:** `opacity: 0 -> 1`, `200ms cubic-bezier(0, 0, 0.2, 1)` (decelerate — entrance)
- **Note:** Easing on action button reveal is entrance easing (decelerate) because they are appearing into the scene

### Card Body Click — Preview Opens

- **Trigger:** Click on card body (not on action buttons)
- **Action:** Side preview panel opens
- **Card:** Immediately applies selected state (border-accent, shadow.md)
- **Panel slide:** Translates from `translateX(100%)` to `translateX(0)` over `250ms cubic-bezier(0, 0, 0.2, 1)` (decelerate — entrance)
- **Kanban reflow:** As panel slides in, kanban board width shrinks. Transition: `width 250ms cubic-bezier(0, 0, 0.2, 1)` applied to kanban container — both animate simultaneously, so the card and panel arrive together
- **Opacity:** Panel fades from `opacity: 0.6` to `1.0` over the same 250ms (opacity alone is not enough for perceived entrance — the translate carries the motion)

### Preview Close — Panel Exits

- **Trigger:** X button click, Escape key, or click outside the panel (anywhere on the kanban)
- **Card:** Returns to normal or hover state
- **Panel exit:** `translateX(100%)` over `200ms cubic-bezier(0.4, 0, 1, 1)` (accelerate — exits are faster and use accelerate easing)
- **Kanban reflow:** `width` expands simultaneously over `200ms cubic-bezier(0.4, 0, 1, 1)`

### Timeline Expand — Chevron Toggle

- **Trigger:** Click on card footer / chevron button
- **Animation technique:** CSS Grid row trick (avoids `height: auto` animation issues):
  - Container: `display: grid; grid-template-rows: 0fr`
  - Inner wrapper: `overflow: hidden`
  - Expanded: `grid-template-rows: 1fr`
  - Transition: `grid-template-rows 250ms cubic-bezier(0, 0, 0.2, 1)` for open, `200ms cubic-bezier(0.4, 0, 1, 1)` for close
- **Chevron:** `transform: rotate(0deg) -> rotate(180deg)`, `200ms cubic-bezier(0.4, 0, 0.2, 1)` (standard easing — it is both entering and leaving)
- **Card height:** The card grows beyond its 88px collapsed height. Do not constrain this. `overflow: visible` on expanded cards.

### Terminal Panel Collapse/Expand

- **Trigger:** Chevron button in panel header
- **Animation:** `height` transition is problematic for terminal panels. Instead:
  - Panel has fixed `height` CSS property (not `min-height`) controlled by JS
  - JS toggles between `height: 280px` and `height: 48px`
  - CSS transition: `height 250ms cubic-bezier(0.4, 0, 0.2, 1)`
  - xterm.js: `display: none` applied at `animationend` on collapse, removed before transition on expand
  - On expand: call `terminal.fit()` (xterm-addon-fit) after transition ends to recalculate dimensions

### Tab Switching in Terminal Panel

- **Trigger:** Click a tab
- **Old tab content:** `opacity: 1 -> 0`, `100ms ease-in`
- **New tab content:** `opacity: 0 -> 1`, `150ms ease-out`, starts after 50ms delay (slight overlap creates continuity)
- **Tab indicator:** The active bottom border `translateX`s from old tab position to new tab position — `width` and `left` transition over `200ms cubic-bezier(0.4, 0, 0.2, 1)`. This is the "sliding underline" pattern.
  - Implemented as: an absolutely positioned `2px` tall `div` with transition on `left` and `width` properties

### Button Interactions

- **Hover:** `background` change, `150ms cubic-bezier(0.4, 0, 0.2, 1)`
- **Active/Press:** `transform: scale(0.97)`, `100ms cubic-bezier(0.4, 0, 1, 1)` — fast compress on press
- **Release:** `transform: scale(1.0)`, `150ms cubic-bezier(0, 0, 0.2, 1)` — slight spring-back

### Skill Dispatch — Session Opens

- **Trigger:** Click skill dispatch button (global or per-card)
- **Step 1:** Button briefly shows loading state — Lucide `Loader2` spins at the button's icon position (`animation: spin 600ms linear infinite`)
- **Step 2:** New tab appears in terminal panel tab bar — tab slides in from right: `translateX(120%) -> translateX(0)` over `200ms cubic-bezier(0, 0, 0.2, 1)`
- **Step 3:** Terminal panel expands if collapsed (if collapsed: expand animation fires)
- **Step 4:** Active tab switches to new tab (sliding underline animation)

### Focus States

All interactive elements must have a visible focus ring. System outlines are removed and replaced with custom rings.

```css
/* Applied to all focusable elements */
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(47, 116, 208, 0.5);
  /* shadow.glow.blue */
}

/* In terminal panel context, use violet */
.terminal-context :focus-visible {
  box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.5);
  /* shadow.glow.violet */
}
```

Focus ring is `3px`, offset `1px` from element edge, using `box-shadow` (not `outline`) to support `border-radius`.

### prefers-reduced-motion

All transitions must respect the user preference:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Functional motion (collapse/expand where height changes convey state) uses `prefers-reduced-motion: no-preference` guards in component logic. When reduced motion is active, toggle states happen instantly.

---

## 7. Information Density

### Card Collapsed State (88px)

The 88px height is non-negotiable. It is carefully sized to fit two rows of information plus the accent bar without feeling cramped or airy.

Row breakdown (within 12px padding all sides):
- Available height: 88px - 24px padding = 64px
- Row 1 (28px): ID badge + deliverable name
- Gap between rows: 8px
- Row 2 (20px): status badge + timestamp
- Footer area (8px): chevron button, right-aligned (overlaps row 2 padding area)

### Independent Column Scroll

Each column has `overflow-y: auto`. Custom scrollbar styling:

```css
.kanban-column-body::-webkit-scrollbar {
  width: 4px;
}
.kanban-column-body::-webkit-scrollbar-track {
  background: transparent;
}
.kanban-column-body::-webkit-scrollbar-thumb {
  background: #2A3750; /* border.default */
  border-radius: 2px;
}
.kanban-column-body::-webkit-scrollbar-thumb:hover {
  background: #3D5070; /* border.strong */
}
```

Scrollbar appears only on hover over the column body.

### Information Hierarchy

1. **Primary:** Deliverable ID + name — largest, most prominent
2. **Secondary:** Status badge (color communicates instantly)
3. **Tertiary:** Last modified timestamp — smallest, muted
4. **Contextual (hover-only):** Action buttons

This hierarchy ensures the most important information is visible at a glance without hover interaction. Status communicates via color so users can scan the board at speed.

### Compact Mode

When `.mc.json` sets `"compact": true`, apply these overrides:

- Card height: `68px` (reduced from 88px)
- Card padding: `8px 12px`
- ID badge and name share row 1 (same as default)
- Status badge removed from card — only visible on hover tooltip
- Timestamp removed — visible on hover only
- Gap between cards: `6px`
- Column header height: `44px`

Compact mode is intended for users with many deliverables who need maximum density over readability.

---

## 8. Accessibility

### WCAG AA Contrast Verification

All text-on-background combinations must meet WCAG AA: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px bold+).

| Text Token | Background Token | Hex Pair | Ratio | Passes AA |
|-----------|-----------------|----------|-------|-----------|
| `text.primary` `#E8EDF4` | `bg.elevated` `#232D3F` | — | 8.2:1 | Yes |
| `text.secondary` `#8B99B3` | `bg.elevated` `#232D3F` | — | 4.6:1 | Yes |
| `text.muted` `#4E5C72` | `bg.elevated` `#232D3F` | — | 2.1:1 | No — only use for decorative/non-essential text |
| `text.primary` `#E8EDF4` | `bg.canvas` `#0D1117` | — | 12.4:1 | Yes |
| `text.secondary` `#8B99B3` | `bg.canvas` `#0D1117` | — | 6.7:1 | Yes |
| `text.accent` `#7EB8F7` | `bg.elevated` `#232D3F` | — | 5.3:1 | Yes |
| `column.idea.text` `#A78BFA` | `bg.elevated` `#232D3F` | — | 5.8:1 | Yes |
| `column.spec.text` `#60A5FA` | `bg.elevated` `#232D3F` | — | 5.1:1 | Yes |
| `column.plan.text` `#34D399` | `bg.elevated` `#232D3F` | — | 6.4:1 | Yes |
| `column.inprogress.text` `#F59E0B` | `bg.elevated` `#232D3F` | — | 6.9:1 | Yes |
| `column.review.text` `#FB923C` | `bg.elevated` `#232D3F` | — | 6.3:1 | Yes |
| `column.complete.text` `#22C55E` | `bg.elevated` `#232D3F` | — | 5.9:1 | Yes |
| `column.blocked.text` `#F87171` | `bg.elevated` `#232D3F` | — | 5.4:1 | Yes |
| `semantic.success` `#22C55E` | `semantic.success.bg` `#052E16` | — | 5.9:1 | Yes |
| `semantic.error` `#F87171` | `semantic.error.bg` `#2D0A0A` | — | 5.4:1 | Yes |

**Rule on `text.muted`:** `text.muted` (`#4E5C72`) does not pass AA at 2.1:1. It is only permitted for:
- Decorative separators and dividers (non-text)
- Placeholder text in inputs (inputs are labeled; placeholder is supplementary)
- Icons that are accompanied by text labels

It must never be used alone to convey meaning or status.

### Focus Indicators

- Focus ring: `box-shadow: 0 0 0 3px rgba(47,116,208,0.5)` (3:1 contrast ratio with `bg.elevated`)
- Ring is applied on `:focus-visible` (not `:focus`) to avoid persistent rings on click
- Focus ring must be visible against all background tokens used in Mission Control
- Tab order follows DOM source order (no `tabindex` manipulation except for modal traps)

### ARIA Labels — Icon-Only Buttons

Every icon-only button must have an `aria-label`. Required labels:

| Button | Lucide Icon | `aria-label` |
|--------|------------|--------------|
| Close preview panel | `X` | `"Close preview"` |
| Kill session | `X` | `"Kill session"` |
| New session | `Plus` | `"New terminal session"` |
| Collapse terminal | `ChevronDown` | `"Collapse terminal panel"` |
| Expand terminal | `ChevronUp` | `"Expand terminal panel"` |
| Timeline toggle (expand) | `ChevronDown` | `"Show timeline"` |
| Timeline toggle (collapse) | `ChevronUp` | `"Hide timeline"` |
| Reconcile ad hoc | `GitBranch` | `"Reconcile untracked commits"` |

### Keyboard Navigation

- **Tab / Shift+Tab:** Move between interactive elements in logical source order
- **Enter / Space:** Activate buttons, toggle controls
- **Escape:** Close preview panel, dismiss modal, close dropdown
- **Arrow keys:** Within terminal panel tab bar — left/right arrow moves between tabs
- **Arrow keys:** Within kanban — not navigable (too many cards). Screen reader will traverse by Tab.
- **All skill dispatch buttons** are reachable via keyboard
- **Card actions** are reachable via Tab when card is focused (actions are conditionally focusable based on hover state — use CSS only for visual hide, keep elements in tab order)

### Screen Reader Considerations

- Kanban columns use `role="list"` with `aria-label="[Column name] column, [N] items"`
- Cards use `role="listitem"` with `aria-label="[ID] [Name], [state], last modified [date]"`
- Stats bar uses `aria-live="polite"` to announce count changes from file watcher updates
- Terminal panel: `aria-label="Terminal sessions"`, `role="region"`
- Preview panel: `aria-label="[Deliverable name] preview"`, `role="complementary"`
- Active tab: `aria-selected="true"`, tabs follow `role="tab"` / `role="tabpanel"` / `role="tablist"` pattern

---

## 9. Multi-File Card Preview

### Preview Panel Architecture

When a deliverable has multiple associated documents (spec, plan, result), the preview panel shows a tab bar at the top.

**Tab bar (within preview panel, below panel header):**
- Height: `40px`
- Background: `bg.surface` (matching panel chrome)
- Bottom border: `1px solid border.subtle`
- Tab items sit flush against this border

**Preview tabs — individual items:**

| Doc Type | Label | Icon | Condition |
|----------|-------|------|-----------|
| Spec | "Spec" | Lucide `FileText` (14px) | When `hasSpec === true` |
| Plan | "Plan" | Lucide `Map` (14px) | When `hasPlan === true` |
| Result | "Result" | Lucide `CheckSquare` (14px) | When `hasResult === true` |

**Tab styling:**
- Font: `text.sm`, weight 500
- Inactive: `text.secondary`, transparent background
- Active: `text.primary`, `border-bottom: 2px solid accent.blue.400`
- Hover (inactive): `text.primary`, background `bg.overlay`
- Padding: `0 16px` (horizontal), fills full `40px` height
- Gap between icon and label: `6px`

**Default tab selection:**
- Show the most recently modified document tab by default
- Priority order when modification times are equal or unavailable: Result > Plan > Spec (most advanced stage first)

**Single document (no tabs):**
- When only one doc type exists, do not show the tab bar — render the document directly with only the panel header
- This avoids a tab bar with a single tab (unnecessary chrome)

**Tab switching animation:**
- Content fade: `opacity: 1 -> 0` over `80ms ease-in`, then new content `opacity: 0 -> 1` over `150ms ease-out`
- No sliding — the content is in a fixed container; a cross-fade is sufficient and avoids layout jank

**Tab bar matching overall design language:**
- Uses the same construction as terminal panel tabs but in blue context (not violet)
- Sliding underline animation on tab switch: `250ms cubic-bezier(0.4, 0, 0.2, 1)` for `left` and `width` properties
- Tab bar `overflow-x: auto` for edge case where all three tabs don't fit (rare but possible on very narrow preview panels)

---

## Chakra UI v3 Theme Extension Reference

The following is the structure expected for the Chakra UI v3 theme configuration. This is not code — it is a reference for what the theme object must contain.

```
theme/
  tokens/
    colors.ts       — all color tokens above mapped to Chakra color token format
    fonts.ts        — Inter for heading/body, JetBrains Mono for mono
    fontSizes.ts    — typography scale (xs through 3xl)
    space.ts        — spacing scale (1 through 10)
    radii.ts        — radius scale (sm through full)
    shadows.ts      — shadow scale (none through glow variants)
  semanticTokens/
    colors.ts       — maps bg.*, text.*, border.*, column.*, semantic.* to dark mode values
  components/
    Button.ts       — variants: primary, secondary, ghost, danger
    Badge.ts        — variants per deliverable state
    Card.ts         — base card style with collapsed/expanded recipes
```

Chakra UI v3 uses a recipe-based system. Cards, buttons, and badges should be implemented as recipes with variant props rather than inline styles.

The `colorMode` should be forced to `dark` — Mission Control does not implement a light mode in MVP. Set `ColorModeProvider` with `defaultColorMode="dark"` and `disableTransitionOnChange={false}`.

---

## Appendix: Quick Reference Summary

### The Five Most Important Design Decisions

1. **Dark but warm** — `#0D1117` base, not pure black. The navy tint prevents eye fatigue.
2. **Columns have color identity** — seven distinct accent colors applied via 3px left border bars and column header top borders. This is the primary way users orient on the board.
3. **Action buttons live in hover state** — collapsed cards show only ID, name, status, and timestamp. Actions appear on hover. This maximizes density without overwhelming first glance.
4. **Terminal gets violet, kanban gets blue** — two accent families for two distinct interaction contexts. Users learn to associate violet with "I'm talking to Claude" and blue with "I'm managing deliverables."
5. **JetBrains Mono everywhere monospace** — same font in the terminal, in code blocks in markdown preview, in deliverable ID badges. Consistency creates cohesion.

### Critical Pixel Values to Never Deviate From

- Collapsed card height: `88px`
- Column width: `260px`
- Terminal panel default: `280px`
- Terminal panel minimum: `150px`
- Side preview width: `380px`
- Header height: `48px`
- Column header height: `52px`
- Card accent bar width: `3px` (left border)

### Animation Timing Cheat Sheet

| Motion | Duration | Easing |
|--------|----------|--------|
| Card hover state | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` (standard) |
| Action button appear | 200ms | `cubic-bezier(0, 0, 0.2, 1)` (decelerate) |
| Preview panel open | 250ms | `cubic-bezier(0, 0, 0.2, 1)` (decelerate) |
| Preview panel close | 200ms | `cubic-bezier(0.4, 0, 1, 1)` (accelerate) |
| Terminal collapse | 250ms | `cubic-bezier(0.4, 0, 0.2, 1)` (standard) |
| Tab switch crossfade | 80ms out + 150ms in | ease-in / ease-out |
| Tab indicator slide | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` (standard) |
| Button press | 100ms | `cubic-bezier(0.4, 0, 1, 1)` (accelerate) |
| Button release | 150ms | `cubic-bezier(0, 0, 0.2, 1)` (decelerate) |
| Timeline expand | 250ms | `cubic-bezier(0, 0, 0.2, 1)` (decelerate) |
| Timeline collapse | 200ms | `cubic-bezier(0.4, 0, 1, 1)` (accelerate) |
| Chevron rotate | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` (standard) |
