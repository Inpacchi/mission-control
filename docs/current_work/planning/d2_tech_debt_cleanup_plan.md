# D2: Tech Debt Cleanup — Implementation Plan

**Spec:** `d2_tech_debt_cleanup_spec.md`
**Created:** 2026-03-16

---

## Overview

D1 shipped a working MVP but left 12 categories of tech debt: an unused theme system (224 inline styles bypassing Chakra tokens), duplicated patterns (button press animation in 5 files, date formatters in 3), synchronous I/O on request hot paths (sdlcParser, catalogParser, sessionStore listSessions/searchSessions), missing CORS middleware, type drift between spec and implementation, a redundant REST round-trip for stats, slug collision risk, a duplicate xterm dependency, mermaid re-initialization, and a trivial wrapper function. This plan organizes the cleanup into 5 phases that respect dependency ordering while maximizing parallel execution.

---

## Component Impact

| Component / Package | Changes |
|--------------------|---------|
| `src/shared/types.ts` | Add `slug` to `Project`, `color` to `ColumnConfig`, `corsOrigins` to `McConfig`, stats variant to `WsMessage` |
| `src/ui/hooks/useButtonPress.ts` | **New file** -- shared press animation hook |
| `src/ui/utils/formatters.ts` | **New file** -- shared date formatting utilities |
| `package.json` | Remove duplicate `xterm` package, add `cors` dependency |
| `src/server/services/sdlcParser.ts` | Convert sync filesystem calls to async |
| `src/server/services/sessionStore.ts` | Convert `searchSessions` to async, adopt collision-safe slug |
| `src/server/services/fileWatcher.ts` | Compute and broadcast stats alongside deliverable updates |
| `src/server/services/projectRegistry.ts` | Generate collision-safe slugs using path hash |
| `src/server/services/configLoader.ts` | Add `color` to default column definitions, add `corsOrigins` default |
| `src/server/index.ts` | Add CORS middleware, update stats broadcast wiring |
| `src/server/routes/sdlc.ts` | Await async sdlcParser calls |
| `src/server/routes/sessions.ts` | Await async sessionStore calls |
| `src/ui/App.tsx` | Remove `handleSwitchProject` wrapper, style migration |
| `src/ui/components/layout/Dashboard.tsx` | Inline styles to Chakra style props |
| `src/ui/components/layout/StatsBar.tsx` | Inline styles to Chakra style props, consume stats from WebSocket |
| `src/ui/components/layout/ProjectPicker.tsx` | Inline styles to Chakra style props, wire useButtonPress |
| `src/ui/components/layout/ProjectSwitcher.tsx` | Inline styles to Chakra style props, wire useButtonPress |
| `src/ui/components/kanban/KanbanBoard.tsx` | Inline styles to Chakra style props, remove hardcoded columns |
| `src/ui/components/kanban/KanbanColumn.tsx` | Inline styles to Chakra style props |
| `src/server/services/catalogParser.ts` | Convert sync filesystem calls to async |
| `src/ui/components/kanban/DeliverableCard.tsx` | Inline styles to Chakra style props |
| `src/ui/components/kanban/SkillActions.tsx` | Inline styles to Chakra style props, wire useButtonPress |
| `src/ui/components/kanban/TimelineView.tsx` | Inline styles to Chakra style props |
| `src/ui/components/terminal/TerminalTabs.tsx` | Inline styles to Chakra style props |
| `src/ui/components/terminal/TerminalPanel.tsx` | Inline styles to Chakra style props |
| `src/ui/components/terminal/SessionControls.tsx` | Inline styles to Chakra style props, wire useButtonPress |
| `src/ui/components/terminal/SessionHistory.tsx` | Inline styles to Chakra style props |
| `src/ui/components/preview/FileViewer.tsx` | Inline styles to Chakra style props |
| `src/ui/components/preview/MarkdownPreview.tsx` | Inline styles to Chakra style props, fix mermaid init |
| `src/ui/components/chronicle/ChronicleBrowser.tsx` | Inline styles to Chakra style props |
| `src/ui/components/adhoc/AdHocTracker.tsx` | Inline styles to Chakra style props, wire useButtonPress |
| `docs/current_work/specs/d1_mission_control_mvp_spec.md` | Type alignment edits |

