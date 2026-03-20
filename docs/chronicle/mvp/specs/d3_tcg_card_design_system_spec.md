---
tier: full
type: feature
complexity: complex
effort: 4
flavor: "Every deliverable deserves a card worth collecting."
created: 2026-03-17
author: CC
depends_on: [D1, D2]
agents: [software-architect, ui-ux-designer, frontend-developer]
---

# D3: TCG Card Design System + War Table Layout — Specification

---

## 1. Problem Statement

Mission Control's current deliverable cards are flat, status-badge-based rectangles that communicate only ID, name, status, and timestamps. They do not visually encode type of work (feature vs. bugfix), complexity/impact, effort, or flavor text. The current kanban + bottom-terminal layout splits attention between a horizontal board and a stacked terminal panel, giving neither the terminal nor the document viewer hero status.

This deliverable introduces a TCG (Trading Card Game) visual metaphor for deliverables and replaces the current Dashboard layout with a three-column "War Table" command room. The goal is to make deliverables visually self-describing — communicating type, status, complexity, and effort at a glance — while giving the terminal and document viewer first-class screen real estate.

---

## 2. Requirements

### Functional

- [ ] Deliverable cards display five zones: identity (ID + name + effort pips), type bar (type + status), ability text (description + flavor), artifact pills, stat block (impact/effort + set symbol)
- [ ] Cards receive visual rarity treatments based on complexity: Common (S), Uncommon (M), Rare (L), Epic (XL), Mythic (Architecture)
- [ ] Rarity animations are always-on (not hover-only): Uncommon foil ID animates continuously, Rare border shimmers continuously, Epic gold border animates continuously, Mythic holographic overlay is always visible (mouse tracking adds tilt on hover)
- [ ] Gold border wrapper technique for Epic/Mythic: a separate `<div>` wraps the card to provide the animated gold frame, keeping card interiors dark and readable
- [ ] YAML frontmatter in spec files is parsed to extract `type`, `complexity`, `effort`, and `flavor` fields
- [ ] Frontmatter format uses standard `---` YAML delimiters at the top of markdown files
- [ ] Sensible defaults when frontmatter is missing: `type: feature`, `complexity: S` (Common), `effort: 1`, `flavor: ""` (hidden)
- [ ] Completion celebration animation: SVG checkmark draw + particle burst when a card transitions to complete status
- [ ] Completed card treatment uses a hybrid approach: the card's rarity treatment renders at 50% opacity (preserving visual identity), overlaid with a green glow and a check icon — completion is legible without erasing rarity
- [ ] Pack opening reveal animation: scale-up entrance + shimmer sweep for newly created deliverables
- [ ] War Table replaces the current Dashboard with three resizable columns: terminal (left ~30%), tactical field (center ~40%), intel panel (right ~30%)
- [ ] Command bar (top, 40px): project info, sprint phase indicator, HUD-style stats
- [ ] Tactical field provides spatial zones: Deck (Ideas), Active Zone (Spec/Plan/In-Progress), Review strip, Graveyard (Complete)
- [ ] Intel panel shows a compact deliverable header (ID, name, status, type/rarity) at the top, followed by a full-height tabbed markdown viewer for associated files (spec, plan, result). No TcgCard is rendered in the intel panel — card info lives in the tactical field.
- [ ] Column widths are resizable via both drag handles (`ColumnResizer`) between columns for fine-grained control, and via preset layout toggle buttons in the command bar ("Terminal Focus" 45/25/30, "Balanced" 30/40/30, "Intel Focus" 25/30/45)
- [ ] Cards work in both full-size (intel panel detail view / future binder) and mini-size (tactical field) variants
- [ ] MiniCard interaction in the tactical field uses an expand-in-place model: a single click expands the MiniCard to a full TcgCard inline within the zone. A second click on the expanded card triggers the flip to the back face (SDLC timeline). A dedicated "Select" button on the card (front or back face) loads the card into the Intel Panel. This three-gesture model avoids conflating expand, flip, and select.
- [ ] Card flip animation: clicking an expanded TcgCard flips it to reveal the back face showing the SDLC timeline (stage progression with dates) and extended flavor text. The flip uses a CSS 3D `rotateY(180deg)` transform with `backface-visibility: hidden` on both faces. Already prototyped in `poc/tcg-cards.html`.

### Non-Functional

