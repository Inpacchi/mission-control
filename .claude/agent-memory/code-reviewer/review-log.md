---
name: Review Log
description: Running log of completed reviews — date, deliverable ID, files reviewed, key findings
type: project
---

## 2026-03-18 — Code Reuse Review (BottomBar / footer consolidation) — CONFIRMED REVIEW

**Deliverable:** Ad hoc — BottomBar refactor pass (removed inline footers, centralized in BoardApp)
**Scope:** `BoardApp.tsx`, `HelpBar.tsx`, `ChronicleList.tsx`, `SessionBrowser.tsx`, `AdhocBrowser.tsx`, `FileBrowser.tsx`, `DetailPanel.tsx`, `PagerView.tsx`, `Pager.tsx`

**Confirmed findings (no CRITICAL/HIGH):**
- MEDIUM M1: Dead props still in interfaces + call sites after footer removal — `_`-prefix in destructuring but not removed from interface. Affects: ChronicleList (`activeDocType`, `projectPath`), AdhocBrowser (`detailSearchQuery`, `detailSearchMode`), DetailPanel (`detailSearchMode`, `detailSearchQuery`), PagerView (`searchQuery`, `searchMode`). BoardApp still threads all of them.
- MEDIUM M2: Inner `<Box flexDirection="column" flexGrow={1}>` wrapper in the 5 sub-view router branches is redundant — sub-views receive explicit `height` prop and are fixed-height. Wrapper carries no observable effect.
- MEDIUM M3: `listHeight` re-alias of `listViewportHeight` is a no-op alias (dead code) in SessionBrowser, AdhocBrowser, ChronicleList.
- MEDIUM M4: `renderLine` and `matchSet` inline (non-memoized) in PagerView — O(n) Set construction per render/scroll.
- MEDIUM M5: `matchingLines.includes()` O(n) scan per visible line in DetailPanel renderLine callback — should use a pre-built Set (as done in PagerView and AdhocBrowser).
- LOW L1: `HelpBar` stub export in HelpBar.tsx — not imported anywhere, pure dead code.
- LOW L2: `content` / `renderedLines` identity aliases in ChronicleList.tsx lines 64–65 — artifact of prior refactor.
- CARRY-FORWARD: `execSync` shell injection in `Pager.tsx` line 133 still unresolved.

**Efficiency re-review addendum (same session, separate pass):**
- Prior log says "no CRITICAL/HIGH." Efficiency pass upgrades two of those findings:
  - `getShortcuts(viewMode)` called on every render (including scroll keypresses) with no memoization → upgraded to HIGH (hot-path alloc on every keypress).
  - `DetailPanel.renderLine` uses `matchingLines.includes()` O(n) scan per visible line → confirmed HIGH (O(viewport × matches) per render, inconsistent with PagerView/AdhocBrowser which use Set).
  - `new Set(matchingLines)` in `PagerView` rebuilt on every scroll render → confirmed MEDIUM M3, should be `useMemo([matchingLines])`.
  - `useStdout()` height fallback dead in 5 sub-views (height prop always provided by BoardApp) → MEDIUM M2 (dead code, misleading optional type).
  - `useStdout()` entirely eliminable from `HelpBar.tsx` if `width` made required → MEDIUM M4.
- `getShortcuts` has no `default` branch — new ViewMode addition causes runtime throw → LOW L (type-safety gap).

**No CRITICAL findings. H1 (getShortcuts memoization) and H3 (includes→Set in DetailPanel) should be resolved before efficiency is considered closed.**

---

## 2026-03-18 — Round 4 Final Code Review

**Deliverable:** Post-fix round 4 (verify detailLoadIdRef fix in useAdhocView)
**Scope:** `useAdhocView.ts`, `useKeyboard.ts`, `useSessionView.ts`, `useFileView.ts`, `useChronicleView.ts`

**Fix verified:** `useAdhocView.ts` lines 92–93, 176, 182–183 — `detailLoadIdRef` added correctly. Both `unmountedRef` and per-load-ID checks present in the `execFile` callback, in correct order. Previously reported MEDIUM finding resolved.

**New findings:**
- MEDIUM: `useFileView.ts` lines 223–239 — `execFile('grep', ...)` callback discards `_err`. grep exits 1 for zero matches (normal) and non-zero for genuine errors (bad regex, missing binary). Both produce `stdout = ''` and empty results. User sees an empty results view with no indication that the search itself failed. Silent failure from a real error is indistinguishable from a legitimate empty search.

**No CRITICAL or HIGH findings. Code is not blocked from merge by this review.**

---

## 2026-03-18 — Round 3 Final Code Review

**Deliverable:** Post-fix round 3 (verify 2 medium fixes)
**Scope:** `useKeyboard.ts`, `useFileView.ts`, `BoardApp.tsx`, `useSessionView.ts`, `useChronicleView.ts`, `useAdhocView.ts`, `src/tui/index.ts`

**Fix 1 verified:** `useKeyboard.ts` line 320 — `terminalHeight` is now the primary source for board-detail paging; `process.stdout.rows` only reached as fallback when `terminalHeight` is undefined. BoardApp always passes `terminalHeight: height` so the fallback is unreachable in practice. Fix correct.

**Fix 2 verified:** `useFileView.ts` line 224 — `grepLoadIdRef` cancellation guard now present as the first statement of the execFile callback. Fix correct.

**New findings:**
- MEDIUM: `useAdhocView.ts` `openDetail` uses only `unmountedRef` for cancellation — no per-load ID. Rapid A→B navigation before A's `git show` resolves produces commit/content mismatch in the detail view. Same pattern that was fixed in `useSessionView` (sessionLoadIdRef) and `useFileView` (grepLoadIdRef) but missed here.
- LOW: `useSessionView.ts` line 336 — `process.stdout.columns` used to compute separator width inside a `handleKey` callback. Not reactive to terminal resize during the session. Minor cosmetic impact only.

**Patterns learned:** `unmountedRef` pattern (useAdhocView) vs. per-load-ID pattern (useSessionView, useFileView) are both present in this codebase. Per-load-ID is strictly more correct for views where the user can reopen different items without unmounting. Any hook with an `openDetail`-style function should use a load ID ref, not just unmountedRef.

---

## 2026-03-18 — Post-Fix Round 2 Code Review (11 fixes verified)

**Deliverable:** Post-execution re-review
**Scope:** `useFileView.ts`, `useSessionView.ts`, `SessionBrowser.tsx`, `BoardApp.tsx`, `useKeyboard.ts`, `ChronicleList.tsx`, `AdhocBrowser.tsx`, `useChronicleView.ts`, `useAdhocView.ts`

