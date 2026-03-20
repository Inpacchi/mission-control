---
tier: lite
type: feature
complexity: moderate
effort: 4
flavor: "The field adapts to any arena."
created: 2026-03-20
author: CC
agents: [tui-developer, tui-designer, code-reviewer]
---

# SDLC-Lite Plan: Dense Playmat Board Redesign

**Execute this plan using the `sdlc-lite-execute` skill.**

**Scope:** Redesign the Mission Control TUI board view with TCG playmat aesthetics — adding a viewport-aware HeaderBar, rarity glyphs, doc availability pills, empty-zone collapse, and TCG-flavored zone glyphs throughout. Responsive to a 2D breakpoint grid (width × height), not just width. The web UI and server are untouched; all changes are confined to `src/tui/`.

**Files:**
- `src/tui/theme.ts` — add `ZONE_GLYPH`, `RARITY_GLYPH`, orange review color
- `src/tui/components/HeaderBar.tsx` — new component (viewport-aware project + phase header)
- `src/tui/components/DeliverableCard.tsx` — rarity glyph, doc pills, width budget corrections, DRY cleanup
- `src/tui/components/ZoneStrip.tsx` — empty-zone collapse, `EMPTY_ZONE_HEIGHT` export, ╌ separator, personality text
- `src/tui/components/HelpBar.tsx` — full zone names + glyphs, review orange, narrow fallback
- `src/tui/BoardApp.tsx` — integrate HeaderBar, recalculate heights and widths, 2D breakpoint routing, collapsed flag semantics

**Agents:** tui-developer, tui-designer, code-reviewer

---

## Viewport Matrix

The responsive system uses a 2D breakpoint grid. Width and height are both inputs to layout decisions.

| Viewport | Width | Height | Layout Mode | Collapsed | HeaderBar |
|----------|-------|--------|-------------|-----------|-----------|
| Quarter column | 40-50 cols | 40+ rows | Single-zone | false | 1 row (name only, truncated) |
| Quarter quadrant | 40-50 cols | ≤12 rows | Single-zone | false | 1 row (name only, truncated) |
| Half column | 80-100 cols | 40+ rows | 2-zone (Active + Review) | true | 2 rows (full format) |
| Half row | 160+ cols | ≤12 rows | 4-zone, Deck/Graveyard in header | true | 1 row (zone counts only) |
| Full | 160+ cols | 40+ rows | 4-zone | false | 2 rows (full format) |
| Too narrow | <28 cols | any | Error message | — | none |

Note: half-col deliberately spans 50-159 columns. The "80-100" label in the table is the typical Zellij half-column width; the classification captures all widths between quarter and full.

`HEADER_HEIGHT` is a derived value based on viewport, not a constant. Compute it before calculating `zoneHeight`.

---

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| 1     | —         | tui-developer | — |
| 2     | Phase 1   | tui-developer | — |
| 3     | Phase 2   | tui-developer | — |
| 4     | Phase 3   | code-reviewer | — |

---

## Phases

### Phase 1: Theme Foundation
**Agent:** tui-developer
**Outcome:** `src/tui/theme.ts` exports `ZONE_GLYPH`, `RARITY_GLYPH`, and the orange review color token. All downstream phases import from theme without local constants.
**Why:** Every subsequent phase imports glyphs and colors from `theme.ts`. Getting the shared tokens right first prevents each component from inventing its own constants.

**Guidance:**

**ZONE_GLYPH (define once here — all other phases reference this, do not restate):**
```
ZONE_GLYPH: Record<string, string> = { deck: '◇', active: '◆', review: '◎', graveyard: '✦' }
```
These are confirmed single-width geometric shapes. Do not substitute `⚔` (U+2694) or `♠` (U+2660) — those are in the Miscellaneous Symbols block and may render double-width in some Ghostty configs.

