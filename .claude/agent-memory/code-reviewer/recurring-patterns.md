---
name: Recurring Patterns
description: Code patterns that have appeared as findings in more than one review cycle
type: project
---

## Setter called inside another setter's functional updater
**Pattern:** `setState1(prev => { setState2(derivedValue); return next; })` — calling one React state setter from inside another state setter's updater function. React's contract requires updater functions to be pure and free of side effects. In Strict Mode, React calls updaters twice to detect violations; the double invocation means the inner `setState2` fires twice, setting state a non-deterministic number of times. In concurrent mode, updaters may be called at unexpected times.
**First seen:** Notepad.tsx — `setCol(mergeCol)` inside `setLines(prev => ...)` at the backspace/merge-line branch; `setCol` inside `setCursor(prev => ...)` at arrow key navigation.
**Mitigation:** Compute all derived values before calling any setter. Call all affected setters as separate, top-level statements. React 18+ batches multiple setState calls in event handlers automatically, so separate calls do not cause extra renders.

## marked.use() global singleton mutation in renderMarkdown
**Pattern:** `marked.use({ renderer })` patches the module-level `marked` singleton, not a local instance. Calling it inside a function that is invoked on every render (e.g., `renderMarkdownToAnsi` called in a component body) mutates global state repeatedly. In any context where the function is called more than once — repeated renders, concurrent renders, or a future multi-pane view — the renderer is non-deterministic.
**First seen:** D4 polish pass — `renderMarkdownToAnsi` called in `DetailPanel` component body on every render including scroll events. Previously flagged LOW in view.ts one-shot context; now HIGH because DetailPanel renders repeatedly.
**Mitigation:** Use `new marked.Marked({ renderer })` for an instance-scoped renderer, or move the renderer configuration to module level (single call at import time, not per invocation).

## Unmemoized computed arrays invalidating dependent useMemo
**Pattern:** An expensive array (e.g., `content.split('\n')`) is computed inline in a component body without `useMemo`, producing a new reference on every render. A `useMemo` hook that lists this array as a dependency is invalidated on every render, defeating its purpose and causing the expensive computation inside the memo to run on every keypress/state change.
**First seen:** D4 polish pass — `Pager.tsx` `lines` array computed inline; `matchingLines` useMemo lists `lines` as a dependency, so search match scanning runs on every scroll keypress.
**Mitigation:** Memoize the source array with `useMemo([content])` before listing it as a dependency of downstream memos.

## complexityToRarity() inversion — arch vs. moonshot
**Pattern:** Plans instructing agents to "port complexityToRarity() from rarity.ts" produce an inverted mapping because the counterintuitive assignment (`arch → mythic`, `moonshot → epic`) is not self-evident. An agent reading the complexity tier names literally will swap them.
**First seen:** D3 post-execution review — mapping was shipped inverted. D4 plan review — same inversion risk flagged again.
**Mitigation:** Any plan or spec that references porting `complexityToRarity()` must explicitly state: `arch → mythic`, `moonshot → epic`. Do not rely on agents reading the source file correctly without a callout.

## TacticalField.tsx zone layout is vertical, not horizontal
**Pattern:** Plans cite TacticalField.tsx as the reference for board layout. TacticalField uses `<Flex direction="column">` — zones are stacked vertically. The TUI board uses horizontal layout. Zone grouping logic is correctly sourced from TacticalField; layout direction is not.
**First seen:** D4 plan review.
**Mitigation:** When citing TacticalField.tsx as a layout reference, specify "zone grouping logic only, not layout direction."

## getUntrackedCommits() is synchronous (execSync) — blocks event loop if called in async context
**Pattern:** `gitParser.getUntrackedCommits()` uses `execSync` with a 10-second timeout. It is safe in one-shot CLI commands (synchronous context) but must not be called inside a React/Ink useEffect, render, or any Promise chain running on the Node.js event loop without a worker thread or child process boundary.
**First seen:** D4 plan review — plan instructs calling it from one-shot commands (safe) but the pattern could be copied into useFileWatcher or BoardApp (unsafe).

## Broadcast shape vs. REST shape divergence
**Pattern:** Server broadcasts `data: <array>` directly in WebSocket messages, but client-side hooks expect `data.<fieldName>: <array>` (the REST response envelope shape). This mismatch causes silent empty state.
**First seen:** D2 review — `watcher:sdlc` update message broadcasts `data: Deliverable[]` but `useSdlcState` reads `data.deliverables`.
**Mitigation:** When adding new WebSocket broadcasts, verify the payload shape against every consumer. Consider narrowing the WsMessage union to typed variants for each channel.