## Interface / Adapter Changes

- `sdlcParser.parseDeliverables()` and `sdlcParser.parseChronicle()` return types change from sync to `Promise<>`
- `sdlcParser.getDeliverable()` return type changes from sync to `Promise<>`
- `sessionStore.listSessions()` return type changes from sync to `Promise<>`
- `sessionStore.searchSessions()` return type changes from sync to `Promise<>`
- `catalogParser.parseCatalog()` return type changes from sync to `Promise<>`
- `fileWatcher` `onUpdate` callback receives both deliverables and stats
- `GET /api/config` response includes `color` field in column definitions
- `GET /api/projects` response includes `slug` field in project objects
- WebSocket `watcher:sdlc` channel emits new `type: 'stats'` message
- `.mc.json` schema accepts optional `corsOrigins: string[]`

## Migration Required

- [x] No database migration needed
- [ ] Storage migration: existing session directories under `~/.mc/sessions/` use basename-only slugs; new slug format will create new directories. Old directories become orphaned but are harmless (pruned by age). No active migration required.

---

## Prerequisites

- [x] D1 (Mission Control MVP) is shipped and stable
- [x] All 103 existing tests pass on the current codebase
- [x] Theme tokens exist in `src/ui/theme/index.ts` (already defined, just unused)

---

## Implementation Phases

### Phase 1: Foundation -- Shared Utilities, Type Updates, and Trivial Cleanups

**Agent:** software-architect (types), frontend-developer (utilities, cleanups)

**Why this phase exists:** Every subsequent phase depends on shared types, the new hook, or the formatters utility. The trivial cleanups (xterm dedup, mermaid fix, wrapper removal) have zero dependencies and are included here to reduce total phase count. Completing this phase first unblocks all other work.

**Spec requirements addressed:** F2, F5 (types only), F7 (types only), F8, F10, F11, F12

**Files affected:**
- `src/shared/types.ts` -- Add `slug: string` to `Project`, `color: string` to `ColumnConfig`, `corsOrigins?: string[]` to `McConfig`, and a stats variant to the `WsMessage` union type
- `src/ui/hooks/useButtonPress.ts` -- **New file.** Extract the scale(0.97) press animation pattern into a reusable hook returning press event handlers and the computed style object
- `src/ui/utils/formatters.ts` -- **New file.** Extract `formatDate` and `formatTimestamp` from their 3 inline definitions into a single shared utility
- `package.json` -- Remove the `xterm` entry from devDependencies (retain `@xterm/xterm` which is the actively used package)
- `src/ui/components/preview/MarkdownPreview.tsx` -- Move mermaid initialization to module scope so it executes exactly once regardless of component render count
- `src/ui/App.tsx` -- Remove the `handleSwitchProject` wrapper function; use `handleSelectProject` directly at the call site

**Acceptance criteria:**
- The `Project` type includes `slug`, `ColumnConfig` includes `color`, `McConfig` includes `corsOrigins`
- `WsMessage` union includes a stats message variant for the `watcher:sdlc` channel
- `useButtonPress` hook exists and returns press handlers plus a style object implementing the animation
- `formatters.ts` exports date formatting functions
- `npm install` after removing `xterm` produces no missing-dependency errors
- `mermaid.initialize()` is provably called once per page load (module-scoped)
- `handleSwitchProject` no longer exists in App.tsx
- Build passes, all 103 tests pass

---

### Phase 2: Server Hardening -- Async I/O, CORS, Stats Broadcast, Slug Generation

**Agent:** backend-developer

**Why this phase exists:** The server-side changes form a cohesive group: async I/O removes event loop blocking on hot paths, CORS closes a security gap for LAN/Tailscale deployments, stats broadcast eliminates a redundant REST round-trip, and slug generation prevents session storage collisions. These changes are interdependent (stats broadcast uses the same sdlcParser that gets converted to async) and must be coordinated.

**Spec requirements addressed:** F3, F4, F6, F7 (implementation)

