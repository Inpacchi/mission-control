---
name: Architectural Decisions
description: Intentional design choices that explain why certain patterns exist, to avoid false findings in future reviews
type: project
---

## fileWatcher — one sync call retained intentionally
`fileWatcher.ts` line 22 uses `fs.existsSync(docsDir)` to guard the no-op watcher path. This is startup-only (called once at server init and on project switch), not on the hot file-change path. The D2 spec explicitly excludes startup code from the async conversion requirement.

## sessionStore and projectRegistry have separate slug functions by design (but this is a bug, not a decision)
As of D2, `generateSlug` in projectRegistry.ts and `projectSlug` in sessionStore.ts exist in parallel and produce different output for the same input (different case normalization). This is NOT intentional — it is an unresolved DRY/collision issue flagged in the D2 review.

## statsBar receives partial stats from WebSocket
By CD decision, the WebSocket `watcher:sdlc` stats broadcast intentionally excludes `untracked` count (would require running git on every file change). StatsBar merges WS-driven totals with a REST-fetched untracked count. This is correct behavior per D2 spec.

## useButtonPress is not a true React hook
`useButtonPress` in `src/ui/hooks/useButtonPress.ts` uses no React state or effects — it returns plain event handler functions. It was placed in hooks/ for discoverability alongside other hooks. The `use` prefix is technically misleading per React conventions but is a deliberate organizational choice.

## WsMessage type uses `data: unknown` for the generic watcher:sdlc update variant
The union type `{ channel: watcher:${string}; type: 'update'; data: unknown }` is intentionally broad. The sdlc-specific channel does not have a narrower typed variant in the union, which is why useSdlcState casts `msg.data as { deliverables?: Deliverable[] }` at the call site.
