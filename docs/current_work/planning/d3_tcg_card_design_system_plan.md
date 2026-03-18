# D3: TCG Card Design System + War Table Layout -- Implementation Plan

**Spec:** `d3_tcg_card_design_system_spec.md`
**Created:** 2026-03-17
**Revised:** 2026-03-17 (incorporates review findings and CD decisions)

---

## Overview

This plan implements a TCG (Trading Card Game) visual metaphor for deliverable cards and replaces the current Dashboard layout with a three-column "War Table" command room. The work is organized into 7 phases using an interleaved approach: data layer + theme first, then a performance stress test gate, then layout shell + card components in parallel, and finally wiring, animations, and polish. This ordering maximizes parallel agent work while ensuring the animation performance risk (spec Section 9) is validated before integration.

---

## Component Impact

| Component / Package | Changes |
|--------------------|---------|
| `src/shared/types.ts` | Add `DeliverableType`, `DeliverableComplexity`, `RarityTier` types; extend `Deliverable` with `cardType`, `complexity`, `effort`, `flavor`, `createdAt` fields |
| `src/server/services/sdlcParser.ts` | Extend `FileInfo` with optional `content` field; read spec file content in `scanDirectory()`; add `gray-matter` frontmatter extraction in `buildDeliverable()`; derive `createdAt` from earliest artifact mtime |
| `src/ui/theme/index.ts` | Add card-type color tokens (`cardType.*`), rarity treatment tokens (foil, shimmer, gold, holo gradients using concrete hex values), card shadow tokens. `@keyframes` in `globalCss` may need `as any` cast for TypeScript compatibility |
| `src/ui/components/cards/` | **New directory** -- TcgCard, MiniCard, CardFlip, GoldBorderWrap, HoloOverlay, RarityEffects |
| `src/ui/components/cards/animations/` | **New directory** -- CompletionCelebration, PackRevealAnimation |
| `src/ui/components/warTable/` | **New directory** -- WarTable, TacticalField, IntelPanel, CommandBar, ColumnResizer, ZoneStrip |
| `src/ui/components/layout/Dashboard.tsx` | Replaced by WarTable as the top-level layout component |
| `src/ui/components/layout/StatsBar.tsx` | Adapted into CommandBar HUD stats format |
| `src/ui/components/kanban/DeliverableCard.tsx` | Retired; replaced by TcgCard and MiniCard |
| `src/ui/stores/dashboardStore.ts` | Add column width state (left/center/right percentages), active layout preset, intel card selection (decoupled from preview), zone view toggle |
| `src/ui/utils/rarity.ts` | **New file** -- `complexityToRarity()` mapping, `cardTypeToColor()` lookup |
| `src/ui/hooks/usePrevious.ts` | **New file** -- generic `usePrevious` hook for detecting state transitions |
| `package.json` | Add `gray-matter` dependency (backend-only; must never appear in `src/ui/` imports) |

## Interface / Adapter Changes

- `parseDeliverables()` return type gains optional fields (`cardType`, `complexity`, `effort`, `flavor`) and required `createdAt` on each `Deliverable` -- no breaking change for existing consumers except `createdAt` which always has a value (derived from earliest file mtime, or current time for catalog-only entries)
- `FileInfo` internal interface gains optional `content?: string` field, populated only for spec-type files
- No new REST endpoints
- No new WebSocket message types -- enriched `Deliverable` objects flow through the existing `watcher:sdlc` pipeline

## Migration Required

- [ ] No database migration needed
- [ ] No storage migration needed
- [x] UI layout migration: `Dashboard` replaced by `WarTable` -- `App.tsx` import updated

---

## Prerequisites

- [x] D1 (MVP) is stable
- [x] D2 (tech debt cleanup) is complete -- inline styles migrated to Chakra tokens, async parser calls in place
- [ ] `gray-matter` npm package installed

---

## Implementation Phases

### Phase 1: Data Layer + Theme Foundation

**Agent:** backend-developer (types + parser), frontend-developer (theme + utilities)

**What -- Backend:**

Extend `FileInfo` with an optional `content?: string` field. In `scanDirectory()`, after the `fs.stat()` call, read file content via `fs.readFile()` ONLY for spec-type files (since frontmatter is only written on specs). This keeps the read targeted -- only spec files are read, not plans/results/complete. Pass the content through `FileInfo` to `buildDeliverable()`, which remains synchronous. `scanDirectory()` is already async, so the added `fs.readFile()` calls fit naturally. Install `gray-matter` and use it in `buildDeliverable()` to extract YAML frontmatter from the spec file's content (available via `FileInfo.content`), parsing `type`, `complexity`, `effort`, and `flavor`. Derive `createdAt` from the earliest artifact file mtime across all files for the deliverable.

