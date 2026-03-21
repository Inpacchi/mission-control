---
tier: lite
type: refactor
complexity: moderate
effort: 2
flavor: "Four zones enter, three zones leave."
status: complete
created: 2026-03-21
completed: 2026-03-21
author: CC
agents: [tui-developer, frontend-developer, code-reviewer]
---

# SDLC-Lite Plan: Three-Zone Playmat

**Execute this plan using the `sdlc-lite-execute` skill.**

**Scope:** Merge the 4-zone layout (Deck | Active | Review | Graveyard) into a 3-zone layout (Deck | Playmat | Graveyard). The Review zone concept is eliminated — deliverables with `review` status fold into the Playmat zone alongside spec/plan/in-progress/blocked. No new behavior or components. The `review` DeliverableStatus value is preserved in `shared/types.ts` and `ZONE_COLOR` in `theme.ts`; only the zone-level concept (`isReviewZone`, zone type `'review'`, zone index 2 for Graveyard) is removed.

**Files changed:**

1. `src/shared/zones.ts` — merge `isReviewZone` into `isActiveZone` → rename to `isPlaymatZone`; remove `isReviewZone` export
2. `src/tui/theme.ts` — `ZONE_GLYPH`: remove `review` key, rename `active` → `playmat`
3. `src/tui/BoardApp.tsx` — `Zone` type union (`'deck'|'playmat'|'graveyard'`); remove `reviewCards` memo and `isReviewZone` import; rename `activeCards` → `playmatCards`; `zones` array shrinks from 4 to 3 entries; all viewport layout branches simplified (half-col loses active/review split logic, becomes single Playmat zone at full width); Graveyard index is 2 everywhere; `showSubzones` condition changes from `type === 'active'` to `type === 'playmat'`
4. `src/tui/hooks/useKeyboard.ts` — `Zone` interface type union updated; `getNavigableZones` collapsed branch: `[1, 2]` → `[1]`
5. `src/tui/components/HeaderBar.tsx` — `ZONE_ORDER` shrinks from 4 to 3 (`['deck', 'playmat', 'graveyard']`); `ZONE_FULL_LABEL`, `ZONE_STATUS_MAP`, `ZONE_INK_COLOR` records updated: remove `review`, rename `active` → `playmat`, merge `review` status into `playmat` statuses
6. `src/tui/components/ZoneStrip.tsx` — `ZoneType` union updated; `ZONE_COLOR`, `EMPTY_PERSONALITY`: remove `review`, rename `active` → `playmat`; `SUBZONE_ORDER` adds `review: 4`; `SUBZONE_COLOR` adds `review: 'cyan'`; subzone label row expanded to include `review`
7. `src/tui/components/HelpBar.tsx` — `Zone` interface type: remove `review`, rename `active` → `playmat`; `ZONE_FULL_NAME` and `ZONE_CHALK_COLOR` records updated
8. `src/tui/components/StatusBar.tsx` — `Zone` interface type updated; `ZONE_LABEL_COLOR` and `ZONE_SHORT` records: remove `review`, rename `active` → `playmat` (short label `'P'`). Note: StatusBar appears unused in the current TUI render tree but still needs the type update for TypeScript cleanliness.
9. `src/ui/components/warTable/TacticalField.tsx` — remove `reviewCards` memo and `isReviewZone` import; rename `activeCards` → `playmatCards`; remove Review `ZoneStrip` render; rename Active Zone `ZoneStrip` props
10. `src/ui/components/warTable/ZoneStrip.tsx` — `ZoneType` union updated; `ZONE_ACCENT` and `ZONE_BG` records: remove `review`, rename `active` → `playmat`; flex grow condition renamed

**Agents:** tui-developer, frontend-developer, code-reviewer

---

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| Phase 1: Shared Foundation | — | tui-developer | — |
| Phase 2: TUI Layer | Phase 1 | tui-developer | Phase 3 |
| Phase 3: Web UI | Phase 1 | frontend-developer | Phase 2 |
| Phase 4: Post-Execution Review | Phases 2 + 3 | code-reviewer | — |

---

## Phases

### Phase 1: Shared Foundation
**Agent:** tui-developer
**Outcome:** `src/shared/zones.ts` and `src/tui/theme.ts` updated. All downstream files compile after this phase because the shared zone contract reflects the 3-zone model.
**Why:** These files are the shared root. Every other file imports from `zones.ts`. Changing them first means Phases 2 and 3 work against a stable, correct foundation.
**Guidance:**

- In `src/shared/zones.ts`: rename `isActiveZone` → `isPlaymatZone` and add `status === 'review'` to its condition body (covers spec, plan, in-progress, blocked, **and** review). Delete `isReviewZone` entirely. Keep `isDeckZone` and `isGraveyardZone` unchanged.
- In `src/tui/theme.ts`: in `ZONE_GLYPH`, remove the `review: '◎'` entry and rename the `active: '◆'` key to `playmat: '◆'`. Do **not** touch `ZONE_COLOR` (keyed by `DeliverableStatus`, not zone type) or `REVIEW_ORANGE`.

