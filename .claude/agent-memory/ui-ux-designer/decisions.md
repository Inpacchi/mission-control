# Settled Design Decisions

## Header Project Name Size
**Decision:** Project name in 48px header should be `text.lg` (17px), weight 600, NOT `text.2xl` (24px).
**Rationale:** At `2xl`, the project name outcompetes the stats bar numbers (`xl`) in visual weight. The stats are the operational information; the project name is orientation. The stats must be the primary element in the header. Current implementation (Dashboard.tsx:153 and ProjectSwitcher.tsx:97) uses `fontSize="2xl"` — this is a bug vs. the spec's hierarchy intent.
**Tokens:** `fontSize="lg"` (17px per theme scale), `fontWeight={600}`, `color="text.primary"`

## Primary Button Color
**Decision:** Never use Chakra `colorScheme="blue"` for primary buttons. Always use explicit tokens.
**Rationale:** Chakra's default blue (`#3182CE`) is more saturated and brighter than the spec's `accent.blue.500` (`#2F74D0`). Using `colorScheme` bypasses the token system and injects a color that does not belong to the Mission Control palette.
**Tokens:** `bg="accent.blue.500"`, `color="text.primary"`, `_hover={{ bg: 'accent.blue.400' }}`, `_active={{ bg: 'accent.blue.700' }}`, `borderRadius="md"`, padding `8px 16px`

## Column Body Background
**Decision:** Kanban column bodies must have `bg="bg.surface"` (not transparent) to maintain the lane metaphor.
**Rationale:** Without a distinct background on the column body, empty columns visually dissolve into the board background (`bg.base`). The lane metaphor — which is the core organizational pattern — collapses. `bg.surface` (`#1C2333`) is one step lighter than `bg.base` (`#13181F`), creating the required layer separation.

## Timeline Expand Animation
**Decision:** Use CSS grid row trick, NOT `height: auto` toggle.
**Rationale:** `height: auto` cannot be CSS-transitioned. The spec explicitly requires `grid-template-rows: 0fr → 1fr` with `overflow: hidden` on the inner wrapper. Easing: open `250ms cubic-bezier(0, 0, 0.2, 1)`, close `200ms cubic-bezier(0.4, 0, 1, 1)`.
**Current bug:** DeliverableCard.tsx line 68 uses `h={expanded ? 'auto' : '88px'}` — this is wrong.

## Supplementary Row — Full Spec Complete (2026-03-16 addendum)
**Decision:** Horizontal accordion strip. Three panels in a full-width strip between kanban and terminal. Only one panel can be expanded at a time (accordion, not independent). Expansion pushes kanban up — does not overlay. Max expanded height per panel: 280px.
**Strip styling:** `bg="bg.surface"`, `borderTop` and `borderBottom` only (`1px solid border.subtle`). No outer border-radius — it is a full-width zone.
**Header per panel:** 40px, icon + label + count badge + chevron. Icons: Chronicle = Archive violet, Ad Hoc = GitBranch amber, Sessions = History blue.
**Count badge:** Pill style with `{accentColor}1A` bg and `{accentColor}33` border. Only shown when count > 0. Zero-count shown as plain `text.xs text.muted` text, not pill.
**Expand animation:** CSS grid row trick same as timeline. 250ms decelerate open, 200ms accelerate close.
**Outer borders on individual components REMOVED:** ChronicleBrowser, AdHocTracker, SessionHistory no longer have outer `border="1px solid border.subtle"`.

## Card Information Density — Increased (2026-03-16 addendum)
**Decision:** Card collapsed height increases from 88px to 108px. Name now wraps to 2 lines (line-clamp: 2) instead of truncating. Third row added: artifact indicator pills (SPEC / PLAN / RESULT).
**Rationale:** Names were truncating at ~15 chars ("Mission Contr..."). The 2-line name with line-clamp and the 20px height increase solves this without widening columns.
**Artifact pills:** 10px font, padding 1px 5px, colored to match status badge colors for each doc type. Only rendered when the path exists. Row omitted entirely when no paths exist (card reverts to ~88px).
**Skill actions indicator:** Always-visible Play icon (11px, text.muted) in the artifact row when hover actions are available. Replaced by full action buttons on hover.

## Card Border Strategy — Perimeter Border Removed (2026-03-16 addendum)
**Decision:** DeliverableCard perimeter border (`border="1px solid border.subtle"`) is REMOVED. Cards are defined by bg.elevated, shadow.sm, and the left accent bar. No perimeter border.
**Selected state:** Uses `shadow.selected` token (`0 0 0 1px #2F74D0, 0 4px 12px rgba(0,0,0,0.4)`) via box-shadow — not border. This avoids layout shift and the box-shadow works alongside borderLeft.
**New shadow token:** `shadow.selected` must be added to `src/ui/theme/index.ts`.
**Rationale:** Perimeter border was adding visual noise. bg.elevated on bg.surface column body creates sufficient containment without outlining every card.

## Container Border Strategy — Surfaces Define Themselves via Background (2026-03-16)
**Decision:** Component containers do not get perimeter borders. Borders serve two roles only: (1) identity signals (colored accent bars) and (2) zone separators (1px lines between functional layout areas). Supplementary panel components removed their individual outer borders per the unified strategy.

## Preview Panel — Hero Treatment (2026-03-16 addendum)
**Decision:** Panel width changes from fixed 380px to `clamp(480px, 60%, 720px)`. Header height increases from 48px to 56px. Body padding changes to 32px top/bottom, 48px left/right, with `max-width: 600px; margin: 0 auto` on content.
**Markdown typography scaled up:** h1 to text.3xl (30px), h2 to text.2xl (24px), p line-height to 1.7, blockquote gets bg.canvas tinted background. See Section E of the addendum spec.
**Animation:** Entry 280ms cubic-bezier(0,0,0.2,1), exit 200ms cubic-bezier(0.4,0,1,1). Kanban width transition must match exactly.
**Shadow:** `-8px 0 40px rgba(0,0,0,0.6), -2px 0 8px rgba(0,0,0,0.4)` — stronger than previous to match the wider panel's visual weight.
**New shadow token:** `shadow.panel` must be added to `src/ui/theme/index.ts`.

## Empty Column CTAs (2026-03-16 addendum)
**Decision:** Ghost dashed-border CTA button added to empty column state for Idea, Spec, Plan, In Progress, Review columns. Complete and Blocked columns do NOT get CTAs (terminal states or unimplemented dispatch).
**Style:** `border: 1px dashed {columnColor}40`, transparent bg, column-colored icon + text at 70% opacity. Hover: border to 60% opacity, 5% fill, text/icon to 100%.
**Position:** Below the existing icon + label, with 10px gap. Entire group remains vertically centered in column body.
