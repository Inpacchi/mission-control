---
name: Async I/O migration (D2 Phase 2)
description: All server services (sdlcParser, catalogParser, sessionStore, configLoader) use fs/promises. All exported functions are async. fileWatcher handleChange awaits parseDeliverables inside setTimeout.
type: project
---

As of D2 Phase 2, all file I/O in server services uses `fs/promises` (async). Key details:

- **sdlcParser**: `parseDeliverables`, `parseChronicle`, `getDeliverable` all return Promises
- **catalogParser**: `parse()` returns `Promise<CatalogEntry[]>`
- **sessionStore**: All exports are async. `projectSlug()` uses SHA-256 hash (exported, not just internal)
- **configLoader**: `loadConfig()` returns `Promise<McConfig>`
- **fileWatcher**: `handleChange` is an async callback inside `setTimeout` -- awaits `parseDeliverables()` before calling `onUpdate`. Has `onStats` callback for broadcasting stats.
- **terminalManager**: Calls to sessionStore are fire-and-forget with `.catch(() => {})` in onData/onExit callbacks (non-blocking)
- **CORS**: Uses `cors` npm package. Default origins include localhost:3002 and localhost:5173. Config extends via `corsOrigins` in `.mc.json`.
- **Slug generation**: `projectRegistry.generateSlug()` and `sessionStore.projectSlug()` both use `basename-sha256hex12` format

**Why:** Sync I/O blocks the event loop; D2 tech debt cleanup converted everything to non-blocking.
**How to apply:** Never reintroduce sync fs calls in services. All route handlers calling these services must be async.