Note: `parseDeliverables()` contains a catalog-only branch that constructs `Deliverable` objects inline rather than through `buildDeliverable()`. This branch must also be updated to include `createdAt: new Date().toISOString()` so all returned deliverables always have a `createdAt` value.

Extend the shared `Deliverable` type with TCG fields (`cardType`, `complexity`, `effort`, `flavor`, `createdAt`) and the supporting enum types (`DeliverableType`, `DeliverableComplexity`, `RarityTier`). The `DeliverableComplexity` enum values are: `'simple'`, `'moderate'`, `'complex'`, `'arch'`, `'moonshot'`. Note: the highest complexity value is `'arch'`, NOT `'architecture'`, to avoid literal collision with `DeliverableType.architecture`.

Constraint: `gray-matter` is a Node-only library. It must NEVER appear in any `src/ui/` import. All frontmatter parsing stays in the server.

**What -- Frontend:**

Add card-type color tokens to the Chakra theme. These use the namespace `cardType.*` (not `type.*`) to avoid TypeScript keyword collision with `type` -- accessing `tokens.type.feature` requires bracket notation, so `cardType` is the canonical namespace. Add rarity treatment tokens: foil gradient, shimmer gradient, gold gradient, holographic gradient. All gradient tokens must use concrete hex values or Chakra-generated CSS variables -- no references to `var(--accent)` or other undefined CSS variables. The shimmer token references `var(--card-accent)`, a CSS custom property set at the component level based on column/status color. Add card shadow tokens.

Create a `rarity.ts` utility module with `complexityToRarity()` (pure mapping, handles `undefined` input) and `cardTypeToColor()` lookup. Create `usePrevious.ts` hook in `src/ui/hooks/`.

**Why:** Every subsequent phase depends on the enriched data model and theme tokens. The parser must produce frontmatter data before cards can display it, and components need tokens to avoid hardcoded colors.

**Acceptance criteria:**
- Spec files with valid frontmatter return enriched `Deliverable` objects from the REST API, including `createdAt` derived from earliest artifact mtime
- Spec files without frontmatter return `undefined` for optional TCG fields (no errors, no defaults injected at the parser level); `createdAt` is always present
- Malformed frontmatter degrades gracefully (returns empty optional fields, does not throw)
- `scanDirectory()` reads file content only for spec-type files, not for plan/result/complete/blocked
- `gray-matter` does not appear in any `src/ui/` file
- All new theme tokens accessible via Chakra token references
- No rarity gradient token references `var(--accent)` or any other undefined CSS variable
- `cardType.*` token namespace used (not `type.*`)
- `complexityToRarity()` covers all complexity values including `undefined`
- `DeliverableComplexity` uses `'arch'` (not `'architecture'`) for the Mythic-tier complexity value

---

### Phase 2: Performance Stress Test

**Agent:** frontend-developer

**What:** Build a temporary test harness page at `src/ui/__tests__/stress/` (excluded from production build) that renders 20 animated card shells simultaneously -- spanning all five rarity tiers with their always-on CSS animations (Uncommon foil shift, Rare border shimmer, Epic gold gradient, Mythic holographic overlay with base opacity 0.2-0.3 at rest). The harness must include always-on holo rendering (Mythic cards at rest with visible overlay, not just on hover). All always-on animations must use ONLY `transform` and `opacity` -- no `box-shadow` in keyframes. The POC's `active-breathe` keyframe that uses `box-shadow` must be converted to a pseudo-element with `opacity` pulse. Profile using Chrome DevTools Performance panel to measure frame times under sustained animation load. Document results: average frame time, worst-case frame time, which rarity tier contributes the most paint cost. If average frame time exceeds 16ms, identify and apply mitigations before proceeding. Include a `prefers-reduced-motion` matchMedia check for any JS-driven animations (mouse tracking).

**Why:** The spec identifies always-on animations with 15+ cards as the primary performance risk (Section 9). Testing this in isolation before building the full card component tree prevents discovering the problem after integration when the fix surface is much larger. The stress test uses raw CSS + minimal React wrappers, so it validates the animation approach independent of the card component architecture.

