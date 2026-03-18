# Ad Hoc Plan: Dashboard Design Polish Pass

**Execute this plan using the `ad-hoc-execution` skill.**

**Scope:** Visual and interaction quality pass across the dashboard, kanban, file preview, and supplementary panels — establishing missing design tokens, tightening typography and spacing, introducing a tab system to give supplementary panels their own dedicated view, and adding empty-state CTAs with SDLC-aware dispatch. No new features, no backend changes.

**Files:**
- `src/ui/theme/` (tokens index or wherever shadow/color tokens are defined)
- `src/ui/components/layout/Dashboard.tsx`
- `src/ui/components/layout/StatsBar.tsx`
- `src/ui/components/kanban/KanbanBoard.tsx`
- `src/ui/components/kanban/KanbanColumn.tsx`
- `src/ui/components/kanban/DeliverableCard.tsx`
- `src/ui/components/kanban/SkillActions.tsx`
- `src/ui/components/terminal/TerminalPanel.tsx`
- `src/ui/components/preview/FileViewer.tsx`
- `src/ui/components/preview/MarkdownPreview.tsx`
- `src/ui/components/layout/ProjectSwitcher.tsx`
- `src/ui/stores/dashboardStore.ts`
- Any supplementary panel components (ChronicleBrowser, AdHocTracker, SessionHistory)

**Agents:** frontend-developer

---

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|------------|-------|-------------------|
| Phase 1: Design Tokens | — | frontend-developer | Nothing (foundational) |
| Phase 2: Card & Column Layer | Phase 1 | frontend-developer | Phase 3 |
| Phase 3: Preview Panel | Phase 1 | frontend-developer | Phase 2 |
| Phase 4: Tab System & Activity View | Phase 1, 2 | frontend-developer | Nothing |

---

## Phases

### Phase 1: Design Token Foundation
**Agent:** frontend-developer

**What:** Establish two new shadow tokens in the theme — `selected` and `panel` — so that all components in subsequent phases can reference them by name rather than repeating raw values. The `panel` token value is `-8px 0 40px rgba(0,0,0,0.6), -2px 0 8px rgba(0,0,0,0.4)`. The `selected` token value is a focused glow consistent with the existing `glow.blue` pattern. Both are referenced in component style props as `boxShadow="selected"` and `boxShadow="panel"`. This phase has no UI-visible output on its own but is a hard dependency for Phases 2, 3, and 4.

**Why:** Phases 2, 3, and 4 each require shadow values. Defining them once as named tokens prevents divergence, enables theme-level overrides, and keeps component code readable.

---

### Phase 2: Card and Column Layer
**Agent:** frontend-developer

**What:**

**DeliverableCard.tsx**
- Card height is conditional: `108px` when artifact paths exist, falling toward `88px` when no artifacts are present.
- The existing `whiteSpace="nowrap"` constraint on the card name must be removed so the name can wrap to a maximum of 2 lines.
- Artifact pills show doc-type color (not column color): SPEC = `#60A5FA`, PLAN = `#34D399`, RESULT = `#22C55E`. Font size is `10px`.
- The play/skill icon changes from `text.muted` to `text.secondary` (`#8B99B3`) for WCAG AA compliance and receives `aria-label="Skill actions available"`.
- Count badge renders as a pill (with background) when count > 0; as plain `text.xs text.muted` text when count is zero.
- Cards receive the `selected` shadow token on selection.

**KanbanColumn.tsx**
- Column body background becomes `bg.surface`. Column header background retains its existing column-color-over-surface treatment.
- Empty column state shows a ghost CTA button with label and hover fill color. Labels by column: Idea = "+ New Idea", Spec = "+ Write Spec", Plan = "+ Create Plan", In Progress = "+ Start Work", Review = "+ Submit for Review". Hover fill is the column accent color at 5% opacity (`{columnColor}0D`).
- On CTA click, a new terminal session opens with the column's SDLC skill command pre-filled: Idea column dispatches a brainstorming/noting prompt, Spec dispatches `sdlc-planning` (spec phase), Plan dispatches `sdlc-planning` (plan phase), In Progress dispatches `sdlc-execution`, Review dispatches the review workflow. Because there is no deliverable ID in an empty column context, the command is pre-filled but not yet bound to a deliverable. KanbanColumn requires store access for this dispatch, following the same pattern already established in SkillActions.

**KanbanBoard.tsx & Dashboard.tsx**
- When the preview panel is open, kanban width adjusts from its current `calc(100% - 380px)` to `calc(100% - clamp(480px, 60%, 720px))` to match the revised FileViewer width.

**ProjectSwitcher.tsx**
- The `fontSize="2xl"` value on the project name is the same oversized-text bug present in Dashboard.tsx and must receive the same corrected value.

**Why:** Cards are the primary information unit of the dashboard. Conditional height, 2-line names, correct artifact pill colors, and accessible play icons together raise the visual density and readability to match the design intent. Empty-state CTAs turn dead space into actionable prompts that are SDLC-aware. The width adjustment is required for layout correctness once the preview panel is resized in Phase 3.

---

### Phase 3: Preview Panel
**Agent:** frontend-developer

**What:**

