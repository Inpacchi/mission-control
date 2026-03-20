---
tier: full
type: refactor
complexity: moderate
effort: 3
flavor: "The foundation is clean. Build freely."
created: 2026-03-16
completed: 2026-03-16
author: CC
---

# D2: Tech Debt Cleanup — Result

**Spec:** `d2_tech_debt_cleanup_spec.md`

---

## Summary

Cleaned 12 categories of tech debt from the D1 MVP across 5 phases: shared utilities and type updates (Phase 1), async I/O conversion with CORS/stats/slugs (Phase 2), layout/kanban style migration (Phase 3), terminal/preview style migration (Phase 4), and spec alignment (Phase 5). Three review rounds resolved critical findings including a broken WebSocket update path, slug divergence, and a ProjectCard hover bug.

---

## What Was Done

### Phase 1: Foundation — Shared Utilities, Type Updates, Trivial Cleanups
- Added `slug`, `color`, `corsOrigins`, and stats WsMessage variant to `src/shared/types.ts`
- Created `src/ui/hooks/useButtonPress.ts` — shared press animation hook with `useCallback` memoization
- Created `src/ui/utils/formatters.ts` — consolidated `formatDate` and `formatCommitDate`
- Removed duplicate `xterm` package from devDependencies
- Fixed mermaid initialization to module scope (single init per page load)
- Removed `handleSwitchProject` wrapper in App.tsx

### Phase 2: Server Hardening — Async I/O, CORS, Stats Broadcast, Slug Generation
- Converted sdlcParser, catalogParser, sessionStore to async `fs/promises`
- Added CORS middleware with configurable origins (`corsOrigins` in `.mc.json`)
- Implemented stats broadcast via WebSocket `watcher:sdlc` channel (total + byStatus)
- Implemented collision-safe SHA-256 hash-based slug generation in projectRegistry
- Unified slug generation — sessionStore imports from projectRegistry
- Updated all 4 server test suites for async APIs
- Added `cors` production dependency, installed `jsdom` + `@testing-library/react` for UI tests

### Phase 3: Style Migration — Layout and Kanban (10 files)
- Migrated Dashboard, StatsBar, ProjectPicker, ProjectSwitcher to Chakra style props
- Migrated KanbanBoard, KanbanColumn, DeliverableCard, SkillActions, TimelineView
- Wired `useButtonPress` into ProjectPicker, ProjectSwitcher, SkillActions
- Removed hardcoded column definitions from KanbanBoard — now fetched via `useConfig` hook from config API
- Created `src/ui/hooks/useConfig.ts` for server config fetching

### Phase 4: Style Migration — Terminal, Preview, Supplementary (9 files)
- Migrated TerminalTabs, TerminalPanel, SessionControls, SessionHistory
- Migrated FileViewer, MarkdownPreview (15+ react-markdown component overrides), ChronicleBrowser
- Migrated AdHocTracker, App.tsx
- Wired `useButtonPress` into SessionControls, AdHocTracker
- Wired StatsBar to consume deliverable stats from WebSocket (untracked remains REST-only)

### Phase 5: Documentation — Spec Alignment
- Updated D1 spec type definitions to match implementation (Project.slug, ColumnConfig.color, McConfig.corsOrigins, WsMessage stats variant)

---

## Success Criteria Verification

