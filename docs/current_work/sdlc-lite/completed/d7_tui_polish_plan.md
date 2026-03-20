---
tier: lite
type: feature
complexity: moderate
effort: 2
flavor: "Polish is not vanity — it is respect for the user."
created: 2026-03-18
author: CC
agents: [frontend-developer]
---

# SDLC-Lite Plan: TUI Polish — Session Formatting, Commit Details, Search Discovery

**Execute this plan using the `sdlc-lite-execute` skill.**

**Scope:** Three focused TUI improvements that raise the quality of existing views: render markdown in session logs, add list→detail interaction to the adhoc commit viewer, and surface the Pager's search capability on first open.
**Files:** `src/tui/commands/adhoc.ts`, `src/tui/SessionBrowser.tsx`, `src/tui/Pager.tsx`, `src/tui/AdhocBrowser.tsx` (new), `src/tui/formatters.ts`, `src/tui/ChronicleList.tsx`
**Agents:** frontend-developer

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| Phase 1: Shared Utilities | — | frontend-developer | — |
| Phase 2: Adhoc Commit Browser | Phase 1 | frontend-developer | Phase 3 |
| Phase 3: Session Log Markdown | Phase 1 | frontend-developer | Phase 2 |
| Phase 4: Search Hint in Pager | — | frontend-developer | Phase 1 |

## Phases

### Phase 1: Shared Utilities — formatDate extraction
**Agent:** frontend-developer
**Outcome:** `formatters.ts` exports a `formatDate(iso: string, includeTime?: boolean): string` utility. The local `formatDate` definitions in `SessionBrowser.tsx` and `ChronicleList.tsx` are removed and replaced with imports.
**Why:** `formatDate` is duplicated with slightly different formats (SessionBrowser includes HH:MM, ChronicleList does not). Extracting to a shared module eliminates drift and provides the utility for the new AdhocBrowser.
**Guidance:**
- Add `formatDate(iso: string, includeTime?: boolean): string` to `src/tui/formatters.ts`. When `includeTime` is true, return `YYYY-MM-DD HH:MM`; when false (default), return `YYYY-MM-DD` only.
- `formatters.ts` already exports `isTTY` and `setupChalk` — follow the existing named export style.
- Remove the local `formatDate` from `SessionBrowser.tsx` and `ChronicleList.tsx`. Import from `../formatters.js` at both call sites.
- **Critical: SessionBrowser has TWO call sites** — the display format in the list rendering AND the search filter in the `useMemo` (`formatDate(s.timestamp).includes(query)`). Both must pass `includeTime: true` to preserve the ability to search by time component. ChronicleList call sites use the default (date-only).

---

### Phase 2: Adhoc Commit Browser — List→Detail Interaction
**Agent:** frontend-developer
**Outcome:** Running `mc adhoc` (TTY mode) opens a new `AdhocBrowser` Ink component that lists untracked commits and lets the user press Enter on a row to drill into a scrollable detail view showing `git show --stat` output. Back navigation returns to the list. The non-TTY path in `adhoc.ts` is unchanged.
**Why:** The current flat Pager dump gives no way to inspect a commit's affected files or full message body. The adhoc list is the primary workflow entry point for reconciling untracked work.
**Guidance:**

