---
tier: full
type: feature
complexity: complex
effort: 4
flavor: "The cards are printed. The collection grows."
created: 2026-03-17
completed: 2026-03-17
author: CC
---

# D3: TCG Card Design System + War Table Layout — Result

**Spec:** `d3_tcg_card_design_system_spec.md`

---

## Summary

Implemented a TCG (Trading Card Game) visual metaphor for deliverable cards and replaced the Dashboard layout with a three-column "War Table" command room. The system maps deliverable complexity to five rarity tiers (Common through Mythic) with GPU-only animations, and provides a spatial tactical field with four zones (Deck, Active, Review, Graveyard).

---

## What Was Built

### Data Layer
- Extended `Deliverable` type with `cardType`, `complexity`, `effort`, `flavor`, `createdAt`
- Added `gray-matter` frontmatter parser to extract TCG metadata from spec files (backend-only)
- Derived `createdAt` from earliest artifact file mtime

### Card Component System (6 components)
- **TcgCard** — Full 5-zone card anatomy (identity, type bar, ability text, artifact pills, stat block)
- **MiniCard** — Compact variant with 2-line clamp, expand-in-place, three-gesture model (expand → flip → select)
- **CardFlip** — 3D CSS rotateY flip wrapper with backface-visibility
- **GoldBorderWrap** — Animated gold gradient border for Epic/Mythic tiers
- **HoloOverlay** — Ref-based mouse-tracked holographic overlay for Mythic (visible at rest)
- **RarityEffects** — Complexity-to-rarity mapper with hybrid completion treatment (70% opacity + green glow + check icon)

### War Table Layout (6 components)
- **WarTable** — Three-column layout replacing Dashboard (terminal / tactical field / intel panel)
- **CommandBar** — 40px HUD bar with project switcher, stats, preset layout buttons
- **TacticalField** — Four spatial zones distributing deliverables by status
- **IntelPanel** — Option B: compact header + full-height tabbed markdown viewer (no TcgCard)
- **ColumnResizer** — Pointer-capture drag handle with 15% minimum column width
- **ZoneStrip** — Individual zone with aria-labels, independent scroll, arrow key navigation

### Transition Animations (2 components)
- **PackRevealAnimation** — Scale-up entrance + shimmer for cards created within 60 seconds
- **CompletionCelebration** — SVG checkmark draw + particle burst on status transition (usePrevious + recency gate)

### Theme & Utilities
- Card-type color tokens (`cardType.*` namespace), rarity gradient tokens, card shadow tokens
- 8 GPU-only `@keyframes` in globalCss (foilShift, shimmerSweep, goldPulse, holoPulse, packRevealScale, packRevealShimmer, drawCheck, burstParticle)
- Centralized `STATUS_ACCENT`, `ARTIFACT_PILL_STYLES`, `TYPE_LABELS` constants
- `complexityToRarity()` and `cardTypeToColor()` utilities
- `usePrevious` hook

---

## Design Decisions

- **Intel Panel Option B** chosen over Option C (late change): compact header + markdown viewer instead of full TcgCard in the panel. Card detail lives in tactical field expand-in-place.
- **IMP stat removed** from TcgCard stat block — no `impact` field exists on Deliverable. Only EFF (effort) is shown.
- **Completed card opacity** set to 70% (not 50%) for text readability, with check icon in top-right corner (not center).
- **Uncommon foil** made more visible (opacity 0.10 + accent border glow) to distinguish from Common.
- **Terminal resize** converted from document-level listeners to pointer capture, matching ColumnResizer pattern.
- **Retired kanban components** left in place with imports removed — not deleted, allowing easy rollback.

---

## Worker Agent Reviews

Key feedback incorporated:

