---
name: Review Log
description: Running log of completed reviews — date, deliverable ID, files reviewed, key findings
type: project
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
