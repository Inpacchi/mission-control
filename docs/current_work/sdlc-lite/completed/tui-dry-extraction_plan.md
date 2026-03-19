# SDLC-Lite Plan: TUI DRY Refactoring — Extract 5 Shared Patterns

**Execute this plan using the `sdlc-lite-execute` skill.**

**Scope:** Extract five duplicated patterns from `src/tui/` into shared utilities and hooks. No behavior changes — only structural consolidation. All six command files share identical screen lifecycle boilerplate; three components duplicate search input handling; date formatting is defined twice privately; list navigation state is replicated across three components; and async file loading with path traversal guards is copied between two components.
**Files:**
- Created: `src/tui/launchScreen.ts`, `src/tui/hooks/useSearchInput.ts`, `src/tui/hooks/useListNavigation.ts`, `src/tui/hooks/useFileContent.ts`
- Modified: `src/tui/formatters.ts`, `src/tui/commands/chronicle.tsx`, `src/tui/commands/files.tsx`, `src/tui/commands/sessions.tsx`, `src/tui/commands/adhoc.ts`, `src/tui/commands/log.ts`, `src/tui/commands/view.ts`, `src/tui/ChronicleList.tsx`, `src/tui/FileBrowser.tsx`, `src/tui/SessionBrowser.tsx`, `src/tui/Pager.tsx`, `src/tui/AdhocBrowser.tsx`, `src/tui/components/DetailPanel.tsx`

**Agents:** refactoring-specialist, frontend-developer

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| Phase 1: Leaf Utilities | — | refactoring-specialist | — |
| Phase 2: Screen Lifecycle | Phase 1 | refactoring-specialist | — |
| Phase 3: Component Hooks | Phase 1 | frontend-developer | Phase 2 |
| Phase 4: Wire & Verify | Phase 2, Phase 3 | refactoring-specialist | — |

## Phases

### Phase 1: Leaf Utilities (no consumers changed yet)
**Agent:** refactoring-specialist
**Status:** Partially complete. `src/tui/formatters.ts` already exports `formatDate(iso: string, includeTime?: boolean): string` with a single unified function (not two separate functions). `SessionBrowser.tsx` already imports and calls `formatDate(timestamp, true)`. The only remaining work in this phase is creating `useFileContent.ts`.
**Outcome:** `src/tui/formatters.ts` exports `formatDate(iso: string, includeTime?: boolean): string` (already done). `src/tui/hooks/useFileContent.ts` exists and exports `useFileContent(filePath: string | undefined, projectPath: string, options?: { onLoad?: (content: string) => void }): { content: string | null, loading: boolean, error: string | null }`.
**Why:** These two utilities have zero inter-dependencies and no UI rendering concerns. Extracting them first gives Phases 2 and 3 a stable foundation to import from, and keeps those phases focused on structural wiring rather than logic decisions.
**Guidance:**
- `formatDate` is already implemented as a single function with an optional `includeTime` parameter. Do not rename it or split it. `ChronicleList.tsx` should call `formatDate(iso)` (no second arg) and `SessionBrowser.tsx` calls `formatDate(timestamp, true)` — already wired.
- `useFileContent` should consolidate the path traversal guard that appears in both `DetailPanel.tsx` (lines 54–61) and `commands/view.ts` (lines 48–53). The guard logic is: resolve the path, normalize the project root to end with `path.sep`, then reject if **both** of the following are true: the resolved path does not start with the normalized root, **and** the resolved path is not exactly equal to `projectPath` (without the trailing separator). This secondary condition handles the edge case where `projectPath` itself is the target. On guard failure, set `error` to a descriptive string and `loading` to false — do not call `process.exit`. That decision belongs to the caller.
- The hook's `useEffect` depends on `[filePath, projectPath]`. When `filePath` is undefined or empty, immediately set `loading: false, content: null, error: null` without attempting a read.
- The hook's async effect **must** use a `cancelled` flag pattern to prevent stale state updates: `let cancelled = false; readFile(path).then(text => { if (!cancelled) setContent(text); }); return () => { cancelled = true; };`
- Accept an optional `onLoad?: (content: string) => void` callback parameter. Call it inside the `then` handler after setting state (and only when `!cancelled`). This gives callers direct control over post-load side effects (e.g., resetting scroll offset) without relying on a downstream `useEffect` watching `content`, which has re-fire edge cases (see Phase 4 guidance).
- Do not yet import `useFileContent` from anywhere — leave existing code untouched in this phase.