**Files affected:**
- `src/server/services/sdlcParser.ts` -- Convert `scanDirectory` (which uses `readdirSync`, `existsSync`, `statSync`) to use `fs/promises` equivalents. All three exported functions (`parseDeliverables`, `parseChronicle`, `getDeliverable`) become async
- `src/server/services/catalogParser.ts` -- Convert `parseCatalog()` from `fs.existsSync`/`fs.readFileSync` to `fs/promises`. This file is called synchronously by `sdlcParser.parseDeliverables` and also directly by the `/api/sdlc/catalog` route in `sdlc.ts`
- `src/server/services/sessionStore.ts` -- Convert `searchSessions` and `listSessions` to async (both use `readdirSync` and `readFileSync`). `searchSessions` delegates to `listSessions`, and the `/api/sessions/history` route calls `listSessions` directly, so both must be converted. Update the `projectSlug` function to use the collision-safe hash-based slug from Phase 1 types
- `src/server/services/projectRegistry.ts` -- Implement collision-safe slug generation using SHA-256 hash of the full project path. Populate the `slug` field when registering or returning projects
- `src/server/services/fileWatcher.ts` -- **[PRODUCTION CORRECTNESS]** The debounced `handleChange` callback must `await` the now-async `parseDeliverables()`. Without this, `onUpdate` receives a `Promise` instead of `Deliverable[]`, silently breaking all downstream consumers. The `onUpdate` type signature must change since it currently uses `ReturnType<typeof parseDeliverables>` (which becomes `Promise<Deliverable[]>`). After awaiting, compute stats (total count, count by status) and broadcast a separate stats message on the `watcher:sdlc` channel. The `onUpdate` callback signature or a companion `onStats` callback carries this data
- `src/server/services/configLoader.ts` -- Add `color` values to the default column definitions so the config API always returns columns with colors. Add `corsOrigins` to the config type handling
- `src/server/index.ts` -- Add CORS middleware (using the `cors` npm package) that allows localhost/127.0.0.1 origins by default and respects a `corsOrigins` allowlist from `.mc.json`. Wire the updated fileWatcher to broadcast both deliverable updates and stats
- `src/server/routes/sdlc.ts` -- Convert route handlers to `await` the now-async sdlcParser functions. The `/api/sdlc/catalog` route must also `await` the now-async `parseCatalog()`
- `src/server/routes/sessions.ts` -- Convert the history route handler to `await` the now-async `searchSessions`
- `src/server/services/__tests__/sdlcParser.test.ts` -- Add `async`/`await` to test functions that call the now-async parser
- `src/server/services/__tests__/sessionStore.test.ts` -- Add `async`/`await` to tests that call `searchSessions` and `listSessions` (both are now async). Update any slug-dependent assertions that hardcode the old slug formula (`path.basename.replace(...)`) to match the new hash-based slug format
- `src/server/services/__tests__/fileWatcher.test.ts` -- Update test assertions that inspect `onUpdate.mock.calls` to account for `parseDeliverables` now returning a `Promise`. Without async-aware assertions, mock call checks will receive `Promise` objects instead of `Deliverable[]`
- `src/server/services/__tests__/catalogParser.test.ts` -- Add `async`/`await` to all 11 calls to `parse()` (which delegates to the now-async `parseCatalog`). Without this, every test receives a `Promise` instead of the parsed catalog result
- `package.json` -- Add `cors` as a production dependency (not currently in the dependency tree; must be freshly installed)

**Acceptance criteria:**
- `sdlcParser` uses only `fs/promises` for filesystem access in its hot-path functions (no `readFileSync`, `readdirSync`, `statSync` in `scanDirectory`, `parseDeliverables`, `parseChronicle`, `getDeliverable`)
- `catalogParser.parseCatalog` uses `fs/promises` (no `existsSync`, `readFileSync`)
- `sessionStore.listSessions` and `sessionStore.searchSessions` use `fs/promises` to read directories and log files
- `fileWatcher` `handleChange` callback `await`s the async `parseDeliverables()` -- a `Promise` is never passed to `onUpdate`
- CORS middleware rejects requests from non-localhost origins by default. When `corsOrigins` is set in `.mc.json`, those origins are also permitted
- The `watcher:sdlc` WebSocket channel emits both `type: 'update'` and `type: 'stats'` messages on each file change event. Stats broadcast includes only deliverable-derived stats (total, byStatus); untracked count remains REST-only via `GET /api/sdlc/stats` to avoid running `git log` on every file change
- Two projects with identical `path.basename` but different full paths produce different slugs
- Session directories use the new collision-safe slug format
- Config API returns column definitions with `color` field populated
- All 103 tests pass (with async adjustments to test helpers where needed)
- Build passes