**AdhocBrowser.tsx — new file:**
- Model after `ChronicleList.tsx`: `viewMode: 'list' | 'detail'` state, `detailLoading` boolean, `detailContent: string | null`.
- **Initial commit list loads synchronously** — `getUntrackedCommits()` is a sync function called in `adhoc.ts` before rendering. Pass the commit array as a prop to `AdhocBrowser`. The `detailLoading` state applies ONLY to the `git show --stat` detail fetch, not the initial list.
- List view: renders commit rows with `commit.hash.slice(0, 7)`, `formatDate(commit.date)` (date-only), and `commit.message`. The `hash` field on `UntrackedCommit` is already the full SHA.
- On Enter: show commit header (hash, author, date, message) immediately from list data. Set `detailLoading = true` for the stat body only. Run `git show --stat <hash>` asynchronously using `execFile('git', ['show', '--stat', commit.hash], { cwd: projectPath }, callback)` — array args, no shell interpolation, no `execSync`. The callback sets `detailContent` and clears `detailLoading`.
- Show `Loading commit details…` in the stat body area while `detailLoading` is true.
- **Detail view must use virtual scroll** — split the stat output into lines and use the same `scrollOffset` + `contentHeight` slice pattern as ChronicleList's detail view. Large commits (merge commits touching hundreds of files) can produce hundreds of lines. Do NOT render the full line array into Ink's tree — slice to `contentHeight` like every other scrollable view in this TUI.
- Stat output styling (plain text with chalk, NOT through `renderMarkdownToAnsi`): file-change lines with `chalk.dim` on the file portion; summary line identified by regex (`/\d+ files? changed/`) rendered as `chalk.bold`. Do not rely on position (last line) for summary detection — single-file commits have no separator.
- Footer in list view: `↑↓: navigate  Enter: view  Esc/q: back`. Footer in detail view: `↑↓: scroll  Esc/q: back` (navigation first, exit last — matching ChronicleList convention).
- Back navigation: Esc or q in detail returns to list (`setViewMode('list')`).

**adhoc.ts — modifications:**
- Non-TTY guard (`if (!isTTY())`) must remain before any Ink rendering and before any `AdhocBrowser` instantiation.
- Alternate screen setup (`\x1b[?1049h`) must remain before `render()`, and `restoreScreen()` in the `finally` block must be preserved exactly. The refactored file replaces `Pager` render with `AdhocBrowser`; the surrounding screen lifecycle code stays identical.

---

### Phase 3: Session Log Markdown Rendering
**Agent:** frontend-developer
**Outcome:** When a user opens a session in `SessionBrowser`, assistant message content renders with full ANSI markdown styling (bold, headings, code blocks, lists). User messages remain plain text. Role headers are styled in bold yellow (User) / bold cyan (Assistant). Dim separator lines appear between turns.
**Why:** `getClaudeSessionLog()` returns assistant content as raw markdown. Passing it straight to the Pager renders markdown syntax literally (`**bold**`, `## heading`, etc.).
**Guidance:**

**ANSI parsing strategy (mandatory approach):**
The log from `getClaudeSessionLog()` contains turns delimited by headers with embedded ANSI SGR codes: `\x1b[1;33m── User ──\x1b[0m` and `\x1b[1;36m── Assistant ──\x1b[0m`. Strip ANSI from the entire log using `stripAnsi()` (from `renderMarkdown.ts`), then split on the plain-text sentinel strings `── User ──` and `── Assistant ──`.

**Note:** `stripAnsi()` in `renderMarkdown.ts` only strips SGR sequences (`\x1b[[0-9;]*m`). This is sufficient here because `getClaudeSessionLog()` only adds SGR color codes — it does not emit cursor movement, OSC, or other escape families. If this assumption ever breaks, the strip regex would need broadening.

**Rendering pipeline in `openSessionInPager`:**
- After fetching the log, strip ANSI and split into turns. Each turn carries a role label (`user` or `assistant`) and its text body.
- User turns: re-apply `chalk.bold.yellow('── User ──')` as the header, then render the body as plain text.
- Assistant turns: re-apply `chalk.bold.cyan('── Assistant ──')` as the header, then pass the body through `renderMarkdownToAnsi()`.
- Between every turn, insert a dim separator: `chalk.dim('─'.repeat(Math.max(0, width - 2)))` where `width` comes from `process.stdout.columns ?? 80`. Pin this width formula — do not introduce a new variant.
- Headers must NOT go through `renderMarkdownToAnsi`.

**Loading state:**
Markdown rendering is synchronous and runs before the Pager is mounted. For large sessions, the screen will be blank during rendering. This is acceptable — document it in a code comment. The alternative (showing a loading component) requires an extra Ink render cycle that adds complexity disproportionate to the benefit.

---

