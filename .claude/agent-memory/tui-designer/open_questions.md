---
name: Open design questions
description: Design decisions pending CD input or implementation verification
type: project
---

## Q1 — Glyph Single-Width Verification
Characters `◆` `✦` `⬡` `◈` `◎` `╾` `╼` need single-width verification in Ghostty.
tui-developer should test each in a character-width probe before committing to them.
Fallbacks documented in patterns.md.

## Q2 — Header Bar at Full Layout (>=120 cols)
At full layout, Deck/Graveyard have their own columns so header bar is redundant for zone counts. But the header bar carries project name, which has no other home at full layout.
Options: (a) show header bar at all widths, (b) show only at collapsed, (c) move project name to bottom bar.
CD decision needed.

## Q3 — Doc Indicator Placement
`[S][P][R]` on card row 2 — inline after status (simpler) or right-aligned (cleaner)?
Right-alignment requires remaining-width calculation on row 2.
CD to decide based on visual preference.

## Q4 — Variable Card Height (compact mode)
Option B from the board redesign spec: 2-row cards by default, 3-row when selected (flavor appears on focus).
Not included in current spec — requires scroll offset math changes.
If CD wants maximum density, worth a dedicated design pass for the scroll model.

## Q5 — ⚔ in Bottom Bar (RESOLVED — EXCLUDED)
U+2694 CROSSED SWORDS excluded from D8 implementation due to confirmed double-width risk.
Use `★` as lead glyph in bottom bar row 2, or omit the lead glyph entirely.
The settled ZONE_GLYPH set (◈ ★ ◎ ✦) does not include ⚔.

## Q6 — Zellij Quarter-Panel Floor (D8 requirement)
The isTooNarrow threshold was 60. D8 review established it should be 28.
Below 28 columns, even a pointer + card ID cannot render meaningfully.
The ultra-narrow layout (28-49 cols) shows Active + Review stacked, no flavor rows, abbreviated bottom bar.
CD should confirm 28 as the absolute floor, or adjust based on testing.

## Q7 — HeaderBar Height at Ultra-Narrow
D8 review established that HeaderBar should be 1 row at <50 cols (just project name, no zone counts).
Zone counts at that width come from bottom bar row 2.
Pending CD confirmation before tui-developer implements variable HEADER_HEIGHT.