**Depends on:** Phase 1 (shared types must be in place for `Project.slug`, `ColumnConfig.color`, stats `WsMessage` variant)

---

### Phase 3: Style Migration -- Layout and Kanban Components

**Agent:** frontend-developer

**Why this phase exists:** The layout and kanban components form the primary visual surface of the dashboard. Migrating them first validates the Chakra style props approach and establishes patterns for the remaining components. The kanban board also carries the F9 requirement (remove hardcoded columns), which depends on Phase 2's config changes.

**Spec requirements addressed:** F1 (partial -- 10 of 18 component files), F9

**Files affected:**
- `src/ui/components/layout/Dashboard.tsx` -- Replace all inline `style={{}}` objects with Chakra `Box`/semantic element style props referencing theme tokens
- `src/ui/components/layout/StatsBar.tsx` -- Replace inline styles with Chakra style props
- `src/ui/components/layout/ProjectPicker.tsx` -- Replace inline styles with Chakra style props. Replace the copy-pasted press animation with `useButtonPress`
- `src/ui/components/layout/ProjectSwitcher.tsx` -- Replace inline styles with Chakra style props. Replace the copy-pasted press animation with `useButtonPress`
- `src/ui/components/kanban/KanbanBoard.tsx` -- Replace inline styles with Chakra style props. Remove the hardcoded `defaultColumns` array; receive column definitions from config API (fetched at a higher level and passed as props or read from store). The server's config loader (updated in Phase 2) provides the defaults, so the UI no longer needs its own fallback
- `src/ui/components/kanban/KanbanColumn.tsx` -- Replace inline styles with Chakra style props
- `src/ui/components/kanban/DeliverableCard.tsx` -- Replace inline styles with Chakra style props
- `src/ui/components/kanban/SkillActions.tsx` -- Replace inline styles with Chakra style props. Replace the copy-pasted press animation with `useButtonPress`
- `src/ui/components/kanban/TimelineView.tsx` -- Replace inline styles with Chakra style props
- `src/ui/utils/formatters.ts` -- Wire into any layout/kanban components that have inline date formatting (replace inline definitions with imports)

**Acceptance criteria:**
- Zero inline `style={{}}` objects remain in any of the 10 files listed above
- All styling uses Chakra UI style props (`bg`, `p`, `color`, `borderRadius`, etc.) or the `sx` prop for CSS properties without direct Chakra equivalents
- Style props reference theme tokens from `src/ui/theme/index.ts` wherever a matching token exists
- `KanbanBoard.tsx` contains no hardcoded column definitions; columns flow from the config API. The loading skeleton must render without column data (either by using a generic placeholder or by ensuring config is fetched before first render)
- `useButtonPress` hook is used in `SkillActions`, `ProjectPicker`, and `ProjectSwitcher` (replacing inline press animation)
- Date formatting uses imports from `formatters.ts` (replacing inline definitions)
- Visual parity: every migrated component renders identically to its pre-migration appearance
- Build passes

**Depends on:** Phase 1 (useButtonPress hook, formatters utility), Phase 2 (config API returns columns with colors for F9)

---

### Phase 4: Style Migration -- Terminal, Preview, and Supplementary Components

**Agent:** frontend-developer

**Why this phase exists:** The remaining 8 component files plus App.tsx complete the style migration. StatsBar's WebSocket wiring depends on Phase 2's stats broadcast. Separating this from Phase 3 keeps each phase at a manageable size and allows Phase 3 to be reviewed before this phase begins.