**All 11 fixes verified correct.** Two new MEDIUM findings surfaced:
- MEDIUM: `useKeyboard.ts` line 320 still uses `process.stdout.rows` in board-detail paging path — fix #11 missed this one site. `terminalHeight` is in scope but unused here. No behavioral bug (process.stdout.rows is kernel-synchronous), but architecturally inconsistent.
- MEDIUM: `useFileView.ts` `execFile` grep callback (line 221) has no unmount guard, unlike the parallel pattern in `useAdhocView.ts`. Minor state leak if user navigates away before grep completes.
- LOW: `Pager.tsx` line 133 — pre-existing `execSync($EDITOR ...)` shell injection still unfixed (out of scope this round).

**TypeScript:** Clean (`tsc --noEmit` exits 0).
**Patterns learned:** Fix sets that say "per-view hooks" may miss inline logic in the orchestrating hook (`useKeyboard`) that performs the same calculation. Always grep for `process.stdout.rows` in the full changed file set, not just the named per-view files.

---

## 2026-03-18 — Unified TUI App Architecture Plan Re-Review (round 2)

**Deliverable:** SDLC-Lite plan `docs/current_work/sdlc-lite/unified_tui_app_plan.md`
**Scope:** Re-review after 15-finding revision. Files read: `useKeyboard.ts`, `BoardApp.tsx`, `src/tui/index.ts`, `src/tui/SessionBrowser.tsx`, `src/cli.ts`, `src/tui/commands/log.ts`, `src/tui/commands/view.ts`, `src/tui/components/HelpBar.tsx`.

**Status of prior findings:** All 15 prior findings appear addressed in the revised plan. Cancellation guards, `execSync` acknowledgment, `renderMarkdownToAnsi` loading state, `n`-key routing, and `launchScreen.ts` retention are all specified.

**Remaining findings:**
- HIGH: `mc log` and `mc view` will break silently. Both call `launchTuiScreen(React.createElement(Pager, {...}))`. Phase 2 removes `useInput`/`useApp` from Pager, leaving these one-shot commands with no keyboard navigation or quit handler. Plan has no guidance for this gap.
- HIGH: `BoardApp.openEditor` uses `spawnSync` which blocks inside the unified Ink renderer — will corrupt TTY. Plan addresses FileBrowser/Pager `execSync` but omits this path.
- MEDIUM: `launchScreen.ts` not in formal file list (only in prose). File list is the agent's scope-completeness check.
- MEDIUM: `onOpenEditor` prop fate not specified — plan removes `onAction` but is silent on `onOpenEditor`.
- MEDIUM: Phase 4 CLI prose does not explicitly say "remove these four `program.command()` blocks" — agent may delete files but forget to update `src/cli.ts`.
- MEDIUM: Stable-ref wrapper for unified `useInput` dispatcher not specified — known recurring pattern for this codebase.
- LOW: `exitOnCtrlC: true` omitted from `launchBoard` snippet without explanation.

**Patterns learned:**
- When a plan converts a component from standalone to presentational, ALL consumers of that component's standalone interface must be audited — not just the primary integration point. `log.ts` and `view.ts` were invisible to the plan because they are one-shot commands, not embedded views.
- The "retained commands" section of a CLI cleanup plan needs to explicitly verify that retained commands still have a working dependency chain after the conversion.

## 2026-03-18 — Unified TUI App Architecture Plan Review (round 1)

**Deliverable:** SDLC-Lite plan `docs/current_work/sdlc-lite/unified_tui_app_plan.md`
**Scope:** Plan review (no code written yet). Files referenced: `useKeyboard.ts`, `SessionBrowser.tsx`, `AdhocBrowser.tsx`, `BoardApp.tsx`, `src/tui/index.ts`, `src/cli.ts`, `adhoc.ts` command, `launchScreen.ts`, `gitParser.ts`, `useListNavigation.ts`.

**Key findings:**
- HIGH: `useKeyboard` will grow a hook call per embedded view (4x `useListNavigation` + 4x `useSearchInput`), all unconditional. Index-reset-on-reentry not addressed — plan's data caching note does not cover selection position.
- HIGH: `execFile` for `git show` cancel guard (`unmounted` ref) must be explicitly preserved when moved to `useKeyboard`. Plan says "call moves" without specifying cancellation. Architectural concern: data fetching in `useKeyboard` vs. sibling data hooks.
- HIGH: `renderMarkdownToAnsi` on session log is synchronous and potentially expensive — plan does not address deferring this when inlining the Pager as a view. Must be explicitly async/memoized.
- MEDIUM: `useEffect([viewMode])` pattern will re-fetch on every re-entry, contradicting caching intent — loaded-flag guard needed.
- MEDIUM: `getUntrackedCommits` uses `execSync` (10s timeout) — plan moves call into `useEffect` without noting it must become async or use `execFile`.
- MEDIUM: `n` key conflict: board-mode `n` = notes, sub-view `n` = next match. Not addressed in plan; affects HelpOverlay update.
- MEDIUM: `launchScreen.ts` not in formal file list; only mentioned in Phase 4 prose as "check before deleting." It is used by `log.ts` and must be retained.
- LOW: Non-TTY pipe output for `mc adhoc` has no stated replacement — plan says "can move or be dropped" without deciding.

**Patterns learned:**
- Plans that move async/callback-based code into React hooks must explicitly specify the cancellation pattern (unmounted ref). Agents will not add it unless told.
- `getUntrackedCommits` is a known `execSync` blocker — any plan moving it into a `useEffect` must specify async wrapping.

## 2026-03-18 — TUI DRY Refactoring Review

**Deliverable:** none (DRY refactoring pass)
**Scope:** `src/tui/hooks/useFileContent.ts`, `src/tui/hooks/useSearchInput.ts`, `src/tui/hooks/useListNavigation.ts`, `src/tui/launchScreen.ts`, `src/tui/components/DetailPanel.tsx`, `ChronicleList.tsx`, `SessionBrowser.tsx`, `FileBrowser.tsx`, `AdhocBrowser.tsx`, `Pager.tsx`, `src/tui/commands/{chronicle,files,sessions,adhoc,log,view}.ts`