**RARITY_GLYPH (key by RarityTier, not DeliverableComplexity):**
```
RARITY_GLYPH: Record<RarityTier, string> = { common: '·', uncommon: '◆', rare: '✦', epic: '◈', mythic: '⬡' }
```
All five glyphs must be distinct. `★` is excluded until single-width is verified. This set (`·`, `◆`, `✦`, `◈`, `⬡`) is fully distinct and confirmed safe.

**CRITICAL — RARITY_GLYPH inversion risk:** Key by `RarityTier`, not `DeliverableComplexity`. Always call `complexityToRarity()` first to map deliverable complexity to a rarity tier. `arch` maps to `mythic`; `moonshot` maps to `epic`. Getting this backwards silently renders wrong glyphs.

**REVIEW_ORANGE:** The review orange is `#FB923C`. Add `REVIEW_ORANGE = chalk.hex('#FB923C')` and export it. For Ink `<Text color>` props, the nearest named ANSI approximation is `"yellow"` — document this limitation in a code comment. Hex does not work in Ink color props.

Read the current `theme.ts` fully before editing. Do not duplicate existing exports.

---

### Phase 2: Component Updates
**Agent:** tui-developer
**Outcome:** `HeaderBar.tsx` exists and renders correctly at all viewport modes; `DeliverableCard.tsx`, `ZoneStrip.tsx`, and `HelpBar.tsx` are updated with the new visual language. No layout wiring to `BoardApp.tsx` yet — that is Phase 3.
**Why:** Isolating component work from layout wiring means each component can be reasoned about independently. Width bugs are caught before full-board integration.

---

**HeaderBar.tsx (new file):**

Props: `projectName: string`, `deliverables: Deliverable[]`, `width: number`, `height: number`, `viewportMode: ViewportMode`.

`HEADER_HEIGHT` is a derived value — compute it from `viewportMode`:
- `quarter-col`, `quarter-quadrant`: 1 row
- `half-row`: 1 row (height is precious in short viewports)
- `half-col`, `full`: 2 rows

Export a `getHeaderHeight(viewportMode: ViewportMode, height: number): number` function from this file so `BoardApp.tsx` can compute `zoneHeight` correctly.

**1-row mode (ultra-narrow and half-row):**
- Ultra-narrow: project name only, truncated to `width - 2`. No zone counts.
- Half-row: zone counts only, no project name. Format: `◇:N  ◆:N  ◎:N  ✦:N`. Use `ZONE_GLYPH`. Review count uses `REVIEW_ORANGE` (chalk) in the formatter path; in Ink `color="yellow"`.

**2-row mode (half-col and full):**
- Row 1: project name (bold, truncated to fit) + zone counts right-aligned. Format: `◇ Deck:N  ◆ Active:N  ◎ Review:N  ✦ Graveyard:N`. Calculate count string width first, then truncate name to `width - countStringWidth - 2`.
- Row 2: phase label of highest-priority active deliverable (or `"no active work"` if active zone is empty) + total count right-aligned (`N deliverables`).

**Board-only rule:** HeaderBar renders ONLY in board view. Sub-views (detail, chronicle, sessions, adhoc, file browser, pager) do NOT include it.

**Zero deliverables:** HeaderBar still renders when there are no deliverables — show project name and all zones at 0. The "No deliverables" message renders below it in the zone area.

**Height suppression:** At `height ≤ 16`, suppress HeaderBar UNLESS the viewport mode is `quarter-col` or `quarter-quadrant` — those modes need the 1-row header for project identity since it's the only place the project name appears. When suppressed, `getHeaderHeight()` returns 0.

---

**DeliverableCard.tsx:**

**Minimum zone width recalculation:** The existing minimum zone width constant of 16 (`BoardApp.tsx` line 432) is too small. With rarity glyph (2 chars: glyph + space) added before the bar on row 1, and a deliverable ID of "D12" plus pips, chrome totals 17+ chars. The new minimum zone width must be at least 20. Update this constant in Phase 3; note it here so Phase 3 does not miss it.