**Spec requirements addressed:** F1 (remaining 8 of 18 component files + App.tsx), F6 (UI side)

**Files affected:**
- `src/ui/components/terminal/TerminalTabs.tsx` -- Replace inline styles with Chakra style props
- `src/ui/components/terminal/TerminalPanel.tsx` -- Replace inline styles with Chakra style props
- `src/ui/components/terminal/SessionControls.tsx` -- Replace inline styles with Chakra style props. Replace press animation with `useButtonPress`
- `src/ui/components/terminal/SessionHistory.tsx` -- Replace inline styles with Chakra style props
- `src/ui/components/preview/FileViewer.tsx` -- Replace inline styles with Chakra style props
- `src/ui/components/preview/MarkdownPreview.tsx` -- Replace inline styles with Chakra style props (mermaid init already fixed in Phase 1). **High-effort file:** ~15 native HTML element overrides in `react-markdown`'s `Components` prop must each become Chakra components; allocate extra review time
- `src/ui/components/chronicle/ChronicleBrowser.tsx` -- Replace inline styles with Chakra style props
- `src/ui/components/adhoc/AdHocTracker.tsx` -- Replace inline styles with Chakra style props. Replace the copy-pasted press animation with `useButtonPress`
- `src/ui/App.tsx` -- Replace any remaining inline styles with Chakra style props
- `src/ui/components/layout/StatsBar.tsx` -- Wire to consume stats from the WebSocket `watcher:sdlc` stats message instead of making a `GET /api/sdlc/stats` REST call on each update

**Acceptance criteria:**
- Zero inline `style={{}}` objects remain in any of the files listed above
- All styling uses Chakra UI style props referencing theme tokens
- `useButtonPress` hook is used in `SessionControls` and `AdHocTracker` (the two files in this batch with the press animation pattern)
- StatsBar updates deliverable-derived stats (total, byStatus) reactively from WebSocket stats messages. Untracked count is fetched only on initial load via `GET /api/sdlc/stats` and is not included in the WebSocket broadcast
- Visual parity: every migrated component renders identically to its pre-migration appearance
- Build passes, all 103 tests pass

**Commit ordering note:** Phase 3 StatsBar style migration must be committed before Phase 4 touches StatsBar for WebSocket wiring to avoid merge conflicts.

**Depends on:** Phase 1 (useButtonPress hook), Phase 2 (stats WebSocket broadcast for StatsBar wiring)

---

### Phase 5: Documentation -- Spec Alignment

**Agent:** software-architect

**Why this phase exists:** The D1 spec's type definitions drifted from the implementation during D1 execution. Now that D2 has finalized the type shapes (adding `slug`, `color`, `corsOrigins`), the spec must be updated to reflect the actual implementation. This is done last so it captures the final state of all types.

**Spec requirements addressed:** F5

**Files affected:**
- `docs/current_work/specs/d1_mission_control_mvp_spec.md` -- Update the `Project` type definition to include `slug: string`. Update `ColumnConfig` to include `color: string`. Update `McConfig` to include `corsOrigins?: string[]`. Reconcile any other type definitions that diverged from implementation during D1 or D2 work.

**Acceptance criteria:**
- Every type definition in the D1 spec matches the corresponding type in `src/shared/types.ts`
- The `Project`, `ColumnConfig`, and `McConfig` types in the spec include the fields added during D2
- No other spec-to-implementation drift remains in the type definitions section of the D1 spec

**Depends on:** Phase 1 (final type shapes in `src/shared/types.ts`)

---

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| 1: Foundation | -- | software-architect, frontend-developer | -- |
| 2: Server Hardening | Phase 1 | backend-developer | -- |
| 3: Style Migration (Layout + Kanban) | Phase 1, Phase 2 | frontend-developer | Phase 5 (after Phase 1) |
| 4: Style Migration (Terminal + Preview) | Phase 1, Phase 2 | frontend-developer | Phase 5 |
| 5: Documentation | Phase 1 | software-architect | Phase 2, Phase 3, Phase 4 |

**Execution order:** Phase 1 runs first. Phase 2 and Phase 5 can start in parallel once Phase 1 completes. Phase 3 starts after Phase 2 completes. Phase 4 starts after Phase 3 is reviewed.