**Acceptance criteria:**
- `isPlaymatZone('review')` returns `true`
- `isPlaymatZone('spec')`, `isPlaymatZone('plan')`, `isPlaymatZone('in-progress')`, `isPlaymatZone('blocked')` all return `true`
- `isReviewZone` is no longer exported from `src/shared/zones.ts`
- `ZONE_GLYPH` has keys `deck`, `playmat`, `graveyard` — no `active`, no `review`
- `REVIEW_ORANGE` and `ZONE_COLOR` in `theme.ts` are untouched

---

### Phase 2: TUI Layer
**Agent:** tui-developer
**Outcome:** All 6 TUI files updated and TypeScript-clean. The board renders 3 zones. Zone navigation in collapsed mode uses only `[1]`. Graveyard index is 2 everywhere.
**Why:** The TUI is the primary surface. All 6 files share the `Zone` type and zone-index assumptions. They must be updated together in one pass to avoid mixed-state rendering.
**Guidance:**

**`src/tui/hooks/useKeyboard.ts`:**
- Update `Zone` interface type union: `'deck' | 'playmat' | 'graveyard'`
- `getNavigableZones` collapsed branch: change `return [1, 2]` to `return [1]`
- Default `selectedZone` initial value stays `1` (still points to center zone)
- Update the comment at line 98 from "Graveyard (3)" to "Graveyard (2)" to reflect the new zone index

**`src/tui/components/ZoneStrip.tsx`:**
- `ZoneType`: `'deck' | 'playmat' | 'graveyard'`
- `ZONE_COLOR`: remove `review`, rename `active` → `playmat` (value `'yellow'` unchanged)
- `EMPTY_PERSONALITY`: remove `review` entry, rename `active` → `playmat`
- `SUBZONE_ORDER`: add `review: 4` (position after `blocked: 3`)
- `SUBZONE_COLOR`: add `review: 'cyan'`
- Expand subzone label row from `(['spec', 'plan', 'in-progress', 'blocked'] as const)` to include `'review'`

**`src/tui/components/HeaderBar.tsx`:**
- `ZONE_ORDER`: `['deck', 'playmat', 'graveyard'] as const`
- `ZONE_FULL_LABEL`: remove `review`, rename `active` → `playmat` (value `'Playmat'`)
- `ZONE_STATUS_MAP`: rename `active` → `playmat`, add `'review'` to statuses; remove `review` zone entry
- `ZONE_INK_COLOR`: rename `active` → `playmat`; remove `review` entry
- `zoneCounts` initial value: `{ deck: 0, playmat: 0, graveyard: 0 }`
- Rename `ZONE_STATUS_MAP.active` references to `ZONE_STATUS_MAP.playmat`

**`src/tui/components/HelpBar.tsx`:**
- `Zone` interface type: `'deck' | 'playmat' | 'graveyard'`
- `ZONE_FULL_NAME`: remove `review`, rename `active` → `playmat` (value `'Playmat'`)
- `ZONE_CHALK_COLOR`: remove `review`, rename `active` → `playmat`

**`src/tui/components/StatusBar.tsx`:**
- `Zone` interface type: `'deck' | 'playmat' | 'graveyard'`
- `ZONE_LABEL_COLOR`: remove `review`, rename `active` → `playmat`
- `ZONE_SHORT`: remove `review`, rename `active` → `playmat` (value `'P'`)
- Note: StatusBar appears unused in the current TUI render tree; make the type updates anyway for TypeScript cleanliness

**`src/tui/BoardApp.tsx`:**
- Import: replace `isActiveZone, isReviewZone` with `isPlaymatZone`
- `Zone` interface type union: `'deck' | 'playmat' | 'graveyard'`
- Remove `reviewCards` memo; rename `activeCards` → `playmatCards`; filter uses `isPlaymatZone`
- `zones` array: 3 entries — Deck, Playmat, Graveyard
- Narrow panel `ZONE_SHORT_NAME`: remove `review`, rename `active` → `playmat`
- **`showSubzones` prop:** `currentZone.type === 'active'` → `currentZone.type === 'playmat'`. There are **three** occurrences in the narrow-panel branch — update all three:
  - Line 461: `showTwoZones` top zone branch
  - Line 471: `showTwoZones` bottom zone branch
  - Line 498: single-zone branch
- **half-col layout**: massive simplification — remove the entire active/review split variable block (delete variables: `activeCount`, `reviewCount`, `totalCards`, `bothPresent`, `eitherEmpty`, `activeWidth`, `reviewWidth`) and remove the three-branch JSX (`bothPresent`/`activeEmpty`/`reviewEmpty`); replace with a single `<ZoneStrip name="Playmat" type="playmat" .../>` at full `availableWidth`
- **half-row layout**: remove Review ZoneStrip and the entire width-split variable block (`activeCount`, `reviewCount`, `totalCenter`, `activeWidth`, `reviewWidth`); Playmat takes `centerWidth`; Graveyard `isSelected={selectedZone === 2}` (was `3`)
- **full layout**: same simplification; Playmat takes full `centerWidth`; Graveyard index 3→2
- All `selectedZone === 3` for Graveyard → `selectedZone === 2`
- All `selectedCard={selectedZone === 3 ? selectedCard : -1}` for Graveyard → `selectedZone === 2`