**Key findings:**
- CRITICAL (pre-existing, unresolved): Shell injection in `FileBrowser.tsx` lines 282 + 421 and `Pager.tsx` line 133 — `execSync(${editor} ...)` pattern.
- HIGH (new): `useSearchInput.handleKey` calls `onQueryChange` inside functional updater — impure side effect. No current caller passes `onQueryChange` but the hook is a shared utility.
- HIGH (new): `useListNavigation` clamp effect lists `selectedIndex` in deps. Zero-count gap: when itemCount drops to 0, selectedIndex is not reset to 0.
- HIGH (new): `openSessionInPager` in `SessionBrowser.tsx` manages its own screen lifecycle outside `launchTuiScreen`, skipping SIGTERM handler.
- MEDIUM (missed DRY): Path traversal guard duplicated verbatim between `useFileContent.ts` and `view.ts`. Should be a shared utility function.
- MEDIUM (pre-existing): `ChronicleList.tsx` downArrow handler reads `renderedLines` from closure inside functional updater. Same impure-updater class as prior findings.
- MEDIUM: `useFileContent` `options.onLoad` not in deps array — stale closure risk for callers that pass unstabilized callbacks. Current `ChronicleList` caller correctly uses `useCallback`.
- MEDIUM: `useListNavigation` exposes raw `setSelectedIndex` setter — couples callers to internal state.

**Patterns learned:**
- `launchTuiScreen` SIGTERM handler accumulates on each call in a `while(true)` board loop — each iteration adds a once-handler that may close the wrong iteration's screen.
- `projectPath` is not sanitized before shell interpolation in FileBrowser grep `exec` call (line 187). `sanitizeGrepQuery` only escapes the query string.

## 2026-03-18 — TUI Polish fix-round verification (Round 2)

**Deliverable:** none (fix verification pass)
**Scope:** `src/tui/formatters.ts`, `SessionBrowser.tsx`, `ChronicleList.tsx`, `Pager.tsx`, `AdhocBrowser.tsx`, `src/tui/commands/adhoc.ts`

**Fix verification results — all 4 prior fixes correctly implemented:**
- H2 (unmount guard): `unmounted` ref + cleanup + `if (unmounted.current) return` in `openDetail` callback — correct.
- M1 (formatDate NaN guard): `isNaN(d.getTime())` guard returns `''` — correct.
- M3 (impure updater): `detailContent` read from closure, `lines`/`maxScroll` computed as local vars before `setScrollOffset` — correct.
- fromBoard keybinding: `'b' || key.escape` both call `exit()` in list mode — correct.

**New findings:**
1. MEDIUM (correctness): `ChronicleList.tsx` lines 119–124 — `setScrollOffset` functional updater reads `renderedLines` from closure. Same impure-updater class as M3 fix in AdhocBrowser but not covered by the fix round. M3 fix pattern should be applied here.
2. LOW (performance): `AdhocBrowser.tsx` — `detailContent.split('\n')` computed twice on every `downArrow`: once in the handler (line 121) and once in the render path (line 135). Should be memoized.

**Pre-existing unfixed (expected):**
- HIGH: Shell injection in `Pager.tsx` line 134 — still present.
- MEDIUM: Incomplete `stripAnsi` in `renderMarkdown.ts` — still present.

## 2026-03-18 — TUI DRY Refactoring Round 3 (fix verification)

**Deliverable:** none (single fix verification)
**Scope:** Same as round 2; specific focus on `useListNavigation.ts` zero-count clamp fix.

**Fix verified — correct:**
- HIGH (round 2): `useListNavigation` clamp effect zero-count gap — fixed. `if (itemCount === 0) return 0` branch added at line 22. Functional updater pattern preserved. No regression introduced.

**New finding (not previously surfaced):**
- MEDIUM: `FileBrowser.tsx` line 187 — `projectPath` is shell-interpolated without sanitization in `exec()` call. `sanitizeGrepQuery()` escapes the user query but not the project path. Safe remedy is `execFile`/`spawnSync` with array arguments (same fix as the pre-existing editor-open sites).

**Still open (pre-existing, unresolved):**
- HIGH: `useSearchInput.handleKey` — `onQueryChange` called inside functional updater (impure side effect). Reported round 2, still unresolved.
- CRITICAL: Shell injection via `execSync(\`${editor} ...\`)` in FileBrowser and Pager.

## 2026-03-18 — TUI Polish changes post-merge review

**Deliverable:** none (direct dispatch / polish pass)
**Scope:** `src/tui/formatters.ts`, `SessionBrowser.tsx`, `ChronicleList.tsx`, `Pager.tsx`, `AdhocBrowser.tsx`, `src/tui/commands/adhoc.ts`

**Key findings:**
1. HIGH (security, pre-existing): `execSync(\`${editor} "${filePath}"\`)` shell injection in Pager.tsx line 134 — still unresolved. Natural window to fix was missed.
2. HIGH (correctness): `execFile` callback in AdhocBrowser.tsx `openDetail` has no cancellation guard — setState fires on unmounted component when user exits during git show.
3. MEDIUM (correctness): `stripAnsi` in renderMarkdown.ts only strips SGR sequences — cursor-movement/OSC codes survive. Session log sentinel matching in SessionBrowser.tsx will silently fail on real Claude Code logs containing cursor sequences.
4. MEDIUM (correctness): `formatDate` in tui/formatters.ts returns "NaN-NaN-NaN" for invalid input — no `isNaN` guard unlike the UI sibling.
5. MEDIUM (performance): `detailContent.split('\n')` inside `setScrollOffset` updater in AdhocBrowser.tsx is an impure functional updater.
6. MEDIUM (arch): AdhocBrowser.tsx uses unstabilized inline `useInput` handler (same recurring pattern as all other TUI components).
7. MEDIUM (DRY): Two `formatDate` functions — `tui/formatters.ts` (YYYY-MM-DD) and `ui/utils/formatters.ts` (MMM DD HH:mm) — no cross-reference comment.
8. LOW: `console.clear()` fires on standalone exit in both AdhocBrowser and SessionBrowser.

**Patterns confirmed:**
- Async unmount cancellation missing from new component (H2) — same pattern as DetailPanel.tsx flagged in prior D4 review.
- `useInput` unstabilized handler — new instance in AdhocBrowser; pre-existing elsewhere.
- Incomplete `stripAnsi` is a new finding not previously documented.

## 2026-03-18 — TUI DRY extraction plan RE-REVIEW (round 2, post-14-findings incorporation)

**Deliverable:** none (SDLC-Lite plan)
**Scope:** Re-review of `docs/current_work/sdlc-lite/tui-dry-extraction_plan.md` after 14 prior findings were incorporated.
**Files reviewed:** plan + `DetailPanel.tsx`, `view.ts`, `ChronicleList.tsx`, `FileBrowser.tsx`

