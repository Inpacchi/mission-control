---
name: Review Log
description: Running log of completed reviews — date, deliverable ID, files reviewed, key findings
type: project
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
