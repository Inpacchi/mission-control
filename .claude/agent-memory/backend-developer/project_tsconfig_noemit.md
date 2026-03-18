---
name: tsconfig noEmit inheritance
description: tsconfig.server.json must explicitly set noEmit false — base tsconfig.json has noEmit true which is inherited
type: project
---

`tsconfig.json` sets `"noEmit": true` for IDE/type-check purposes. `tsconfig.server.json` extends it and must explicitly override with `"noEmit": false` to actually emit compiled output to `dist/server/`. Without this override, `tsc -p tsconfig.server.json` runs cleanly but emits nothing (the existing `dist/server/` contents were stale from a prior full build run).

**Why:** Discovered during D4 Phase 1 when `src/tui/` was added to the include list but produced no output in `dist/server/tui/`.

**How to apply:** Any future work that adds new source directories to `tsconfig.server.json` should verify files appear in `dist/server/` after build — if they don't, check whether `noEmit` is being inherited.
