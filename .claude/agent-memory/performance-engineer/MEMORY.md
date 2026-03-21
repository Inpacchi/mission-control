# Performance Engineer Memory Index

## Hot Paths
- [File watcher hot paths](hot-paths-filewatcher.md) — Known issues and cost model for fileWatcher.ts / sdlcParser.ts

## Baselines
_No baselines measured yet._

## Hot Paths (sessions)
- [Session viewer hot paths](hot-paths-sessions.md) — claudeSessions.ts / parseLogContent.ts / useSessionView.ts / SessionHistory.tsx findings and applied fixes

## Optimizations
- Fix #2 applied: raw `includes` pre-filter before JSON.parse in sessionContainsQuery
- Fix #4 applied: useMemo for parseLogContent in SessionHistory.tsx
- Fix #5 applied: Marked singleton in renderMarkdown.ts (was allocating per call)
- Fix #1b applied: removed blocking Promise.all(fs.stat) pre-sort in searchSessionContent
- Fix #1a applied: scanSession single-pass replaces double-read (confirmed in source)
- Fix #3 applied: getSessionTurns structured path eliminates ANSI round-trip (confirmed in source)
- New fix A applied: useMemo for sessions.filter in useSessionHistory.ts (new Date() per keystroke)
- Open (low): handleViewLog useCallback instability (SessionHistory.tsx) — inline onClick lambda nullifies benefit
- Open (accepted): buildSessionContent synchronous Marked block (useSessionView.ts) — documented, tui-developer handoff if >200ms sessions