**Acceptance criteria:**
- 20 animated card shells render simultaneously with < 16ms average frame time on mid-tier hardware
- Mythic holo overlay visible at rest (base opacity 0.2-0.3), not just on hover
- No `box-shadow` in any animation keyframe -- all animations use only `transform` and `opacity`
- Results documented with specific frame time numbers
- Any required mitigations applied to the animation CSS before proceeding to Phase 3
- `prefers-reduced-motion` verified: all CSS animations disabled when the media query matches, and JS-driven mouse tracking respects the same check
- Stress test files located in `src/ui/__tests__/stress/`, excluded from production build
- Rare tier shimmer test cases must set `--card-accent` directly on the card shell element to validate shimmer rendering

---

### Phase 3: Card Component System

**Agent:** frontend-developer

**What:** Build the TCG card component family inside `src/ui/components/cards/`. This includes:

- **TcgCard:** Full-size card with five zones (identity, type bar, ability text, artifact pills, stat block). Artifact pills must meet WCAG AA contrast for foreground/background at rendered sizes -- increase pill background lightness if needed. Epic/Mythic cards that use a gold border instead of the left border-accent must have an inner status color indicator (thin inset stripe or status color tint in the type bar background) so status is not lost.

- **MiniCard:** Compact variant for tactical field zones showing ID, name, effort pips, type dot, status. Name display uses 2-line clamp (not single-line truncation) to preserve task identification -- this increases card height slightly. Single-click on a MiniCard in the tactical field expands it into a full TcgCard inline within the zone. A second click on the expanded card triggers the card flip. An explicit button on the card selects it for the Intel Panel. Clicking a different MiniCard while one is expanded collapses the first and expands the newly clicked one. Clicking outside all cards collapses the expanded one. Keyboard path: Tab to MiniCard, Enter to expand, Enter again to flip, Tab to Intel selection button. At MiniCard scale, effort is rendered as a numeric count (e.g., `3`) followed by a small pip icon, not as five individual pips.

- **CardFlip:** 3D flip wrapper using `rotateY(180deg)` with `backface-visibility: hidden` on both faces. Click triggers flip on an already-expanded card. Back face contains card details.

- **GoldBorderWrap:** Wrapper providing animated gold gradient border for Epic and Mythic tiers, keeping card interior dark and readable.

- **HoloOverlay:** Absolute-positioned overlay for Mythic cards. Mouse coordinate updates must use `ref.current.style.setProperty()`, NOT React state, to prevent per-frame re-renders. Base opacity at rest is 0.2-0.3 (always visible on Mythic cards). Mouse tracking adds tilt and increases opacity on hover.

- **RarityEffects:** Logic component mapping complexity to the correct rarity CSS class and animation set. Completed cards retain their rarity treatment at 50% opacity, with green glow + check icon overlay added on top (both states visible simultaneously). A small check icon is always present alongside the green glow for completed cards -- color must not be the sole completion indicator. RarityEffects accepts `complexity`, `isComplete`, and `children` props. It calls `complexityToRarity()`, computes the correct CSS class, and wraps `children` in a container with that class applied.

Both card variants (full and mini) must render gracefully when optional TCG fields are `undefined`, falling back to Common/Feature defaults at the component level. Card CSS animations must use only `transform` and `opacity` (GPU-composited properties) per stress test results. No barrel files for `cards/` -- use direct imports (matches existing codebase pattern). Each card sets `--card-accent` as an inline style on its own root element based on column/status color. This is set at the card level, not the zone container level.

**Why:** The card system is the core visual deliverable of D3. Building it as an isolated component family (not wired to the layout yet) allows independent testing of all five rarity treatments, the expand/flip interaction, and the full/mini variant rendering. The POC CSS patterns from `poc/tcg-cards.html` serve as the design reference for each rarity tier.

**Acceptance criteria:**
- TcgCard renders all five zones with test data
- Artifact pill foreground/background passes WCAG AA contrast at rendered sizes
- Epic/Mythic cards have an inner status color indicator when the left border-accent is replaced by gold border
- MiniCard renders compact variant with correct rarity class; name uses 2-line clamp
- MiniCard click expands to full TcgCard inline; second click flips; button selects for Intel Panel
- GoldBorderWrap only renders the gold frame for Epic and Mythic rarity
- HoloOverlay tracks mouse position via `ref.current.style.setProperty()` (not React state); base opacity 0.2-0.3 at rest
- Completed cards show rarity treatment at 50% opacity with green glow + check icon overlay
- Cards with `undefined` TCG fields render as Common/Feature with effort 1
- All rarity animations run on `transform`/`opacity` only
- All interactive elements have accessible labels
- No barrel files -- direct imports only