**FileViewer.tsx**
- Both the outer Box and the inner Flex currently hardcode `380px`. Both must change to `clamp(480px, 60%, 720px)`.
- The preview panel receives the `panel` shadow token (`boxShadow="panel"`).
- The panel header height is `56px` — intentionally taller than the dashboard header (`48px`) as a hero treatment for the open file.
- A `maxW="600px"` wrapper belongs in the FileViewer body to constrain rendered prose width, not inside MarkdownPreview.

**MarkdownPreview.tsx**
- Blockquote background uses the `accent.blue.900` token (`#0A1628`).
- Table cell padding is `8px 14px` (not `8px 12px`).
- h3–h6 heading sizes follow the standard typographic scale downward from h2 without inventing intermediate values.

**Why:** The FileViewer's hardcoded 380px was designed for an earlier, narrower layout. At wider viewports, prose content becomes uncomfortably narrow. The `clamp` value gives the panel breathing room while the 600px content cap maintains readable line lengths. The `panel` shadow grounds the overlay visually. The markdown corrections ensure rendered content matches the design token system used everywhere else in the UI.

---

### Phase 4: Tab System and Activity View
**Agent:** frontend-developer

**What:**

**Dashboard.tsx — Tab Bar**
- The main content area below the header gains a two-tab navigation bar sitting directly below the stats bar row. Tab labels: "Board" (with a kanban/grid icon) and "Activity" (with a clock/history icon). The tab bar height is `40px`, with the active tab indicated by the existing `accent.violet` underline pattern used elsewhere in the UI. The active tab index is stored in `dashboardStore` as a new `activeTab` field (values: `'board' | 'activity'`) with a corresponding typed selector.
- The tab bar is always visible regardless of which tab is active. It does not hide when the preview panel is open.

**Dashboard.tsx — Board Tab**
- The Board tab contains exactly what the current main area contains: the KanbanBoard and the FileViewer side panel. The supplementary panel row that currently sits below the kanban is removed from this tab entirely.
- The `fontSize="2xl"` bug in the dashboard header title receives the correct scale value.
- Card entry animation timing is `280ms` (replacing the current `250ms` — this is a replacement, not an addition).

**Dashboard.tsx — Activity Tab**
- The Activity tab renders ChronicleBrowser, AdHocTracker, and SessionHistory as full-width stacked accordion rows, each spanning 100% of the tab content width. Expanding one row pushes the others down vertically.
- Because the panels are no longer competing for horizontal space with the kanban, the one-open-at-a-time accordion constraint from the original plan is relaxed: multiple panels may be open simultaneously. Each panel manages its own open/closed state via local `useState`; no shared accordion state owner is required.
- Maximum expanded height per panel row is `280px`.
- Expand/collapse animation uses the CSS grid row-height trick: `250ms` to open, `200ms` to close.
- Panel header icon colors: Chronicle/Archive icon = `accent.violet.400`, Ad Hoc/GitBranch icon = `accent.amber.400`, Sessions/History icon = `accent.blue.400`.
- The FileViewer side panel does not render in the Activity tab — it is Board-only.

**StatsBar.tsx**
- Any stat count or label font size corrections needed to align with the type scale established across other phases.

**Why:** Cramming the supplementary panels below the kanban forces them into a compressed horizontal strip where variable-length content (log lines, session lists, chronicle entries) cannot breathe. Promoting them to their own tab gives each panel full viewport width, removes the need for a strict one-open accordion, and keeps the Board tab clean and focused on active work. Storing `activeTab` in the dashboard store (rather than local state in Dashboard.tsx) ensures that tab position survives re-renders caused by WebSocket updates and is available to any component that needs to conditionally render based on the active view.

---

## Worker Agent Reviews

Key feedback incorporated:

- [ui-ux-designer] `shadow.panel` token value was missing from Phase 1 where the token is defined — added exact CSS value
- [ui-ux-designer] `ProjectSwitcher.tsx` had the same `fontSize="2xl"` bug as Dashboard.tsx but was missing from the file scope — added
- [ui-ux-designer] Artifact pill colors must be doc-type-specific (SPEC=#60A5FA, PLAN=#34D399, RESULT=#22C55E), not column color — corrected
- [ui-ux-designer] Play icon at `text.muted` fails WCAG AA at 2.1:1 contrast — changed to `text.secondary` (#8B99B3) with aria-label
- [ui-ux-designer] Blockquote background token resolved to `accent.blue.900` (#0A1628) — settled ambiguity between bg.canvas and accent.blue.900
- [frontend-developer] FileViewer has two hardcoded 380px widths (outer Box and inner Flex) — both must change to clamp value
- [frontend-developer] Card 2-line clamp requires removing existing `whiteSpace="nowrap"` constraint — called out explicitly
- [frontend-developer] Ghost CTA dispatch needs store access in KanbanColumn (same pattern as SkillActions) — noted
- [frontend-developer] maxW="600px" wrapper belongs in FileViewer body, not MarkdownPreview — scoped correctly
- [code-reviewer] Phase 2 has hard dependency on Phase 1 tokens (selected state invisible without them) — dependency table updated
- [code-reviewer] TimelineView.tsx already implements CSS grid row expand — removed from file scope

## Post-Execution Review

All completed work must be reviewed by all relevant worker domain agents.
All review findings must be fixed by the most relevant domain agent.
Build must pass (`npx tsc --noEmit` with zero errors) before work is considered done.