### Phase 2: Screen Lifecycle Extractor
**Agent:** refactoring-specialist
**Outcome:** `src/tui/launchScreen.ts` exists and exports `launchTuiScreen`. All six command files (`chronicle.tsx`, `files.tsx`, `sessions.tsx`, `adhoc.ts`, `log.ts`, `view.ts`) are updated to use it. The inline `process.stdout.write('\x1b[?1049h')`, `restoreScreen`, `process.once('SIGTERM', ...)`, `render(...)`, `waitUntilExit()`, and `try/finally` blocks are removed from each.
**Why:** The identical 15-line block appears verbatim in six files. Any future change to screen restore behavior (e.g., adding cursor shape restoration) must currently be applied to six places. Centralizing it makes that a one-line fix.
**Guidance:**
- The function signature should be: `launchTuiScreen(element: React.ReactElement, options?: { skipClear?: boolean, ttyErrorMessage?: string }): Promise<void>`.
- Use `skipClear?: boolean` rather than `fromBoard?: boolean` for the console clear suppression option. `fromBoard` is a rendering concern on the component side; `skipClear` accurately names what the option does at the lifecycle level. `log.ts` passes `{ skipClear: true }` because it never clears the console. `view.ts` passes nothing (it always clears — which is the default when `skipClear` is absent). All other callers pass nothing.
- `view.ts` always clears the console unconditionally (it has no `fromBoard` guard and never did). It is the second exceptional case — alongside `log.ts` — that must be documented in the implementation. `view.ts` is the "always clears" default; `log.ts` opts out via `skipClear: true`.
- The function must: check `process.stdout.isTTY` and exit with the caller-supplied `ttyErrorMessage` if not a TTY (callers that already check TTY before calling — `adhoc.ts`, `log.ts`, `view.ts` — can skip passing this option and omit their own TTY check); write the enter-alternate-screen escape; define and register `restoreScreen` covering both `\x1b[?1049l` and `\x1b[?25h`; register `process.once('SIGTERM', ...)` using that same restoreScreen; call `render(element, { exitOnCtrlC: true })` **inside the `try` block** (safer pattern — ensures restoreScreen always runs if render throws); await `waitUntilExit()`; and run `finally { restoreScreen(); if (!options?.skipClear) console.clear(); }`.
- `chronicle.tsx` and `sessions.tsx` have a structural asymmetry: they call `render()` before the `try` block while `files.tsx` and the Pager commands call it inside `try`. After extraction this distinction disappears — the helper owns the try/finally, and `render()` is always inside `try`. Verify the behavior is identical either way before committing.
- The TTY check in `chronicle.tsx`, `files.tsx`, and `sessions.tsx` lives at the top of the function (before the component is resolved). Keep this behavior: fail fast before any screen manipulation.

### Phase 3: Component Hooks
**Agent:** frontend-developer
**Outcome:** `src/tui/hooks/useSearchInput.ts` and `src/tui/hooks/useListNavigation.ts` exist and are exported. `ChronicleList.tsx`, `SessionBrowser.tsx`, `FileBrowser.tsx`, `AdhocBrowser.tsx`, and `Pager.tsx` are updated to use the appropriate hooks, with their inline duplicates removed.
**Why:** Search input handling is copied identically across three components and Pager. List navigation state (selectedIndex, scrollOffset, clamping, arrow key dispatch) is duplicated across four list components (ChronicleList, SessionBrowser, FileBrowser, AdhocBrowser). Extracting them eliminates ~40 lines of repeated state management per consumer and makes the interaction contract explicit.

