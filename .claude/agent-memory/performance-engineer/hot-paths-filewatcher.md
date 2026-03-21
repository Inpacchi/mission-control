---
name: File watcher hot paths and known issues
description: Performance and correctness findings from review of fileWatcher.ts and sdlcParser.ts (commit 7efe5b4)
type: project
---

## fileWatcher.ts — restart logic race condition

The error handler calls `watcher?.close().catch(() => {})` (fire-and-forget) then schedules
`startWatcher()` via `setTimeout(..., 3000)`. chokidar's `close()` is async. Under EMFILE conditions
(the exact scenario this code defends against), close can take >3s, meaning a new watcher is spawned
before the old one has released its file descriptors. With 3 retries, up to 4 concurrent watcher
instances can hold fds simultaneously.

**Fix:** `await watcher.close()` before calling `startWatcher()` in the error handler. Remove the
fixed 3000ms delay (it was a proxy for drain time; an explicit await is deterministic).

## fileWatcher.ts — restartCount never resets

`restartCount` increments on each error but is never reset on a successful parse. A process that
survives two separate EMFILE episodes will exhaust its 3-attempt budget across both, not per-episode.
Fix: reset `restartCount = 0` in `handleChange`'s success path, or use a time-windowed counter.

## sdlcParser.ts — parseCatalog() called on every watcher trigger

`parseCurrentWork()` issues `scanDirectory()` and `parseCatalog()` in parallel on every debounced
change. `parseCatalog()` reads `docs/_index.md` — a single small file, sub-millisecond I/O on local
SSD. Not a bottleneck today. Cost grows linearly with catalog size. Long-term: cache with mtime check
or watch `_index.md` as a separate single-file watcher.

## Correctness gap — _index.md not watched

Narrowing the watch scope to `docs/current_work/` excluded `docs/_index.md`. Catalog-only entries
("idea" deliverables with no files) won't update live when the catalog changes. This is a correctness
gap, not a performance issue.

## Debounce values

- `awaitWriteFinish.stabilityThreshold: 100ms` + `pollInterval: 50ms` — appropriate
- Debounce: `200ms` — not measured against real burst frequency, but defensible
- Total latency floor: ~300-350ms from file write to WebSocket broadcast — acceptable for kanban use case

## parseChronicle() code duplication

`parseChronicle()` and `parseDeliverables()` duplicate the sort logic from
`buildDeliverablesFromFiles()`. Minor maintainability issue, not a performance concern.
