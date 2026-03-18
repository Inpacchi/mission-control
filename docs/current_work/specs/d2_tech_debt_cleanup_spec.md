---
type: refactor
complexity: moderate
effort: 3
flavor: "A clean foundation holds more weight than a decorated ruin."
---

# D2: Tech Debt Cleanup — Specification

**Status:** Draft
**Created:** 2026-03-16
**Author:** software-architect
**Depends On:** D1

---

## 1. Problem Statement

D1 (Mission Control MVP) shipped a functional product, but the code review identified 12 categories of tech debt that collectively degrade maintainability, correctness, and performance:

- **Unused theme system.** The UI defines a full Chakra UI theme in `src/ui/theme/index.ts` with color tokens, typography scales, and spacing values. Zero components reference these tokens. All 224 inline `style={{}}` objects bypass the theme entirely, making visual consistency fragile and global style changes impossible.

- **Duplicated patterns.** The button press animation (`scale(0.97)` onMouseDown/onMouseUp/onMouseLeave) is copy-pasted across 8 files. Date formatting functions are independently defined in 3 components. Column definitions exist in both `.mc.json` schema and a hardcoded fallback in `KanbanBoard.tsx`. Each duplicate is a maintenance liability and a divergence risk.

- **Synchronous I/O on hot paths.** `sdlcParser` makes 3 synchronous filesystem calls on every REST request to `/api/sdlc/*`. `sessionStore.searchSessions` synchronously reads entire log files. These block the Node.js event loop during request handling, degrading throughput under concurrent use.

- **Missing security middleware.** No CORS configuration exists. The server accepts requests from any origin. Users binding to `0.0.0.0` for LAN/Tailscale access have no mechanism to restrict which origins can interact with the API.

- **Type drift.** The D1 spec types diverge from the implementation. The `Project` type lacks the `slug` field that the code already uses. The `ColumnConfig` type lacks a `color` field. This drift erodes the spec's value as a reference document.

- **Redundant REST round-trip.** The StatsBar fetches stats via a separate `GET /api/sdlc/stats` call after receiving a WebSocket deliverable update. The fileWatcher already has the data needed to compute stats at broadcast time.

- **Slug collision risk.** Project slugs use `path.basename` only, so two projects named `api` in different parent directories produce the same slug, corrupting session storage.

- **Duplicate dependency.** Both `xterm` and `@xterm/xterm` appear in `package.json`. The old `xterm` package is unused dead weight.

- **Mermaid re-initialization.** `mermaid.initialize()` runs inside a `useEffect` on every `MermaidBlock` render, which is unnecessary and triggers console warnings.

- **Trivial wrapper function.** `handleSwitchProject` in `App.tsx` delegates directly to `handleSelectProject` with no additional logic.

None of these issues are user-facing bugs today, but together they create a codebase that is harder to modify, slower than necessary, and less secure than it should be for its intended deployment model.

---

## 2. Requirements

### Functional

- [ ] **F1: Chakra style props migration** — Replace all 224 inline `style={{}}` objects across 18 UI component files with Chakra UI `Box` components (or equivalent semantic elements) using style props (`bg`, `p`, `color`, `borderRadius`, etc.) that reference the theme tokens defined in `src/ui/theme/index.ts`.

- [ ] **F2: useButtonPress hook** — Extract the `scale(0.97)` onMouseDown/onMouseUp/onMouseLeave pattern from 8 files into a shared `useButtonPress()` hook at `src/ui/hooks/useButtonPress.ts`. Each call site replaced with the hook.

- [ ] **F3: Async hot-path I/O** — Convert `sdlcParser` (3 synchronous filesystem calls) and `sessionStore.searchSessions` (synchronous log file reads) to use `fs/promises` async equivalents. All callers updated to `await`.

- [ ] **F4: CORS middleware** — Add CORS middleware to Express with a configurable `corsOrigins` field in `.mc.json`. Default behavior: allow `localhost` and `127.0.0.1` origins only (any port). When `corsOrigins` is specified, use it as the allowlist.

- [ ] **F5: Type alignment** — Update the D1 spec document (`docs/current_work/specs/d1_mission_control_mvp_spec.md`) to match the implemented types. Add `slug: string` to `Project`. Add `color: string` to `ColumnDefinition`. Reconcile any other spec-to-implementation drift discovered during the work.