---

### Phase 4: War Table Layout Shell

**Agent:** frontend-developer

**What:** Build the War Table layout components inside `src/ui/components/warTable/`.

- **WarTable:** Top-level layout replacing `Dashboard`, with three resizable columns + command bar. Must declare the full props interface matching `DashboardProps` from day one (including `wsConnected`, `wsReconnecting`, `wsSend`, `wsSubscribe`, `wsAddListener`, `projects`, `onSwitchProject`). Props are plumbed through even if not fully wired until Phase 5. Omit `wsUnsubscribe` from the new props interface (dead prop in existing Dashboard). Calls `useSdlcState` to obtain deliverables, mirroring how `Dashboard` works, and passes deliverables down as props to child components. Default column widths: 30/40/30 (Terminal 30%, Tactical Field 40%, Intel Panel 30%).

- **CommandBar:** 40px top bar with project switcher, phase indicator pill, HUD stats counters, and preset layout toggle buttons: "Terminal Focus" (45/25/30), "Balanced" (30/40/30), "Intel Focus" (25/30/45).

- **TacticalField:** Center column rendering spatial zones -- Deck for Ideas, Active Zone for Spec/Plan/In-Progress, Review Strip, Graveyard for Complete -- with independent scroll per zone and fixed zone heights. Minimum Active Zone height of 120px enforced; if column is too narrow, fixed zones (Deck/Review/Graveyard) shrink before Active Zone does. All zone containers must have `aria-label` describing purpose and card count (e.g., `aria-label="Active Zone: 4 cards"`).

- **IntelPanel:** Right column (Option B -- Markdown Only). When a card is selected, the Intel Panel shows a compact deliverable header (ID, name, status badge, type/rarity indicator) at the top, followed by a full-height tabbed markdown viewer for Spec/Plan/Result files. No TcgCard is rendered in the Intel Panel — card detail lives in the tactical field's expand-in-place interaction. Tabs for non-existent files are hidden (tab not rendered). Tabs for files that exist but cannot be read show an error state. When no card is selected, display an empty state with a ghost prompt guiding the user to select a card. Reuses existing `openSupplementaryPanel` store field for the accordion state -- no new store field needed. Supplementary panels (ChronicleBrowser, AdHocTracker, SessionHistory) render in an accordion below the header/documents area.

- **ColumnResizer:** Drag handle between columns updating width percentages in the store. Uses `setPointerCapture`/`releasePointerCapture` on the drag handle element instead of document-level mouse listeners (fixes stuck-drag bug). Needs a container ref for pixel-to-percentage conversion. Enforces 15% minimum column width.

- **ZoneStrip:** Individual zone within the tactical field, rendering cards by status. `zoneViewMode` typed as `'zones' | 'list'`.

Add column width state, active preset, zone view toggle, and `setIntelCard(id)` action to the dashboard store with typed selectors. `setIntelCard` sets the Intel Panel card WITHOUT toggling `previewOpen` state, decoupling it from `setSelectedCard`. The `spin` keyframe from Dashboard.tsx's inline style must be moved to `theme/index.ts` globalCss as part of this phase's theme work. Verify Dashboard.tsx does not use `wsUnsubscribe` before omitting it from WarTable props. Note: Vite excludes files not in the import graph from production builds by default -- the stress test harness (not imported from main.tsx) is excluded without additional config.

**Why:** The layout shell defines the spatial structure that all other components plug into. Building it in parallel with the card system (Phase 3) is possible because the layout only needs to render placeholder content in each zone and column -- actual card wiring happens in Phase 5. The existing `Dashboard.tsx` props interface and WebSocket plumbing serve as the contract the new `WarTable` must satisfy.

**Acceptance criteria:**
- Three-column layout renders with correct default widths (30/40/30)
- Preset layout buttons switch column proportions immediately ("Terminal Focus" 45/25/30, "Balanced" 30/40/30, "Intel Focus" 25/30/45)
- Drag handles resize columns with 15% minimum enforced, using pointer capture (no document-level listeners)
- Tactical field renders four spatial zones with independent scroll; Active Zone has 120px minimum height
- All zone containers have `aria-label` with purpose and card count
- Intel panel shows compact deliverable header + full-height tabbed markdown viewer when card selected; empty state ghost prompt when no card selected
- Intel panel tabs provide Spec/Plan/Result markdown access (no TcgCard rendered in intel panel)
- Intel panel accordion reuses `openSupplementaryPanel` store field
- Terminal remains in the left column with full existing functionality
- WarTable props interface matches `DashboardProps` (minus `wsUnsubscribe`)
- `setIntelCard(id)` action exists and is decoupled from `setSelectedCard`/`previewOpen`
- Column width state and zone view mode in Zustand have typed selectors
- `zoneViewMode` typed as `'zones' | 'list'`
- Reconnection banner, connection indicator preserved from Dashboard