**Guidance for `useSearchInput`:**
- Signature: `useSearchInput(options?: { onQueryChange?: (query: string) => void }): { query: string, handleKey: (input: string, key: Key) => boolean }`.
- Do **not** include `active` in the return shape. The hook does not own mode state — it only owns the query string accumulation. Consumers track their own mode state (e.g., `mode === 'search'`). Including `active` would be unpopulatable from inside the hook. Consumers already have their own mode variables; the hook exposes only `query` and `handleKey`.
- `handleKey` returns `true` if it consumed the event — the caller should `return` early from its own handler. Returns `false` if the event was not consumed, meaning the caller should continue evaluating remaining key handlers.
- It handles: Escape (clear query, return true), Backspace/Delete (remove last char, return true), printable character input without ctrl/meta modifiers (append to query, return true).
- Accept an optional `onQueryChange?: (query: string) => void` callback in an options object. Call it whenever the query changes (after state update). `FileBrowser` uses this to reset `selectedIndex` to 0 on each character append (line 324 currently does this inline; the callback keeps it in the component without coupling the hook to component concerns).
- `FileBrowser` has two distinct search states — filename search and grep-input — only the filename search (`mode === 'search'`) maps to this hook. The grep-input state has its own query (`grepQuery`) that is separate and should not be merged in this refactoring.
- `Pager` has a search mode whose key handling (lines 71–112) matches the hook's contract. Wire it here.

**Guidance for `useListNavigation`:**
- Signature: `useListNavigation(itemCount: number, viewportHeight: number): { selectedIndex: number, scrollOffset: number, handleUp: () => void, handleDown: () => void, handlePageUp: () => void, handlePageDown: () => void, setSelectedIndex: Dispatch<SetStateAction<number>> }`.
- `scrollOffset` should be computed (not stored as separate state) as `Math.max(0, selectedIndex - viewportHeight + 1)` — this matches the trailing-edge scroll formula used by ChronicleList and SessionBrowser. FileBrowser uses a centered scroll formula (`selectedIndex - Math.floor(viewportHeight / 4)`); if the formulas cannot be unified cleanly under a single hook without adding a `scrollStyle` flag, keep FileBrowser's scrollOffset computed inline and only extract the selectedIndex state management for FileBrowser.
- `handleUp/Down` clamp to `[0, itemCount - 1]`. `handlePageUp/Down` step by `viewportHeight`.
- `handleDown` and `handlePageDown` must guard against `itemCount === 0` — when there are no items, these handlers should be no-ops (return without changing `selectedIndex`). Without this guard, `Math.min(prev + 1, itemCount - 1)` produces `-1` for one render frame before the clamping effect corrects it.
- The hook must include a `useEffect` that clamps `selectedIndex` when `itemCount` decreases (e.g., after a search filter reduces results). This effect is duplicated in both FileBrowser and SessionBrowser. Its inclusion here is an intentional improvement for ChronicleList, which gains auto-clamping it did not previously have.
- Do NOT wire `useInput` inside this hook — the callers have complex multi-mode input handlers and must remain in control of which keys reach the navigation handlers.
- `ChronicleList` uses selectedIndex for both navigation and detail-view selection; expose `setSelectedIndex` so the component can reset it on Enter.
- Callers using raw `setSelectedIndex` directly (bypassing `handleUp`/`handleDown`) are responsible for keeping the value within `[0, itemCount - 1]`. The hook does not guard against out-of-range values set via `setSelectedIndex`.
- `FileBrowser`'s `scrollOffset` depends on `visibleEntries.length`, which comes from component state (`collapsed`). This creates a circular dependency if the hook tried to own `scrollOffset` for FileBrowser. The hook exposes only `selectedIndex` and handlers for FileBrowser; `scrollOffset` remains computed inline in the component.

