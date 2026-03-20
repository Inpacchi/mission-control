---
name: Board layout redesign — TCG upgrade
description: Settled design for the board view overhaul adding header strip, rarity glyphs, zone personality text, and doc indicators
type: project
---

## Settled Decisions

### 1. Header bar replaces Deck/Graveyard badge columns in collapsed layout (80-119 cols)
The `D[0]` and `G[0]` badges at 8 cols each were dead space. Replaced by a 1-row header bar showing project name and all four zone counts with TCG glyphs. Frees ~16 cols for Active/Review zones.

Format: `╾─ MISSION CONTROL ∷ project-name ──── ◈ D:0   ★ A:1   ◎ R:3   ✦ G:0 ─╼`

**Why:** Badge columns communicated only a count (zero signal most of the time) and blocked 16% of available width. Header bar carries the same info plus project context without cost.

**How to apply:** In collapsed layout (80-119), render `HeaderBar` component as the first row above zone columns. `zoneHeight = height - BOTTOM_BARS_HEIGHT - 1` (the extra 1 for the header row).

### 2. Rarity triple-signal on cards
Three simultaneous visual signals for rarity, replacing the current single signal (ID color only):
- Col 2 of card: rarity glyph (● ◆ ★ ✦ ⬡) in rarity color
- ID text color (unchanged from current)
- Border bar weight: │ for common/uncommon, ┃ for rare/epic, ║ for mythic

**Why:** Current design encodes rarity only in ID color, which is hard to scan down a list. Adding the glyph in a dedicated column makes rarity visible without reading the ID.

### 3. Zone glyphs (consistent vocabulary)
- Deck: ◈ (U+25C8)
- Active: ★ (U+2605)
- Review: ◎ (U+25CE)
- Graveyard: ✦ (U+2726)

Same glyphs used on: zone headers, header bar zone counts, bottom bar row 2.

### 4. Empty zone personality text
Replaces `— empty —` with zone-specific flavor:
- Deck: dim italic "draw pile empty"
- Active: dim italic "nothing in play"
- Review: dim italic "stack is clear"
- Graveyard: dim italic "none yet fallen"

### 5. Doc availability indicators on card row 2
`[S]` (blue), `[P]` (magenta), `[R]` (green) — rendered after status label on row 2, only when the corresponding doc path exists on the deliverable. Dim when unselected.

### 6. Separator character change
Card separators change from `─` (U+2500) to `╌` (U+254C, BOX DRAWINGS LIGHT DOUBLE DASH HORIZONTAL). Visually lighter, reduces noise between cards.

### 7. Bottom bar row 2 upgrade
Full zone names with glyphs: `★  MC   ◈ Deck:0   ★ Active:1   ◎ Review:3   ✦ Graveyard:0`

`⚔` (U+2694) excluded — confirmed double-width risk. Lead glyph is `★` or omitted.

### 8. Zellij-aware responsive breakpoints (D8 review decision)
The user runs Ghostty + Zellij as their daily environment. Quarter panels render at 40-50 columns.
The old 60-column hard cutoff ("too narrow") is replaced by a genuine 5-tier breakpoint model:

| Tier | Width range | Layout |
|---|---|---|
| Ultra-narrow | 28–49 | 1 col, Active + Review stacked, no flavor rows, abbreviated bottom bar, 1-row header |
| Narrow | 50–79 | 1 col, all 4 zones stacked, flavor rows present, full bottom bar, 2-row header |
| Collapsed | 80–119 | 2 center cols, Deck/Graveyard as badges, full bottom bar |
| Full | 120–159 | 4 cols, zone widths proportional |
| Wide | 160+ | 4 cols, center zones expand, Deck/Graveyard capped at max 20 cols each |

Absolute floor: 28 columns. The isTooNarrow check moves from `< 60` to `< 28`.

**Why:** Quarter-panel is a primary usage mode, not an edge case. The board must render useful information
at 40 columns — refusing to render breaks the tool in the user's most common multi-pane workflow.

### 9. Wide layout max-width cap (D8 review decision)
At widths above 160, Deck and Graveyard must be capped at 20 columns maximum.
Without a cap, the 12% proportional calculation expands side zones to 24+ columns at 200 cols,
leaving empty whitespace on every card row with no information value.
Center zones (Active + Review) absorb extra width up to a practical card content limit.
