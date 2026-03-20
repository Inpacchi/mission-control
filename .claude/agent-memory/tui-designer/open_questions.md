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

## Q5 — ⚔ in Bottom Bar
U+2694 CROSSED SWORDS may render as emoji double-width. Test in Ghostty first.
Fallback: use `★` as lead glyph, or omit entirely.