**Key findings:**
1. HIGH (security): ChronicleList absolute-path bypass in file loading is a known behavioral difference from DetailPanel. Plan does not call this out — implementing agent may re-introduce the bypass as a "compatibility" accommodation when wiring useFileContent.
2. HIGH (correctness): Phase 4 omits explicit instruction to remove/replace `detailLoading` and `detailError` state vars with the hook's `loading` and `error` returns. Orphaned state will silently break the loading indicator.
3. MEDIUM: `handleKey` return value description contradicts itself — "continue evaluating remaining handlers" vs. "do not pass further down." Agent will implement wrong branching logic.
4. MEDIUM: `useListNavigation` signature lists `scrollOffset` unconditionally but FileBrowser does not use it. No explicit instruction saying "FileBrowser does not destructure scrollOffset."
5. MEDIUM: Plan modifies FileBrowser.tsx but does not flag two existing HIGH shell injection sites (execSync + $EDITOR interpolation). Natural window to fix them.

**Patterns confirmed:**
- ChronicleList uses `path.join` + absolute-path conditional where DetailPanel uses `path.resolve`. Security consolidation plans must explicitly name behavioral differences, not assume the agent will infer them.
- State variable cleanup (removing detailLoading, detailError) must always be explicitly named in Phase guidance — agents remove effects but may leave the state declarations.

---

## 2026-03-18 — TUI DRY extraction code quality Round 2 (post-fix verification)

**Deliverable:** none (fix verification pass)
**Scope:** Same 16 files as round 1: all `src/tui/hooks/`, `launchScreen.ts`, `DetailPanel.tsx`, `ChronicleList.tsx`, `SessionBrowser.tsx`, `FileBrowser.tsx`, `AdhocBrowser.tsx`, `Pager.tsx`, `commands/{chronicle,files,sessions,adhoc,log,view}.ts`

**Fix verification:**
- Fix 1 (`useListNavigation` dep array `[itemCount]` + functional updater): Structurally correct. Residual: `&& itemCount > 0` guard in updater leaves `selectedIndex` stale when list empties to 0. Callers guard `entries[selectedIndex]` so no crash currently.
- Fix 2 (`ChronicleList` same-path check on Enter): Correct.

**New findings:**
1. MEDIUM (correctness): `useListNavigation` zero-count gap — `&& itemCount > 0` prevents reset to 0 when list empties. Hook's contract (selectedIndex in [0, itemCount-1]) is violated at itemCount=0. Latent: callers currently guard. Fix: remove `&& itemCount > 0`.
2. MEDIUM (correctness): `FileBrowser.tsx` line 187 — `projectPath` interpolated into grep `exec` shell string without sanitization. `sanitizeGrepQuery` only escapes the user query. A project path with shell metacharacters (quotes, ampersands, parens) causes injection.
3. MEDIUM (correctness): `FileBrowser.tsx` line 311 — `setTimeout(() => setSelectedIndex(idx), 0)` where `idx` is an index into `allFiles`, not the post-collapse `visibleEntries`. Fragile timing dependency.
4. LOW: `SessionBrowser.tsx` lines 2+5 — duplicate `'ink'` import declarations; `render` should be merged into line 2.

**Pre-existing unresolved HIGHs (still present):**
- `useSearchInput` side-effect in functional updater (lines 31, 39)
- `openSessionInPager` missing SIGTERM handler
- `execSync($editor ...)` shell injection at FileBrowser lines 282+421 and Pager line 133

---

## 2026-03-18 — TUI DRY extraction SDLC-Lite plan review (no deliverable ID)

**Deliverable:** none (SDLC-Lite plan)
**Scope:** Plan review for `docs/current_work/sdlc-lite/tui-dry-extraction_plan.md` — 5 extractions: formatters, launchScreen, useSearchInput, useListNavigation, useFileContent
**Files reviewed:** plan + all 12 source files in scope

**Key findings:**
1. MAJOR: `log.ts` / `skipClear` design decision left ambiguous — plan says "choose whatever" between two options. Must be resolved before dispatch.
2. MAJOR: `useFileContent` hook spec does not mention `isCancelled` stale-state cancellation — exactly the pattern in recurring-patterns.md. Phase 4 ChronicleList refactor adds a race window.
3. MAJOR: `active: boolean` in `useSearchInput` return type is contradictory with "hook does not own mode state" — agent will interpret it two incompatible ways.
4. MAJOR: Path traversal guard has a `resolved !== projectPath` escape clause present in both implementations; plan consolidates without prompting review of whether it is intentional.
5. MINOR: `SessionBrowser.tsx` line 55 uses local `formatDate` (datetime form) as search corpus — must become `formatDateTime`, not `formatDate`, after extraction. Plan does not call this out.
6. MINOR: `openSessionInPager` in `SessionBrowser.tsx` contains a second independent `render()` + screen lifecycle not covered by `launchTuiScreen` scope.

**Patterns learned:**
- `useSearchInput` `active` field ambiguity: when a hook returns a field that the caller already controls, question whether the field belongs in the hook at all.
- Plan "choose A or B" language is always a finding — agents pick one and the choice has downstream consequences.

## 2026-03-18 — Unified TUI Architecture — post-execution code review

**Deliverable:** SDLC-Lite — unified TUI architecture (execution review)
**Scope:** 13 implementation files post-refactor. Files reviewed: `useKeyboard.ts`, `useChronicleView.ts`, `useSessionView.ts`, `useAdhocView.ts`, `useFileView.ts`, `BoardApp.tsx`, `index.ts`, `ChronicleList.tsx`, `SessionBrowser.tsx`, `AdhocBrowser.tsx`, `FileBrowser.tsx`, `PagerView.tsx`, `HelpBar.tsx`. Also read: `cli.ts`, `renderMarkdown.ts`, `useSearchInput.ts`, `useListNavigation.ts`, `commands/log.ts`, `commands/view.ts`.

**Status of plan-stage findings:**
- `mc log` / `mc view` Pager dependency: RESOLVED. Pager.tsx retained; commands use launchTuiScreen correctly.
- `BoardApp.openEditor` spawnSync: RESOLVED. Uses spawnSync with array args (correct form).
- Stable-ref wrapper for useInput: NOT FIXED. The useInput call in useKeyboard.ts line 342 still uses an inline arrow function.
- execSync $EDITOR in FileBrowser: PARTIALLY RESOLVED. BoardApp.tsx uses spawnSync correctly. useFileView.ts lines 308 and 413 were NOT fixed.