---

### Phase 5: Integration + Store Wiring

**Agent:** frontend-developer

**What:** Wire the card components (Phase 3) into the War Table layout (Phase 4). Replace placeholder content in tactical field zones with MiniCards, distributing deliverables by status into the correct zones (Ideas to Deck, Spec/Plan/In-Progress to Active Zone, Review to Review Strip, Complete to Graveyard). Wire the MiniCard expand-in-place interaction: single-click expands to full TcgCard inline within the zone, second click flips the expanded card, explicit button selects card for Intel Panel via `setIntelCard`. Wire Intel Panel to display the compact deliverable header + full-height tabbed markdown viewer when a card is selected. Connect the enriched `Deliverable` data from the WebSocket pipeline to the card props, mapping `complexity` through `complexityToRarity()` and `cardType` through `cardTypeToColor()`. Each card sets `--card-accent` CSS custom property based on its column/status color for shimmer gradient references. Update `App.tsx` to import `WarTable` instead of `Dashboard`, passing the same props interface. Remove the `wsUnsubscribe` prop from the App.tsx call site when swapping Dashboard for WarTable. Ensure existing supplementary panels (ChronicleBrowser, AdHocTracker, SessionHistory) render correctly in the Intel Panel accordion. Verify the `prefers-reduced-motion` global CSS rule covers all new keyframes.

**Why:** This phase connects the independently built pieces. Keeping integration as a separate phase means Phase 3 and Phase 4 can proceed in parallel, and integration failures are isolated to wiring logic rather than mixed with component construction.

**Acceptance criteria:**
- Deliverables appear as MiniCards in correct tactical field zones based on status
- MiniCard single-click expands to full TcgCard inline in zone; second click flips; button selects for Intel Panel
- Selecting a card via button populates the Intel Panel with compact header + tabbed markdown viewer
- `--card-accent` CSS custom property set per card based on column/status color
- Rarity effects display correctly based on deliverable complexity
- Completed cards show hybrid treatment (50% opacity rarity + green glow + check icon)
- Deliverables without frontmatter render as Common/Feature MiniCards
- Terminal sessions, file preview, session history, chronicle browser, ad hoc tracker all function in the new layout
- `prefers-reduced-motion` disables all animations (verified manually)

---

### Phase 6: Transition Animations

**Agent:** frontend-developer

**What:** Add the two transition animations:

- **PackRevealAnimation:** Scale-up entrance + shimmer sweep triggered once for newly created deliverables. Uses `createdAt` field on `Deliverable` (added in Phase 1): if `createdAt` is within the last 60 seconds, animate on mount. The animation fires once per mount and does not repeat.

- **CompletionCelebration:** SVG checkmark draw + particle burst overlay triggered when a card's status transitions to `complete`. Detection uses `usePrevious` hook comparing previous and current status AND a recency gate (`lastModified` within last 60 seconds). This prevents false triggers on initial page load when completed deliverables are first rendered -- the celebration only fires on actual transitions, not on mount of already-complete cards.

Add `prefers-reduced-motion` matchMedia check for JS-driven animations.

**Why:** Animations are the final visual layer and depend on the card system and layout being fully wired. Separating them prevents animation work from blocking the core layout and card construction.

**Acceptance criteria:**
- New deliverables (created within last 60 seconds) animate in with pack reveal effect (once per mount)
- Completing a deliverable triggers the celebration animation only on actual status transition (not on initial load of already-complete cards)
- `usePrevious` + recency gate prevents false celebration triggers
- JS-driven animations respect `prefers-reduced-motion` matchMedia check
- No visual regressions in terminal, file viewer, or supplementary panels

---

### Phase 7: Performance Validation + Polish

**Agent:** frontend-developer, ui-ux-designer (review)

**What:** Conduct a final performance pass with the full War Table loaded with real deliverable data, profiling frame times to confirm the 15-card animated target holds in context (not just the Phase 2 isolated harness). Apply final polish: hover states, focus ring consistency across card variants, keyboard navigation for card flip (Enter/Space on expanded card) and zone traversal (arrow keys within zones). Verify WCAG AA contrast for all artifact pill foreground/background at rendered sizes and adjust if needed. Ensure all interactive card elements have focus rings. Verify that the `@keyframes` declarations in `globalCss` compile without TypeScript errors (apply `as any` cast if needed).