---

## Approach Comparison

| Approach | Description | Key Tradeoff | Selected? |
|----------|-------------|-------------|-----------|
| A: Phase-by-track (style, server, cleanup, docs) | Organize phases strictly by the spec's 4 tracks. Style migration is one giant phase. | Single style phase touches 18 files in one pass -- too large for a single review cycle, higher risk of merge conflicts. | No -- phase too large |
| B: Phase-by-dependency with style split | Split style migration into two phases by component group (layout+kanban, then terminal+preview). Interleave server and foundation work based on dependency order. | More phases (5 vs 4), but each is reviewable and independently verifiable. | Yes -- manageable phase size, clear dependency chain |

---

## Agent Skill Loading

| Agent | Load These Skills |
|-------|------------------|
| software-architect | (none -- standard type analysis and spec editing) |
| backend-developer | (none -- standard Node.js/Express work) |
| frontend-developer | (none -- standard React/Chakra UI work) |

---

## Testing

### Manual Testing

1. **Visual parity (after Phases 3 and 4):** Open the dashboard and compare every component against a pre-migration screenshot. Check layout, spacing, colors, typography, hover states, and animations. No visible differences should exist.
2. **CORS (after Phase 2):** With default config, verify `fetch` from `http://localhost:3002` succeeds. From a different origin, verify the request is blocked. With `corsOrigins` set in `.mc.json`, verify the specified origin is allowed.
3. **Stats broadcast (after Phase 2 + Phase 4):** Open the dashboard, create a file in `docs/current_work/specs/`. Verify StatsBar deliverable counts (total, byStatus) update via WebSocket without a new REST call. Verify that untracked count does not change (it is REST-only and not broadcast).
4. **Slug uniqueness (after Phase 2):** Register two projects with the same directory name but different parent paths. Verify they produce distinct slugs and use separate session storage directories.
5. **Mermaid (after Phase 1):** Open a deliverable containing a Mermaid diagram. Verify it renders without console warnings about re-initialization. Navigate away and back; verify no duplicate initialization.
6. **Column config (after Phase 3):** Delete `.mc.json` and verify the board still renders with default columns from the server. Create `.mc.json` with custom columns and verify they appear.
7. **Button press animation (after Phases 3 and 4):** Click skill action buttons, session controls, project picker items, project switcher, and ad hoc tracker buttons. Verify the scale animation still triggers on mouse down.

### Automated Tests

- [x] Existing 103 tests pass (with async adjustments to sdlcParser tests in Phase 2)
- [ ] New unit tests for slug generation: deterministic output for known paths, collision resistance for same-basename paths
- [ ] New unit tests for `useButtonPress`: returns correct style when pressed vs not pressed
- [ ] New unit tests for `formatters.ts`: `formatDate` and `formatTimestamp` produce expected output for known ISO strings

---

## Verification Checklist

- [ ] All implementation phases complete
- [ ] Zero inline `style={{}}` objects remain in any UI component file (SC1)
- [ ] `useButtonPress` is the sole source of press animation -- grep for `scale(0.97)` finds only the hook file (SC2)
- [ ] `formatDate`/`formatTimestamp` defined only in `formatters.ts` (SC3)
- [ ] No synchronous `readFileSync`/`readdirSync`/`statSync`/`existsSync` in sdlcParser, catalogParser, listSessions, or searchSessions hot paths (SC4)
- [ ] CORS middleware active, non-localhost origins rejected by default (SC5)
- [ ] StatsBar receives deliverable-derived stats (total, byStatus) via WebSocket; untracked count is REST-only (SC6)
- [ ] Same-basename projects produce different slugs (SC7)
- [ ] KanbanBoard has no hardcoded column definitions (SC8)
- [ ] Only `@xterm/xterm` in package.json (SC9)
- [ ] `mermaid.initialize()` runs once per page load (SC10)
- [ ] `handleSwitchProject` does not exist in App.tsx (SC11)
- [ ] D1 spec types match implementation (SC12)
- [ ] All 103 tests pass, build produces zero errors (SC13)
- [ ] Manual visual parity check complete
- [ ] Manual CORS check complete
- [ ] Manual stats broadcast check complete

