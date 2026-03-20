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
Full zone names with glyphs: `⚔  MC   ◈ Deck:0   ★ Active:1   ◎ Review:3   ✦ Graveyard:0`

Note: `⚔` (U+2694) may render as emoji double-width — test in Ghostty, fall back to `★` or omit.