### Phase 4: Wire useFileContent and Verify
**Agent:** refactoring-specialist
**Outcome:** `DetailPanel.tsx` and `ChronicleList.tsx` use `useFileContent` from Phase 1. Their inline `useEffect` + `fs.readFile` + path traversal guard blocks are removed. Build passes with no TypeScript errors. Behavior is unchanged.
**Why:** This phase is last because it touches components that were also modified in Phase 3, avoiding merge conflicts. Running it after Phase 3 is settled ensures clean integration.
**Guidance:**
- `DetailPanel.tsx` currently sets `loading: true` and `content: null` at the start of each effect (lines 46–47). The hook must replicate this reset-on-path-change behavior — verify the hook's effect dependency array matches `[filePath, projectPath]` exactly.
- `DetailPanel.tsx` has a subtle case: when `filePath` is undefined (idea-only deliverable), it renders an early return before the hooks. This is a hooks-order violation risk — the `useFileContent` call must remain unconditional (above any early return). The hook already handles `filePath: undefined` gracefully (Phase 1 spec), so this is safe.
- **ChronicleList coordination contract:** The component must follow this exact hooks call order — all unconditional, before any early return: (1) `const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(undefined)` — this drives file loading; (2) `const { content, loading, error } = useFileContent(selectedFilePath, projectPath, { onLoad: handleContentLoad })` — wires loading to state; (3) `const markdownLines = useMarkdownLines(content)` — downstream of content. When the user presses Enter on a chronicle file, call `setSelectedFilePath(file.path)`. When the user returns to list view, call `setSelectedFilePath(undefined)` to clear. Do **not** drive `setViewMode('detail')` or `setScrollOffset(0)` from a `useEffect` watching `content !== null` — this has an edge case where opening the same file twice won't re-fire because the content reference doesn't change. Instead, use the `onLoad` callback (from Phase 1): define `handleContentLoad` to call `setViewMode('detail')` and `setScrollOffset(0)`. The callback fires each time a load completes, including repeat loads of the same path, because it is invoked from inside the async resolution, not from React's change-detection.
- Remove `detailError` and `detailLoading` local state variables. Replace all JSX branches that reference `detailLoading` and `detailError` with `loading` and `error` from `useFileContent`.
- Note: ChronicleList currently has no path traversal guard on file reads (it reads `entry.resultPath` directly). Wiring through `useFileContent` applies the guard for the first time. This is an intentional security improvement. If any chronicle entry has a `resultPath` outside the project directory, it will now show an error instead of reading the file.
- Define `handleContentLoad` using `useCallback` with an empty dependency array (since it only calls `useState` setters, which are stable). This is defensive but makes the intent explicit and guards against future additions to the callback body.
- After wiring, run `npm run build` (or the project's equivalent TypeScript check) and confirm zero new errors.

## Post-Execution Review
All completed work must be reviewed by all relevant worker domain agents.
All findings must be fixed by the most relevant domain agent.
Build must pass before work is considered done.

## Worker Agent Reviews

Key feedback incorporated from agent review of the initial plan draft:

- [refactoring-specialist] **F1:** `view.ts` always clears the console unconditionally — it is the second exceptional case alongside `log.ts` and must be explicitly documented in the `launchTuiScreen` implementation, not treated as the default-clear case without comment.
- [refactoring-specialist] **F2:** Replaced `fromBoard?: boolean` with `skipClear?: boolean` on `launchTuiScreen`. `fromBoard` is a component rendering concern; `skipClear` accurately names the lifecycle behavior. `log.ts` passes `{ skipClear: true }`; `view.ts` passes nothing (always clears by default).
- [refactoring-specialist] **F3:** Prescribed that `render()` is called inside the `try` block, not before it — ensures `restoreScreen` always executes even if `render` throws.
- [frontend-developer] **F4:** Added `onQueryChange?: (query: string) => void` callback to `useSearchInput` options. `FileBrowser` passes a callback that resets `selectedIndex` to 0 on each query character, preserving the inline behavior from line 324 without coupling the hook to component concerns.
- [refactoring-specialist] **F5:** Documented the clamping `useEffect` in `useListNavigation` as an intentional improvement — ChronicleList gains auto-clamping it did not previously have.
- [refactoring-specialist] **F6:** Replaced the `useEffect`-watching-`content` pattern for ChronicleList with the `onLoad` callback. The `useEffect` pattern fails when the same file path is opened twice because the content reference does not change and React skips the effect. The `onLoad` callback fires inside the async resolution on every completed load.
- [refactoring-specialist] **F7:** Tightened the path traversal guard specification. The guard must reject only when the resolved path does not start with the normalized root **and** is not exactly equal to `projectPath`. The secondary condition handles the edge case where `projectPath` itself is the file target.
- [frontend-developer] **F8:** Clarified that `handleKey` returning `false` means the caller should continue evaluating remaining key handlers — not return early from the entire input handler.
- [frontend-developer] **F9:** Added explicit wiring note: ChronicleList must use the `onLoad` callback (not a `useEffect` watching `content`) to reset `scrollOffset` when content arrives.
- [frontend-developer] **F10:** Added Phase 3 guidance documenting that `FileBrowser`'s `scrollOffset` depends on `visibleEntries.length` from component state, creating a circular dependency if the hook tried to own it. The hook exposes only `selectedIndex` and handlers for FileBrowser.
- [frontend-developer] **F11:** Removed `active` from `useSearchInput` return shape. The hook does not own mode state and cannot populate `active` meaningfully. Consumers already track their own mode variables.
- [refactoring-specialist] **F12:** Documented that callers using raw `setSelectedIndex` are responsible for staying within `[0, itemCount - 1]`.
- [refactoring-specialist] **F13:** Added `cancelled` flag pattern requirement to `useFileContent`'s async effect to prevent stale state updates when `filePath` or `projectPath` changes before a previous read resolves.
- [refactoring-specialist] **F14:** Specified the exact hooks call order for ChronicleList in Phase 4: `selectedFilePath` state → `useFileContent(selectedFilePath, projectPath)` → `useMarkdownLines(content)` — all unconditional, before any early return.
- [refactoring-specialist] **Status update (Phase 1):** `formatDate` is already implemented in `formatters.ts` as a single function with an optional `includeTime` parameter, and `SessionBrowser.tsx` already imports and uses it. Phase 1 date formatter work is complete; only `useFileContent.ts` creation remains.
- [refactoring-specialist] **R1:** Corrected `useFileContent` signature in Phase 1 Outcome. `onLoad` is an input parameter (part of an `options` object), not a return value. The return type is `{ content: string | null, loading: boolean, error: string | null }` — no `onLoad` in the return shape.
- [refactoring-specialist] **R2:** Added Phase 4 ChronicleList guidance to remove `detailError` and `detailLoading` local state variables and replace all JSX branches referencing them with `loading` and `error` from `useFileContent`.
- [refactoring-specialist] **R3:** Documented that wiring ChronicleList through `useFileContent` applies a path traversal guard for the first time — ChronicleList previously read `entry.resultPath` directly with no guard. This is an intentional security improvement: entries with paths outside the project directory will now show an error.
- [frontend-developer] **R4:** Fixed the `handleKey` parenthetical in Phase 3 `useSearchInput` guidance. The prior wording inverted the meaning of `true` and `false`. Corrected to: `true` means the caller should `return` early (event consumed); `false` means the caller should continue evaluating remaining key handlers (event not consumed).
- [frontend-developer] **R5:** Added `itemCount === 0` guard requirement to `useListNavigation`. Without this guard, `Math.min(prev + 1, itemCount - 1)` resolves to `-1` for one render frame when the list is empty, causing a transient invalid selection before the clamping effect corrects it.
- [frontend-developer] **R6:** Added `useCallback` requirement for `handleContentLoad` in Phase 4 ChronicleList guidance. Defining it with an empty dependency array is defensive — `useState` setters are stable, so correctness is guaranteed either way, but `useCallback` makes the intent explicit and guards against future additions to the callback body that might otherwise introduce stale closure bugs.