## Parallel slug functions for the same concept
**Pattern:** Multiple services define their own slug derivation for the same input (project path), producing different output due to independent implementation.
**First seen:** D2 review — `generateSlug` (projectRegistry.ts) and `projectSlug` (sessionStore.ts) both hash a project path but normalize differently.
**Mitigation:** Single exported slug function in one service, imported by others.

## Inline formatters not fully migrated to shared utility
**Pattern:** After extracting a shared utility (formatters.ts), one or more call sites still use locally-defined versions.
**First seen:** D2 review — `formatCommitDate` in AdHocTracker.tsx post-migration.

## Hardcoded hex values duplicated between component constants and theme tokens
**Pattern:** Components define module-level color constants (e.g., `statusBadgeColors` in DeliverableCard.tsx) that duplicate values already defined in `theme/index.ts` tokens. New card components risk adding a third copy.
**First seen:** D3 plan review — `statusBadgeColors` at DeliverableCard.tsx lines 16–24 vs. `badge.*` tokens in theme/index.ts lines 86–107.
**Confirmed D3 execution:** `statusToAccent` appears in TcgCard.tsx, MiniCard.tsx, AND TacticalField.tsx — three identical 7-entry maps. `artifactPillStyles` duplicated in TcgCard.tsx and MiniCard.tsx. Card shadows hardcoded as raw rgba in TcgCard/MiniCard instead of using card.sm/card.md tokens.
**Mitigation:** New card components should read from Chakra tokens, not define parallel constants. Per-status accent colors should be a shared export.

## Shared keyframe mutation breaks undiscovered consumers in stress/test files
**Pattern:** Plans that modify or remove shared CSS keyframes in `theme/index.ts` check production components but miss test/stress files, which also reference keyframe names directly by string.
**First seen:** D3 ad hoc styling alignment plan review — `foilShift` (RarityEffects.tsx + CardStressTest.tsx) and `shimmerSweep` (RarityEffects.tsx + CardStressTest.tsx) both have consumers in `src/ui/__tests__/stress/CardStressTest.tsx`.
**Mitigation:** Always grep `src/ui/__tests__/` separately when a plan proposes mutating or removing a keyframe. The stress test file references keyframe names as animation property strings — not as imports — so a module-level grep for the keyframe name is required.