- [ ] Performance: Always-on animations must not cause jank with 15+ visible cards; target <16ms frame time on mid-tier hardware
- [ ] Accessibility: `prefers-reduced-motion` disables all animations (existing global CSS rule must cover new keyframes)
- [ ] Readability: All text remains legible at every rarity tier — gold/shimmer treatments apply to frame and ID only, never flooding card interior backgrounds
- [ ] Extensibility: New rarity tiers or card zones can be added without restructuring the component hierarchy

---

## 3. Scope

### Components Affected

- [ ] `src/shared/types.ts` — Deliverable interface extension, new enums
- [ ] `src/server/services/sdlcParser.ts` — YAML frontmatter extraction from spec files
- [ ] `src/ui/theme/index.ts` — New token categories for rarity, type, card anatomy
- [ ] `src/ui/components/kanban/DeliverableCard.tsx` — Full redesign into TCG card anatomy
- [ ] `src/ui/components/layout/Dashboard.tsx` — Replace with War Table three-column layout
- [ ] `src/ui/components/layout/StatsBar.tsx` — Adapt to command bar format
- [ ] New: `src/ui/components/cards/` — Card component family (TcgCard, MiniCard, CardFlip, GoldBorderWrap, HoloOverlay, RarityEffects)
- [ ] New: `src/ui/components/warTable/` — War Table layout components (WarTable, TacticalField, IntelPanel, CommandBar, ZoneStrip)
- [ ] New: `src/ui/components/cards/animations/` — Celebration, PackReveal, ShimmerSweep
- [ ] `src/ui/stores/dashboardStore.ts` — Adapt state for War Table layout (column widths, active zone, selected card context)

### Domain Scope

- [ ] Frontend: Card component system, layout overhaul, theme tokens, animation system
- [ ] Backend: SDLC parser frontmatter extraction only — no new routes or WebSocket messages needed
- [ ] Shared: Type extensions propagate through existing WebSocket update pipeline

### Data Model Changes

Extend `Deliverable` interface in `src/shared/types.ts`:

```typescript
export type DeliverableType = 'feature' | 'bugfix' | 'refactor' | 'architecture' | 'research';

export type DeliverableComplexity = 'S' | 'M' | 'L' | 'XL' | 'arch';
// Note: 'arch' is used instead of 'architecture' to avoid string literal collision with DeliverableType.architecture.

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic';

export interface Deliverable {
  id: string;
  name: string;
  status: DeliverableStatus;
  phase: DeliverablePhase;
  specPath?: string;
  planPath?: string;
  resultPath?: string;
  lastModified: string;
  createdAt: string;        // ISO date string; derived from earliest artifact file mtime, or current time for catalog-only entries
  catalog?: CatalogEntry;
  // New TCG fields
  type?: DeliverableType;
  complexity?: DeliverableComplexity;
  effort?: number;         // 1-5 scale, displayed as energy pips
  flavor?: string;         // Italic flavor text on card
}
```

Complexity-to-rarity mapping (derived, not stored):

| Complexity | Rarity Tier | Visual Treatment |
|------------|-------------|------------------|
| `S`        | Common      | Plain card, no effects |
| `M`        | Uncommon    | Silver foil animated ID text |
| `L`        | Rare        | Shimmer border strip + gold foil ID |
| `XL`       | Epic        | Animated gold gradient border wrapper + gold foil ID |
| `arch`         | Mythic  | Gold border wrapper + holographic overlay with mouse-tracked tilt |

### Interface / Adapter Changes

**Parser output change:** `parseDeliverables()` return type gains optional fields (`type`, `complexity`, `effort`, `flavor`). Existing consumers receive `undefined` for these fields until frontmatter is added to spec files — no breaking change.

**No new REST endpoints.** No new WebSocket message types. The existing `watcher:sdlc` update pipeline carries the enriched Deliverable objects automatically.

---

## 4. Design

### Approach

The work divides into four layers, each independently testable:

1. **Data layer** — Extend types, add frontmatter parser to `sdlcParser.ts`
2. **Theme layer** — Add rarity/type/card tokens to the Chakra theme
3. **Card component layer** — Build the TCG card family (full-size + mini variants, rarity wrappers, animations)
4. **Layout layer** — Replace Dashboard with War Table shell, wire up existing terminal/preview/supplementary panels into the new three-column structure

### Key Components