**Acceptance criteria:**
- `pnpm tsc --noEmit` passes with no errors in `src/tui/`
- Board renders 3 zone columns in full/half-row layout: Deck | Playmat | Graveyard
- Half-col layout shows single Playmat zone at full available width — no split logic
- Playmat zone shows subzone badges for spec, plan, in-progress, blocked, and review
- Graveyard selectable via right-arrow from Playmat in non-collapsed mode
- Collapsed mode navigation locked to `[1]`
- StatusBar abbreviation: `'P'`
- HeaderBar zone count row: `◇ Deck:N  ◆ Playmat:N  ✦ Graveyard:N`

---

### Phase 3: Web UI
**Agent:** frontend-developer
**Outcome:** `src/ui/components/warTable/TacticalField.tsx` and `src/ui/components/warTable/ZoneStrip.tsx` updated. Web UI renders 3 zones.
**Why:** The web UI imports from `src/shared/zones.ts` — after Phase 1, `isReviewZone` and `isActiveZone` no longer exist. Phase 3 fixes the web layer against the new foundation.
**Guidance:**

**`src/ui/components/warTable/ZoneStrip.tsx`:**
- `ZoneType`: `'deck' | 'playmat' | 'graveyard'`
- `ZONE_ACCENT`: remove `review`, rename `active` → `playmat`
- `ZONE_BG`: remove `review` entry (discard `#2D1602`), rename `active` → `playmat` (retain its existing value `#2D1A04`)
- `flex` grow prop condition: `zoneType === 'active'` → `zoneType === 'playmat'` — this rename appears on **two lines** (lines 74 and 75) and both must be updated
- `minH` condition: same rename (covered by the two-line update above)

**`src/ui/components/warTable/TacticalField.tsx`:**
- Update import: replace `isActiveZone, isReviewZone` with `isPlaymatZone`
- Remove `reviewCards` memo; rename `activeCards` → `playmatCards` using `isPlaymatZone`
- Remove the Review `ZoneStrip` block
- Rename Active Zone `ZoneStrip`: `title="Playmat"`, `zoneType="playmat"`, `cards={playmatCards}`

**Acceptance criteria:**
- `pnpm tsc --noEmit` passes with no errors in `src/ui/`
- Web UI renders 3 zone strips: Deck, Playmat, Graveyard
- Deliverables with `review` status appear in Playmat
- Playmat is the flex-growing center zone

---

### Phase 4: Post-Execution Review
**Agent:** code-reviewer
**Outcome:** All findings fixed, build passes.
**Why:** 10-file refactor across shared, TUI, and web UI layers. Targeted review catches missed references and index-offset bugs.
**Guidance:**

- Grep for stale zone type references: `'active'` as zone type, `isReviewZone`, `isActiveZone`
- Verify Graveyard zone index is consistently `2` (not `3`) in `BoardApp.tsx`
- Verify all three narrow-panel `showSubzones` occurrences in `BoardApp.tsx` (lines ~461, ~471, ~498) use `type === 'playmat'`
- Verify `pnpm tsc --noEmit` and `pnpm build` pass
- Confirm `configLoader.ts` was not modified (it does not need changes — its columns config is per-status for the web Kanban, not per-zone)

**Acceptance criteria:**
- Zero TypeScript errors (`pnpm tsc --noEmit`)
- No references to zone type `'active'` or `'review'` in Zone interfaces, ZoneType unions, or zone record keys
- `isReviewZone` and `isActiveZone` do not exist anywhere
- `pnpm build` completes without errors

## Worker Agent Reviews

Key feedback incorporated:

- [tui-developer] showSubzones has 3 occurrences in narrow-panel branch (lines 461, 471, 498), not 2 — plan updated to list all three explicitly
- [tui-developer] half-col and half-row variable blocks named explicitly for deletion (activeCount, reviewCount, totalCards, etc.)
- [tui-developer] useKeyboard.ts line 98 comment needs Graveyard index update (3→2) — added to guidance
- [tui-developer] StatusBar.tsx noted as unused in TUI render tree — type update still required for TypeScript cleanliness
- [code-reviewer] configLoader.ts has 7 per-status columns (not 4 zone columns) — removed from plan entirely; Phase 4 now confirms it was not modified
- [frontend-developer] ZONE_BG color values made explicit: retain `#2D1A04` for playmat, discard `#2D1602` (review)
- [frontend-developer] flex/minH rename in web ZoneStrip.tsx clarified as two lines (74, 75)

## Post-Execution Review
All completed work must be reviewed by all relevant worker domain agents.
All findings must be fixed by the most relevant domain agent.
Build must pass before work is considered done.