### Phase 4: Search Hint in Pager
**Agent:** frontend-developer
**Outcome:** On first open, the Pager footer displays a `/ to search` hint. The hint disappears the moment the user presses `/` (entering search mode). It does not disappear on scroll or any other key. At terminal widths below 80 columns, the hint is omitted. The hint resets on each fresh Pager mount (correct behavior — each Pager open is a new Ink `render()` call).
**Why:** The search feature is invisible to first-time users who don't know less/vim conventions.
**Guidance:**
- Add `showHint: boolean` state to `Pager`, initialized to `true`.
- In `useInput`, set `showHint = false` ONLY in the `input === '/'` branch. No other key clears it.
- In the footer render: when `mode === 'normal'` and `showHint` is true and `dimensions.width >= 80`, include the hint text in the right-side footer string. The hint's character length must be factored into the gap calculation (`dimensions.width - left.length - right.length`) so the layout doesn't overflow. When `dimensions.width < 80`, omit the hint from the string — do NOT set `showHint = false`, just skip rendering it.
- The hint should be visually distinct — use `dim` styling so it reads as a discovery cue rather than a persistent control label. It supplements the existing `[/] Find` rather than replacing it.
- `showHint` is local component state. It resets to `true` on each Pager mount, which is the desired behavior — each fresh Pager open shows the hint again until the user presses `/`.

---

## Worker Agent Reviews

Key feedback incorporated:

- [frontend-developer] ANSI header parsing must match exact escape sequences — specified stripAnsi-then-split approach as mandatory strategy
- [frontend-developer] `execSync` blocks Ink render loop — replaced with async `execFile` with array args throughout Phase 2
- [frontend-developer] Alternate screen setup/teardown not mentioned — added explicit preservation requirement in adhoc.ts modifications
- [frontend-developer] Any-keypress hint dismissal too eager — changed to dismiss only on `/` press per user decision
- [ui-ux-designer] Role header visual treatment unspecified — added bold yellow/cyan headers with dim separator lines
- [ui-ux-designer] `git show --stat` output not safe for markdown rendering — specified plain text with chalk styling, regex-based summary detection
- [ui-ux-designer] Detail footer order inverted — corrected to `↑↓: scroll  Esc/q: back` matching convention
- [ui-ux-designer] Loading state should show header immediately, loading only for stat body — incorporated immediate header rendering from list data
- [code-reviewer] Use `spawnSync`/`execFile` with array args, not string interpolation — specified `execFile('git', ['show', '--stat', hash])` pattern
- [code-reviewer] `formatDate` duplicated — extracted to shared utility in Phase 1 with explicit call-site guidance for SessionBrowser's search filter
- [code-reviewer] Detail view stat output needs virtual scroll for large commits — added mandatory scroll slice pattern requirement
- [code-reviewer] `stripAnsi` only handles SGR sequences — documented assumption and why it's sufficient for this use case

## Post-Execution Review

All completed work must be reviewed by all relevant worker domain agents.
All findings must be fixed by the most relevant domain agent.
Build must pass before work is considered done.

The reviewing agent should verify:

1. **ANSI parsing correctness** — open a real session with multiple turns and confirm role headers render in bold yellow/cyan, assistant bodies show rendered markdown, and dim separators appear between turns.
2. **No markdown bleed into git stat output** — open a commit with files containing `|` in paths; confirm plain text rendering.
3. **Async git show** — confirm `detailLoading` state is visible before detail content appears; confirm no render-loop blocking.
4. **Virtual scroll in detail** — open a large commit (merge with many files); confirm scrolling works and no render lag.
5. **Search hint behavior** — open Pager, scroll several lines, confirm hint remains; press `/`, confirm hint disappears and does not return on Esc.
6. **Narrow terminal** — resize below 80 cols; confirm hint absent, base footer still shows.
7. **Screen lifecycle** — open adhoc, enter detail, press q; confirm alternate screen restored cleanly.
8. **formatDate shared utility** — confirm SessionBrowser (with time) and ChronicleList (without time) format correctly, and SessionBrowser search filter still matches time components.
9. **TypeScript** — `npx tsc --noEmit` passes with no new errors.