- [ ] **F6: Stats WebSocket broadcast** — Modify `fileWatcher` to compute `CatalogStats` and broadcast a `{ channel: 'watcher:sdlc', type: 'stats', stats: CatalogStats }` message alongside (or immediately after) the deliverable update. Update StatsBar to consume stats from WebSocket instead of making a REST call on each update.

- [ ] **F7: Collision-safe project slugs** — Generate slugs using `path.basename(projectPath) + '-' + sha256(fullPath).substring(0, 6)`. Add `slug` field to the `Project` type in `src/shared/types.ts`. Use slugs consistently in `sessionStore` directory naming and API responses.

- [ ] **F8: Deduplicate date formatters** — Extract `formatDate` and `formatTimestamp` into `src/ui/utils/formatters.ts`. Replace the 3 inline definitions with imports.

- [ ] **F9: Column config from server** — Remove the hardcoded `defaultColumns` array from `KanbanBoard.tsx`. Fetch column definitions from `GET /api/config` on mount and flow them through as props or store state. Add `color: string` to the `ColumnConfig` type so columns can carry their theme color.

- [ ] **F10: Remove duplicate xterm** — Remove the `xterm` package from `package.json`, retaining only `@xterm/xterm`.

- [ ] **F11: Fix mermaid initialization** — Move `mermaid.initialize()` to module scope (top-level side-effect) or gate it with a module-level boolean flag so it executes exactly once regardless of how many `MermaidBlock` components render.

- [ ] **F12: Remove handleSwitchProject wrapper** — Inline `handleSelectProject` directly at the call site in `App.tsx` where `handleSwitchProject` is currently used. Remove the wrapper function.

### Non-Functional

- [ ] **NF1: Visual parity** — Every component must render identically after the inline-style-to-Chakra migration. No visible layout shifts, color changes, or spacing differences.
- [ ] **NF2: Test stability** — All 103 existing tests must pass without modification (unless a test explicitly asserts on sync call signatures that changed to async).
- [ ] **NF3: Build cleanliness** — `npm run build` produces zero errors and zero TypeScript warnings throughout all intermediate commits.
- [ ] **NF4: No performance regression** — Async conversions must not increase observable latency on REST endpoints. Stats WebSocket broadcast must not add perceptible delay to file watcher events.

---

## 3. Scope

### Components Affected

- [ ] `src/server/index.ts` — CORS middleware addition, stats WebSocket routing
- [ ] `src/server/services/sdlcParser.ts` — sync-to-async conversion (3 calls)
- [ ] `src/server/services/sessionStore.ts` — async `searchSessions`, slug-based directory paths
- [ ] `src/server/services/fileWatcher.ts` — stats computation and broadcast
- [ ] `src/server/services/projectRegistry.ts` — SHA-256-based slug generation
- [ ] `src/server/routes/sdlc.ts` — await async sdlcParser calls
- [ ] `src/server/routes/sessions.ts` — await async sessionStore calls
- [ ] `src/shared/types.ts` — `Project.slug`, `ColumnDefinition.color`, stats `WsMessage`
- [ ] `src/ui/App.tsx` — remove `handleSwitchProject`
- [ ] `src/ui/components/layout/Dashboard.tsx` — inline styles to Chakra props
- [ ] `src/ui/components/layout/StatsBar.tsx` — inline styles to Chakra props, consume stats from WebSocket
- [ ] `src/ui/components/layout/ProjectPicker.tsx` — inline styles to Chakra props
- [ ] `src/ui/components/layout/ProjectSwitcher.tsx` — inline styles to Chakra props
- [ ] `src/ui/components/kanban/KanbanBoard.tsx` — inline styles to Chakra props, remove hardcoded columns, fetch from config
- [ ] `src/ui/components/kanban/KanbanColumn.tsx` — inline styles to Chakra props
- [ ] `src/ui/components/kanban/DeliverableCard.tsx` — inline styles to Chakra props, useButtonPress hook
- [ ] `src/ui/components/kanban/SkillActions.tsx` — inline styles to Chakra props, useButtonPress hook
- [ ] `src/ui/components/kanban/TimelineView.tsx` — inline styles to Chakra props
- [ ] `src/ui/components/terminal/TerminalTabs.tsx` — inline styles to Chakra props, useButtonPress hook
- [ ] `src/ui/components/terminal/TerminalPanel.tsx` — inline styles to Chakra props
- [ ] `src/ui/components/terminal/SessionControls.tsx` — inline styles to Chakra props, useButtonPress hook
- [ ] `src/ui/components/terminal/SessionHistory.tsx` — inline styles to Chakra props
- [ ] `src/ui/components/preview/FileViewer.tsx` — inline styles to Chakra props
- [ ] `src/ui/components/preview/MarkdownPreview.tsx` — inline styles to Chakra props, mermaid fix
- [ ] `src/ui/components/chronicle/ChronicleBrowser.tsx` — inline styles to Chakra props
- [ ] `src/ui/components/adhoc/AdHocTracker.tsx` — inline styles to Chakra props
- [ ] `src/ui/hooks/useButtonPress.ts` — **new file**
- [ ] `src/ui/utils/formatters.ts` — **new file**
- [ ] `package.json` — remove `xterm` duplicate
- [ ] `docs/current_work/specs/d1_mission_control_mvp_spec.md` — type alignment edits