| Component | Purpose |
|-----------|---------|
| `TcgCard` | Full-size TCG card with five-zone anatomy. Used in intel panel detail view and future contexts (binder, shop). |
| `MiniCard` | Compact card for tactical field zones. Shows ID, name, effort pips, type dot, status. Rarity effects scaled down. |
| `GoldBorderWrap` | Wrapper div providing animated gold gradient border for Epic/Mythic cards. Keeps card interior dark. |
| `HoloOverlay` | Absolute-positioned overlay for Mythic cards. Renders rainbow gradient keyed to `--pointer-x`/`--pointer-y` CSS custom properties. Mouse-tracked on hover. |
| `RarityEffects` | Logic component that maps `complexity` to the correct rarity class and animation set. Pure derivation, no side effects. |
| `CardFlip` | Wrapper providing 3D flip between front face (TcgCard) and back face (SDLC timeline + flavor). Click-triggered. Uses `backface-visibility: hidden` on both faces. |
| `PackRevealAnimation` | Entry animation for newly created deliverables: scale-up + shimmer sweep. Triggered once on mount when `isNew` flag is set. |
| `CompletionCelebration` | SVG checkmark draw + particle burst overlay. Triggered when status transitions to `complete`. After animation settles, the card enters its completed visual state: rarity treatment at 50% opacity + green glow + check icon overlay. |
| `WarTable` | Top-level layout replacing `Dashboard`. Three resizable columns + command bar. |
| `CommandBar` | 40px top bar: project switcher, phase indicator pill, HUD stats (active/review/complete counts), and preset layout toggle buttons (e.g., "Terminal Focus" 45/25/30, "Balanced" 30/40/30, "Intel Focus" 25/30/45). |
| `TacticalField` | Center column. Renders spatial zones (Deck, Active Zone, Review Strip, Graveyard) with cards distributed by status. Supports zones view and list view toggle. |
| `IntelPanel` | Right column. Compact deliverable header (ID, name, status, type/rarity) at top, followed by full-height tabbed markdown viewer for spec/plan/result files. No TcgCard rendered — card detail lives in tactical field expand-in-place. Secondary accordion panels (session history, ad hoc tracker, chronicle browser) collapse beneath. |
| `ColumnResizer` | Drag handle between columns. Updates column width percentages in store. Minimum column widths enforced (15%). |

### Data Model (if applicable)

**YAML frontmatter format in spec files:**

```yaml
---
type: feature
complexity: M
effort: 3
flavor: "Every commit tells a story"
---
# D3: TCG Card Design System ...
```

**Rarity derivation utility (pure function, no component):**

```typescript
export function complexityToRarity(complexity?: DeliverableComplexity): RarityTier {
  switch (complexity) {
    case 'M': return 'uncommon';
    case 'L': return 'rare';
    case 'XL': return 'epic';
    case 'arch': return 'mythic';
    default: return 'common';
  }
}
```

**Type-to-color mapping:**

| Type | Color | Token |
|------|-------|-------|
| Feature | `#F59E0B` (amber) | `type.feature` |
| Bugfix | `#A78BFA` (violet) | `type.bugfix` |
| Refactor | `#E879A8` (pink) | `type.refactor` |
| Architecture | `#60A5FA` (blue) | `type.architecture` |
| Research | `#34D399` (green) | `type.research` |

### Theme Token Additions

New token categories to add to `src/ui/theme/index.ts`:

```typescript
// Type colors
'type.feature': { value: '#F59E0B' },
'type.bugfix': { value: '#A78BFA' },
'type.refactor': { value: '#E879A8' },
'type.architecture': { value: '#60A5FA' },
'type.research': { value: '#34D399' },

// Rarity treatment tokens
'rarity.uncommon.foil': { value: 'linear-gradient(135deg, #888, #ccc 25%, #999 50%, #ddd 75%, #aaa)' },
'rarity.rare.shimmer': { value: 'linear-gradient(180deg, var(--card-accent) 0%, #fff 50%, var(--card-accent) 100%)' },
// Note: --card-accent is a CSS custom property set per-card at the component level, not a global token.
'rarity.epic.gold': { value: 'linear-gradient(135deg, #b8860b 0%, #ffd700 20%, #b8860b 40%, #ffe44d 60%, #b8860b 80%, #ffd700 100%)' },
'rarity.mythic.holo': { value: 'linear-gradient(110deg, rgba(168,85,247,0.15), rgba(59,130,246,0.15), rgba(16,185,129,0.15), rgba(245,158,11,0.15), rgba(239,68,68,0.15))' },

// Card shadows
'shadow.card.common': { value: '0 2px 4px rgba(6,15,28,0.6), 0 1px 2px rgba(6,15,28,0.7)' },
'shadow.card.epic': { value: '0 4px 16px rgba(184,134,11,0.2), 0 2px 4px rgba(6,15,28,0.7)' },
'shadow.card.mythic': { value: '0 8px 24px rgba(168,85,247,0.15), 0 0 60px rgba(59,130,246,0.08)' },
```