---

## Post-Execution Review

The following agents will review the completed work:

| Agent | Review Focus |
|-------|-------------|
| software-architect | Type correctness, shared abstraction design, spec alignment, overall architectural coherence |
| backend-developer | Async conversion correctness, CORS configuration, stats broadcast reliability, slug collision safety |
| frontend-developer | Chakra style prop usage, theme token coverage, visual parity, hook and utility integration |
| code-reviewer | Cross-cutting concerns: naming consistency, dead code removal, test coverage gaps, commit hygiene |

---

## Component-to-Phase Map

Every file from the spec's Components Affected list, mapped to its implementation phase:

| File | Phase |
|------|-------|
| `src/shared/types.ts` | 1 |
| `src/ui/hooks/useButtonPress.ts` (new) | 1 |
| `src/ui/utils/formatters.ts` (new) | 1 |
| `package.json` | 1 (xterm), 2 (cors) |
| `src/ui/components/preview/MarkdownPreview.tsx` (mermaid fix) | 1 |
| `src/ui/App.tsx` (wrapper removal) | 1 |
| `src/server/services/sdlcParser.ts` | 2 |
| `src/server/services/catalogParser.ts` | 2 |
| `src/server/services/sessionStore.ts` | 2 |
| `src/server/services/fileWatcher.ts` | 2 |
| `src/server/services/projectRegistry.ts` | 2 |
| `src/server/services/configLoader.ts` | 2 |
| `src/server/index.ts` | 2 |
| `src/server/routes/sdlc.ts` | 2 |
| `src/server/routes/sessions.ts` | 2 |
| `src/server/services/__tests__/fileWatcher.test.ts` | 2 |
| `src/ui/components/layout/Dashboard.tsx` | 3 |
| `src/ui/components/layout/StatsBar.tsx` | 3 (styles), 4 (WebSocket wiring) |
| `src/ui/components/layout/ProjectPicker.tsx` | 3 |
| `src/ui/components/layout/ProjectSwitcher.tsx` | 3 |
| `src/ui/components/kanban/KanbanBoard.tsx` | 3 |
| `src/ui/components/kanban/KanbanColumn.tsx` | 3 |
| `src/ui/components/kanban/DeliverableCard.tsx` | 3 |
| `src/ui/components/kanban/SkillActions.tsx` | 3 |
| `src/ui/components/kanban/TimelineView.tsx` | 3 |
| `src/ui/components/terminal/TerminalTabs.tsx` | 4 |
| `src/ui/components/terminal/TerminalPanel.tsx` | 4 |
| `src/ui/components/terminal/SessionControls.tsx` | 4 |
| `src/ui/components/terminal/SessionHistory.tsx` | 4 |
| `src/ui/components/preview/FileViewer.tsx` | 4 |
| `src/ui/components/preview/MarkdownPreview.tsx` (styles) | 4 |
| `src/ui/components/chronicle/ChronicleBrowser.tsx` | 4 |
| `src/ui/components/adhoc/AdHocTracker.tsx` | 4 |
| `src/ui/App.tsx` (styles) | 4 |
| `docs/current_work/specs/d1_mission_control_mvp_spec.md` | 5 |

---

## Notes