**Rarity glyph (row 1):**
- Add `RARITY_GLYPH[rarity]` before the thick bar on row 1, followed by a space. This occupies exactly 2 characters (glyph + space).
- Color and style per rarity: `common`=dim, `uncommon`=green, `rare`=cyan bold, `epic`=yellow bold, `mythic`=yellow bold underline.
- Update name truncation formula: reduce available name width by 2 to account for glyph + space.

**Doc pills (row 2):**
- Pills `[S][P][R]` are right-aligned on row 2 alongside type + status text. They do NOT create a new row 3. `CARD_HEIGHT` stays at 4 (3 rows + separator) unless flavor is absent, then 3 — no change to card height.
- Pill presence: a pill is "present" when its path field is truthy (not a filesystem existence check — just `!!specPath`, `!!planPath`, `!!resultPath`).
- Colors when present: S=blue, P=magenta, R=green. When absent: dim (gray). Pills always render; color signals presence.
- Pills occupy 9 characters (`[S][P][R]` = 3 × 3 chars). Row 2 layout reserves 9 chars from the right before truncating type/status text.
- **Suppress pills entirely when zone width < 50 cols.** At ultra-narrow widths the pills are unworkable.

**Flavor row width fix:**
- Update flavor text available width from `width - 5` to `width - 7` to account for the rarity glyph (2 chars).

**DRY cleanup:**
- Remove the local `RARITY_INK_COLOR` constant and import the exported one from `theme.ts`. No user-visible effect; eliminates drift risk.

---

**ZoneStrip.tsx:**

**EMPTY_ZONE_HEIGHT export:**
- Export `export const EMPTY_ZONE_HEIGHT = 1` from this file. `BoardApp.tsx` uses this constant — do not hardcode 1 in `BoardApp.tsx`.

**Empty zone rendering (count === 0):**
- Collapse to exactly 1 row (the `EMPTY_ZONE_HEIGHT`): `ZoneName (0)  — personality text`. No border box, no padding rows, no scroll state.
- Personality text by zone: Deck=`"shuffle some ideas in"`, Active=`"all quiet on the field"`, Review=`"nothing to review"`, Graveyard=`"the graveyard rests quiet"`. Render dim.
- Non-empty zones keep the existing bordered layout unchanged.

**Height redistribution:** Freed height from empty zones goes proportionally to non-empty zones. In the full layout, an empty zone's column width narrows to min 12 chars (enough for glyph + name + count); remaining vertical space below the 1-row strip is blank.

**Separator change:**
- Change the card separator from `─`.repeat(width-4) to `╌`.repeat(width-4). This is the only change to non-empty zone rendering.

---

**HelpBar.tsx:**

**Row 2 zone counts — standard format (≥60 cols):**
- Change from single-letter codes (`D:0 A:1`) to full glyphs + short names: `◇ Deck:0  ◆ Active:1  ◎ Review:3  ✦ Grave:0`. Use "Grave" (not "Graveyard") to fit 80-column widths. Use `ZONE_GLYPH` from `theme.ts`.
- Review zone color changes from `chalk.cyan` to `REVIEW_ORANGE` (chalk hex is valid here — not Ink).

**Row 2 narrow fallback (<60 cols):**
- Below 60 cols, revert to single-letter zone codes using zone glyphs: `◇:0 ◆:1 ◎:3 ✦:0`. This prevents overflow at quarter-panel widths.

Import `ZONE_GLYPH` and `REVIEW_ORANGE` from `theme.ts`. Remove any locally duplicated color constants.

---

### Phase 3: Layout Integration
**Agent:** tui-developer
**Outcome:** `BoardApp.tsx` integrates `HeaderBar`, implements 2D breakpoint routing, recalculates all height and width budgets, and the full board renders correctly across all 5 viewport configurations.
**Why:** Layout math is the highest-risk step. Off-by-one errors in height or width cause visible wrapping or clipping. Deferring to its own phase means components are stable when integration happens.

---

**2D breakpoint classification:**

Derive a `ViewportMode` type (or string literal union):
```
type ViewportMode = 'too-narrow' | 'quarter-col' | 'quarter-quadrant' | 'half-col' | 'half-row' | 'full'
```