**Why:** The final performance pass validates that the Phase 2 stress test results hold in the real application context with all components wired together. Polish items are batched here to avoid disrupting the functional implementation phases.

**Acceptance criteria:**
- Frame time remains < 16ms with 15+ animated cards in the full War Table
- Keyboard navigation works for card flip (Enter/Space) and zone traversal (arrow keys)
- Focus rings visible on all interactive card elements
- Artifact pill contrast passes WCAG AA at rendered sizes
- `@keyframes` in globalCss compiles without TypeScript errors
- No visual regressions in terminal, file viewer, or supplementary panels

---

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| 1 | -- | backend-developer + frontend-developer | -- |
| 2 | Phase 1 (theme tokens for animation CSS) | frontend-developer | -- |
| 3 | Phase 2 (validated animation approach) | frontend-developer | Phase 4 |
| 4 | Phase 1 (store types, theme tokens) | frontend-developer | Phase 3 |
| 5 | Phase 3 + Phase 4 | frontend-developer | -- |
| 6 | Phase 5 | frontend-developer | -- |
| 7 | Phase 6 | frontend-developer + ui-ux-designer | -- |

---

## Approach Comparison

| Approach | Description | Key Tradeoff | Selected? |
|----------|-------------|-------------|-----------|
| A: Sequential | Build data layer, then cards top-to-bottom, then layout, then wire together. Simple dependency chain. | Slower total elapsed time -- no parallelism between card and layout work | No -- unnecessarily serializes independent work |
| B: Interleaved | Data + theme first, stress test gate, then card system and layout shell in parallel, then wire + animate + polish. | Requires a clear integration phase (Phase 5) to connect parallel streams | Yes -- maximizes parallel agent work while respecting the performance gate requirement |
| C: Layout-first | Build War Table shell first, then drop in cards incrementally. | Card component design would be constrained by layout assumptions before the card system is independently validated | No -- risks card design compromises to fit premature layout decisions |

## Agent Skill Loading

| Agent | Load These Skills |
|-------|------------------|
| frontend-developer | -- (no special skills needed) |
| backend-developer | -- (no special skills needed) |
| ui-ux-designer | -- (review role only) |
| software-architect | -- (review role only) |
| code-reviewer | -- (review role only) |

---

## Files

### New Files

| File | Phase | Purpose |
|------|-------|---------|
| `src/ui/utils/rarity.ts` | 1 | `complexityToRarity()` and `cardTypeToColor()` pure utility functions |
| `src/ui/hooks/usePrevious.ts` | 1 | Generic `usePrevious` hook for detecting state transitions (used by CompletionCelebration) |
| `src/ui/components/cards/TcgCard.tsx` | 3 | Full-size TCG card with five-zone anatomy |
| `src/ui/components/cards/MiniCard.tsx` | 3 | Compact card variant for tactical field zones (2-line clamp, expand-in-place) |
| `src/ui/components/cards/CardFlip.tsx` | 3 | 3D flip wrapper (front/back face toggle on expanded cards) |
| `src/ui/components/cards/GoldBorderWrap.tsx` | 3 | Animated gold gradient border wrapper for Epic/Mythic |
| `src/ui/components/cards/HoloOverlay.tsx` | 3 | Ref-based mouse-tracked holographic overlay for Mythic (always visible at rest) |
| `src/ui/components/cards/RarityEffects.tsx` | 3 | Complexity-to-rarity class mapper with hybrid completion treatment |
| `src/ui/components/cards/animations/CompletionCelebration.tsx` | 6 | SVG checkmark draw + particle burst (usePrevious + recency gate) |
| `src/ui/components/cards/animations/PackRevealAnimation.tsx` | 6 | Scale-up entrance + shimmer sweep (uses createdAt recency) |
| `src/ui/components/warTable/WarTable.tsx` | 4 | Top-level three-column layout (full DashboardProps minus wsUnsubscribe) |
| `src/ui/components/warTable/CommandBar.tsx` | 4 | 40px top bar with HUD stats + preset buttons (30/40/30, 45/25/30, 25/30/45) |
| `src/ui/components/warTable/TacticalField.tsx` | 4 | Center column with spatial zones (120px min Active Zone height) |
| `src/ui/components/warTable/IntelPanel.tsx` | 4 | Right column: full TcgCard view + "View Documents" tabbed strip + accordion panels |
| `src/ui/components/warTable/ColumnResizer.tsx` | 4 | Pointer-capture drag handle for column width adjustment (container ref for px-to-% conversion) |
| `src/ui/components/warTable/ZoneStrip.tsx` | 4 | Individual zone within tactical field (aria-labeled with purpose + card count) |
| `src/ui/__tests__/stress/` | 2 | Performance stress test harness (excluded from production build) |