- **CORS dependency:** The `cors` npm package is not currently in `package.json` dependencies. It must be added as a production dependency in Phase 2.
- **Session directory migration:** The slug format change in Phase 2 will cause new session directories to be created alongside old ones. Old directories are not actively migrated; they will be naturally pruned by the 30-day age policy already in the session store. This is acceptable because session history is ephemeral.
- **Test breakage -- sdlcParser.test.ts:** The existing tests call `parseDeliverables` and `getDeliverable` synchronously. Phase 2 must add `async`/`await` to these test functions.
- **Test breakage -- sessionStore.test.ts:** Tests hardcode the old slug formula (`path.basename.replace(...)`) for slug assertions. Phase 2 must update these to match the new hash-based slug format. Tests calling `listSessions` must also gain `async`/`await`.
- **Test breakage -- fileWatcher.test.ts:** Test assertions on `onUpdate.mock.calls` will receive `Promise` objects instead of `Deliverable[]` once `parseDeliverables` becomes async. The test must `await` appropriately or mock the async version.
- **Test breakage -- catalogParser.test.ts:** All 11 calls to `parse()` in this test file invoke the now-async `parseCatalog` and must gain `async`/`await`. Without this, every assertion operates on a `Promise` instead of the parsed result.
- **Chakra `sx` prop fallback:** Some inline styles may use CSS properties without direct Chakra style prop equivalents (pseudo-elements, complex selectors, CSS grid shorthand). For these cases, use Chakra's `sx` prop rather than retaining inline styles. Each exception should be documented in the result.
- **@keyframes handling:** `<style>` tags containing `@keyframes` (Dashboard spin animation, KanbanBoard shimmer animation) are not inline `style={{}}` objects and are therefore not in scope of the "zero inline style" criteria. These should move to the theme's `globalCss` or remain as `<style>` tags -- the executing agent should choose the approach that best integrates with the Chakra theme system and document the decision.
- **Column defaults location after F9:** The hardcoded column definitions move from `KanbanBoard.tsx` to `configLoader.ts` (which already has them, but without `color`). Phase 2 adds `color` to the defaults in configLoader. Phase 3 removes the UI-side copy. The server is the single source of truth for column definitions.
- **MarkdownPreview effort estimate:** This file has ~15 native HTML element overrides in `react-markdown`'s `Components` prop that must each become Chakra components. It is the highest-effort single file in the style migration and should be allocated extra implementation and review time.
- **Stats broadcast scope (CD decision):** WebSocket stats broadcast includes only deliverable-derived stats (total, byStatus). Untracked count remains REST-only via `GET /api/sdlc/stats` to avoid running `git log` on every file change.
- **Naming consistency:** The actual type in `src/shared/types.ts` is `ColumnConfig`, not `ColumnDefinition`. Use `ColumnConfig` consistently throughout all plan references, spec updates, and implementation.
- **useButtonPress actual targets:** The 5 component files containing the `scale(0.97)` press animation pattern are: SessionControls, ProjectSwitcher, ProjectPicker, SkillActions, and AdHocTracker. Neither DeliverableCard nor TerminalTabs contains this pattern.

---

## Domain Agent Reviews

Key feedback incorporated:

- [software-architect] catalogParser.ts must be explicitly in Phase 2 async scope — sdlcParser delegates to it synchronously, breaking the async chain
- [software-architect] StatsBar split across Phase 3 (styles) and Phase 4 (WebSocket) requires commit ordering — Phase 3 work must be committed before Phase 4 touches it
- [backend-developer] listSessions is sync and called by searchSessions — converting only searchSessions leaves the heavy readdirSync/readFileSync blocking via delegation
- [backend-developer] fileWatcher handleChange will silently pass a Promise to onUpdate when parseDeliverables goes async — flagged as production correctness bug requiring explicit handling
- [backend-developer] sessionStore.test.ts hardcodes old slug formula in 3 test cases — slug format change will break cleanup logic and path assertions
- [backend-developer] Stats broadcast must exclude untracked count to avoid execSync git calls on every file change — CD confirmed REST-only for untracked
- [frontend-developer] useButtonPress targets were wrong — DeliverableCard and TerminalTabs do not have scale(0.97); actual targets are 5 specific files
- [frontend-developer] KanbanBoard loading skeleton depends on column definitions that will be async after removing hardcoded defaults — needs fallback rendering
- [frontend-developer] MarkdownPreview is highest-effort file — ~15 react-markdown component overrides must become Chakra components, not just style prop swaps
- [code-reviewer] fileWatcher.onUpdate type signature will cascade when ReturnType<typeof parseDeliverables> changes from Deliverable[] to Promise<Deliverable[]>
- [code-reviewer] catalogParser.test.ts has 11 synchronous parse() calls that will break — added to Phase 2 test breakage scope
- [code-reviewer] @keyframes in JSX style tags are not inline style objects — clarified as out of scope for "zero inline style" criteria
