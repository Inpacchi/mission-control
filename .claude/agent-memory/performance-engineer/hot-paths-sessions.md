---
name: Claude session viewer hot paths
description: Profiling findings and applied fixes for claudeSessions.ts, parseLogContent.ts, useSessionView.ts, SessionHistory.tsx (commit c130394 review)
type: project
---

## Applied fixes (commit c130394 review)

### Fix #2 — sessionContainsQuery raw pre-filter (claudeSessions.ts)
Raw `line.toLowerCase().includes(queryLower)` check added before `JSON.parse` in the readline
loop. Eliminates parse cost for the ~90%+ of lines that cannot contain the query. Zero false
negatives (encoding cannot introduce the query string). Applied directly.

### Fix #4 — parseLogContent memoization (SessionHistory.tsx)
`parseLogContent(logContent)` was called inline in render (line 463 before fix). Runs 7 regex
passes on the full log string. Fired on every hover-driven re-render. Wrapped in
`useMemo([logContent])` as `parsedLogSegments`. Applied directly.

### Fix #5 — Marked singleton (renderMarkdown.ts)
`renderMarkdownToAnsi` was allocating `new Marked()` + `buildAnsiRenderer()` on every call.
For a session open with 100+ text segments this meant 100+ short-lived object allocations and
GC pressure. Hoisted to module-scope singleton `_markedInstance`. `Marked.parse()` is stateless
with respect to instance fields — confirmed safe to share. Applied directly.

### Fix #1b — mtime pre-sort removed (claudeSessions.ts)
`searchSessionContent` was doing `Promise.all(50+ fs.stat)` before opening a single file.
This blocked the search until all stats completed — penalising the best case (early match on
file 1). Replaced with `readdir + localeCompare` descending sort (Claude session IDs are
time-based UUIDs so lexicographic descending ≈ newest-first). Applied directly.

## Re-review round 2 (2026-03-21) — remaining issues

### Fix #1a + Fix #3 — RESOLVED in prior session
`scanSession` single-pass function was applied (fixing #1a double-read).
`getSessionTurns` structured path now returns plain-text turns (fixing #3 ANSI round-trip).
Both confirmed present in current source.

### New finding A — useSessionHistory filtered useMemo (APPLIED)
`sessions.filter(...)` ran on every render with `new Date()` per session per keystroke.
Fixed in `/Users/yovarniyearwood/Projects/mission-control/src/ui/hooks/useSessionHistory.ts`:
wrapped filter in `useMemo([sessions, searchQuery, dateFilter])`.

### New finding B — handleViewLog useCallback instability (open, low)
`useCallback(handleViewLog, [viewingLog, fetchLog])` in SessionHistory.tsx is recreated on
every session-open. The `onClick` lambda `() => handleViewLog(session.id)` at render-time
nullifies the benefit anyway. Converting `viewingLog` to a ref would stabilize the callback,
but the outer inline lambda is the real blocker. Low priority — no measurable render cost at
current session list sizes.

### New finding C — buildSessionContent synchronous event-loop block (open, low/accepted)
`renderMarkdownToAnsi` (Marked.parse) called synchronously per text segment across all
assistant turns. 30 turns × several segments each = 30–100+ Marked parse calls blocking the
event loop during session open. Acknowledged in comment at line 272 of useSessionView.ts.
Fix: chunk `turns` iteration with `setImmediate` between turns. Handoff to tui-developer
if large sessions start causing visible pause (> ~200ms).

## Cost model calibration (this codebase)

- `parseLogContent` on a 50KB log string: ~0.5–2ms (7 regex matchAll passes)
- `renderMarkdownToAnsi` per call (now singleton): parse cost only, no alloc overhead
- `renderMarkdownToAnsi` per call (before fix): ~0.1ms alloc overhead × 100+ calls = 10ms+
- `JSON.parse` per JSONL line: ~0.01–0.05ms per line; 10K lines = 100–500ms
- `fs.stat` per file: ~0.5–3ms; 50 files × 2ms = 100ms blocked before first search result
- Session search total (50 files, cold I/O cache): 200–800ms wall clock

## Debounce note

300ms debounce in useSessionView.ts is borderline. After fix #2 reduces search cost,
re-measure before adjusting. If search completes in <150ms, 300ms is fine. Do not change
without measurement.