### Modified Files

| File | Phase | Changes |
|------|-------|---------|
| `src/shared/types.ts` | 1 | Add `DeliverableType`, `DeliverableComplexity` (with `'arch'` not `'architecture'`), `RarityTier` types; extend `Deliverable` with `cardType`, `complexity`, `effort`, `flavor`, `createdAt` |
| `src/server/services/sdlcParser.ts` | 1 | Extend `FileInfo` with optional `content`; read spec file content in `scanDirectory()`; add `gray-matter` import + `parseFrontmatter()` call in `buildDeliverable()`; derive `createdAt` from earliest artifact mtime |
| `src/ui/theme/index.ts` | 1 | Add `cardType.*` color tokens, rarity gradient tokens (concrete hex values, `var(--card-accent)` for shimmer), card shadow tokens; `@keyframes` with `as any` cast if needed for TypeScript |
| `src/ui/stores/dashboardStore.ts` | 4 | Add `columnWidths`, `activePreset`, `zoneViewMode` (`'zones' \| 'list'`), `intelCardId` state + `setIntelCard(id)` action (decoupled from `setSelectedCard`/`previewOpen`) + typed selectors for all new fields |
| `src/ui/App.tsx` | 5 | Replace `Dashboard` import with `WarTable` |
| `package.json` | 1 | Add `gray-matter` dependency |

### Retired Files (no longer imported after Phase 5)

| File | Replaced By |
|------|-------------|
| `src/ui/components/kanban/DeliverableCard.tsx` | `TcgCard` + `MiniCard` |
| `src/ui/components/kanban/KanbanBoard.tsx` | `TacticalField` + `ZoneStrip` |
| `src/ui/components/kanban/KanbanColumn.tsx` | `ZoneStrip` |
| `src/ui/components/layout/Dashboard.tsx` | `WarTable` |

---

## Design Constraints

These constraints are collected from review findings and must be respected across all phases:

1. **`gray-matter` is backend-only.** Must never appear in any `src/ui/` file.
2. **`cardType.*` token namespace.** Not `type.*` -- avoids TypeScript keyword collision requiring bracket notation.
3. **No `var(--accent)` in tokens.** Use concrete hex values or `var(--card-accent)` (set per-component).
4. **`'arch'` not `'architecture'`** for Mythic complexity value -- avoids literal collision with `DeliverableType.architecture`.
5. **GPU-only animations.** All always-on animations use only `transform` and `opacity`. No `box-shadow` in keyframes.
6. **HoloOverlay is ref-based.** Mouse coordinate updates via `ref.current.style.setProperty()`, never React state.
7. **Pointer capture for resize.** `ColumnResizer` uses `setPointerCapture`/`releasePointerCapture`, not document-level mouse listeners.
8. **No barrel files for `cards/`.** Use direct imports matching existing codebase pattern.
9. **`prefers-reduced-motion`** must be checked for both CSS animations (media query) and JS-driven animations (matchMedia).
10. **Existing `prefers-reduced-motion` rule** in `theme/index.ts` (lines 183-189) blankets CSS animations. New keyframes must use standard `animation-duration`/`transition-duration` to be covered.

---

## Testing

### Manual Testing

1. Load the dashboard with a mix of deliverables (some with frontmatter, some without) and verify cards display correct rarity treatments
2. Click a MiniCard -- verify it expands to full TcgCard inline within the zone
3. Click the expanded card -- verify 3D flip animation plays
4. Click the Intel Panel selection button on a card -- verify Intel Panel shows compact deliverable header + full-height tabbed markdown viewer
5. Verify Intel Panel tabs provide Spec/Plan/Result markdown access; verify no TcgCard is rendered in the panel
6. Verify Intel Panel shows ghost prompt empty state when no card is selected
7. Hover over a Mythic card -- verify holographic tilt effect tracks mouse position; verify holo is visible at rest (base opacity)
8. Verify completed cards show hybrid treatment: dimmed rarity (50% opacity) + green glow + check icon
9. Use preset layout buttons -- verify columns snap to correct proportions (30/40/30, 45/25/30, 25/30/45)
10. Drag column resize handles -- verify minimum width (15%) is enforced and drag does not stick on pointer leave
11. Scroll within a tactical field zone that has more cards than visible space -- verify independent zone scroll
12. Verify terminal sessions work (create, type commands, see output) in the new left column position
13. Enable `prefers-reduced-motion` in OS settings -- verify all animations (CSS and JS-driven) are disabled
14. Navigate cards using keyboard only (Tab to focus, Enter/Space to flip expanded cards, Tab to Intel selection button, Enter to select)
15. Verify artifact pill text contrast is readable at rendered sizes (WCAG AA)
16. Verify Epic/Mythic cards have visible status indicator when gold border replaces left accent

