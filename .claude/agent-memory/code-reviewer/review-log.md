---
name: Review Log
description: Running log of completed reviews — date, deliverable ID, files reviewed, key findings
type: project
---

## 2026-03-17 — D3 ad hoc: POC Styling Alignment — Round 3 final pass

**Deliverable:** D3 ad hoc (no new ID)
**Scope:** Final pass — verify MiniCard Rare border fix from round 2, sweep for new regressions
**Files reviewed:** CommandBar.tsx, TcgCard.tsx, GoldBorderWrap.tsx, RarityEffects.tsx, MiniCard.tsx, theme/index.ts

**Fix verification:**
- MiniCard Rare border (round 2 new finding): FIXED. Line 96 now reads `(isEpicOrMythic || rarity === 'rare') ? 'none' : ...`, matching TcgCard line 95 exactly.

**New findings:**
- MEDIUM-1: GoldBorderWrap (line 31) references `goldPulse` keyframe, which animates opacity. The component sets `backgroundSize: '300% 300%'` implying a gradient sweep was intended, but `goldPulse` never changes `background-position`. The `foilShiftBg` keyframe animates backgroundPosition and would produce the intended effect. Visual result: Epic/Mythic gold border breathes in opacity instead of sweeping.
- MEDIUM-2: GoldBorderWrap inner clip Box (line 38) hardcodes `#1C2333` (bg.surface). MiniCard body uses `#232D3F` (bg.elevated). On Epic/Mythic MiniCards the 3px padding gap shows `#1C2333` against a `#232D3F` card face — a visible darker seam inside the gold border. TcgCard is unaffected (uses #1C2333 matching the clip color).
- LOW-1: GoldBorderWrap `_hover` (line 26) and MiniCard `_hover` (line 100) both fire independently on Epic/Mythic MiniCards. The two hover effects stack (opacity ring + translateY + card shadow) without coordination or documentation.

**Patterns learned:**
- GoldBorderWrap serves both TcgCard (surface color #1C2333) and MiniCard (elevated color #232D3F). It cannot safely hardcode either — the inner clip color should accept a prop or use a CSS variable.
- When a keyframe name is referenced as a string animation value, always verify the keyframe's actual property list matches the component's CSS context (e.g., backgroundSize set → backgroundPosition must animate, not opacity).

---

## 2026-03-17 — D3 ad hoc: POC Styling Alignment — Round 2 re-review (post-fix verification)

**Deliverable:** D3 ad hoc (no new ID)
**Scope:** Re-review after three targeted fixes: (1) suppressLeftBorder → self-detection for Rare in TcgCard, (2) _hover conditional for Epic/Mythic, (3) unused import React in RarityEffects
**Files reviewed:** CommandBar.tsx, TcgCard.tsx, GoldBorderWrap.tsx, RarityEffects.tsx, MiniCard.tsx, theme/index.ts, rarity.ts (dependency read), TacticalField.tsx (MiniCard consumer)

**Fix verification:**
1. M1 (suppressLeftBorder/cloneElement): FIXED. TcgCard line 95 self-detects `rarity === 'rare'` to suppress left border. RarityEffects has no cloneElement and no suppressLeftBorder prop.
2. M4 (_hover double-shadow): FIXED. TcgCard line 111 is `_hover={isEpicOrMythic ? undefined : { ... }}`.
3. Unused import React: FIXED. RarityEffects line 1 imports only `type ReactNode`.

**Remaining open findings (not in scope for this fix pass):**
- M2 (will-change on foilShiftBg/borderShimmer): still unresolved
- M3 (idGradientStyle IIFE duplicated in TcgCard and MiniCard): still unresolved
- M5 (RarityEffects JSDoc line 20 wrong keyframe name and mechanism): still unresolved
- M6 (CardStressTest keyframe catalog stale at line 444): still unresolved
- L1 (CommandBar scan-line Box redundant h="40px"): still present
- L2 (hover glow literal in 3 files): still present

**New finding introduced by fix:**
- MEDIUM (NEW): MiniCard Rare border asymmetry — TcgCard now suppresses left border for Rare (`isEpicOrMythic || rarity === 'rare'`), but MiniCard line 96 only suppresses for `isEpicOrMythic`. A Rare MiniCard shows a solid `3px solid ${accent}` left border with no shimmer animation, while the same card expanded (as TcgCard) shows the borderShimmer stripe and no solid border. No comment documents whether this is intentional at mini scale.

**Patterns learned:**
- Self-detection fixes applied to TcgCard must be verified against MiniCard in parallel — both components have inline border logic that must stay consistent for shared rarity tiers.

---

## 2026-03-17 — D3 ad hoc: POC Styling Alignment — Post-execution code review

**Deliverable:** D3 ad hoc (no new ID)
**Scope:** Post-execution review of 5 changed files: CommandBar.tsx, TcgCard.tsx, GoldBorderWrap.tsx, RarityEffects.tsx, theme/index.ts
**Files reviewed:** CommandBar.tsx, TcgCard.tsx, GoldBorderWrap.tsx, RarityEffects.tsx, theme/index.ts, MiniCard.tsx (unmodified, confirmed), HoloOverlay.tsx (unmodified, confirmed), CardStressTest.tsx (regression check)

**Key findings:**
- MEDIUM (M1): `suppressLeftBorder` via `React.cloneElement` shipped despite ui-ux-designer plan note explicitly superseding it in favor of self-detection. `cloneElement` silently fails if children is not a single element — double-border corruption risk.
- MEDIUM (M2): `foilShiftBg` and `borderShimmer` animate `background-position` (not GPU-compositable). `will-change: background-position` agreed to in plan as mitigation for MiniCard — never landed.
- MEDIUM (M3): `idGradientStyle` IIFE block duplicated verbatim between TcgCard.tsx and MiniCard.tsx — belongs in rarity.ts as a shared utility.
- MEDIUM (M4): TcgCard's `_hover` shadow is dead for Epic/Mythic cards because `overflow: hidden` on both GoldBorderWrap's inner wrapper and TcgCard's root clip outward box-shadow. Not a regression — pre-existing overflow — but the `_hover` on TcgCard reads as functional when it isn't.
- MEDIUM (M5): RarityEffects JSDoc line 20 says "foilShift on card ID via CSS class" — both wrong (keyframe is foilShiftBg, mechanism is inline style).
- MEDIUM (M6): CardStressTest keyframe catalog (line 444) and GPU label (line 445) are stale — foilShiftBg and borderShimmer unlisted.
- LOW (L1): Scan-line Box in CommandBar has redundant explicit `h="40px"` alongside `inset="0"`.
- LOW (L2): Hover glow literal `0 0 0 1px rgba(47,116,208,0.15)` in 3 files with no shared constant.
- CONFIRMED: shimmerSweep, foilShift keyframes untouched. MiniCard/HoloOverlay unmodified. No overflow on CommandBar root.

**Patterns learned:**
- Plan Worker Agent Reviews notes (especially design-agent overrides) need to be the final word. When two approaches are discussed and one is chosen, the implementation agent must confirm it shipped the chosen one.
- `background-position` animation in MiniCard ID text is a scale-sensitive risk — a will-change or exclusion mitigation is needed before the War Table goes wide.
- CardStressTest's GPU label/keyframe catalog must be updated whenever new keyframes are added to production components.

---

## 2026-03-17 — D3 ad hoc: POC Styling Alignment — Pre-execution plan review

**Deliverable:** D3 ad hoc (no new ID)
**Scope:** Pre-execution plan review of d3_tcg_card_styling_alignment_plan.md — performance, DRY, accessibility, regression risk
**Files reviewed:** d3_tcg_card_styling_alignment_plan.md, poc/intel-panel-options.html, TcgCard.tsx, MiniCard.tsx, RarityEffects.tsx, CommandBar.tsx, theme/index.ts, rarity.ts, CardStressTest.tsx

**Key findings:**
- HIGH: `foilShift` keyframe mutation will break RarityEffects.tsx Uncommon overlay (line 56) and CardStressTest.tsx UncommonCard (line 175) — both depend on the current transform behavior. Plan says "verify before changing" but does not commit to adding a separate `foilShiftPos` keyframe.
- HIGH: `shimmerSweep` removal in Phase 4 will encounter CardStressTest.tsx line 200 as an active consumer — plan provides no migration instruction for this consumer.
- MEDIUM: `background-position` gradient animation on MiniCard ID text will run 20+ concurrent paint-triggering animations on a populated War Table — plan should either exclude MiniCard ID text from animation or specify `will-change: background-position`.
- MEDIUM: Gold gradient stop positions in the plan (`30%, 50%, 80%`) differ from the existing `rarity.gold.gradient` theme token (`25%, 50%, 75%`). Implementation agent will either use wrong stops or bypass the token system.
- MEDIUM: Phase 4 border suppression coordination (`RarityEffects` → `TcgCard`) is underspecified — "data attribute or class" approach has no named reading mechanism in TcgCard.
- CONFIRMED: `prefers-reduced-motion` global CSS at theme/index.ts lines 203-210 covers all animation-property-based keyframes including the proposed new ones. No gap.

**Patterns learned:**
- `foilShift` has two active consumers beyond the plan's scope: RarityEffects.tsx Uncommon overlay AND CardStressTest.tsx — always grep both src/ and __tests__/ before mutating a shared keyframe.
- `shimmerSweep` also has a CardStressTest.tsx consumer — Phase 4 removal requires stress test migration.
- The `rarity.gold.gradient` theme token's stop positions do not match the POC exactly — any future plan should compare token values against POC before relying on the token.

---

## 2026-03-17 — D3: TCG Card Design System + War Table Layout — Post-execution code review

**Deliverable:** D3
**Scope:** Full post-execution code review of all 16 new files and 5 modified files
**Files reviewed:** All 16 new component/utility files, src/shared/types.ts, src/server/services/sdlcParser.ts, src/ui/theme/index.ts, src/ui/stores/dashboardStore.ts, src/ui/App.tsx

**Key findings:**
- HIGH: `complexityToRarity()` in rarity.ts maps `arch` → `epic` and `moonshot` → `mythic`. But the plan's Phase 1 acceptance criteria say "DeliverableComplexity uses 'arch' for the Mythic-tier complexity value." The mapping is inverted from the plan's stated intent. The spec's table also shows `arch` as the Mythic tier.
- HIGH: `MiniCard.tsx` expand logic: when `isExpanded=true`, `CardFlip` is returned with `flipped=true` and `onFlip={() => onExpand?.()}`. This means the CardFlip outer wrapper responds to clicks, but the inner `miniFace` (front face) also has its own `onClick={onExpand}`. Both will fire on click. Also the CardFlip always shows the BACK face (TcgCard) since `flipped=true` — the expand state jumps straight from mini to full-card-flipped, skipping the expand-to-full-then-flip-on-second-click three-gesture model.
- HIGH: TcgCard.tsx stat block lines 325-343: IMP and EFF both render `deliverable.effort ?? '-'`. There is no `impact` field on `Deliverable`. IMP always equals EFF — the stat block is misleading.
- HIGH: IntelPanel.tsx props interface includes `wsSend`, `wsAddListener`, `wsSubscribe`, `wsConnected` (lines 22-25) but the function signature only destructures `deliverables` (line 38-40). All four WebSocket props are accepted but silently dropped — dead props with a typed surface.
- MEDIUM: `statusToAccent` map duplicated in TcgCard.tsx, MiniCard.tsx, and TacticalField.tsx — three copies of the same 7-entry Record.
- MEDIUM: `artifactPillStyles` duplicated identically in TcgCard.tsx and MiniCard.tsx.
- MEDIUM: Card shadow values hardcoded as raw rgba strings in TcgCard.tsx and MiniCard.tsx instead of using the card.sm/card.md tokens defined in theme/index.ts.
- MEDIUM: IntelPanel.tsx `retryLoad` uses `setTimeout(..., 0)` without cleanup (line 132) — pre-existing pattern from FileViewer, now replicated.
- MEDIUM: Terminal vertical resize handler in WarTable.tsx (lines 62-76) still uses document-level mousemove/mouseup — the same stuck-drag pattern flagged in prior D3 plan reviews. The fix (pointer capture) was only applied to ColumnResizer, not to the terminal resize handle.
- LOW: ColumnResizer has no `onPointerCancel` handler. If pointer is captured and a cancel event fires (e.g., stylus lift on tablet), `dragging` state stays true until a subsequent pointerdown.

**Patterns learned:**
- Card components in this codebase will accumulate per-card status-to-color maps unless a shared constant module is established early. This is now the THIRD site for statusToAccent.
- The terminal vertical resize handle is a persistent stuck-drag risk — it appears in both the old Dashboard and the new WarTable using the document-level pattern.

---

## 2026-03-17 — D3: TCG Card Design System — Round 3 post-fix verification (clean)

**Deliverable:** D3
**Scope:** Focused re-review of 4 files modified in round 2 fix pass. Verified all 6 round-2 findings are resolved. No new issues found.
**Files reviewed:** IntelPanel.tsx, MiniCard.tsx, RarityEffects.tsx, sdlcParser.ts

**Fix verification (all 6 confirmed):**
1. IntelPanel tab buttons: `_focusVisible` added at line 248. FIXED.
2. IntelPanel retry button: `_focusVisible` added at line 308. FIXED.
3. IntelPanel `retryLoad`: `retryCount` state replaces `setTimeout` hack. FIXED.
4. MiniCard comment: three-gesture model accurately documented; TcgCard = front face error corrected. FIXED.
5. MiniCard `onFlip` passed to expanded TcgCard (line 265). FIXED.
6. RarityEffects check icon Box: `role="img"` and `aria-label="Completed"` added. FIXED.
7. sdlcParser sort: `localeCompare` fallback handles sub-deliverable suffixes (D3a/D3b). FIXED.

**Verdict:** No issues. All round-2 findings resolved, no regressions.

---

## 2026-03-17 — D3: TCG Card Design System + War Table Layout — Round 2 plan review (post-revision)

**Deliverable:** D3
**Scope:** Second review of revised plan — verify four previously-flagged fixes landed, check for new issues. Also read sdlcParser.ts and dashboardStore.ts to verify parser async assumption and store decoupling correctness.
**Files reviewed:** d3_tcg_card_design_system_plan.md, d3_tcg_card_design_system_spec.md, src/server/services/sdlcParser.ts, src/ui/stores/dashboardStore.ts

**Fix verification (all four confirmed in plan):**
- gray-matter Node-only constraint: FIXED — Design Constraint 1, Phase 1 acceptance criteria, verification checklist.
- Store decoupling (`setIntelCard` separate from `setSelectedCard`/`previewOpen`): FIXED — confirmed `setSelectedCard` line 94 in store still couples `previewOpen`; plan correctly proposes new decoupled action.
- ColumnResizer pointer capture: FIXED — Design Constraint 7 mandates `setPointerCapture`/`releasePointerCapture`.
- Celebration recency gate: FIXED — `usePrevious` + `lastModified` within 60s gate specified in Phase 6.

**New findings:**
- HIGH: Preset layout proportions in plan (45/25/30, 30/40/30, 25/30/45) do not match spec (50/20/30, 35/30/35, 25/25/50).
- HIGH: Default column widths in plan (30/40/30) do not match spec (~35/30/35).
- HIGH: `DeliverableComplexity` value for Mythic — plan says `'arch'`, spec says `'architecture'`. Direct contradiction on a shared exported type.
- MEDIUM: `createdAt` field required by plan but absent from spec's Deliverable interface definition.
- LOW (spec accuracy): Spec line 228 still says frontmatter "piggybacks on content already accessed for scanDirectory" — factually wrong, scanDirectory does not read file content. Plan correctly fixes the architecture but spec retains the wrong statement.
- LOW (spec accuracy): Spec token definition for `rarity.rare.shimmer` uses `var(--accent)` — plan bans this and requires `var(--card-accent)`. Spec and plan disagree; an agent reading the spec token example will use the wrong variable.

**Patterns learned:**
- Spec/plan divergence on concrete values (percentages, enum literals) is a recurring risk when the plan revises decisions made in the spec without updating the spec. The spec should be treated as authoritative for type names and token values; the plan should only override with explicit CD approval noted.

---

## 2026-03-17 — D3: TCG Card Design System + War Table Layout — Pre-execution plan review

**Deliverable:** D3
**Scope:** Pre-execution plan correctness review — code quality, DRY, overengineering, error handling, test coverage, security, backwards compatibility
**Files reviewed:** d3_tcg_card_design_system_plan.md, d3_tcg_card_design_system_spec.md, src/shared/types.ts, src/server/services/sdlcParser.ts, src/ui/theme/index.ts, src/ui/components/kanban/DeliverableCard.tsx, src/ui/components/layout/Dashboard.tsx, src/ui/stores/dashboardStore.ts, src/ui/App.tsx

**Key findings:**
- CRITICAL: `buildDeliverable()` is synchronous and never receives file content — plan's "piggybacking on existing read" is factually wrong. `scanDirectory()` only calls `fs.stat`, never `fs.readFile`. Phase 1 cannot proceed without resolving this architectural gap first.
- CRITICAL: `buildDeliverable()` is synchronous; frontmatter extraction requires async I/O. Converting it to async requires updating both call sites (lines 125, 171 in sdlcParser.ts).
- HIGH: Validation contract for `effort` and `type` frontmatter fields is under-specified. Non-integer effort, fractional values, and unknown type strings need explicit boundary behavior defined before implementation.
- HIGH: `selectedCardId`/`previewOpen` store coupling (setSelectedCard atomically sets both) will conflict with the War Table's dual-gesture model (flip vs. select). Plan does not address disposition of `previewOpen`.
- HIGH: `onResizeStart` drag pattern in Dashboard.tsx (used as reference for ColumnResizer) has a stuck-drag bug — `mouseup` is missed if cursor leaves the browser window. Three ColumnResizer handles will inherit this if copied.
- MEDIUM: Phase 2 stress test harness has no defined disposal plan or file path — risk of shipping to production.
- MEDIUM: JS-driven animations (HoloOverlay onMouseMove, particle burst) are not covered by the global `prefers-reduced-motion` CSS rule — require explicit `window.matchMedia` checks at component level.

**Patterns learned:**
- `scanDirectory()` in sdlcParser.ts reads only directory entries and stat — never file content. Any plan that assumes file content is available in `buildDeliverable()` is wrong.
- `Dashboard.tsx` `onResizeStart` attaches `mousemove`/`mouseup` to `document` — susceptible to stuck-drag on window blur. Wrong pattern to copy.
- `ActiveProject` in dashboardStore.ts is a near-duplicate of `Project` in shared/types.ts (missing only `slug`). Pre-existing DRY violation; grows worse as store accumulates D3 state.

---

## 2026-03-16 — Ad hoc re-review round 2: Dashboard Design Polish Pass (post round-2 fix verification)

**Deliverable:** Ad hoc (no ID)
**Scope:** Verification of two specific round-2 fixes (Dashboard.tsx borderRadius, KanbanColumn.tsx py) plus full new-issue sweep of all in-scope files
**Files reviewed:** Dashboard.tsx, KanbanColumn.tsx, KanbanBoard.tsx, DeliverableCard.tsx, SkillActions.tsx, TimelineView.tsx, StatsBar.tsx, ProjectSwitcher.tsx, FileViewer.tsx, MarkdownPreview.tsx, ChronicleBrowser.tsx, AdHocTracker.tsx, SessionHistory.tsx, SessionControls.tsx, TerminalTabs.tsx, TerminalPanel.tsx, dashboardStore.ts, theme/index.ts

**Round-2 fix verification:**
1. Dashboard.tsx `borderRadius="lg lg 0 0"` → explicit corner props: FIXED. `borderTopLeftRadius="lg"` and `borderTopRightRadius="lg"` at lines 254-255.
2. KanbanColumn.tsx `py="1.5"` → `py="6px"`: FIXED. `py="6px"` at line 182.

**New findings in this pass:**
- MEDIUM: `SkeletonColumn` in KanbanBoard.tsx (line 64) uses `borderRadius="md md 0 0"` — the same invalid Chakra v3 multi-value shorthand that was just fixed in KanbanColumn. The fix was applied to the live column header but not to its loading skeleton counterpart.
- MEDIUM: `FileViewer` error retry handler (lines 298-301) calls `setActiveTab(null)` then `setTimeout(() => setActiveTab(current), 0)` — a zero-delay timeout without cleanup. If the component unmounts in the same tick the timeout fires, it will call setState on an unmounted component. The pre-existing `setTimeout` finding was flagged before (switchTab animation); this is a second independent instance in the same file.
- LOW: `TerminalTabs` imports `forwardRef` (line 1) but it is unused at the module level — it is used only inside the `Tab` sub-component definition on line 93, which is in the same file. The import itself is used, but the function is re-exported by name rather than being the default export, so this is fine. Discard — not an issue.

**Patterns confirmed:**
- The Chakra v3 multi-value borderRadius shorthand bug (`"md md 0 0"`) resurfaced in the SkeletonColumn — confirming it is a recurring copy-paste pattern risk when skeleton components mirror live component markup.

---

## 2026-03-16 — Ad hoc re-review: Dashboard Design Polish Pass (post-8-fix verification)

**Deliverable:** Ad hoc (no ID)
**Scope:** Verification that all 8 originally-flagged fixes landed correctly, plus full sweep for regressions
**Files reviewed:** theme/index.ts, dashboardStore.ts, DeliverableCard.tsx, KanbanColumn.tsx, SkillActions.tsx, TimelineView.tsx, Dashboard.tsx, ProjectSwitcher.tsx, StatsBar.tsx, FileViewer.tsx, MarkdownPreview.tsx, ChronicleBrowser.tsx, AdHocTracker.tsx, SessionHistory.tsx

**Fix verification:**
1. KanbanColumn Plan CTA → `/sdlc-planning`: FIXED. `columnSkillCommands.Plan = '/sdlc-planning'`, confirmed at line 46.
2. KanbanColumn borderRadius → explicit corner props: FIXED. `borderTopLeftRadius="md"` and `borderTopRightRadius="md"` at lines 110-111.
3. KanbanColumn dispatching guard: FIXED. `if (!skillCommand || dispatching) return;` at line 71.
4. MarkdownPreview `th` padding → `8px 14px`: FIXED. `p="8px 14px"` at line 367.
5. MarkdownPreview blockquote bg → `accent.blue.900` token: FIXED. `bg="accent.blue.900"` at line 338.
6. AdHocTracker icon color → `#F59E0B`: FIXED. `GitBranch color="#F59E0B"` at line 90.
7. AdHocTracker badge → amber colors: FIXED. `bg="#F59E0B26"`, `color="accent.amber.400"` at lines 108-109.
8. AdHocTracker useCallback deps: FIXED. `handleReconcile` deps are `[addSession, toggleTerminal]` at line 65.

**New findings in this pass:**
- HIGH: `MermaidBlock` assigns unsanitized SVG from mermaid.render() directly to `innerHTML` — XSS if Mermaid itself produces unsafe SVG from malicious diagram code in a user doc
- HIGH: `dashboardStore.setTerminalHeight` calls `window.innerHeight` directly inside the Zustand setter — SSR/test-environment crash; also produces stale reads when window is resized without resizing the terminal
- MEDIUM: `borderRadius="lg lg 0 0"` on Dashboard terminal panel (line 254) is a Chakra v2-style shorthand not valid in Chakra v3 — the top-radius rounding will silently not apply
- MEDIUM: `ChronicleBrowser` and `AdHocTracker` only fetch when `entries/commits.length === 0` — stale data after an error is resolved; panel must be fully unmounted to get fresh data
- MEDIUM: FileViewer `switchTab` uses `setTimeout` for tab-switch animation — not cancelled on unmount, can set state on an unmounted component
- LOW: `KanbanColumn` CTA `py="1.5"` — spacing token `1.5` is not defined in theme (theme defines 1, 2, 3, 4...); Chakra will fall through to default or 0
- LOW: `wsUnsubscribe` is accepted in `DashboardProps` and passed from App.tsx but destructured out in Dashboard (line 35-37) without use — dead prop still in interface

**Patterns learned:**
- Mermaid SVG from `mermaid.render()` is not pre-sanitized — any innerHTML assignment of mermaid output is an XSS surface if input is from untrusted sources
- Chakra v3 (`@chakra-ui/react` 3.x) does not support multi-value shorthand on `borderRadius` prop — must use `borderTopLeftRadius`/`borderTopRightRadius` explicit props

---

## 2026-03-16 — Ad hoc execution review: Dashboard Design Polish Pass

**Deliverable:** Ad hoc (no ID)
**Scope:** Post-execution code review of all 14 changed files from the dashboard polish plan
**Files reviewed:** theme/index.ts, DeliverableCard.tsx, KanbanColumn.tsx, SkillActions.tsx, TimelineView.tsx, Dashboard.tsx, ProjectSwitcher.tsx, StatsBar.tsx, FileViewer.tsx, MarkdownPreview.tsx, ChronicleBrowser.tsx, AdHocTracker.tsx, SessionHistory.tsx, dashboardStore.ts

**Key findings:**
1. HIGH: KanbanColumn `columnSkillCommands` maps `Plan: '/sdlc-execution'` — should be `/sdlc-planning`. Both Plan and In Progress dispatch execution.
2. HIGH: MarkdownPreview `th` cell padding is `p="2 3"` (8px 12px) — spec requires `8px 14px`. Only `td` was updated.
3. MEDIUM: AdHocTracker GitBranch icon uses `#FBBF24` (Tailwind amber.400) not `#F59E0B` (theme `accent.amber.400`). Subtle but diverges from token system.
4. MEDIUM: AdHocTracker count badge uses violet colors (`#A78BFA26`, `column.idea`) despite being an amber-themed panel — likely a copy-paste error.
5. MEDIUM: MarkdownPreview blockquote `bg="#0A1628"` hardcoded instead of `accent.blue.900` token reference.
6. MEDIUM: ChronicleBrowser and AdHocTracker only fetch when `entries.length === 0` — never refreshes on re-open after first load.
7. LOW: `Session` type missing `logSize` note in prior review log is STALE — SessionHistory.tsx uses `useSessionHistory()`'s own `SessionLogEntry` type which includes `logSize?: number`. Prior memory entry was incorrect.

**Patterns learned:**
- `useSessionHistory` defines its own `SessionLogEntry` type (in `src/ui/hooks/useSessionHistory.ts`) separate from the shared `Session` type — these are not interchangeable.
- CTA dispatch pattern (KanbanColumn, SkillActions) uses direct `fetch('/api/sessions')` POST, not wsSend. The wsSend prop in KanbanColumnProps is currently dead.
- Chakra spacing tokens `p="2 3"` resolve to theme spacing-2 (8px) and spacing-3 (12px), not `8px 14px`. Raw pixel values must be used for non-standard spacings.

---

## 2026-03-16 — Ad hoc plan review: Dashboard Design Polish Pass

**Deliverable:** Ad hoc (no ID)
**Scope:** Plan correctness review — verified file assumptions, type availability, state management implications, phase dependencies
**Files reviewed:** Dashboard.tsx, DeliverableCard.tsx, KanbanColumn.tsx, KanbanBoard.tsx, FileViewer.tsx, TerminalPanel.tsx, SessionControls.tsx, dashboardStore.ts, shared/types.ts, theme/index.ts, SkillActions.tsx, TimelineView.tsx, MarkdownPreview.tsx, ChronicleBrowser.tsx, AdHocTracker.tsx, SessionHistory.tsx

**Key findings:**
1. MAJOR: Phase 3 "single-activePanel accordion" requires lifting state to dashboardStore or Dashboard — all three supplementary components (ChronicleBrowser, AdHocTracker, SessionHistory) manage collapsed state locally with no shared controller. Scope gap.
2. MAJOR: Phase 4 FileViewer has a hardcoded inner Flex at w="380px" (line 136) separate from the outer Box. Plan only mentions updating the outer container. Both must change or content won't fill the wider panel.
3. MAJOR: Phase 2 shadow.selected token dependency on Phase 1 — if token addition is skipped, cards lose all selected-state visual with no fallback. Hard sequencing constraint not stated in plan.
4. MINOR: TimelineView CSS grid row expand is already implemented (gridTemplateRows 0fr/1fr, lines 76-83) — Phase 1 lists it as work to add.
5. MINOR: Card name needs whiteSpace="nowrap" removed for 2-line clamp to work — plan states the outcome but not this prerequisite.
6. MINOR: KanbanColumn empty-state CTAs need useDashboardStore access (addSession/toggleTerminal) not currently present in that component.
7. PRE-EXISTING: Session type missing logSize field (SessionHistory.tsx line 270 reads it). Will surface as TS error if Phase 3 triggers a strict compile pass.

**Patterns learned:**
- All three supplementary row components (Chronicle, AdHoc, SessionHistory) share identical accordion structure (grid 0fr/1fr, ChevronDown rotate, defaultCollapsed prop). A shared CollapsibleSection wrapper would eliminate the duplication but was not raised as a concern here since the plan is a polish pass, not a refactor.
- FileViewer uses two nested sizing elements (outer Box for animation, inner Flex for fixed width) — any width change must update both.

---

## 2026-03-16 — D2 Tech Debt Cleanup, round 3 re-review (post round-2 fixes)

**Deliverable:** D2
**Scope:** Verification of four specific round-2 fixes plus final sweep
**Files reviewed:** src/ui/components/layout/ProjectPicker.tsx, src/ui/hooks/useSdlcState.ts, src/ui/utils/__tests__/formatters.test.ts, src/ui/hooks/__tests__/useButtonPress.test.ts, src/ui/hooks/useButtonPress.ts, src/ui/utils/formatters.ts, src/shared/types.ts, vitest.config.ts, package.json, plus style={{}} grep across all ui/*.tsx

**Round-2 fixes verified:**
- ProjectCard onMouseLeave clears transform: FIXED. All three interactive elements in ProjectPicker.tsx call pressHandlers.onMouseLeave(e) then clear el.style.transform = ''.
- useSdlcState stats cast uses Record<DeliverableStatus, number>: FIXED. Line 101 matches the typed stats variant in types.ts.
- formatCommitDate has test coverage: FIXED. Full describe block at formatters.test.ts lines 91-122 with 5 tests.
- useButtonPress.test.ts comment is accurate: FIXED. Comment now correctly states the hook uses useCallback internally.

**Remaining open issues:**
1. HIGH (carried): jsdom still absent from node_modules and package.json. UI test project (vitest.config.ts line 28) still specifies environment: 'jsdom'. All UI tests remain non-runnable.
2. MEDIUM (carried): formatters.ts exports formatCommitDate but spec F8/SC3 specifies formatTimestamp. Spec/implementation name divergence is unresolved.
3. MEDIUM (new): Surviving style={{}} objects — three components (ChronicleBrowser, AdHocTracker, SessionHistory) pass style={{ transition, transform }} to Lucide ChevronDown for the rotate-on-collapse animation. SessionControls and SkillActions pass style={{ animation: 'spin ...' }} to Lucide Loader2. Dashboard passes style={{ animation: 'spin ...' }} to an inline SVG. SC1 is not fully satisfied.

**Patterns learned:**
- Lucide icon props do not accept Chakra style props — only native React style= works. For icon animation (spin, rotate), style={{}} is the only available mechanism unless icons are wrapped in a chakra.span/Box. This is an architectural constraint, not an oversight.

---

## 2026-03-16 — D2 Tech Debt Cleanup, round 2 re-review (post round-1 fixes)

**Deliverable:** D2
**Scope:** Targeted verification of round 1 fixes — SC2 (scale(0.97) grep), SC3 (formatter definitions), unused imports/dead code, new test file patterns, DRY violations
**Files reviewed:** src/ui/hooks/useButtonPress.ts, src/ui/utils/formatters.ts, src/ui/hooks/__tests__/useButtonPress.test.ts, src/ui/utils/__tests__/formatters.test.ts, src/server/services/__tests__/slugGeneration.test.ts, src/ui/components/layout/ProjectPicker.tsx, src/ui/components/adhoc/AdHocTracker.tsx, src/ui/components/kanban/DeliverableCard.tsx, src/ui/components/terminal/SessionControls.tsx, src/server/index.ts, src/server/services/sessionStore.ts, src/shared/types.ts, src/ui/hooks/useConfig.ts

**Key findings:**
1. MEDIUM: `formatTimestamp` was specified in F8 and SC3 but does not exist in the implementation. `formatters.ts` exports `formatDate` and `formatCommitDate` instead. SC3's grep criterion for `formatTimestamp` will always return no matches. Not a functional bug but spec divergence.
2. MEDIUM: `formatCommitDate` exported from `formatters.ts` has zero test coverage in `formatters.test.ts`. The test file imports and tests only `formatDate`.
3. HIGH: `jsdom` is not in `package.json` but `vitest.config.ts` specifies `environment: 'jsdom'` for UI tests. The `useButtonPress.test.ts` and `formatters.test.ts` tests cannot run — `jsdom` package missing. UI test project produces `ERR_MODULE_NOT_FOUND` error when invoked.
4. MEDIUM: `useButtonPress.test.ts` contains a false comment claiming the hook has "no React hook calls inside" (line 5-6). The hook actually calls `useCallback` three times. The tests pass only because Vitest's jsdom environment doesn't enforce React's hook dispatcher rules outside `renderHook`. This is fragile and the comment is incorrect.
5. LOW: `slugGeneration.test.ts` includes a reference implementation of the slug algorithm (lines 28-36) duplicated from production code. This pattern is unique to this test file and risks the reference diverging from the implementation over time.

**Fixed from round 1:**
- SC2: `scale(0.97)` now found only in `useButtonPress.ts` (and its test assertions) — ProjectPicker.tsx residual removed. FIXED.
- SC3: `formatCommitDate` now in `formatters.ts`, not inline in AdHocTracker. FIXED.
- WebSocket shape mismatch: server now broadcasts `data: { deliverables }`. FIXED.
- Slug divergence: sessionStore now imports and uses `generateSlug` from projectRegistry. FIXED.

**Patterns learned:**
- `jsdom` package must be installed explicitly; it is not bundled with vitest.
- Test comments asserting "no React hooks inside" are unreliable — always read the implementation file.
- Reference implementations in test files create divergence risk when the algorithm changes.

---

## 2026-03-16 — D2 Tech Debt Cleanup (cross-cutting review)

**Deliverable:** D2
**Scope:** Cross-cutting concerns — naming, dead code, DRY, test coverage, unused imports
**Files reviewed:** src/shared/types.ts, src/server/services/* (all), src/server/routes/sdlc.ts, src/server/routes/sessions.ts, src/server/index.ts, src/ui/App.tsx, src/ui/components/** (all), src/ui/hooks/useButtonPress.ts, src/ui/hooks/useConfig.ts, src/ui/hooks/useSdlcState.ts, src/ui/utils/formatters.ts, package.json, all __tests__

**Key findings:**
1. MAJOR: `watcher:sdlc` update message broadcasts `data: deliverables` (an array) but `useSdlcState` reads `data.deliverables` (expects object with `.deliverables` property) — shape mismatch causes silent empty-array state on every WebSocket file-change event.
2. MAJOR: Two parallel slug generation functions exist: `generateSlug` in projectRegistry.ts (12-char hash, lowercase base) and `projectSlug` in sessionStore.ts (12-char hash, preserves case). Session directories use `projectSlug`; Project objects use `generateSlug`. These produce different slugs for the same path, so session directories are not addressable via the Project.slug field.
3. MAJOR: `formatCommitDate` in AdHocTracker.tsx is an inline date formatter that duplicates logic already in formatters.ts — SC3 not fully satisfied.
4. MAJOR: `scale(0.97)` survives in ProjectPicker.tsx line 220 outside the hook — SC2 not fully satisfied.
5. MINOR: `wsUnsubscribe` prop accepted by Dashboard but never used.
6. MINOR: `fetchStats` in useSdlcState is called at initial load but is redundant with `fetchUntrackedCount` — two REST calls hit the same endpoint at startup.
7. MINOR: No unit tests for useButtonPress, formatters.ts, or slug generation — plan specified these as required new tests.
8. MINOR: useButtonPress is not a React hook (no useState/useCallback/useEffect) — naming with `use` prefix is misleading.
9. MINOR: fileWatcher.ts retains one synchronous `fs.existsSync` call (line 22) — only startup path, not hot-path, so acceptable per spec constraints.

**Patterns learned:**
- Server broadcasts `data: array` but client expects `data.deliverables: array` — a recurring shape-mismatch risk when broadcast payload and REST payload diverge.
- Two separate slug functions in different services for the same concept is a recurring DRY risk in this codebase.