### Domain Scope

- [ ] Infrastructure-only. No new features, no new user-facing behavior. All changes are internal code quality, performance, and security improvements.

### Data Model Changes

| Type | Change | Rationale |
|------|--------|-----------|
| `Project` | Add `slug: string` | Collision-safe identifier using basename + 6-char SHA-256 hash of full path |
| `ColumnDefinition` | Add `color: string` | Allow column config to carry theme color for rendering |
| `McConfig` | Add `corsOrigins?: string[]` | Configurable CORS allowlist |

### Interface / Adapter Changes

- `sdlcParser.getDeliverables()` — return type changes from sync to `Promise<Deliverable[]>`
- `sdlcParser.getStats()` — return type changes from sync to `Promise<CatalogStats>`
- `sessionStore.searchSessions()` — return type changes from sync to `Promise<SessionLogEntry[]>`
- `fileWatcher` — now broadcasts both `type: 'update'` and `type: 'stats'` messages on `watcher:sdlc` channel
- `GET /api/config` response — `ColumnDefinition` objects now include `color` field
- `.mc.json` schema — accepts optional `corsOrigins: string[]` field

---

## 4. Design

### Approach

This is a cleanup deliverable, not a feature deliverable. The guiding principle is **wire what exists, remove what duplicates, and fix what blocks**. No new abstractions beyond the two small extractions (hook, utility). No architectural changes. Every item produces a codebase that is closer to the architecture D1 specified but did not fully realize.

The work decomposes into four independent tracks that can be planned and executed in parallel where dependencies allow:

1. **Style migration (F1, F2, F8)** — Mechanical transformation of 18 component files. High file count, low complexity per file. The theme tokens already exist; this is a wiring task. The `useButtonPress` hook and `formatters.ts` utility are extracted first, then each component is migrated file-by-file.

2. **Server hardening (F3, F4, F6, F7)** — Async I/O, CORS, stats broadcast, slug generation. These are service-layer changes with clear interfaces. Each change is independently testable.

3. **Cleanup (F10, F11, F12)** — Trivial removals and one-line fixes. No dependency between them.

4. **Documentation (F5, F9 type portion)** — Spec alignment and type updates. Done last to reflect final state.

### Key Components

| Component | Purpose |
|-----------|---------|
| `useButtonPress` hook | Returns `{ onMouseDown, onMouseUp, onMouseLeave, style }` implementing the `scale(0.97)` press animation. Single source of truth for 8 call sites. |
| `formatters.ts` utility | Exports `formatDate(iso: string): string` and `formatTimestamp(iso: string): string`. Single source of truth for 3 call sites. |
| CORS middleware | Express middleware using the `cors` package. Reads `corsOrigins` from config. Defaults to `[/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/]`. |
| Slug generator | Pure function: `(fullPath: string) => string`. Implementation: `path.basename(fullPath) + '-' + crypto.createHash('sha256').update(fullPath).digest('hex').substring(0, 6)`. |

### Data Model

```typescript
// Updated Project type (addition of slug field)
interface Project {
  path: string;
  name: string;
  slug: string;           // basename + '-' + sha256(fullPath).substring(0, 6)
  lastOpened: string;
  hasSdlc: boolean;
  hasClaude: boolean;
}

// Updated ColumnDefinition (addition of color field)
interface ColumnDefinition {
  id: string;
  label: string;
  color: string;          // theme token key, e.g. "brand.blue" or hex value
  match: {
    hasSpec?: boolean;
    hasPlan?: boolean;
    hasResult?: boolean;
    isComplete?: boolean;
    isBlocked?: boolean;
  };
}

// Updated McConfig (addition of corsOrigins)
interface McConfig {
  columns?: ColumnDefinition[];
  actions?: Record<string, ActionMapping[]>;
  corsOrigins?: string[];  // e.g. ["http://192.168.1.50:3002"]
  port?: number;
  bind?: string;
}
```