### Frontmatter Parser Design

Add to `sdlcParser.ts`:

```typescript
interface FrontmatterData {
  type?: DeliverableType;
  complexity?: DeliverableComplexity;
  effort?: number;
  flavor?: string;
}

function parseFrontmatter(content: string): FrontmatterData {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  // Parse YAML key-value pairs from match[1]
  // Validate type against enum, clamp effort to 1-5
  // Return parsed data with invalid values omitted (not defaulted)
}
```

The parser reads spec file content and extracts frontmatter. This function is called inside `buildDeliverable()` when a spec file exists. Note: `scanDirectory()` currently only calls `fs.stat()`; Phase 1 must add `fs.readFile()` for spec-type files to extract frontmatter.

**Library decision:** `gray-matter` is the approved YAML frontmatter parser for this system. It is battle-tested, handles edge cases (multi-line strings, special characters) that hand-rolled regex would not, and the ~50KB dependency is acceptable for this use case. The spec requires that standard `---`-delimited YAML is supported and that malformed frontmatter degrades gracefully (returns empty object, does not throw).

### API (if applicable)

No new API endpoints. The existing REST endpoint `GET /api/sdlc/deliverables` returns the enriched objects. The existing `watcher:sdlc` WebSocket channel pushes updates with the new fields included.

---

## 5. Testing Strategy

- [ ] **Unit tests:** Frontmatter parser — valid YAML, missing frontmatter, malformed YAML, out-of-range effort values, unknown type values
- [ ] **Unit tests:** `complexityToRarity()` mapping function — all complexity values including undefined
- [ ] **Unit tests:** Type-to-color mapping utility
- [ ] **Component tests:** TcgCard renders all five zones with provided data; renders gracefully with missing optional fields
- [ ] **Component tests:** MiniCard renders compact variant; rarity class applied correctly
- [ ] **Component tests:** GoldBorderWrap renders wrapper div around children for Epic/Mythic only
- [ ] **Component tests:** CardFlip toggles between front and back on click; backface is hidden during transition
- [ ] **Visual regression:** Screenshot tests for each rarity tier (Common through Mythic) to prevent visual drift
- [ ] **Performance:** Manual profiling with 15+ animated cards visible; document frame time in result doc
- [ ] **Manual QA:** Verify `prefers-reduced-motion` disables all new animations
- [ ] **Manual QA:** War Table layout with column resizing; verify min/max width constraints
- [ ] **Manual QA:** Terminal and markdown viewer remain fully functional in new layout positions
- [ ] **Integration:** Existing WebSocket pipeline delivers enriched Deliverable objects to UI without new subscription logic

---

## 6. Success Criteria

- [ ] Deliverable cards visually communicate type, status, complexity, and effort at a glance without reading text
- [ ] The War Table layout gives terminal and markdown viewer hero status while maintaining spatial awareness of all deliverables
- [ ] Rarity treatments create a visual reward system where higher-impact work looks more impressive
- [ ] All existing functionality (terminal sessions, file preview, session history, chronicle browser, ad hoc tracker) works in the new layout without regression
- [ ] Always-on animations maintain <16ms frame time with 15 visible animated cards
- [ ] `prefers-reduced-motion` fully disables all animations
- [ ] The card design system is extensible: adding a new rarity tier or card zone does not require restructuring existing components
- [ ] Spec files without frontmatter render as Common/Feature cards with effort 1 — no errors, no blank fields

---

## 7. Constraints

