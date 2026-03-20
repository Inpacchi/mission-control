---
tier: lite
type: refactor
complexity: complex
effort: 4
flavor: "One app to rule them all, one render loop to bind them."
created: 2026-03-18
author: CC
agents: [frontend-developer]
---

# SDLC-Lite Plan: Unified Single-App TUI Architecture

**Execute this plan using the `sdlc-lite-execute` skill.**

**Scope:** Refactor Mission Control's TUI from a multi-Ink-instance architecture (board exits, launches standalone screen, re-launches board) into a single unified Ink application where all views are embedded components rendered by BoardApp via viewMode switching. Eliminates screen flash, removes the `while(true)` relaunch loop, and consolidates keyboard handling.

**Files:**

Modified:
- `src/tui/hooks/useKeyboard.ts` -- expand ViewMode, compose per-view hooks, dispatch to per-view handlers
- `src/tui/BoardApp.tsx` -- render all views based on viewMode (chronicle, sessions, adhoc, files, and their detail sub-views)
- `src/tui/ChronicleList.tsx` -- convert from standalone Ink app to presentational component (remove `useInput`, `useApp`)
- `src/tui/SessionBrowser.tsx` -- convert from standalone Ink app to presentational component; inline Pager as session-detail view
- `src/tui/AdhocBrowser.tsx` -- convert from standalone Ink app to presentational component
- `src/tui/FileBrowser.tsx` -- convert from standalone Ink app to presentational component
- `src/tui/index.ts` -- remove the `while(true)` action loop; single `render(BoardApp)` call
- `src/cli.ts` -- remove standalone subcommands (`mc chronicle`, `mc sessions`, `mc adhoc`, `mc files`); keep `mc status`, `mc view`, `mc log` as one-shot commands
- `src/tui/components/HelpBar.tsx` -- accept viewMode prop, show context-appropriate shortcuts per active view

Created:
- `src/tui/hooks/useChronicleView.ts` -- state + keyboard handler for chronicle list + detail views
- `src/tui/hooks/useSessionView.ts` -- state + keyboard handler for session list + search + detail views
- `src/tui/hooks/useAdhocView.ts` -- state + keyboard handler for adhoc list + search + detail views
- `src/tui/hooks/useFileView.ts` -- state + keyboard handler for file browser views (browse, search, grep-input, grep-results)
- `src/tui/PagerView.tsx` -- presentational pager component (no `useInput`/`useApp`) for embedded session-detail view

Deleted:
- `src/tui/commands/chronicle.tsx` -- no longer needed (view is embedded)
- `src/tui/commands/sessions.tsx` -- no longer needed
- `src/tui/commands/files.tsx` -- no longer needed
- `src/tui/commands/adhoc.ts` -- no longer needed (non-TTY pipe output for adhoc is dropped; mc is a TUI app)
- RETAIN (not delete): `src/tui/launchScreen.ts` -- used by surviving one-shot commands (`view.ts`, `log.ts`)

**Agents:** frontend-developer

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| 1 | None | frontend-developer | -- |
| 2 | Phase 1 | frontend-developer | -- |
| 3 | Phase 2 | frontend-developer | -- |
| 4 | Phase 3 | frontend-developer | -- |

## Phases

### Phase 1: Keyboard Dispatch Architecture + ViewMode Expansion

**Agent:** frontend-developer
**Outcome:** `useKeyboard.ts` supports the full ViewMode union type, composes per-view hooks that each manage their own state and expose a `handleKey` function, and dispatches keyboard input accordingly. Board and detail keyboard handling extracted into handler functions following the same pattern. All existing board+detail behavior works identically.

**Why:** This is the foundational change. Every subsequent phase plugs a new view into this dispatcher. Getting the dispatch pattern right first, with existing views as proof, prevents rework.

**Guidance:**

Expand ViewMode to:
```typescript
export type ViewMode =
  | 'board' | 'detail'
  | 'chronicle' | 'chronicle-detail'
  | 'sessions' | 'session-search' | 'session-detail'
  | 'adhoc' | 'adhoc-search' | 'adhoc-detail' | 'adhoc-detail-search'
  | 'files' | 'file-search'
  | 'file-grep-input' | 'file-grep-results';
```

**Composed hooks pattern (not separate handler files):** Each per-view hook (e.g., `useChronicleView`, `useSessionView`) manages BOTH its own state AND its key handling. It returns a state sub-object and a `handleKey(input, key) => boolean` function. `useKeyboard` becomes a thin dispatcher that composes these hooks.