**Key findings:**
- CRITICAL: `execSync(\`${editor} ...\`)` shell injection still present in `useFileView.ts` lines 308 and 413. Previously flagged in FileBrowser.tsx; moved to hook but fix not applied.
- CRITICAL: `exec()` shell injection for grep in `useFileView.ts` lines 211–216 — `projectPath` interpolated unquoted/unescaped into shell string. Previously flagged at FileBrowser.tsx line 187; still unresolved after move to hook.
- HIGH: `useInput` inline handler in `useKeyboard.ts` line 342 — listener churn per render. Recurring pattern, not fixed.
- HIGH: `buildSessionContent` promise has no cancellation guard in `useSessionView.ts` lines 316–321 — stale content can overwrite state after back-navigation.
- HIGH: `setMode()` not in `handleKey` useCallback deps in `useSessionView.ts` — searchMode/viewMode updates not atomic.
- MEDIUM: `scanAll()` blocks event loop synchronously in `useFileView` useEffect line 135 — no async deferral.
- MEDIUM: `ChronicleList` duplicates useFileContent+useMarkdownLines calls already made by `useChronicleView` — double file-read per chronicle-detail navigation.
- MEDIUM: Viewport heights computed from `process.stdout.rows` at hook init across all per-view hooks — stale after terminal resize.
- MEDIUM: Non-null assertion on `selectedCommit` in AdhocBrowser.tsx line 90 — missing null guard.
- MEDIUM: Unused `useListNavigation` import in SessionBrowser.tsx line 13.
- MEDIUM: `stripAnsi` SGR-only regex — pre-existing unfixed gap.
- MEDIUM: `useSearchInput` side-effect in functional updater — pre-existing unfixed gap.

**Patterns confirmed:**
- Shell injection via execSync/$EDITOR is a persistent unfixed finding. Code was moved (FileBrowser → useFileView) but the fix was not applied during the move. Moving code does not carry forward unfixed security findings.

---

## 2026-03-17 — Notepad.tsx new component review (no deliverable ID)

**Deliverable:** none (ad hoc new component)
**Scope:** New `src/tui/components/Notepad.tsx` — multi-line in-memory text editor backed by `{projectPath}/.mc/notes.md`
**Files reviewed:** Notepad.tsx (diff, 215 lines), DetailPanel.tsx, Pager.tsx, BoardApp.tsx, useKeyboard.ts, cli.ts

**Key findings:**
1. CRITICAL: `loadNotes` called 3 separate times during initialization (lines 39–46) — `lines`, `cursor`, and `col` derived from three independent `readFileSync` calls. File-change between calls can leave cursor index out of bounds, making every `lines[cursor]` access return `undefined`.
2. HIGH: `setCol(mergeCol)` called inside a `setLines(prev => ...)` functional updater (line ~100) — state side-effect in updater, non-deterministic in Strict Mode / concurrent rendering.
3. HIGH: Cursor rendered against truncated `displayLine` rather than raw `line` (lines 181–183 area) — cursor becomes invisible for any line longer than `contentWidth`. Silent failure.
4. HIGH: No path traversal guard on `saveNotes` write path — asymmetric with `DetailPanel.tsx` which guards reads at lines 52–59.
5. MEDIUM: `setCol` inside `setCursor` updater repeated for arrow key navigation (lines 120–129) — same anti-pattern as H1 in two more locations.
6. MEDIUM: Synchronous `fs.readFileSync` / `fs.writeFileSync` — architectural deviation from async fs pattern in `DetailPanel`. Blocks event loop on every debounced save.
7. MEDIUM: Notes written to `{projectPath}/.mc/notes.md` — deviates from CLAUDE.md architecture doc (`~/.mc/` for session storage) without explanation.

**Blockers for merge:** H1 (setCol in setLines updater) and C1 (triple file read / divergent init state). M3 (same setter-in-updater pattern for arrow keys) should be fixed alongside H1.

**Patterns confirmed:**
- Setter-in-updater anti-pattern (calling setX inside a setY functional updater) is a new recurring pattern to watch. Adding to recurring-patterns.md.
- Defense-in-depth gap on file writes vs. reads is a second instance of the DetailPanel path-guard asymmetry (previously flagged in D4 round 1 for reads; now also present for writes in Notepad).

---

## 2026-03-18 — Notepad.tsx post-fix re-review (no deliverable ID)

**Deliverable:** none (ad hoc)
**Scope:** Re-review of `src/tui/components/Notepad.tsx` after 9 fixes applied. Verified all 9 fixes correct. Identified new issues introduced by the fix approach.
**Files reviewed:** Notepad.tsx (233 lines post-fix), node_modules/ink/build/hooks/use-input.js (Ink dependency contract)

**Key findings:**
1. HIGH: `inputHandler` passed to `useInput` is an inline arrow function — new reference every render. Ink's `use-input.js` (line 121) lists `inputHandler` as a useEffect dependency. This causes listener teardown + re-attach on every keystroke. The ref-based stale closure fix (Finding 4) resolved the read side but did not stabilize the handler reference.
2. MEDIUM: `onExit` and `projectPath` props not wrapped in refs — stale closure for Escape path. `linesRef/cursorRef/colRef` were added for state, but props were missed. `onExit` from a parent that re-renders with captured state will call the old version.
3. MEDIUM: `!key.meta` guard at line 165 silently drops Option/Alt character input on macOS (Ink sets `key.meta = true` for Option combinations). Pre-existing gap now confirmed after reading Ink source.
4. LOW: Four "Finding N:" prefixed comments embedded in source (lines 59, 78, 115, 130) — no meaning without the review document. Should describe the invariant, not the ticket.

**New pattern confirmed:**
- Ink `useInput` lists the handler function as a useEffect dependency. Passing inline arrow functions to `useInput` causes listener churn on every render. Must use a stable ref-wrapped callback. Adding to recurring-patterns.md.

**Blockers for merge:** H1 (listener churn per keystroke). M2 (stale onExit) is a correctness gap that should be fixed alongside H1 since both require the same ref-wrapping pattern.

---

## 2026-03-18 — Notepad.tsx round 2 re-review (no deliverable ID)

**Deliverable:** none (ad hoc)
**Scope:** Verified all round-1 and round-1.5 fixes. Checked for new issues in 246-line post-fix file.
**Files reviewed:** Notepad.tsx (246 lines, provided inline), recurring-patterns.md, architectural-decisions.md