- **Performance:** CSS animations must use `transform` and `opacity` only (GPU-composited properties) to avoid layout thrashing. No JavaScript-driven animation loops except for mouse-tracked Mythic tilt.
- **Readability:** Gold/shimmer treatments are restricted to the border wrapper and ID text. Card body background remains `bg.elevated` (#1C2333) at all rarity tiers.
- **Backwards compatibility:** Deliverables without frontmatter must render identically to how they appear today (modulo the new card layout). The new fields are additive; no existing field semantics change.
- **Single process:** Frontmatter parsing adds file reads to the SDLC scan. Spec file content must be read anyway for the existing pipeline; the parser piggybacks on this read, not a separate I/O pass.
- **No new dependencies for the card system.** Rarity effects, animations, and the gold border wrapper are pure CSS + React. The one exception is `gray-matter` for YAML frontmatter parsing — this dependency is approved (see Section 9).

---

## 8. Out of Scope

- **Drag-and-drop** between tactical field zones (future deliverable)
- **Persistent column width preferences** saved to `~/.mc/` (can be added later; session-only state is sufficient for D3)
- **Custom user themes / rarity customization** (future deliverable)
- **Remote/multiplayer War Table** (out of architectural scope — local-only tool)
- **Sound effects** for pack opening or completion celebrations
- **Card collection / binder view** (the card components will support it, but the view itself is a separate deliverable)
- **Changes to `.mc.json` config schema** — the column definitions in config continue to work for status grouping, but the War Table's tactical field zones are status-based, not config-driven

---

## 9. Open Questions / Unknowns

Each item below was an open question during spec drafting. All five are now decided.

- [x] **Decided:** Performance of always-on CSS animations with 15+ cards visible simultaneously
  - **Decision:** The performance unknown remains accepted — always-on animations with 15+ cards are a known risk on lower-end hardware.
  - **Rationale:** Eliminating always-on animations would undermine the core design intent (rarity tiers as a visual reward system). The risk is mitigated by requiring a performance stress test phase early in implementation.
  - **Plan requirement:** The plan must include an explicit stress test phase (20 animated cards on a test page) before the card system is wired into the full layout. If frame time exceeds 16ms, reduce animation complexity for Common/Uncommon tiers first (they have the most cards). Consider `will-change` hints and `contain: layout style paint` on card containers.

- [x] **Decided:** Frontmatter parser library
  - **Decision:** Use `gray-matter` (npm package).
  - **Rationale:** Battle-tested, handles YAML edge cases (multi-line strings, special characters) that hand-rolled regex would miss. The ~50KB bundle cost is acceptable. This is the one approved new dependency for the card system (constraint in Section 7 updated accordingly).

- [x] **Decided:** Tactical field zone overflow behavior
  - **Decision:** Each zone scrolls independently when it has more cards than can fit. Zone heights remain fixed. Spatial overview of other zones is preserved.
  - **Rationale:** Fixed zone heights keep the tactical field predictable as a spatial map. Independent scroll per zone means a crowded Active Zone does not collapse other zones. The POC's ghost "No items" state remains the design for empty zones.

- [x] **Decided:** Column resize interaction model
  - **Decision:** Both presets and drag handles. The command bar provides preset layout toggle buttons ("Terminal Focus" 45/25/30, "Balanced" 30/40/30, "Intel Focus" 25/30/45) for one-click layout switching. Drag handles (`ColumnResizer`) between columns allow fine-grained adjustment.
  - **Rationale:** Presets serve the common case quickly; drag handles serve power users who want precise control. The existing `onResizeStart` pattern in `Dashboard.tsx` gives the backend of drag-based resize a foundation to build from.

- [x] **Decided:** Mythic holographic mouse-tracking vs. card click/select behavior
  - **Decision:** Mouse movement over a Mythic card triggers the tilt (holographic) effect. In the tactical field, a single click on a MiniCard expands it to a full TcgCard inline (expand-in-place). A second click on the expanded card flips it to the back face (SDLC timeline). A dedicated "Select" button on the card (front or back) loads the card into the Intel Panel. This three-gesture model — expand, flip, select — avoids all gesture ambiguity.
  - **Rationale:** Expand-in-place gives the user a preview of card detail without displacing the Intel Panel, which may already have a selected card loaded. Separating select (explicit button) from flip (second click) means the Intel Panel only updates on deliberate intent. Mouse-tracked tilt uses CSS custom properties (`--pointer-x`, `--pointer-y`) updated via `onMouseMove`; browser rendering pipeline batches these updates, so debounce/throttle is not needed.