| Criterion | Status | Notes |
|-----------|--------|-------|
| SC1: Zero inline `style={{}}` on Chakra-compatible elements | **PASS** | Remaining `style={{}}` only on Lucide SVG icons (excluded per plan) |
| SC2: `scale(0.97)` only in useButtonPress.ts | **PASS** | Grep confirmed: hook file + test file only |
| SC3: Date formatting in formatters.ts only | **PASS** | `formatDate` + `formatCommitDate` consolidated; `formatRelativeTime` in ProjectPicker is relative-time display, not date formatting |
| SC4: No sync fs in sdlcParser, catalogParser, sessionStore | **PASS** | All hot paths use `fs/promises` |
| SC5: CORS middleware active | **PASS** | Rejects non-localhost by default; respects `corsOrigins` config |
| SC6: StatsBar WebSocket stats | **PASS** | Deliverable stats (total, byStatus) via WebSocket; untracked REST-only |
| SC7: Collision-safe slugs | **PASS** | SHA-256 hash of full path appended to basename |
| SC8: No hardcoded columns in KanbanBoard | **PASS** | Columns from config API via useConfig hook |
| SC9: Only @xterm/xterm in package.json | **PASS** | Legacy `xterm` removed |
| SC10: mermaid.initialize once per page load | **PASS** | Module-scoped promise |
| SC11: handleSwitchProject removed | **PASS** | Does not exist in codebase |
| SC12: D1 spec types match implementation | **PASS** | All type definitions aligned |
| SC13: All tests pass, zero build errors | **PASS** | 142/142 tests, 15/15 test files, build clean |

---

## New Tests Added

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/ui/hooks/__tests__/useButtonPress.test.ts` | 10 | Press handlers, style object, memoization |
| `src/ui/utils/__tests__/formatters.test.ts` | 15 | formatDate, formatCommitDate, invalid dates, edge cases |
| `src/server/services/__tests__/slugGeneration.test.ts` | 11 | Determinism, collision resistance, URL safety |

**Test count: 106 → 142** (+36 new tests)

---

## Decisions Made During Execution

- **WebSocket update shape:** Server wraps deliverables in `{ deliverables: Deliverable[] }` object to match client expectation (caught in review round 1)
- **@keyframes handling:** `<style>` tags with `@keyframes` left in place (Dashboard spin, KanbanBoard shimmer) — moving to globalCss would require Chakra v3 API research with no visual benefit
- **Lucide icon styles:** `style={{}}` on Lucide SVG icons is acceptable — they don't accept Chakra style props
- **formatTimestamp alias removed:** Renamed single call site to `formatDate` rather than keeping a dead alias
- **formatCommitDate:** Moved from AdHocTracker to formatters.ts as shared utility
- **useConfig hook:** Created new hook for KanbanBoard column fetching (not in original plan but necessary for F9)

---

## Skipped Phases

None — all 5 phases executed as planned.

---

## Worker Agent Reviews

Key feedback incorporated:

- [software-architect] WebSocket update data shape mismatch: server sent `Deliverable[]` directly but client expected `{ deliverables?: Deliverable[] }` — live kanban updates were silently broken. Fixed by wrapping server payload.
- [software-architect] Stats variant `byStatus` typed as `Record<string, number>` instead of `Record<DeliverableStatus, number>` — required unsafe runtime casts. Tightened to match SdlcStats.
- [backend-developer] fileWatcher `handleChange` must await async `parseDeliverables` — flagged as production correctness concern during planning, verified correct in implementation.
- [backend-developer] Slug divergence between projectRegistry and sessionStore — two different normalization functions for the same input. Unified to single `generateSlug`.
- [frontend-developer] ProjectCard custom `onMouseDown`/`onMouseUp` bypassed useButtonPress and left card stuck at `translateY(-1px)` after click. Rewired to use hook properly.
- [frontend-developer] SessionControls swapped ChevronUp/ChevronDown instead of rotating single icon — inconsistent with all other collapsible panels. Fixed to rotation pattern.
- [frontend-developer] MarkdownPreview ~15 react-markdown component overrides converted to Chakra components — confirmed visual parity.
- [code-reviewer] sessionLifecycle.test.ts used `require.resolve` in ESM context — PTY tests could silently skip. Fixed to dynamic `import()`.
- [code-reviewer] jsdom not installed — new UI test files were silently not running (15 test files showed as 13 passed). Installed jsdom + @testing-library/react.
- [code-reviewer] formatCommitDate survived inline in AdHocTracker — violated SC3 intent. Moved to formatters.ts with test coverage.