Each per-view hook follows this pattern:
```typescript
// Example: src/tui/hooks/useChronicleView.ts
export interface ChronicleViewState {
  entries: Deliverable[];
  loading: boolean;
  selectedIndex: number;
  scrollOffset: number;
  content: string | null;
  activeDocType: DocType;
  // ... view-specific state
}

export function useChronicleView(projectPath: string, viewMode: ViewMode): {
  state: ChronicleViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
} {
  // All state lives here
  // handleKey checks viewMode to decide whether to act
  // Data-loading useEffect triggers on viewMode transitions
  // Returns true if input was consumed
}
```

All per-view hooks are called unconditionally at the top of `useKeyboard` (React rules of hooks), even when the view is not active. The `handleKey` function inside each hook checks the current viewMode before acting.

The return type of `useKeyboard` groups state into sub-objects:
```typescript
interface UseKeyboardResult {
  viewMode: ViewMode;
  board: BoardViewState;      // selectedZone, selectedCard, showHelp, expandedCardId, detail state...
  chronicle: ChronicleViewState;
  sessions: SessionViewState;
  adhoc: AdhocViewState;
  files: FileViewState;
}
```

`useKeyboard`'s single `useInput` callback becomes a dispatcher:
```typescript
useInput((input, key) => {
  if (currentViewMode === 'board' || currentViewMode === 'detail') {
    handleBoardKeys(input, key, boardState, boardActions);
    return;
  }
  if (currentViewMode.startsWith('chronicle')) {
    chronicleView.handleKey(input, key, currentViewMode);
    return;
  }
  if (currentViewMode.startsWith('session')) {
    sessionView.handleKey(input, key, currentViewMode);
    return;
  }
  // ...etc
});
```

Extract existing board-mode and detail-mode keyboard logic from `useKeyboard.ts` into `handleBoardKeys()` as the first handler -- this validates the pattern before adding new views. Keep `handleBoardKeys` in `useKeyboard.ts` initially (it can be extracted to its own file later if desired). `handleBoardKeys` is a local function inside `useKeyboard` with closure access to existing state variables -- it does not receive state as explicit parameters.

Remove `pendingAction` and `BoardAction` from useKeyboard entirely. Replace with direct `setViewMode('chronicle')` calls when `c`, `s`, `a`, `f` are pressed.

Add `projectPath: string` to the UseKeyboardOptions interface. Multiple views need it for data loading (chronicle, sessions, adhoc, files, git calls).

Do not debounce view transitions. React's `setState` batching handles rapid key input correctly.

**Key files:** `src/tui/hooks/useKeyboard.ts` (primary), `src/tui/hooks/useSearchInput.ts` (pattern reference), `src/tui/hooks/useListNavigation.ts` (reuse for list views).

### Phase 2: Convert Standalone Screens to Presentational Components

**Agent:** frontend-developer
**Outcome:** ChronicleList, SessionBrowser, AdhocBrowser, and FileBrowser are pure presentational components. They accept data and callbacks as props, render UI, and contain zero `useInput`/`useApp` calls. A new `PagerView.tsx` provides the presentational pager for embedded session-detail rendering. Each component's rendering logic is unchanged from its current appearance.

**Why:** Separating presentation from interaction is required before embedding. If keyboard handling stays in the components, there will be multiple `useInput` hooks active simultaneously, causing input conflicts.

**Guidance:**

For each component, apply this transformation:

1. Remove `useInput()`, `useApp()`, and any `exit()` calls.
2. Remove `fromBoard` prop (no longer needed -- there is no "from board" vs "standalone" distinction).
3. Remove data loading from the component. Data loading moves to the per-view hooks (e.g., `useChronicleView`). The component receives data as props.
4. Remove internal viewMode state (e.g., ChronicleList's `'list' | 'detail'`). The parent (BoardApp + useKeyboard) now controls which sub-view is shown via the global ViewMode.
5. Keep all rendering logic (JSX) intact. The visual output should not change.

Passive data-fetching hooks (`useFileContent`, `useMarkdownLines`) that do not call `useInput` remain in the presentational components. Only keyboard-triggered data loading (e.g., `parseChronicle`, `listClaudeSessions`) moves to the per-view hooks.

**ChronicleList transformation:**
- Current: loads data via `parseChronicle()` in useEffect, manages `viewMode: 'list' | 'detail'`, handles its own `useInput`.
- After: receives `entries: Deliverable[]`, `loading: boolean`, `selectedIndex`, `scrollOffset`, `listStart`, `viewMode` (from parent), `content`, `activeDocType`, etc. as props. Renders list view or detail view based on `viewMode` prop.
- Data loading (`parseChronicle(projectPath)`) moves to `useChronicleView` hook.

**SessionBrowser transformation:**
- Current: loads sessions, manages list+search modes, exits Ink and launches Pager for session detail.
- After: receives `sessions`, `filteredSessions`, `selectedIndex`, `searchQuery`, `mode` as props. Session detail becomes the `'session-detail'` viewMode in the parent, not a separate Pager launch.
- The `openSessionInPager` function becomes a data-loading effect: when viewMode transitions to `'session-detail'`, load the session log and render it inline using `PagerView` (the new presentational pager component).
- **CPU-bound rendering note:** The `openSessionInPager` function's markdown rendering (`renderMarkdownToAnsi` per assistant turn) is synchronous and CPU-bound. In the unified app, this runs in a `useEffect` when viewMode transitions to `'session-detail'`. The component MUST show a loading state while rendering. The pattern: `useEffect` sets `sessionContent = null` (triggers loading UI), runs the parse+render synchronously, then sets `sessionContent = renderedString`. This blocks the event loop briefly but is acceptable (same as current behavior). Add a comment documenting this.

**AdhocBrowser transformation:**
- Current: receives commits as props already (good), manages list+detail+search internally.
- After: receives additional props for selection state, search state, detail content. The `execFile('git', ['show', ...])` call for commit detail moves to `useAdhocView`'s state management.

**FileBrowser transformation:**
- Same pattern. File tree state, search state, and editor launching move to the keyboard/state layer.
- **Expanded guidance (4 modes):** FileBrowser has 4 distinct modes: `'browse'`, `'search'`, `'grep-input'`, and `'grep-results'`. The `'grep-input'` mode uses raw character accumulation (not `useSearchInput`) -- the `grepQuery` state is built character-by-character via `setGrepQuery(q => q + input)`. The `'grep-results'` mode has its own navigation state (`grepSelectedIndex`, `grepResults`). All four modes and their state must be represented in `useFileView`. The ViewMode union includes `'file-grep-input'` and `'file-grep-results'` for these.
- **Disk-persistence exception:** FileBrowser's `useEffect` that persists collapsed directory state to disk (lines 127-131 in current code) stays in the component -- it does not involve `useInput` and would cause spurious writes if hoisted to `useFileView`. Add a comment noting this intentional exception.
- **Editor launch via `execSync` is safe in the unified app** because `execSync` blocks the event loop entirely -- Ink cannot render during the block. The alternate-screen toggle pattern (`\x1b[?1049l` before, `\x1b[?1049h` after) works unchanged. No Ink exit/re-enter needed.

**Pager standalone vs embedded fork:**
- `src/tui/Pager.tsx` is NOT modified. It remains unchanged as the standalone pager used by one-shot commands (`mc log`, `mc view`) via `launchScreen.ts`.
- Create a new `src/tui/PagerView.tsx` -- the presentational version of Pager with no `useInput`/`useApp`. This is the component used by the embedded session-detail view. It accepts title, content, scroll position, search state, and footer text as props. The scroll/search state it needs is managed by `useSessionView`.
- `launchScreen.ts` continues to import the original `Pager.tsx`.

**Key constraint:** All hooks (`useListNavigation`, `useSearchInput`, `useFileContent`) that these components currently call must either (a) move to the per-view hooks, or (b) remain in the component ONLY if they do not involve `useInput`. `useListNavigation` and `useSearchInput` are safe -- they manage state but do not call `useInput`. `useFileContent` is safe -- it is a data-fetching hook. The only hook that must be removed is `useInput`.

**Key files:** `src/tui/ChronicleList.tsx`, `src/tui/SessionBrowser.tsx`, `src/tui/AdhocBrowser.tsx`, `src/tui/FileBrowser.tsx`, `src/tui/PagerView.tsx` (created), `src/tui/components/DetailPanel.tsx` (reference pattern).

### Phase 3: Wire Views into BoardApp + Remove Relaunch Loop

**Agent:** frontend-developer
**Outcome:** BoardApp renders all views inline based on viewMode from useKeyboard. Pressing `c`/`s`/`a`/`f` transitions viewMode instantly (no exit/relaunch). Pressing `b`/Esc returns to board. The `while(true)` loop in `src/tui/index.ts` is removed. `launchBoard()` becomes a single `render(BoardApp)` call. HelpOverlay is updated to document all views and keybindings.

**Why:** This is the integration phase that delivers the user-facing improvement: no more screen flash, instant view switching.

**Guidance:**

BoardApp's render function becomes a view router:
```tsx
if (viewMode === 'detail' && expandedCardId !== null) {
  return <DetailPanel ... />;
}
if (viewMode === 'chronicle' || viewMode === 'chronicle-detail') {
  return <ChronicleList ... />;
}
if (viewMode.startsWith('session')) {
  return <SessionBrowser ... />;  // or PagerView for session-detail
}
if (viewMode.startsWith('adhoc')) {
  return <AdhocBrowser ... />;
}
if (viewMode.startsWith('file')) {
  return <FileBrowser ... />;
}
// Default: board view
return <BoardLayout ... />;
```

Data loading for each view triggers on viewMode transition. Use `useEffect` dependencies on viewMode to load data lazily:
- Chronicle: call `parseChronicle(projectPath)` when viewMode becomes `'chronicle'`
- Sessions: call `listClaudeSessions(projectPath)` when viewMode becomes `'sessions'`
- Adhoc: call `getUntrackedCommits(projectPath)` when viewMode becomes `'adhoc'`
- Files: scan file tree when viewMode becomes `'files'`

**Cache vs clear policy:** Cache view lists (sessions list, chronicle entries, adhoc commits) so returning to a view does not re-fetch. Clear detail content (session log, commit stat output) when leaving the detail sub-view. This prevents unbounded memory growth from large session logs while keeping list navigation snappy.

**Data loading cancellation guard:** Data-loading effects must use a cleanup function with a `cancelled` flag. Pattern:
```typescript
useEffect(() => {
  let cancelled = false;
  loadData().then(d => { if (!cancelled) setState(d) });
  return () => { cancelled = true };
}, [viewMode]);
```
Reference AdhocBrowser's existing `unmounted` ref (line 103-108 in current code) as precedent for this pattern.

**`getUntrackedCommits` is synchronous** (uses `execSync` internally). In the unified app's `useEffect`, accept the brief event-loop block (same as current behavior). Add a comment noting this.

**Remove `pendingAction` useEffect:** Remove the `useEffect` watching `pendingAction` in BoardApp (lines 162-167 in current code) alongside the `onAction` prop. Failing to remove this effect will cause premature exits since `pendingAction` no longer exists.

**The existing `openEditor` callback in BoardApp must be updated** to toggle alternate screen (`\x1b[?1049l` before, `\x1b[?1049h` after) around the `spawnSync` call, matching the FileBrowser pattern. `spawnSync` blocks the event loop so Ink cannot render during the editor session. This applies to the `n` key handler in BoardApp (lines 129-137 in current code).

**Update HelpOverlay** to document all views and their keybindings:
- Board: `c` chronicle, `s` sessions, `a` adhoc, `f` files, `?` help, `q` quit
- All sub-views: `b`/Esc back, `q` quit, `/` search (where applicable), `n`/`p` next/prev match

**`n` key routing note:** In board mode, `n` opens notes in `$EDITOR`. In sub-views with active search, `n` means next match. This is NOT a conflict because the dispatcher routes by viewMode -- `n` in board mode goes to `handleBoardKeys`, `n` in chronicle/session/adhoc/file modes goes to the respective view's `handleKey`. No resolution needed.

`src/tui/index.ts` simplifies to:
```typescript
export async function launchBoard(projectPath: string): Promise<void> {
  if (!process.stdout.isTTY) { ... }
  const deliverables = await parseDeliverables(projectPath);
  process.stdout.write('\x1b[?1049h');
  // ... SIGTERM handler, restoreScreen ...
  try {
    const { waitUntilExit } = render(
      React.createElement(BoardApp, { projectPath, initialDeliverables: deliverables }),
    );
    await waitUntilExit();
  } finally {
    restoreScreen();
    console.clear();
  }
}
```

Remove `onAction` prop from BoardApp.

**Key files:** `src/tui/BoardApp.tsx`, `src/tui/index.ts`, `src/tui/hooks/useKeyboard.ts`.

### Phase 4: CLI Cleanup + Polish

**Agent:** frontend-developer
**Outcome:** Standalone subcommands (`mc chronicle`, `mc sessions`, `mc adhoc`, `mc files`) are removed from `src/cli.ts`. One-shot commands (`mc status`, `mc view`, `mc log`, `mc board`) remain. Dead command files deleted. Bottom bar shows context-appropriate shortcuts for active view. Build passes.

**Why:** The standalone commands were the entry points for the now-embedded views. Keeping them creates dead code and user confusion. One-shot commands remain because they serve a different purpose (pipe-friendly output, direct document access).

**Guidance:**

In `src/cli.ts`:
- Remove the `program.command('chronicle', ...)`, `program.command('sessions', ...)`, `program.command('adhoc', ...)`, and `program.command('files', ...)` blocks.
- Keep `status` (non-TTY stats), `view` (direct doc access), `log` (direct session log), `board` (explicit board launch, same as default).
- The `mc board` subcommand and the default `mc` action both call `launchBoard()`.
- Non-TTY pipe output for `mc adhoc` is dropped. mc is a TUI app; the non-TTY guard in `commands/adhoc.ts` is not preserved.

Delete files:
- `src/tui/commands/chronicle.tsx`
- `src/tui/commands/sessions.tsx`
- `src/tui/commands/files.tsx`
- `src/tui/commands/adhoc.ts`

RETAIN (not delete): `src/tui/launchScreen.ts` -- used by surviving one-shot commands (`view.ts`, `log.ts`).

Update `BottomBar` in `src/tui/components/HelpBar.tsx` to accept the current viewMode and show relevant shortcuts for the active view rather than always showing board shortcuts.

Verify the build passes: `npm run build` must succeed with no type errors.

**Key files:** `src/cli.ts`, `src/tui/commands/chronicle.tsx` (delete), `src/tui/commands/sessions.tsx` (delete), `src/tui/commands/files.tsx` (delete), `src/tui/commands/adhoc.ts` (delete), `src/tui/BoardApp.tsx`, `src/tui/components/HelpBar.tsx`.

## Post-Execution Review

All completed work must be reviewed by all relevant worker domain agents.
All findings must be fixed by the most relevant domain agent.
Build must pass before work is considered done.

Specific review focus areas:
- **Keyboard conflicts:** Verify no two views respond to the same key simultaneously. Only one `useInput` call should exist in the entire component tree.
- **Hook call order:** All hooks in useKeyboard must be called unconditionally (React rules of hooks). Verify no hooks are inside conditionals.
- **Data loading:** Verify lazy loading triggers correctly on viewMode transitions and does not re-fetch unnecessarily.
- **Screen flash:** Manually test that pressing `c`, `s`, `a`, `f` and then `b` produces instant transitions with no alternate-screen toggle flash.
- **Memory leaks:** Verify that data loaded for inactive views does not accumulate unboundedly. Session log content (potentially large) should be cleared when leaving session-detail.
- **Cancellation guards:** Verify all async data-loading effects use the `cancelled` flag cleanup pattern.
- **Disk-persistence exception:** Verify FileBrowser's collapsed-state `useEffect` remains in the component, not in `useFileView`.

## Worker Agent Reviews

Key feedback incorporated:

- [frontend-developer] Hook-count explosion in useKeyboard -- mandated composed per-view hooks (useChronicleView etc.) that own both state and key handling, returning structured sub-objects
- [frontend-developer] FileBrowser's collapsed-state persistence useEffect must stay in component -- added explicit exception to Phase 2
- [frontend-developer] Per-view hook signatures need viewMode parameter for data-loading trigger -- added to hook interface
- [frontend-developer] file-detail ViewMode is dead -- removed from union
- [software-architect] FileBrowser has 4 internal modes, not 3 -- expanded ViewMode with file-grep-input and file-grep-results, detailed conversion guidance
- [software-architect] Pager standalone vs embedded fork -- resolved by keeping Pager.tsx unchanged and creating PagerView.tsx for embedded use
- [software-architect] Session log markdown rendering is CPU-bound -- added mandatory loading state pattern in Phase 2
- [code-reviewer] BoardApp.openEditor needs alternate-screen toggle like FileBrowser -- added to Phase 3
- [code-reviewer] Cancellation guards needed for data-loading effects on rapid view switching -- added cancelled-flag pattern with code example
- [code-reviewer] getUntrackedCommits uses execSync -- noted as acceptable brief block with comment requirement
- [code-reviewer] Non-TTY mc adhoc pipe output dropped per user decision