**Key findings:**
1. HIGH: H3 from round 1 (cursor rendered against truncated displayLine) was NOT fixed. `visualCol = Math.min(col, displayLine.length)` clamps col against the truncated string — cursor still renders at the wrong position for any line longer than contentWidth.
2. MEDIUM: `key.delete` and `key.backspace` handled in the same branch, both performing backspace (col-1 deletion). Forward-delete (col deletion) is unimplemented; Delete key silently does wrong thing.
3. MEDIUM: `saveNotesSync` called synchronously from Escape handler — blocks Node.js event loop at the exact moment user exits. Async `saveNotes` already exists; sync write is unnecessary.
4. MEDIUM: `loadNotes` calls `fs.readFileSync` inside a `useState` initializer — blocks initial render. Deviates from async-first fs pattern established by DetailPanel.

**Blockers for merge:** H1 (cursor rendering on truncated lines) is a visible correctness bug on any line longer than contentWidth.

**Note:** The prior round-1 H3 finding was not carried forward into the round-1.5 fix list and therefore was not addressed.

---

## 2026-03-17 — D4 Polish Commits (1b10de4..2859718) — Pager, renderMarkdown, view cmd, card redesign

**Deliverable:** D4
**Scope:** D4 polish commits — new Pager, renderMarkdown, view command flags, DeliverableCard 3-row redesign, DetailPanel doc-type switching, ZoneStrip dividers, BoardApp proportional widths, useKeyboard activeDocType

**Files reviewed:** Pager.tsx, renderMarkdown.ts, commands/view.ts, DeliverableCard.tsx, DetailPanel.tsx, ZoneStrip.tsx, BoardApp.tsx, hooks/useKeyboard.ts, cli.ts, shared/types.ts

**Key findings:**
1. HIGH: `marked.use({ renderer })` mutates global marked singleton on every `renderMarkdownToAnsi` call — concurrent/repeated renders produce non-deterministic output. Instance API (`new marked.Marked(...)`) needed.
2. HIGH: `DetailPanel.tsx` has no path traversal guard (view.ts has one; DetailPanel reads the same sdlcParser paths without checking). Currently safe because sdlcParser confines paths, but defense-in-depth is absent.
3. HIGH: `useKeyboard` collapsed-mode `useEffect` has eslint-disable suppressing real stale-closure on `selectedZone` — zone reset may not fire when resizing from wide to collapsed after navigating to Graveyard.
4. HIGH: `renderMarkdownToAnsi` called synchronously in `DetailPanel` component body on every render including scroll — full re-parse on every keypress.
5. HIGH: `lines` array in `Pager` not memoized, new reference each render defeats `matchingLines` useMemo — search scan runs on every scroll keypress.
6. MEDIUM: Search submit handler in Pager duplicates matchingLines reduce logic inline (DRY + correctness coupling to un-memoized lines).
7. MEDIUM: `DocType` defined twice — `useKeyboard.ts` export and `DetailPanel.tsx` local. Will silently diverge if one is extended.
8. MEDIUM: `ZONE_HEADER_COLOR` and `ZONE_BORDER_COLOR` in ZoneStrip are identical — dead abstraction.
9. MEDIUM: `CARD_HEIGHT = 4` does not account for conditional flavor row — 2-row cards overestimate height, causing fewer cards than available space allows.
10. MEDIUM: `detailScrollOffset` has magic ceiling `10000` with no connection to actual document length — runaway scroll.
11. LOW: SIGTERM handler in view.ts registered with `once` but never removed on clean exit.
12. LOW: HelpOverlay still shows "Phase 5" planning language in user-facing help text.
13. LOW: `stripAnsi` function duplicated in Pager.tsx and renderMarkdown.ts; regex only handles SGR sequences.