### Automated Tests

- [ ] Unit tests: `complexityToRarity()` -- all complexity values including `undefined`
- [ ] Unit tests: `cardTypeToColor()` -- all type values including `undefined`
- [ ] Unit tests: Frontmatter parser -- valid YAML, missing frontmatter, malformed YAML, out-of-range effort, unknown type values
- [ ] Unit tests: `createdAt` derivation -- earliest mtime across multiple artifact files
- [ ] Component tests: TcgCard renders all five zones with provided data; renders gracefully with missing optional fields
- [ ] Component tests: MiniCard renders compact variant with 2-line clamp; correct rarity class applied
- [ ] Component tests: GoldBorderWrap renders wrapper for Epic/Mythic only, passes through for lower rarities
- [ ] Component tests: RarityEffects applies 50% opacity + green glow + check icon for completed cards
- [ ] Component tests: CardFlip toggles state on click

---

## Verification Checklist

- [ ] All implementation phases complete (1-7)
- [ ] Manual testing passes (all 16 scenarios)
- [ ] Automated tests pass
- [ ] Performance target met (< 16ms frame time with 15+ animated cards)
- [ ] `prefers-reduced-motion` disables all animations (CSS and JS-driven)
- [ ] No regressions in terminal, file viewer, or supplementary panels
- [ ] No new `any` types introduced
- [ ] All new Zustand state has typed selectors
- [ ] `setIntelCard` is decoupled from `setSelectedCard`/`previewOpen`
- [ ] Deliverables without frontmatter render as Common/Feature cards
- [ ] Gold border wrapper keeps card interiors dark and readable at Epic/Mythic
- [ ] Epic/Mythic cards retain visible status indicator (inner stripe or type bar tint)
- [ ] Completed cards show check icon alongside green glow (not color-only)
- [ ] All zone containers have `aria-label` with purpose and card count
- [ ] No `gray-matter` import in `src/ui/`
- [ ] No `var(--accent)` references in theme tokens

---

## Post-Execution Review

All work must be reviewed by:

- **frontend-developer** -- component architecture, Chakra/Zustand patterns, accessibility, performance
- **ui-ux-designer** -- visual fidelity to POC designs, rarity treatment readability, layout usability
- **software-architect** -- data model correctness, type safety, component hierarchy extensibility
- **code-reviewer** -- code quality, test coverage, no regressions

---

## Notes

- The POC files (`poc/tcg-cards.html`, `poc/tcg-war-table.html`) serve as the visual design reference for CSS patterns. The React implementation should produce visually identical results using Chakra style props (not `sx` -- Chakra v3 does not support `sx`). For complex CSS that cannot be expressed as Chakra style props (keyframe animations, pseudo-elements with `content`), use the global CSS approach already established in `theme/index.ts` via `globalCss`.
- The `gray-matter` library is the only new dependency, and it is backend-only. Card rarity effects, gold border wrapper, holographic overlay, and all animations are pure CSS + React.
- Column width persistence to `~/.mc/` is explicitly out of scope (spec Section 8). Session-only state in Zustand is sufficient.
- The existing `prefers-reduced-motion` rule in `theme/index.ts` (lines 183-189) already blankets all CSS animations. New keyframes must follow the same pattern (use standard `animation-duration` / `transition-duration` rather than custom timing mechanisms) to be covered. JS-driven animations (mouse tracking in HoloOverlay) must additionally check `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- Retired kanban components should not be deleted in Phase 5 -- they should be left in place with their imports removed from the active tree, allowing easy rollback if needed. Deletion is a follow-up cleanup task.
- ShimmerSweep is CSS-only, defined as `@keyframes` in `globalCss` within `theme/index.ts` -- not a separate component file.
- `@keyframes` declarations in `globalCss` may require `as any` TypeScript cast for compatibility.