## Background color hardcoded in shared wrappers serving components with different surface levels
**Pattern:** A shared wrapper component (e.g., GoldBorderWrap) hardcodes a background color for an inner clip/padding layer. When consumed by components that use a different surface-level background (e.g., TcgCard at #1C2333 vs. MiniCard at #232D3F), the hardcoded clip color creates a visible seam.
**First seen:** D3 ad hoc round 3 — GoldBorderWrap inner clip at #1C2333, MiniCard body at #232D3F. Epic/Mythic MiniCards show a darker ring inside the gold border.
**Mitigation:** Wrapper clip background should accept a prop or CSS variable so consumers can match their own surface color.

## Keyframe name referenced by string — property mismatch not caught at type level
**Pattern:** A component sets a CSS property (e.g., `backgroundSize: '300% 300%'`) that implies a specific keyframe property will animate (e.g., `background-position`), but the referenced keyframe string name actually animates a different property (e.g., `opacity`). TypeScript cannot verify keyframe property lists against component CSS context.
**First seen:** D3 ad hoc round 3 — GoldBorderWrap references `goldPulse` (animates opacity) while setting backgroundSize indicating a gradient sweep was intended.
**Mitigation:** When adding `animation: 'keyframeName ...'`, always read the keyframe definition in theme/index.ts globalCss to confirm the animated property matches the component's CSS context.

## Duplicate function signature blocks with conflicting forms in same plan section
**Pattern:** A plan shows the same function signature twice in the same section (once as a draft/initial block, once as a "final" or "explicit" clarification block), and the two differ on a detail (e.g., default parameter value). Implementing agents read whichever block appears first and stop. The second block's intent is ignored.
**First seen:** D4 round 3 — useFileWatcher shown with `initialDeliverables: Deliverable[] = []` on line 488 then `initialDeliverables: Deliverable[]` (no default) on line 526. The no-default form is the correct one per prose, but the defaulted form appears first.
**Mitigation:** Plans should show each function signature exactly once. If a revision supersedes an earlier draft, remove or explicitly strikethrough the earlier block. Never rely on a second block "overriding" a first block in a prose document.

## Async useEffect missing cancellation — stale state flash
**Pattern:** `useEffect` triggers an async operation (fs.readFile, fetch) and sets state in the `.then()` callback without checking whether the component is still mounted or the dependency has changed. When the dependency changes before the async op completes, the old result lands in state and briefly displays wrong content.
**First seen:** D4 post-execution — DetailPanel.tsx useEffect for file reading lacks isCancelled flag. useDeliverables.ts (same repo) correctly uses a cancelled flag — the pattern exists to copy.
**Mitigation:** Always use an `isCancelled` flag inside async useEffects. Return a cleanup function that sets `cancelled = true`. Check `if (!cancelled)` before every setState call.

## Unclamped scroll offset in detail views
**Pattern:** A scroll offset state increments on key press without an upper bound. The consuming component uses `array.slice(offset, offset + pageSize)` — when offset exceeds array.length, slice returns [] and the view goes blank silently.
**First seen:** D4 post-execution — DetailPanel.tsx passes scrollOffset from useKeyboard unchanged; SessionBrowser and ChronicleList in the same codebase both clamp correctly.
**Mitigation:** Either clamp in the hook (`Math.min(offset, Math.max(0, totalLines - pageSize))`) or clamp in the component before the slice call.

## Plan I/O assumptions not verified against actual service implementation
**Pattern:** Plans describe a feature as "piggybacking" on existing I/O but the actual service code does not perform that I/O. Implementing agents then silently add a new I/O pass or stall.
**First seen:** D3 plan review — plan claimed frontmatter parsing would piggyback on existing file reads in `scanDirectory()`, but `scanDirectory()` only stats files, never reads content.

## Shell injection via $EDITOR / $VISUAL interpolation
**Pattern:** `execSync(\`${editor} "${filePath}"\`, { stdio: 'inherit' })` where `editor = process.env.VISUAL || process.env.EDITOR`. The editor variable is attacker-influenced (shell profile, environment). Filenames with backticks, `$()`, or semicolons can escape double-quoting. The safe form is `spawnSync(editor, [filePath], { stdio: 'inherit' })` — array arguments bypass the shell entirely.
**First seen:** D4 post-execution — FileBrowser.tsx lines 266 and 409, Pager.tsx line 132. BoardApp.tsx line 130 correctly uses spawnSync array form; the three execSync sites do not.
**Mitigation:** Never interpolate `$EDITOR`/`$VISUAL` into a shell string. Always use `spawnSync(editor, [arg1, arg2, ...], { stdio: 'inherit' })`. For `+linenum` vim-style flags: `spawnSync(editor, [\`+${line}\`, filePath])`.

## Incomplete stripAnsi regex misses cursor-movement and OSC sequences
**Pattern:** `stripAnsi` in `src/tui/renderMarkdown.ts` matches only SGR sequences (`/\x1b\[[0-9;]*m/g`). Cursor-movement CSI sequences (`ESC[A/B/C/D/H/K` etc.) and OSC window title sequences (`ESC]...\x07`) are not stripped. Real Claude Code session logs contain these sequences. When the result is used for plain-text sentinel matching (e.g., `── User ──` / `── Assistant ──`), stray escape bytes adjacent to the header text prevent the match and cause turns to silently not split.
**First seen:** TUI polish pass review (2026-03-18) — `SessionBrowser.tsx` calls `stripAnsi(log)` then splits on sentinel strings. Complete regex: `/\x1b(?:[@-Z\\-_]|\[[0-9;]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\))/g`
**Mitigation:** Replace the narrow regex in `renderMarkdown.ts:stripAnsi` with the complete CSI/OSC form above. Alternatively, import the `strip-ansi` npm package which covers all cases.

## Ink useInput handler must be stable — inline arrow functions cause listener churn per render
**Pattern:** `useInput(handler, options)` in Ink lists `handler` (called `inputHandler` internally) as a `useEffect` dependency (confirmed in `node_modules/ink/build/hooks/use-input.js` line 121). Passing an inline arrow function recreated on every render causes the internal event emitter listener to be removed and re-added on every render. In a keyboard-driven editor where every keypress produces a state update and therefore a render, this means listener teardown/re-attach on every keystroke.
**First seen:** Notepad.tsx post-fix re-review (2026-03-18) — ref-based state reads correctly solved the stale closure read side, but the handler function itself was not stabilized with `useCallback` or a stable ref wrapper. Confirmed unmitigated in D4 in FileBrowser, SessionBrowser, Pager, useKeyboard.
**Mitigation:** Wrap the `useInput` callback in a stable ref pattern: create `handlerRef = useRef(fn)`, update it in an effect, and pass a stable outer function `useCallback(() => handlerRef.current(...args), [])` to `useInput`. This gives Ink a stable reference while the inner handler always reads current values.