**Patterns confirmed:**
- `marked.use()` global mutation risk: now confirmed as a HIGH finding (previously noted as LOW/latent in prior entry because view.ts was one-shot; DetailPanel renders repeatedly).
- Unclamped scroll offset pattern recurs again (finding #10) — third instance in D4 TUI layer.
- Async useEffect missing cancellation in DetailPanel remains open from prior review round.

---

## 2026-03-17 — D4: Terminal-First Mission Control — Round 2 re-review (post-8-fix verification)

**Deliverable:** D4
**Scope:** Targeted verification of 8 round-1 fixes. No CRITICAL or HIGH findings.

**Fix verification (all 8 confirmed):**
1. ZoneStrip.tsx virtual scroll centering formula: VERIFIED — lines 82-84 correctly compute idealOffset = max(0, selectedCard - floor(visibleCount/2)) clamped to maxOffset.
2. DetailPanel.tsx scroll clamp (end-of-document indicator): VERIFIED — line 110 shows "— end of document —" when visibleLines.length === 0 && scrollOffset > 0. Note: scrollOffset itself is not clamped in hook or component; indicator is the visual fix.
3. SessionBrowser.tsx error handling: VERIFIED — lines 57-59 add .catch(() => { setLoading(false); }).
4. ChronicleList.tsx error handling: VERIFIED — lines 50-52 add .catch(() => { setLoading(false); }).
5. useKeyboard.ts zone reset on collapse: VERIFIED — useEffect at lines 49-57 resets selectedZone to first navigable zone when collapsed=true.
6. src/tui/index.ts process.once + dead code: VERIFIED — process.once at line 27; file is 42 lines, no dead code found.
7. sessions.tsx process.once: VERIFIED — line 21.
8. chronicle.tsx process.once: VERIFIED — line 21.
9. BoardApp.tsx help overlay replaces zone layout: VERIFIED — all three layout branches (vertical, collapsed, full) return HelpOverlay+StatusBar+HelpBar when showHelp=true.

**New findings introduced by fixes:**
- LOW (NEW): ZoneStrip.tsx lines 150-151 — scroll indicator renders ▼▲ order (more-below then more-above). Conventional order is ▲▼ (above then below). Purely cosmetic inversion.

**Remaining open from round 1 (not in fix scope):**
- MEDIUM: DetailPanel.tsx async useEffect still has no isCancelled flag — stale content flash on rapid navigation.
- LOW: ChronicleList.tsx still has no path.startsWith(projectPath) traversal guard on resultPath.
- LOW: useKeyboard.ts line 57 eslint-disable suppresses both getNavigableZones and selectedZone from effect deps. Safe in practice (events cannot co-occur in same render) but broad suppression.

**Verdict:** All 8 fixes correctly applied. No regressions. One new LOW cosmetic finding in scroll indicator.

---

## 2026-03-17 — D4: Terminal-First Mission Control — Post-execution code review

**Deliverable:** D4
**Scope:** Full post-execution review of all 22 new TUI files plus 4 modified files
**Files reviewed:** src/tui/* (all), src/shared/zones.ts, src/cli.ts, src/ui/components/warTable/TacticalField.tsx, package.json, tsconfig.server.json

**Plan compliance:** All 7 key design decisions verified correct. No CRITICAL or HIGH findings.

**MEDIUM findings (4):**
1. DetailPanel.tsx: missing cancellation in async useEffect — stale content flash when navigating between cards
2. DetailPanel.tsx: detailScrollOffset not clamped — panel goes blank when scrolling past document end (SessionBrowser/ChronicleList both correctly clamp)
3. useDeliverables.ts: dead code — hook defined but never imported; superseded by useFileWatcher
4. SessionBrowser.tsx + ChronicleList.tsx: unhandled promise rejections on data load — app hangs in loading state on fs errors

**LOW findings (7):**
- SIGTERM listener never removed (single-process invocation, harmless in production)
- marked.use() global mutation in view.ts (one-shot context, plan-compliant, latent risk)
- useFileWatcher stats return value never consumed by any component (StatusBar derives counts from zone card arrays directly)
- process.exit(0) in runAdhoc is redundant (function is already synchronous)
- ChronicleList.tsx lacks path traversal guard (view.ts has one; risk is low since sdlcParser controls paths)
- formatEffort treats effort=0 as falsy (clamped to 1-5 by parser, but formatter contract is broader)
- ZONE_HEADER_COLOR and ZONE_BORDER_COLOR in ZoneStrip.tsx are identical — duplicate records

**Stale memory correction:** Prior review log noted "getDeliverable() does not exist in sdlcParser.ts" — this was WRONG. getDeliverable(projectPath, deliverableId) exists at sdlcParser.ts line 225 and was correctly used in view.ts.

**Patterns learned:**
- useDeliverables.ts hook (src/tui/hooks/) is dead code — use useFileWatcher instead
- DetailPanel does not clamp scrollOffset — SessionBrowser and ChronicleList do (inconsistency)
- listSessions() in sessionStore accepts optional limit parameter (default 50)

---

## 2026-03-17 — D4: Terminal-First Mission Control — Round 4 post-fix verification (15-finding fix pass)

**Deliverable:** D4
**Scope:** Verification of 15 fixes across renderMarkdown.ts, Pager.tsx, DetailPanel.tsx, useKeyboard.ts, ZoneStrip.tsx, DeliverableCard.tsx, BoardApp.tsx

**Fix verification (confirmed resolved):**
1. marked.use() global singleton: RESOLVED — `new Marked()` per call in renderMarkdown.ts line 224. HIGH closed.
2. `lines` not memoized in Pager: RESOLVED — `useMemo([content])` at line 43. HIGH closed.
3. `rendered`/`lines` not memoized in DetailPanel: RESOLVED — both wrapped in useMemo at lines 106, 109. HIGH closed.
4. useKeyboard collapsed useEffect stale closure: RESOLVED — deps now `[collapsed, selectedZone, getNavigableZones]` line 61. HIGH closed.
5. ZONE_HEADER_COLOR / ZONE_BORDER_COLOR dead duplicate: RESOLVED — merged to single ZONE_COLOR map in ZoneStrip.tsx.
6. Card divider width: RESOLVED — `width - 4` at ZoneStrip line 135.
7. RARITY_INK_COLOR comment added: RESOLVED — explicit comment in DeliverableCard.tsx lines 13–15.
8. Phase 5 removed from help: RESOLVED — HelpOverlay in BoardApp.tsx has no Phase 5 reference.
9. Resize comment added in BoardApp: RESOLVED — comment at line 63.
10. stripAnsi exported from renderMarkdown: RESOLVED — exported at line 5; Pager imports it line 3.
11. DocType import in DetailPanel: RESOLVED — imported from useKeyboard.ts line 7.
12. Path traversal guard in DetailPanel: RESOLVED — guard at lines 53–59. HIGH closed.
13. Search DRY comment in Pager: RESOLVED — comment at lines 74–77.

**Remaining open findings (2 HIGH, 2 MEDIUM, 1 LOW):**
1. HIGH: DetailPanel.tsx lines 61–69 — async useEffect for fs.readFile still has no isCancelled flag. Stale content flash on rapid navigation. Pattern exists in-repo (useDeliverables.ts).
2. HIGH: useKeyboard.ts line 163 — `Math.min(prev + 1, 10000)` not clamped to actual content length. Holding ↓ past end-of-document leaves offset at 10000; recovering with ↑ requires thousands of keypresses. Hook does not accept totalLines parameter.
3. MEDIUM: Pager.tsx line 192 — `new Set(matchingLines)` allocated unconditionally every render, outside useMemo. Should be memoized on [matchingLines].
4. MEDIUM: BoardApp.tsx lines 207–224 and 284–300 — proportional Active/Review width calculation duplicated verbatim between collapsed and full layout paths.
5. LOW: DetailPanel.tsx line 37 — `shownType` typed as `string` rather than narrowed union; DocType is already imported.

**Verdict:** Two HIGH findings require resolution before merge. All previously verified fixes are correctly applied with no regressions.

---

## 2026-03-17 — D4: Terminal-First Mission Control — Round 3 plan verification (post round-2 fixes)

**Deliverable:** D4
**Scope:** Targeted verification of 6 round-2 fixes plus new-issue sweep
**Files reviewed:** d4_terminal_first_mission_control_plan.md, package.json, TacticalField.tsx, sessionStore.ts

**Fix verification (all 6 confirmed):**
1. listSessions/getSessionLog import disambiguation: VERIFIED — explicit in Overview, Phase 3, and Phase 6.
2. marked@^16 as direct dependency: VERIFIED — plan correctly states it is currently only transitive (via mermaid) and requires adding it.
3. ChronicleList uses resultPath (not completePath): VERIFIED — line 589 explicitly explains why resultPath is correct.
4. TacticalField.tsx in Phase 4 files list: VERIFIED — in files list (line 318) and acceptance criteria (line 463).
5. useFileWatcher accepts initialDeliverables: VERIFIED with caveat — see new MAJOR finding.
6. StatusBar uses shared zone functions: VERIFIED — line 397 specifies aggregation via isDeckZone/isActiveZone/etc.

**New findings:**
- MAJOR: useFileWatcher signature shown twice with conflicting forms — line 488 has `= []` default (optional), line 526 has no default (required). Prose says "MUST be preserved." First block will be read first; agents will implement the weaker optional form. Phase 5 guidance should remove the first block or mark one as canonical.
- MINOR: getDeliverable(projectPath, id) referenced in Phase 3 (line 275) — **RESOLVED IN IMPLEMENTATION**: getDeliverable() does exist in sdlcParser.ts at line 225 and was correctly used in view.ts. This finding was incorrect — the function was added/existed. Stale finding, do not carry forward.
- MINOR: StatusBar onStats callback shape not verified against actual fileWatcher.ts — plan assumes byStatus per-status map, but does not direct agent to confirm the actual callback signature.

**Patterns learned:**
- When a plan shows the same function signature twice in the same section (as "initial draft" then "explicit definition"), agents will use whichever appears first. Plans must either show it once or explicitly mark one as superseding the other.
- getDeliverable() does not exist in sdlcParser.ts — only parseDeliverables(projectPath) returning Deliverable[].

---

## 2026-03-17 — D4: Terminal-First Mission Control — Pre-execution plan review

**Deliverable:** D4
**Scope:** Pre-execution code quality review of plan and spec — DRY, testing, security, error handling, structure, TUI/web UI maintainability
**Files reviewed:** d4_terminal_first_mission_control_plan.md, d4_terminal_first_mission_control_spec.md, src/cli.ts, src/server/services/fileWatcher.ts, src/server/services/sdlcParser.ts, src/server/services/sessionStore.ts, src/server/services/gitParser.ts, src/server/services/configLoader.ts, src/ui/components/warTable/TacticalField.tsx, src/ui/utils/rarity.ts, src/shared/types.ts

**Key findings:**
- MAJOR-1: complexityToRarity() inversion risk — plan says "port from rarity.ts" but does not call out that arch=mythic and moonshot=epic (the same inversion that shipped wrong in D3). Must be explicit.
- MAJOR-2: Zone filter duplication explicitly endorsed in plan — filter predicates are business logic, not rendering concerns. A pure function in src/shared/ would avoid divergence without renderer coupling.
- MAJOR-3: useFileWatcher passes `{ ...s, untracked: 0 }` hardcoded — TUI stats bar will always show untracked=0 without documentation that this is intentional.
- MAJOR-4: mc view reads file path from service data without a path traversal guard — DELIVERABLE_FILE_RE allows `.` in name group, path.join resolves `..` segments. Plan should require path.startsWith(projectPath) check.
- MAJOR-5: `q` handler calls process.exit(0) — bypasses React unmount lifecycle, useFileWatcher cleanup does not fire, chokidar orphaned. Should use useApp().exit() then await natural exit.
- MINOR-1: Snapshot tests only — no behavioral assertions for zone routing. A filter bug placing `blocked` in Graveyard would be baked into the snapshot baseline.
- MINOR-5: DetailPanel.tsx (components/) and DeliverableViewer.tsx (root) may be duplicate concepts — not resolved in plan.
- MINOR-6: chalk relied on as transitive dep — should be a direct dep given how heavily theme.ts uses it.

**Patterns learned:**
- TacticalField.tsx uses vertical Flex layout (direction=column), not horizontal. Plan's claim of horizontal reference is wrong for layout direction — only zone grouping logic is accurate to cite.
- getUntrackedCommits() is synchronous (execSync) — plan describes it as called from async one-shot commands. This is fine (sync in async context), but the TUI should not call it inside useEffect or Ink render — it will block the event loop.

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

---

## 2026-03-18 — D4 Terminal-First TUI post-execution review (commits 9aa85882..f8f475c5)

**Deliverable:** D4
**Scope:** New TUI subsystem — FileBrowser, SessionBrowser, Pager, BoardApp updates, board loop, command files, claudeSessions service, HelpBar, useKeyboard
**Files reviewed:** src/server/services/claudeSessions.ts, src/tui/FileBrowser.tsx, src/tui/SessionBrowser.tsx, src/tui/Pager.tsx, src/tui/BoardApp.tsx, src/tui/index.ts, src/tui/components/HelpBar.tsx, src/tui/hooks/useKeyboard.ts, src/tui/commands/adhoc.ts, src/tui/commands/files.tsx, src/tui/commands/sessions.tsx, src/tui/commands/chronicle.tsx, src/tui/commands/log.ts, src/tui/commands/view.ts

**Key findings:**
1. CRITICAL: `execSync(\`${editor} "${path}"\`)` in FileBrowser.tsx (lines 266, 409) and Pager.tsx (line 132) — shell injection via `$EDITOR`/`$VISUAL`. BoardApp.tsx correctly uses `spawnSync(editor, [path])` array form — use that as the fix template.
2. HIGH: `projectSlug` in claudeSessions.ts uses `replace(/\//g, '-')` — no-op on Windows (backslash paths), silently returns empty session list.
3. HIGH: `process.once('SIGTERM', ...)` added on every board loop iteration — MaxListenersExceeded after ~10 cycles.
4. HIGH: SessionBrowser calls `render()` in a 50ms `setTimeout` after `exit()` — race condition producing corrupted terminal output.
5. HIGH: `useInput` receives unstable inline handlers in FileBrowser, SessionBrowser, Pager, useKeyboard — listener churn per keystroke. Confirmed recurring pattern.
6. HIGH: `detailScrollOffset` clamped to hardcoded 10000 in useKeyboard.ts — detail panel goes blank after scrolling past end of short files.
7. MEDIUM: Verbatim launch pattern (altscreen+SIGTERM+render+finally) duplicated across 6 command files + index.ts — extract to shared utility; also fixes H3.
8. MEDIUM: `projectPath` shell-interpolated in grep command without sanitization (only query is sanitized).
9. MEDIUM: collapsed-state persistence fires on initial load write; `allFiles.length` dep causes spurious writes.
10. MEDIUM: `parseSessionSummary` reads every JSONL line despite claim of early-exit streaming.
11. MEDIUM: `stateFilePath` uses last-60-chars suffix — hash collision for projects with identical path suffix.
12. MEDIUM: `openSessionInPager` calls `process.exit(1)` on read error — hard-exits board loop.

**Patterns learned:**
- `$EDITOR` / `$VISUAL` must always be the executable in `spawnSync(editor, [args])`. `execSync(\`${editor} ...\`)` is always a shell injection vector.
- `process.once('SIGTERM', ...)` in a loop accumulates listeners — register once at process startup or remove after render exits.
- `claudeSessions.ts` `projectSlug` (reads Claude Code's native `~/.claude/projects/` convention) is intentionally different from `generateSlug` (MC's own storage). This is NOT the same bug as the D2 parallel-slug issue — it serves a different purpose. The distinction should be documented in the function.
- SessionBrowser's `render()` in a setTimeout is the only component that bypasses the board loop contract. All other subcommands correctly signal via `onAction`. This pattern must not be replicated.

**Stale memory note:**
- Notepad.tsx findings in review-log (2026-03-17) are fully resolved — Notepad.tsx was deleted in this commit range.
