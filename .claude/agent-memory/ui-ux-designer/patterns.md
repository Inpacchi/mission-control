# Established UI Patterns for Mission Control

## Color Token System
- The theme at `src/ui/theme/index.ts` faithfully implements all tokens from the design spec.
- Never use raw hex values in components — always reference the token name.
- Column colors: `column.{id}` tokens exist for all 7 columns (idea, spec, plan, inprogress, review, complete, blocked).
- Status badge colors are duplicated in both theme tokens AND inline in DeliverableCard.tsx's `statusBadgeColors` record (acceptable — the token system can't be referenced inline in JS object literals easily with Chakra v3's approach).

## Column Identity System
Each column has three derived values:
- Header label + count badge text: the base column color hex at full saturation
- Header background tint: `column.{id}.bg` (dark tint approximating 10% opacity)
- Top accent border: `column.{id}.border` (60% opacity hex suffix `99`)
This three-layer treatment is the primary color signal for each lane.

## Card Anatomy (88px fixed height, collapsed)
Row 1: `[ID badge (mono, text.accent, bg.canvas bg)] [Name (text.base, text.primary, truncated)]`
Row 2: `[Status badge (pill, color-coded)] [spacer] [Timestamp (mono, xs, text.muted)] [Chevron (14px)]`
Left accent: `3px solid` column color
Hover: background → `bg.overlay`, shadow → `shadow.md`, action buttons fade in

## Status Badge Pattern
Pill shape (`borderRadius="full"`), `text.xs` 11px, weight 600, uppercase, `letter-spacing: 0.03em`
Padding: `2px 8px`. Colors are explicit hex triples (bg, text, border) per status.

## Button Hierarchy
- Primary: `bg.accent.blue.500`, explicit color props (never colorScheme)
- Secondary: `bg.elevated`, `border.default`, text `text.secondary`
- Ghost: transparent bg, `text.muted`, hover → `bg.overlay`
- Danger: `semantic.error.bg`, `semantic.error` text, `semantic.error.border` border
- All buttons: minimum 32px target size, `scale(0.97)` press animation via `useButtonPress` hook

## Terminal Context
- Terminal panel background: `bg.surface` (`#1C2333`)
- Terminal content area: `bg.canvas` (`#0D1117`) — matches xterm.js background
- Terminal accent color: violet (`accent.violet.*`) — distinct from kanban blue accents
- Tab active indicator: `2px solid accent.violet.400` (sliding underline pattern, GPU-accelerated via absolute position + left/width transition)
- Focus rings in terminal context: `shadow.glow.violet` (not blue)

## Animation Easing Vocabulary
- Entrance (things appearing): `cubic-bezier(0, 0, 0.2, 1)` — decelerate
- Exit (things leaving): `cubic-bezier(0.4, 0, 1, 1)` — accelerate
- Standard UI transitions: `cubic-bezier(0.4, 0, 0.2, 1)` — standard Material easing
- Fast micro-interactions: 100-150ms; Panel transitions: 200-250ms

## Font Usage
- JetBrains Mono: ID badges, timestamps, terminal output, code blocks, file paths
- Inter: everything else
- Both fonts are loaded via Google Fonts in `src/ui/index.html` (preconnect + display=swap)