### API

No new endpoints. Changes to existing interfaces:

```
GET /api/config
  Response shape unchanged. ColumnDefinition objects now include `color` field.

GET /api/projects
  Response shape unchanged. Project objects now include `slug` field.

WebSocket watcher:sdlc channel
  Now emits both:
    { channel: 'watcher:sdlc', type: 'update', deliverables: Deliverable[] }
    { channel: 'watcher:sdlc', type: 'stats', stats: CatalogStats }
  Previously only emitted 'update'. The 'stats' message follows immediately
  after 'update' in the same file-change event cycle.
```

### useButtonPress Hook Design

```typescript
// src/ui/hooks/useButtonPress.ts
import { useState, useCallback } from 'react';

interface ButtonPressResult {
  isPressed: boolean;
  pressProps: {
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
  pressStyle: { transform: string; transition: string };
}

export function useButtonPress(): ButtonPressResult {
  const [isPressed, setIsPressed] = useState(false);
  return {
    isPressed,
    pressProps: {
      onMouseDown: useCallback(() => setIsPressed(true), []),
      onMouseUp: useCallback(() => setIsPressed(false), []),
      onMouseLeave: useCallback(() => setIsPressed(false), []),
    },
    pressStyle: {
      transform: isPressed ? 'scale(0.97)' : 'scale(1)',
      transition: 'transform 0.1s ease',
    },
  };
}
```

### CORS Middleware Design

```typescript
// Added to src/server/index.ts
import cors from 'cors';

const config = loadConfig(projectPath);
const allowedOrigins = config.corsOrigins ?? [];
const defaultPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, curl, etc.)
    if (!origin) return callback(null, true);
    if (defaultPattern.test(origin)) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
```

### Slug Generation Design

```typescript
// In src/server/services/projectRegistry.ts
import { createHash } from 'crypto';
import path from 'path';

function generateSlug(fullPath: string): string {
  const base = path.basename(fullPath);
  const hash = createHash('sha256').update(fullPath).digest('hex').substring(0, 6);
  return `${base}-${hash}`;
}
```

---

## 5. Testing Strategy

- [ ] **Build verification** — `npm run build` succeeds with zero errors after each track is complete. TypeScript strict mode enforced throughout.
- [ ] **Existing test suite** — All 103 tests pass. Tests that call now-async functions will need `await` adjustments; these are expected and not "modifications" in the sense of changed assertions.
- [ ] **Manual QA: Visual parity** — Open dashboard before and after style migration. Compare every component visually. No layout shifts, color differences, or spacing changes. Screenshot comparison recommended.
- [ ] **Manual QA: CORS** — With default config, verify `fetch` from `http://localhost:3002` succeeds and from `http://evil.example.com` is blocked. With `corsOrigins: ["http://192.168.1.50:3002"]`, verify that origin is allowed.
- [ ] **Manual QA: Stats broadcast** — Open dashboard, create a file in `docs/current_work/specs/`. Verify StatsBar updates without a visible REST request in the Network tab (stats arrive via WebSocket).
- [ ] **Manual QA: Slug uniqueness** — Register two projects with the same directory name but different parent paths. Verify they get distinct slugs and separate session storage directories.
- [ ] **Manual QA: Mermaid** — Open a deliverable with a Mermaid diagram. Verify it renders once without console warnings about re-initialization.
- [ ] **Unit tests: Slug generation** — Given known paths, verify deterministic slug output and collision resistance.
- [ ] **Unit tests: formatters** — Verify `formatDate` and `formatTimestamp` produce expected output for known ISO strings.

---

## 6. Success Criteria

