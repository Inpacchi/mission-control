---
name: TUI visual patterns and conventions
description: Reusable visual patterns, card anatomy, zone glyphs, color semantics for the Mission Control TUI
type: project
---

## Card Anatomy (3-row standard)

```
col: 1    2    3-4   5+
     ptr  rar  bar   content
     ▸    ✦    ┃     [D4] Name                    ●●●○○
          ✦    ┃     ★ feature · spec          [S][P]
          ✦    ┃     italic:"flavor text here..."
```

- Col 1: pointer `▸` (yellow) or space. Selection indicator.
- Col 2: rarity glyph (● ◆ ★ ✦ ⬡) in rarity color. Dim when unselected.
- Col 3-4: bar char + space. Bar weight = rarity (│ common/uncommon, ┃ rare/epic, ║ mythic). Bar color = status color when unselected, white+bold when selected.
- Row 1: `[ID]` in rarity color + name (truncated) + effort pips right-aligned
- Row 2: type icon + type label + ` · ` + status label + doc indicators `[S][P][R]`
- Row 3: italic dim flavor text (truncated to zone width)

## Rarity System

| Tier | Glyph | Color | Bar | ID style |
|------|-------|-------|-----|----------|
| Common | ● | white | │ | white normal |
| Uncommon | ◆ | green | │ | green normal |
| Rare | ★ | cyan | ┃ | cyan bold |
| Epic | ✦ | yellow | ┃ | yellow bold |
| Mythic | ⬡ | yellow | ║ | yellow bold underline |

Glyph fallbacks if double-width: ●→● ◆→◆ ★→★ ✦→+ ⬡→◈

## Zone Glyphs

| Zone | Glyph | Color | Empty text |
|------|-------|-------|------------|
| Deck | ◈ | gray | "draw pile empty" |
| Active | ★ | yellow | "nothing in play" |
| Review | ◎ | cyan | "stack is clear" |
| Graveyard | ✦ | green | "none yet fallen" |

## Status Colors (established, unchanged)

idea=gray, spec=blue, plan=magenta, in-progress=yellow, review=cyan, complete=green, blocked=red

## Doc Indicator Pills

`[S]` blue, `[P]` magenta, `[R]` green — appear on card row 2 after status label. Only render if corresponding doc path is non-null on the deliverable.

## Separator Character

`╌` (U+254C) between cards — lighter visual weight than `─`

## Header Bar (collapsed layout only)

Format: `╾─ MISSION CONTROL ∷ {project-basename} ───── ◈ D:{n}   ★ A:{n}   ◎ R:{n}   ✦ G:{n} ─╼`
- "MISSION CONTROL" bold white
- `∷` dim
- project name dim italic
- filler `─` dim
- zone counts: glyph in zone color, count in zone color

## Bottom Bar Row 2

`⚔  MC   ◈ Deck:{n}   ★ Active:{n}   ◎ Review:{n}   ✦ Graveyard:{n}`
`⚔` fallback: `★` or omit — test double-width in Ghostty.
