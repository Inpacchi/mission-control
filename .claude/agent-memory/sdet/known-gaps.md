# Known Coverage Gaps

## jsdom not installed — UI component tests blocked
- **Gap:** `src/ui/` test project declares `environment: 'jsdom'` but `jsdom` is not in devDependencies
- **Effect:** Any test that needs DOM APIs (querySelector, event dispatch, React rendering) cannot run
- **Affected scope:** All future `src/ui/**` tests that use React hooks with side effects, Zustand stores, or xterm.js
- **Resolution required:** `npm install -D jsdom` before writing component-level or hook-level tests that need a DOM
- **Deferred because:** D2 unit tests for `useButtonPress` and `formatters` happened to not need DOM APIs

## No E2E test suite
- **Gap:** No Playwright E2E tests exist. The `ops/sdlc/knowledge/testing/tool-patterns.yaml` documents Playwright patterns but no test files exist.
- **Scope when filled:** Full browser-to-server scenarios: kanban board rendering, WebSocket terminal session lifecycle, file watcher triggering kanban updates, stats broadcast
- **Deferred:** Outside D2 scope; should be a separate deliverable

## No integration tests for HTTP routes
- **Gap:** `src/server/routes/__tests__/files.test.ts` exists but the other routes (sdlc, sessions, config) have no integration tests
- **Deferred:** Outside current scope
