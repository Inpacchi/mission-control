---
name: TUI unified app Phase 2 patterns
description: Patterns established during Phase 2 refactor — converting standalone TUI screens to presentational components
type: project
---

## Phase 2 complete as of 2026-03-18

**What was done:** ChronicleList, SessionBrowser, AdhocBrowser, FileBrowser converted to pure presentational components. Per-view hooks (useChronicleView, useSessionView, useAdhocView, useFileView) filled in with real state + keyboard handling. PagerView.tsx created as embedded pager for session detail.

**Why:** Unified single-app TUI architecture — one Ink instance, one useInput dispatcher in useKeyboard.

**How to apply:**

### Presentational component pattern
- Components import from `ink` but ONLY use `useStdout` for dimensions — never `useInput`, `useApp`, or `exit()`
- Props contain all state the component needs to render
- Internal `useMemo` for derived values (filteredCommits etc.) is acceptable if it doesn't call useInput

### Per-view hook pattern
- Each hook owns: useState for all its view state, useEffect for data loading (cancelled-flag), useListNavigation, useSearchInput, useCallback for handleKey
- `handleKey(input, key, viewMode)` — checks viewMode at top, returns `boolean` (consumed)
- handleKey must reference latest state via closure — declare as `useCallback` with full deps array
- setViewMode transitions (e.g., 'adhoc' → 'adhoc-detail') happen inside handleKey

### Cache policy
- Cache list data (sessions, commits, chronicle entries): `if (items.length > 0) return;` guard in useEffect
- Clear detail content when leaving detail sub-view (setSessionContent(null), setDetailContent(null))

### File rename: adhoc command
- `src/tui/commands/adhoc.ts` was renamed to `adhoc.tsx` during Phase 2 because it gained JSX for the StandaloneAdhocBrowser wrapper component. The import in cli.ts/index.ts still uses `.js` extension (correct for ESM).

### Standalone command wrappers
- `src/tui/commands/{chronicle,sessions,adhoc,files}.tsx` each got a `StandaloneXxx` component that wires the hook + useInput for the non-unified standalone use case. Phase 3/4 will replace these with unified BoardApp routing.

### Disk-persistence exception in FileBrowser
- The `useEffect` that persists collapsed directory state stays in FileBrowser.tsx (not useFileView) to avoid spurious writes when the files view is not active in the unified app.

### PagerView.tsx location
- `src/tui/PagerView.tsx` — presentational pager, no useInput
- `src/tui/Pager.tsx` — standalone pager with useInput (for `mc log`, `mc view`) — DO NOT MODIFY