- [code-reviewer] complexityToRarity mapping was inverted (arch→epic instead of arch→mythic) — fixed to match spec's design constraint
- [code-reviewer] MiniCard three-gesture model was broken (expand jumped directly to flipped state) — fixed with local flipped state and proper front/back face assignment
- [code-reviewer] WarTable terminal resize used document-level listeners causing stuck-drag bug — converted to pointer capture pattern
- [code-reviewer] statusToAccent map was triplicated across 3 files — centralized in rarity.ts with ARTIFACT_PILL_STYLES and TYPE_LABELS
- [code-reviewer] ColumnResizer was missing onPointerCancel handler — added to prevent stuck drags on touch cancel
- [code-reviewer] IntelPanel retryLoad used setTimeout(0) anti-pattern — replaced with retryCount state
- [code-reviewer] Sub-deliverable sort was unstable (D3a/D3b both parsed to 3) — added localeCompare fallback
- [frontend-developer] Select button click bubbled through CardFlip onClick causing simultaneous flip+select — added stopPropagation
- [frontend-developer] IntelPanel accepted 4 unused WebSocket props — removed from interface
- [frontend-developer] MiniCard border shorthand conflict for epic/mythic — fixed property ordering
- [ui-ux-designer] Common and Uncommon cards were visually indistinguishable — increased foil opacity and added accent border glow
- [ui-ux-designer] Completed card 50% opacity made text unreadable — increased to 70%, moved check icon to top-right corner
- [ui-ux-designer] IntelPanel tab buttons and CommandBar preset buttons missing keyboard focus rings — added _focusVisible
- [software-architect] Silent frontmatter parse failures produced no logging — added console.warn
- [software-architect] IntelPanel unused WS props created dead interface surface — removed

---

## Files Changed

### New Files (17)
| File | Purpose |
|------|---------|
| `src/ui/utils/rarity.ts` | complexityToRarity, cardTypeToColor, centralized constants |
| `src/ui/hooks/usePrevious.ts` | Generic usePrevious hook |
| `src/ui/components/cards/TcgCard.tsx` | Full-size TCG card |
| `src/ui/components/cards/MiniCard.tsx` | Compact card with expand-in-place |
| `src/ui/components/cards/CardFlip.tsx` | 3D flip wrapper |
| `src/ui/components/cards/GoldBorderWrap.tsx` | Gold border for Epic/Mythic |
| `src/ui/components/cards/HoloOverlay.tsx` | Ref-based holographic overlay |
| `src/ui/components/cards/RarityEffects.tsx` | Rarity class mapper + completion treatment |
| `src/ui/components/cards/animations/PackRevealAnimation.tsx` | New card entrance animation |
| `src/ui/components/cards/animations/CompletionCelebration.tsx` | Status transition celebration |
| `src/ui/components/warTable/WarTable.tsx` | Three-column War Table layout |
| `src/ui/components/warTable/CommandBar.tsx` | HUD top bar with presets |
| `src/ui/components/warTable/TacticalField.tsx` | Four-zone tactical field |
| `src/ui/components/warTable/IntelPanel.tsx` | Compact header + tabbed markdown viewer |
| `src/ui/components/warTable/ColumnResizer.tsx` | Pointer-capture column drag handle |
| `src/ui/components/warTable/ZoneStrip.tsx` | Individual zone with a11y |
| `src/ui/__tests__/stress/CardStressTest.tsx` | Performance stress test harness |

### Modified Files (6)
| File | Changes |
|------|---------|
| `src/shared/types.ts` | Added DeliverableType, DeliverableComplexity, RarityTier; extended Deliverable |
| `src/server/services/sdlcParser.ts` | gray-matter parsing, createdAt, console.warn on errors, stable sub-deliverable sort |
| `src/ui/theme/index.ts` | Card tokens, rarity gradients, 8 keyframes, zone scrollbar styles, spin/xterm in globalCss |
| `src/ui/stores/dashboardStore.ts` | columnWidths, activePreset, zoneViewMode, intelCardId + actions |
| `src/ui/App.tsx` | Dashboard → WarTable swap |
| `package.json` | Added gray-matter dependency |

### Retired Files (4, imports removed only)
| File | Replaced By |
|------|-------------|
| `src/ui/components/kanban/DeliverableCard.tsx` | TcgCard + MiniCard |
| `src/ui/components/kanban/KanbanBoard.tsx` | TacticalField + ZoneStrip |
| `src/ui/components/kanban/KanbanColumn.tsx` | ZoneStrip |
| `src/ui/components/layout/Dashboard.tsx` | WarTable |