- [ ] **SC1:** Zero inline `style={{}}` objects remain in any UI component file. All styling uses Chakra UI style props or the theme system.
- [ ] **SC2:** `useButtonPress` hook exists and is the sole source of the press animation pattern. Grep for `scale(0.97)` finds only the hook file.
- [ ] **SC3:** `formatDate` and `formatTimestamp` are defined only in `src/ui/utils/formatters.ts`. Grep for their definitions finds only that file.
- [ ] **SC4:** `sdlcParser` and `sessionStore.searchSessions` use `fs/promises` exclusively on hot paths. No synchronous `fs.readFileSync`/`fs.readdirSync`/`fs.statSync` calls in those functions.
- [ ] **SC5:** CORS middleware is active. Requests from non-localhost origins are rejected by default. `corsOrigins` in `.mc.json` is respected.
- [ ] **SC6:** StatsBar receives stats via WebSocket. The Network tab shows no `GET /api/sdlc/stats` calls after initial page load.
- [ ] **SC7:** Two projects with the same `basename` but different full paths produce different slugs.
- [ ] **SC8:** `KanbanBoard.tsx` contains no hardcoded column definitions. Columns are fetched from `GET /api/config`.
- [ ] **SC9:** Only `@xterm/xterm` appears in `package.json`. The `xterm` package is gone.
- [ ] **SC10:** `mermaid.initialize()` executes exactly once per page load regardless of render count.
- [ ] **SC11:** `handleSwitchProject` does not exist in `App.tsx`.
- [ ] **SC12:** The D1 spec types match the implementation, including `Project.slug` and `ColumnDefinition.color`.
- [ ] **SC13:** All 103 existing tests pass. Build produces zero errors.

---

## 7. Constraints

- **Visual identity preserved.** This is a wiring task. The theme tokens already define the visual language. Components must look identical after migration, not different. No design changes.
- **No new features.** Every change is a cleanup, extraction, or hardening of existing behavior. If a change would alter user-visible behavior, it is out of scope.
- **Build must pass continuously.** Each logical commit must leave the build in a passing state. No "break now, fix later" intermediate states.
- **Async conversion limited to hot paths.** Only `sdlcParser` (called per-request) and `sessionStore.searchSessions` (reads log files) are converted. Startup-only sync code (`configLoader`, `projectRegistry` initialization) stays synchronous to keep startup simple.
- **No new dependencies** except `cors` (if not already present). The `crypto` module is built into Node.js.

---

## 8. Out of Scope

- **Theme redesign or color changes.** The theme exists and is correct. This deliverable wires components to existing tokens. It does not change the tokens.
- **New component extraction.** Beyond `useButtonPress` and `formatters.ts`, no new components, hooks, or utilities are introduced. Resist the urge to refactor further.
- **Full async conversion.** Startup code, config loading, and project registry initialization remain synchronous. Converting them yields no user-facing benefit and complicates startup sequencing.
- **Authentication or authorization.** CORS is a cross-origin control, not an auth system. Application-level auth remains out of scope per D1 constraints.
- **Test coverage expansion.** Existing tests must pass. Writing new tests for previously untested code is not part of this deliverable (though the plan may include targeted tests for new utilities like `useButtonPress`, `formatters`, and slug generation).
- **Performance profiling or optimization beyond async conversion.** No caching layers, no query optimization, no bundle size reduction.
- **Linting or formatting enforcement.** Style consistency improvements are welcome as a side-effect of the Chakra migration but are not a tracked goal.

---

## 9. Open Questions / Unknowns

- [ ] **Unknown:** Are there inline styles that cannot be directly expressed as Chakra style props (e.g., pseudo-elements, complex selectors, CSS grid shorthand)?
  - **Risk:** Some components may need `sx` prop or `css` prop fallback, which is less clean than pure style props.
  - **Mitigation:** Audit all 224 inline style objects during planning. Identify any that use CSS properties without Chakra equivalents. For those, use the Chakra `sx` prop (which accepts arbitrary CSS) rather than keeping inline styles. Document each exception.

- [ ] **Unknown:** Does the `cors` npm package already exist in the dependency tree, or does it need to be added?
  - **Risk:** Minimal. `cors` is a well-maintained, zero-dependency Express middleware.
  - **Mitigation:** Check `package.json` and `package-lock.json` during planning. If absent, add it. If a different CORS approach is already partially implemented, use that instead.

- [ ] **Unknown:** Are any of the 103 existing tests tightly coupled to synchronous `sdlcParser` or `sessionStore` call signatures?
  - **Risk:** Tests that call these functions synchronously will fail after async conversion and need `await` + `async` adjustments.
  - **Mitigation:** Grep test files for direct calls to `sdlcParser` and `sessionStore.searchSessions` during planning. Enumerate affected tests and plan the `async/await` adjustments as part of the async conversion track.

- [ ] **Unknown:** Does `KanbanBoard.tsx` currently handle the case where `GET /api/config` returns no columns (empty or missing `.mc.json`)?
  - **Risk:** Removing the hardcoded fallback could cause an empty board if config fetch fails or returns no columns.
  - **Mitigation:** The config route should merge defaults server-side before responding. The hardcoded defaults move from the UI component to the server's config loader, not deleted entirely. The plan must specify where the defaults live after migration.