Classification logic (evaluate in this order):
1. `width < 28` → `'too-narrow'` (hard floor; no layout renders)
2. `width < 50 && height > 12` → `'quarter-col'`
3. `width < 50 && height <= 12` → `'quarter-quadrant'`
4. `width >= 50 && width < 160 && height > 12` → `'half-col'`
4.5. `width >= 50 && width < 160 && height <= 12` → `'half-col'`  (HeaderBar suppressed via height ≤ 16 rule, unless it's quarter-*)
5. `width >= 160 && height <= 12` → `'half-row'`
6. `width >= 160 && height > 12` → `'full'`

When half-col fires at short heights (≤16 rows), HeaderBar is suppressed by `getHeaderHeight()`, giving all vertical space to the zones.

**`collapsed` flag semantics per viewport:**
- `quarter-col`, `quarter-quadrant`: `collapsed = false` — all 4 zones remain keyboard-navigable via left/right arrows (single-zone display mode)
- `half-col`: `collapsed = true` (Deck/Graveyard in HeaderBar)
- `half-row`: `collapsed = true` (Deck/Graveyard in HeaderBar)
- `full`: `collapsed = false`

**Height budget:**
- `headerHeight = getHeaderHeight(viewportMode)` (from HeaderBar.tsx; returns 0 when suppressed at height ≤ 16)
- `BOTTOM_BARS_HEIGHT = 2` (existing)
- `zoneHeight = height - BOTTOM_BARS_HEIGHT - headerHeight`

**Minimum zone width constant:**
- Update the minimum zone width (currently 16, `BoardApp.tsx` line ~432) to 20. This accounts for the 2-char rarity glyph + space added in Phase 2. Every zone column width passed to `<ZoneStrip>` and `<DeliverableCard>` must be an explicit integer ≥ 20. Re-verify that all width arithmetic sums to exactly `width` with no gaps or overlaps.
- Also update the fallback guard at lines ~435-438 in the collapsed layout branch where raw `16` literals appear in the if-statement. Both must change to 20 to match the new minimum.

---

**Single-zone mode (quarter-col and quarter-quadrant):**

Show only the currently selected zone at full width. Left/right arrow keys cycle through zones. The `collapsed` flag is `false` — all 4 zones remain in the navigation model even though only one is visible at a time. In single-zone mode (`quarter-col` and `quarter-quadrant`), HelpBar row 1 replaces its standard keyboard hints with the zone indicator: `◆ Active (2 of 4)  ←→ zones  ↑↓ cards  Enter open`. This reuses the existing row, costs no additional height.

HeaderBar at 1 row: project name only, truncated to `width - 2`.

---

**Collapsed layout (half-col, 80-100 cols):**

HeaderBar at 2 rows (full format). Deck and Graveyard removed from zone columns — their counts live in HeaderBar row 1. Give Active and Review the full available width. If both non-empty, split proportionally by card count. If one is empty, give the other all available width — but still render the empty zone as its `EMPTY_ZONE_HEIGHT`-row strip. Empty zones do not disappear entirely.

Remove the existing `badgeWidth = 8` badge columns from the half-col branch — they are fully replaced by the HeaderBar zone counts.

---

**Half-row layout (160+ cols, ≤12 rows):**

HeaderBar at 1 row (zone counts only, no project name). Deck/Graveyard counts in HeaderBar. 4 zone columns side-by-side but height is precious — zone columns get all height minus 1 (HeaderBar) minus 2 (bottom bars). Cap Deck and Graveyard columns at max 20 chars width. Let Active and Review absorb remaining width proportionally.

---

**Full layout (160+ cols, 40+ rows):**

HeaderBar at 2 rows. 4 zone columns side-by-side. Cap Deck and Graveyard columns at max 20 chars. (At 200 cols, proportional allocation gives side zones 24 chars each — too wide. The cap prevents this.) Active and Review absorb the remaining width after side zones, split proportionally by card count.

For empty zones: column width collapses to `Math.max(12, Math.floor(width * 0.08))` characters. The `EMPTY_ZONE_HEIGHT`-row strip renders at the top of the column; remaining height is blank.

---

### Phase 4: Review and Polish
**Agent:** code-reviewer
**Outcome:** All findings from code review are fixed; TypeScript compiles clean (`npx tsc --noEmit`); the board renders correctly at all 5 viewport configurations with no wrapping artifacts.
**Why:** The board is the primary view. Regressions break the entire TUI experience. An independent review pass catches width miscalculations, missing edge cases, and type errors before the work is marked done.

**Test matrix (must verify all 6):**
- 40×12 (quarter-quadrant): single-zone mode, 1-row header, no pills
- 40×40 (quarter-col): single-zone mode, 1-row header, no pills
- 55×40 (half-col minimum): 2-zone collapsed, 2-row header, pills visible
- 80×40 (half-col): 2-zone collapsed, 2-row header, pills visible
- 160×12 (half-row): 4-zone, 1-row header (counts only), pills visible
- 160×40 (full): 4-zone, 2-row header, pills visible, side zones capped at 20

**Checklist:**
- Verify `RARITY_INK_COLOR` duplication is fully removed from `DeliverableCard.tsx`.
- Verify `HeaderBar` handles zero deliverables gracefully — renders with all zone counts at 0.
- Verify empty-zone collapse does not break keyboard navigation — `useListNavigation` selection indices remain valid when zones have 0 items.
- Verify `╌` (U+254C) separator character is single-width in font metrics.
- Verify doc pills `[S][P][R]` render correctly when `specPath`, `planPath`, `resultPath` are `undefined` (not just falsy strings).
- Verify HelpBar row 2 fits within 80 columns in standard format. If it does not fit, the narrow fallback (`◇:0 ◆:1 ◎:3 ✦:0`) must trigger correctly.
- Verify `RARITY_GLYPH` is keyed by `RarityTier` (not `DeliverableComplexity`) everywhere — `complexityToRarity()` is called before lookup.
- Verify `ZONE_GLYPH` is imported from `theme.ts` in all components — no local restatements.
- Verify `getHeaderHeight(viewportMode, height)` returns 0 when `height ≤ 16` (except for `quarter-col` and `quarter-quadrant`), and that `zoneHeight` calculation uses it correctly.
- Verify minimum zone width constant is updated to 20 in `BoardApp.tsx`.
- Verify `collapsed = false` in single-zone mode and that zone navigation (left/right arrows) works across all 4 zones.
- All findings are fixed by tui-developer before the work is marked complete.

---

## Worker Agent Reviews

Key feedback incorporated:

- [tui-designer] Replaced ⚔/♠ zone glyphs with confirmed single-width geometric shapes (◇◆◎✦) to avoid Miscellaneous Symbols double-width risk
- [tui-designer] Added 2D viewport matrix (width × height) replacing width-only breakpoints, covering all 5 Zellij panel configurations
- [tui-designer] Fixed height suppression carve-out for quarter-col/quarter-quadrant modes — header is load-bearing for project identity at those sizes
- [tui-designer] Specified HelpBar row 1 zone indicator for single-zone mode, reusing existing row at zero height cost
- [code-reviewer] Identified minimum zone width breakage: rarity glyph + doc pills push chrome beyond old 16-char minimum; updated to 20
- [code-reviewer] Specified doc pill contract: truthy check (not filesystem), row 2 placement (not new row 3), CARD_HEIGHT unchanged
- [code-reviewer] Fixed classification dead zone for 50-159 cols × ≤12 rows (maps to half-col with header suppressed)
- [code-reviewer] Added explicit `collapsed` flag semantics per viewport mode and getHeaderHeight signature accepting both viewportMode and height
- [code-reviewer] Identified hardcoded 16 fallback guard in collapsed branch; added instruction to update both literal positions to 20
- [code-reviewer] Added 55×40 test case for half-col minimum width validation

## Post-Execution Review
All completed work must be reviewed by all relevant worker domain agents.
All findings must be fixed by the most relevant domain agent.
Build must pass before work is considered done.
