---
tier: full
type: architecture
complexity: moonshot
effort: 5
flavor: "Express, WebSocket, PTY — the bones of a command center."
created: 2026-03-16
author: CC
agents: [software-architect, backend-developer, frontend-developer]
---

# D1: Mission Control MVP -- Implementation Plan

**Spec:** `d1_mission_control_mvp_spec.md`
**Revised:** 2026-03-16 (architecture review findings incorporated)

---

## Overview

Mission Control is a greenfield Node.js CLI tool that serves a React web UI for managing SDLC workflows and Claude Code terminal sessions. This plan covers the full MVP: project scaffolding, server infrastructure, SDLC state derivation, PTY-backed terminal sessions, the complete UI (kanban, terminals, preview, stats, history, chronicle, ad hoc tracking), multi-project support, configuration, and visual design.

The build approach is Vite dev server + Express API with proxy in dev mode. Vite builds the UI to `dist/ui/`, tsc compiles the server to `dist/server/`. In production, Express serves the static UI. In development, Vite provides HMR while proxying API and WebSocket requests to Express.

---

## Component Impact

| Component / Package | Changes |
|--------------------|---------|
| `package.json` | New package: all dependencies, bin entry (`mc`), build scripts, dev scripts |
| `tsconfig.json` / `tsconfig.server.json` | TypeScript configuration for server (CommonJS/Node target) and UI (ESNext/DOM target) |
| `vite.config.ts` | Vite configuration: React plugin, proxy to Express API in dev, output to `dist/ui/` |
| `vitest.config.ts` | Vitest configuration with separate node/jsdom environments |
| `src/cli.ts` | CLI entry point: arg parsing, project resolution, server startup, browser open |
| `src/server/` | Express server, WebSocket setup, REST routes (sdlc, sessions, config, files, projects), all services |
| `src/shared/` | Shared type definitions used by both server and UI (API contracts; UI re-exports and extends) |
| `src/ui/` | React SPA: app shell, kanban board, terminal panel, markdown preview, stats bar, session history, chronicle browser, ad hoc tracker, project picker/switcher |
| `.mc.json` | Example/default configuration file |

## Interface / Adapter Changes

All interfaces are new (greenfield):

- **REST API:** 15 endpoints across sdlc, sessions, files, config, and projects resources (see spec Section 4)
- **WebSocket:** Single multiplexed connection at `/ws` carrying terminal I/O channels and SDLC watcher channel
- **CLI:** `mc` command with `--port`, `--bind`, `--no-open` flags and optional positional `<path>` argument
- **Filesystem reads:** `docs/` tree, `docs/_index.md`, `docs/chronicle/`, `.mc.json`, `~/.mc/`
- **Filesystem writes:** `~/.mc/sessions/` (session logs), `~/.mc/projects.json` (project registry)
- **Process spawning:** `claude` binary via `node-pty`, `git log` via child_process

## Migration Required

- [x] No migration needed -- greenfield project, no existing data or schema

---

## Prerequisites

- [x] Node.js 20+ available on development machine
- [x] `claude` CLI installed and functional
- [x] Approved spec at `docs/current_work/specs/d1_mission_control_mvp_spec.md`
- [ ] npm package name `mission-control` availability confirmed (or scoped alternative chosen)

---

## Phases

### Phase 1: Project Scaffolding, Build Pipeline, and Test Infrastructure

**Agent:** `software-architect`

**Why:** Every subsequent phase depends on a working build pipeline, project structure, and test infrastructure. Getting this right first prevents rework across all other phases. Test runners must be configured from the start so every phase can add tests incrementally.

**Outcome:** A buildable, runnable, testable project skeleton. `npm run build` compiles both server and UI. `npm run dev` starts Vite HMR and Express API concurrently with proxy configuration. `npm test` runs Vitest against a placeholder test. Playwright is installed for E2E testing. The `mc` CLI entry point parses arguments and starts the server. The npm package is structured for global installation with a `bin` entry. A startup check verifies the `claude` binary is in PATH and emits a clear error message if missing (dashboard still loads; terminal features are disabled).

**Files affected:**
- `package.json` (includes vitest, @vitest/coverage-v8, playwright, node-pty with prebuild-install or node-pty-prebuilt-multiarch)
- `tsconfig.json`, `tsconfig.server.json`
- `vite.config.ts`
- `vitest.config.ts` (separate node environment for server tests, jsdom for UI tests)
- `playwright.config.ts` (base config, 3 minimum E2E scenario stubs)
- `src/cli.ts` (includes claude binary PATH check with clear error output)
- `src/server/index.ts` (minimal Express + static serving + WebSocket attach point)
- `src/shared/types.ts` (all shared type definitions from the spec data model)
- `src/ui/main.tsx`, `src/ui/App.tsx` (minimal React entry point)
- `src/__tests__/placeholder.test.ts` (placeholder test to verify runner works)

**node-pty native compilation note:** Document the native compilation requirement in package.json postinstall or README. Use `node-pty-prebuilt-multiarch` or `prebuild-install` to reduce build friction. If native compilation fails, emit clear troubleshooting guidance in the error output.

**Acceptance criteria:**
- `npm run build` succeeds: tsc compiles server to `dist/server/`, Vite builds UI to `dist/ui/`
- `npm run dev` starts both Vite dev server and Express API; Vite proxies `/api/*` and `/ws` to Express
- `npm test` exits zero against a placeholder test (Vitest configured with node + jsdom environments)
- Playwright is installed and `npx playwright test` runs (placeholder E2E tests may be skipped/pending)
- `node dist/server/cli.js` starts the server on port 3002 and serves the built UI
- `node dist/server/cli.js --port 4000 --bind 0.0.0.0 --no-open ~/some/path` correctly parses all flags
- If `claude` is not in PATH, startup logs a clear error message and the dashboard loads with terminal features disabled
- TypeScript strict mode enabled; shared types compile cleanly for both server and UI targets
- Project structure matches the layout defined in CLAUDE.md

---

### Phase 2: Server Core, Terminal System, and PTY Bridge

**Agent:** `backend-developer`

**Context files to read before implementing:**
- `ops/sdlc/knowledge/architecture/technology-patterns.yaml`
- `ops/sdlc/knowledge/architecture/typescript-patterns.yaml`
- `ops/sdlc/knowledge/architecture/api-design-methodology.yaml`

**Why:** The server is the backbone that all UI features depend on, and the terminal system is the highest-risk component (spec unknown U1) and the core value proposition. Combining these into one phase under a single agent eliminates handoff overhead and allows the PTY bridge to be validated end-to-end before any UI work begins. This phase is large -- follow the internal sequencing below strictly.

**Internal sequencing (must be followed in order):**

1. **Stage A: Express setup + WebSocket server + service shells**
   - Express app, WebSocket server at `/ws`, graceful shutdown handler with registered cleanup callback pattern
   - Service module shells with interfaces (sdlcParser, catalogParser, gitParser, fileWatcher, sessionStore, projectRegistry)
   - Service initialization ordering: `projectRegistry.resolve()` -> parsers with resolved path -> `fileWatcher` -> `sessionStore`
   - Session history endpoints return empty arrays at this stage
   - WebSocket heartbeat: server ping every 30s, close connection on 2 missed pongs
   - projectPath validation on all endpoints: must be a registered project, return 400 otherwise

2. **Stage B: Parsers and file watcher wired to routes**
   - sdlcParser, catalogParser, gitParser fully implemented
   - All SDLC routes wired to services
   - fileWatcher pushing live updates over WebSocket
   - File content endpoint with path traversal prevention (reject `../` sequences, validate resolved path is within docs/)
   - Separate `src/server/routes/projects.ts` for project endpoints

3. **Stage C: Terminal manager and PTY bridge**
   - terminalManager service: spawn `claude` via node-pty, bridge PTY I/O to WebSocket terminal channels
   - Session routes wired to terminal manager
   - WebSocket terminal channel message routing with type: "input" for client-to-server keystrokes (distinct from "data" for server-to-client output)
   - `terminalManager.killAll()` registered as cleanup callback in the shutdown handler
   - Session log streaming to files (append-only, no memory buffering)

4. **Stage D: PTY testing gate**
   - Scripted smoke test using node-pty against a known binary (e.g., `echo`, `cat`, or a simple ANSI-output script) before wiring to claude
   - Manual test matrix: permission prompts, long output (1000+ lines), rapid bursts, resize mid-session, non-zero exit codes
   - **Gate: if PTY smoke tests fail, Phase 4 terminal UI work must not begin**

**Files affected:**
- `src/server/index.ts` (full Express + WebSocket setup, graceful shutdown with cleanup callback registry)
- `src/server/routes/sdlc.ts` (deliverables, catalog, stats, untracked, chronicle endpoints)
- `src/server/routes/sessions.ts` (create, list, kill sessions; session history and log retrieval)
- `src/server/routes/config.ts` (config endpoint)
- `src/server/routes/projects.ts` (project list, project switch)
- `src/server/routes/files.ts` (read-only file content, restricted to docs/)
- `src/server/services/sdlcParser.ts` (scan docs/current_work/ and docs/chronicle/, derive states)
- `src/server/services/catalogParser.ts` (parse docs/_index.md with lenient regex)
- `src/server/services/gitParser.ts` (parse git log, filter untracked commits)
- `src/server/services/fileWatcher.ts` (chokidar on docs/, 200ms debounce, WebSocket emit)
- `src/server/services/sessionStore.ts` (persist logs to ~/.mc/sessions/, auto-prune 30 days, 10MB cap)
- `src/server/services/projectRegistry.ts` (manage ~/.mc/projects.json, resolve paths, track recent)
- `src/server/services/terminalManager.ts` (spawn claude via node-pty, manage PTY lifecycle, bridge to WebSocket)

**Acceptance criteria:**
- All 15 REST endpoints return correct response shapes matching the spec data model
- `GET /api/sdlc/deliverables` correctly derives state from file existence and naming conventions
- `GET /api/sdlc/untracked` returns commits without `d<N>:` prefix from recent git history
- WebSocket at `/ws` accepts connections and supports channel subscription messages
- WebSocket heartbeat: server pings every 30s, closes connection on 2 missed pongs
- File watcher detects create/rename/delete in docs/ and pushes `watcher:sdlc` updates within 500ms
- Session store writes logs to `~/.mc/sessions/{project-slug}/` and prunes entries older than 30 days
- Project registry persists to `~/.mc/projects.json` and tracks last-used project
- SIGTERM/SIGINT triggers graceful shutdown: registered cleanup callbacks run (closes WebSocket, kills terminals, cleans up watchers)
- `terminalManager.killAll()` is invoked during graceful shutdown (acceptance criterion for PTY cleanup)
- `.mc.json` is read and merged with defaults for column definitions and action mappings
- File content endpoint restricts reads to the docs/ directory (no path traversal)
- Path traversal test: `GET /api/files/../../package.json` returns 403 or 400
- projectPath validation: unregistered paths return 400
- `POST /api/sessions` spawns a `claude` process in a PTY with correct working directory and environment inheritance
- `POST /api/sessions` with a `command` body dispatches `claude "<command>"` (pre-filled skill command)
- PTY output streams to the client over the `terminal:{sessionId}` WebSocket channel
- Client keystrokes sent via WebSocket (type: "input") are forwarded to the PTY stdin
- Terminal resize messages update the PTY dimensions
- Process exit triggers a `terminal:{sessionId}` exit event and session log finalization
- `DELETE /api/sessions/:id` sends SIGTERM to the claude process and cleans up resources
- Multiple concurrent sessions operate independently without cross-contamination
- Session output is streamed to a log file for persistence (append-only, no memory buffering)
- Claude Code's interactive permission prompts render and respond correctly through the PTY bridge
- PTY smoke test passes against a known binary before claude is wired
- Manual PTY test matrix completed: permission prompts, long output, rapid bursts, resize, non-zero exit
- Session store integration test: after session exit, log file exists, metadata persisted, auto-prune works with backdated timestamps
- Unit tests: projectRegistry path resolution and detection logic
- Unit test: path traversal prevention on file content endpoint

---

### Phase 3: Design Direction

**Agent:** `ui-ux-designer`

**Context files to read before implementing:**
- `ops/sdlc/knowledge/design/ux-modeling-methodology.yaml`
- `ops/sdlc/knowledge/design/ascii-conventions.yaml`
- `docs/current_work/specs/d1_mission_control_mvp_spec.md` (especially NF10, SC7)

**Why:** Visual design decisions must be made before any UI code is written. Without a design direction document, Phase 4 and Phase 5 agents will make ad hoc styling choices that result in an inconsistent, generic-looking dashboard. This phase produces a reference document -- no code -- that subsequent UI phases treat as required reading.

**Outcome:** A design direction document at `docs/current_work/design/d1_design_direction.md` that establishes the complete visual identity for Mission Control. This document is the authoritative reference for all UI implementation.

**The design direction document must cover:**
- **Color palette:** Primary, secondary, accent colors (minimum 3 accent colors). Custom color tokens (non-default Chakra values). Semantic color assignments (success, warning, error, info).
- **Typography:** Font families (heading, body, mono). Documented typography scale with sizes, weights, and line heights. Custom font specification.
- **Spacing and layout:** Spacing scale. Default layout proportions (kanban 60%, terminal 40%). Minimum panel heights (terminal 150px). Terminal collapse behavior. Side preview panel behavior. Layout states (kanban-only, kanban+terminal, kanban+preview, all three).
- **Border radii and shadows:** Component-level radius and shadow specifications.
- **Component patterns:** Card design (collapsed and expanded states). Column header treatment. Terminal panel chrome. Stats bar styling. Button hierarchy. Badge and tag styling. Empty states. Error states. Loading states.
- **Interaction principles:** Minimum 2 micro-interaction transitions specified. Hover states. Focus states. Panel transitions. Card click opens preview (body click), action buttons are distinct click targets, panel dismissed by X or click outside, one preview open at a time, empty state for cards with no doc, timeline expand via chevron toggle on card footer.
- **Information density:** Fixed card height in collapsed state. Independently scrollable columns. Information hierarchy (ID+name primary, modified secondary, actions on hover). Compact mode toggle behavior (for `.mc.json` configuration).
- **Accessibility:** WCAG AA contrast ratios. Visible focus indicators. ARIA labels on icon-only buttons.
- **Multi-file card preview:** Tab for each doc type (Spec/Plan/Result), default to most recent.

**Files affected:**
- `docs/current_work/design/d1_design_direction.md` (new)

**Acceptance criteria:**
- Design direction document exists at `docs/current_work/design/d1_design_direction.md`
- Document covers all sections listed above
- Color palette includes custom tokens (not default Chakra colors) with minimum 3 accent colors
- Typography scale is fully documented with at least 6 size steps
- Layout proportions and minimum dimensions are specified with numeric values
- At least 2 micro-interaction transitions are described with timing and easing
- Information density rules are concrete (fixed heights, scroll behavior, hierarchy)
- WCAG AA contrast is specified for all text-on-background combinations
- Document is self-contained -- a frontend developer can implement the full visual identity from this document alone

**Parallelism note:** This phase can run in parallel with Phase 2 (Server Core + Terminal). It has no server dependencies. Phase 4 depends on both Phase 2 and Phase 3.

---

### Phase 4: UI Core -- App Shell, Kanban, Stats Bar, Terminal Panel, and Skill Dispatch

**Agent:** `frontend-developer`

**Context files to read before implementing:**
- `docs/current_work/design/d1_design_direction.md` (REQUIRED -- read before writing any component)
- `ops/sdlc/knowledge/design/ux-modeling-methodology.yaml`
- `ops/sdlc/knowledge/architecture/typescript-patterns.yaml`

**Why:** This phase delivers the primary user-facing value: the dashboard layout, live kanban board, stats overview, tabbed terminal sessions, and skill dispatch buttons. These are the features the CD will use every session. All styling must follow the Phase 3 design direction document.

**Outcome:** A functional single-page application with: ChakraProvider initialized with a base theme derived from the design direction document; a dashboard layout containing a stats bar, kanban board, and resizable terminal panel; live-updating kanban cards derived from the SDLC API and WebSocket watcher; tabbed terminal sessions with xterm.js rendering PTY output; and skill dispatch buttons (both global actions and per-deliverable context actions) that open new sessions with pre-filled commands.

**Files affected:**
- `src/ui/App.tsx` (app shell, ChakraProvider with base theme, WebSocket provider, project context)
- `src/ui/theme/index.ts` (base Chakra UI theme from design direction: colors, typography, spacing, radii, shadows)
- `src/ui/components/layout/Dashboard.tsx` (main layout: stats bar, kanban, terminal panel)
- `src/ui/components/layout/StatsBar.tsx` (summary counts from catalog stats)
- `src/ui/components/kanban/KanbanBoard.tsx` (column layout)
- `src/ui/components/kanban/KanbanColumn.tsx` (column header, count badge, independently scrollable card list)
- `src/ui/components/kanban/DeliverableCard.tsx` (card: fixed height in collapsed state, ID+name primary, modified secondary, actions on hover, body click opens preview stub, timeline chevron toggle)
- `src/ui/components/kanban/SkillActions.tsx` (context-sensitive action buttons per deliverable state, distinct click targets)
- `src/ui/components/terminal/TerminalTabs.tsx` (tab bar for sessions)
- `src/ui/components/terminal/TerminalPanel.tsx` (xterm.js wrapper, xterm-addon-fit, resize handling, WebSocket binding, correct disposal on unmount, instance preservation on tab switch)
- `src/ui/components/terminal/SessionControls.tsx` (new session, kill session, global skill dispatch)
- `src/ui/hooks/useWebSocket.ts` (single connection, channel multiplexing, reconnection with backoff; on reconnect: re-subscribe channels, fetch full state via GET /api/sdlc/deliverables and GET /api/sessions, reattach running terminal sessions)
- `src/ui/hooks/useSdlcState.ts` (subscribe to watcher:sdlc, maintain deliverable state)
- `src/ui/hooks/useTerminalSession.ts` (xterm.js lifecycle, bind to terminal channel)
- `src/ui/stores/dashboardStore.ts` (Zustand: active tab, selected card, panel visibility, project)
- `src/ui/types/deliverable.ts`
- `src/ui/types/session.ts`
- `src/ui/types/config.ts`
- `src/ui/types/project.ts`

**Acceptance criteria (stub-testable -- no server required):**
- ChakraProvider is initialized in App.tsx with the base theme from design direction
- Dashboard renders with stats bar at top, kanban board in main area, terminal panel at bottom (resizable)
- Layout proportions follow design direction defaults (kanban 60%, terminal 40%)
- Terminal panel respects minimum height (150px) and collapse behavior from design direction
- Kanban columns are independently scrollable
- Deliverable cards have fixed height in collapsed state
- Card information hierarchy: ID+name primary, modified secondary, actions on hover
- Card body click opens a placeholder preview panel (stub -- full preview wiring in Phase 5)
- Action buttons are distinct click targets from card body
- Empty states display for columns with no cards and for cards with no associated doc
- One preview panel open at a time; dismissed by X or click outside

**Acceptance criteria (integration-testable -- requires running server):**
- Stats bar shows total, in-progress, blocked, complete, and untracked ad hoc counts
- Kanban columns match the spec: Idea, Spec, Plan, In Progress, Review, Complete, Blocked
- Deliverable cards appear in correct columns based on filesystem state
- Cards update in real time when files are created/renamed/deleted (no page refresh)
- Clicking a skill dispatch button (e.g., "Start Planning") opens a new terminal tab with the correct pre-filled command
- Terminal tabs support multiple concurrent sessions; tab switching preserves output via instance preservation (not rehydration)
- xterm.js renders ANSI colors, cursor movement, and interactive prompts correctly
- xterm-addon-fit is initialized and active; terminal resizes to container
- xterm.js instances are properly disposed on unmount (no memory leaks)
- Terminal resize events are sent to the server when the panel is resized
- WebSocket reconnects with exponential backoff (1s, 2s, 4s, max 30s) on disconnection
- On WebSocket reconnect: re-subscribes channels, fetches full state via GET endpoints, reattaches running terminal sessions
- Per-deliverable context actions change based on deliverable state (e.g., Idea shows "Start Planning", Plan shows "Execute Plan")

---

### Phase 5: UI Features -- Preview, Timeline, Chronicle, Ad Hoc, and Session History

**Agent:** `frontend-developer`

**Context files to read before implementing:**
- `docs/current_work/design/d1_design_direction.md` (REQUIRED)
- `ops/sdlc/knowledge/design/ux-modeling-methodology.yaml`
- `ops/sdlc/knowledge/architecture/typescript-patterns.yaml`

**Why:** These features complete the information architecture -- developers need to preview documents without leaving the dashboard, trace deliverable progression, browse archived work, track untracked commits, and review past sessions. Without these, the CD would still need to drop to the terminal for common lookup tasks.

**Outcome:** A markdown preview panel that opens when clicking a deliverable card (replacing the Phase 4 stub), showing rendered GFM with syntax highlighting and Mermaid diagrams. Multi-file card preview with tabs for each doc type (Spec/Plan/Result), defaulting to most recent. A timeline view within each card showing progression timestamps, expandable via chevron toggle. A collapsible chronicle browser for archived deliverables. An ad hoc work tracker showing untracked git commits with a reconcile button. A session history panel with search by date and content.

**Recommended libraries:** react-markdown + remark-gfm + rehype-highlight + mermaid for markdown preview.

**Files affected:**
- `src/ui/components/preview/MarkdownPreview.tsx` (GFM rendering, syntax highlighting, Mermaid)
- `src/ui/components/preview/FileViewer.tsx` (side panel container, file loading via REST, multi-doc tabs: Spec/Plan/Result, default to most recent)
- `src/ui/components/kanban/TimelineView.tsx` (expandable timeline within card, chevron toggle, timestamps from GET /api/sdlc/deliverable/:id)
- `src/ui/components/chronicle/ChronicleBrowser.tsx` (collapsible section, search, archived deliverables)
- `src/ui/components/adhoc/AdHocTracker.tsx` (untracked commit list, reconcile button)
- `src/ui/components/terminal/SessionHistory.tsx` (past session browser, search by date/content)
- `src/ui/hooks/useSessionHistory.ts` (fetch and search past sessions)

**Acceptance criteria:**
- Clicking a deliverable card opens the FileViewer side panel (replaces Phase 4 stub)
- FileViewer shows tabs for each available doc (Spec/Plan/Result), defaults to most recent
- Markdown preview supports GitHub-flavored markdown, fenced code blocks with syntax highlighting, and Mermaid diagrams
- Timeline view shows progression entries (spec created, plan created, execution started) with timestamps derived from file modification times
- Timeline is expandable via chevron toggle on card footer
- Chronicle browser lists archived deliverables from `docs/chronicle/`, searchable by name, ID, or content
- Ad hoc tracker displays recent git commits lacking a `d<N>:` prefix with commit hash, message, date, and author
- Ad hoc tracker includes a "Reconcile" button that dispatches an `sdlc-reconciliation` skill session
- Session history panel lists past sessions with date, command, exit code, and log file size
- Session history supports search by content and date filtering
- Preview panel is read-only -- no editing capabilities
- All styling follows the Phase 3 design direction document

---

### Phase 6: Multi-Project Support, Config System, and Project Lifecycle

**Agent:** `backend-developer` (server-side) + `frontend-developer` (UI components)

**Context files to read before implementing:**
- `docs/current_work/design/d1_design_direction.md` (REQUIRED for UI components)
- `ops/sdlc/knowledge/architecture/technology-patterns.yaml`

**Why:** Multi-project support is what makes `mc` a daily-driver tool rather than a one-project demo. The project picker, switcher, and registry transform it from "run in one directory" to "manage your entire portfolio."

**Outcome:** Running `mc` with no arguments shows a project picker page listing previously used projects (sorted by last opened). Running `mc <path>` opens directly to that project. A header dropdown allows switching between registered projects without restarting. Project state (kanban, sessions, config) scopes correctly to the active project. The `.mc.json` config file overrides column definitions and action mappings per project. Project detection identifies SDLC markers and adjusts available features.

**Files affected:**
- `src/server/services/projectRegistry.ts` (refinements: detection, registration, switching logic)
- `src/server/routes/config.ts` (project switch endpoint wiring)
- `src/server/index.ts` (project context on startup, re-initialization on switch)
- `src/ui/components/layout/ProjectPicker.tsx` (full-page project selector)
- `src/ui/components/layout/ProjectSwitcher.tsx` (header dropdown for switching)
- `src/ui/App.tsx` (project context provider, conditional routing to picker vs dashboard)
- `src/ui/stores/dashboardStore.ts` (active project state)

**Acceptance criteria:**
- `mc` with no args shows project picker listing registered projects sorted by last opened
- `mc ~/path/to/project` opens directly to that project's dashboard
- Project switcher dropdown in the header lists all registered projects
- Switching projects updates kanban, stats, and config to the new project's state
- Active terminal sessions remain running when switching projects (sessions are scoped, not killed)
- A warning displays when switching away from a project with active sessions
- `.mc.json` overrides are applied per project: custom columns and actions take effect
- `.mc.json` compact mode setting is respected when present
- Project detection checks for `CLAUDE.md`, `docs/_index.md`, `.claude/`, `.mc.json` markers
- Projects without SDLC markers still support terminal sessions (kanban is disabled/empty)
- New projects are auto-registered in `~/.mc/projects.json` on first open

---

### Phase 7: Design Review, Polish, and Final QA

**Agents:** `ui-ux-designer` (review against design direction), then `frontend-developer` (corrections)

**Context files to read before implementing:**
- `docs/current_work/design/d1_design_direction.md` (REQUIRED)
- `ops/sdlc/knowledge/design/ux-modeling-methodology.yaml`
- `ops/sdlc/knowledge/design/ascii-conventions.yaml`

**Why:** The spec (NF10, SC7) explicitly requires a fun, modern, engaging aesthetic with personality. Even with a design direction document guiding Phases 4-6, implementation drift is inevitable. This phase is the quality gate where the ui-ux-designer reviews every built component against the direction document and issues targeted corrections.

**Process:** The `ui-ux-designer` agent reviews the built UI against the Phase 3 design direction document. The agent produces a list of specific corrections (color values, spacing, transitions, component treatments). The `frontend-developer` agent then applies corrections. This is NOT a from-scratch redesign -- it is a targeted review pass.

**Outcome:** A cohesive visual identity for Mission Control that matches the design direction document. Custom Chakra UI theme fully applied. All components styled consistently. Micro-interactions and transitions implemented. Empty, error, and loading states polished. Responsive layout behavior verified. The full theme replaces the base theme established in Phase 4.

**Files affected:**
- `src/ui/theme/` (Chakra UI theme finalization: colors, typography, components, shadows, radii)
- All `src/ui/components/` files (styling corrections to match design direction)
- `src/ui/App.tsx` (final theme provider configuration)
- Static assets if needed (fonts, icons, any brand elements)

**Acceptance criteria (SC7 verifiable checklist):**
- Custom color tokens applied (non-default Chakra values throughout)
- Minimum 3 accent colors in active use across the UI
- At least 2 micro-interaction transitions implemented (with specified timing and easing)
- Custom font applied per design direction
- Documented typography scale implemented (all specified sizes, weights, line heights)
- Typography hierarchy is clear and aesthetically pleasing (heading, body, mono fonts)
- Cards, columns, panels, and controls have visual variety -- not flat monotone
- Empty states (no deliverables, no sessions, no history) have helpful, well-designed content
- Error states display clearly without breaking the layout
- Loading states are present and styled
- Terminal panel chrome complements the dashboard without feeling disconnected
- WCAG AA contrast maintained for all text (verified against design direction color specs)
- Visible focus indicators on all interactive elements
- ARIA labels on all icon-only buttons
- Color choices maintain sufficient contrast for accessibility
- The overall aesthetic passes SC7: a developer looking at the UI would describe it as "fun" or "engaging," not "generic" or "utilitarian"

---

## Phase Dependencies

| Phase | Depends On | Agent(s) | Can Parallel With |
|-------|-----------|----------|-------------------|
| 1: Scaffolding | -- | software-architect | -- |
| 2: Server + Terminal | Phase 1 | backend-developer | Phase 3 |
| 3: Design Direction | -- (reads spec only) | ui-ux-designer | Phase 2 |
| 4: UI Core | Phase 2, Phase 3 | frontend-developer | -- |
| 5: UI Features | Phase 4 | frontend-developer | Phase 6 (server side) |
| 6: Multi-Project | Phase 2 (server), Phase 4 (UI) | backend-developer + frontend-developer | Phase 5 |
| 7: Design Review | Phase 4, Phase 5, Phase 6 (UI) | ui-ux-designer, then frontend-developer | -- |

**Parallelism notes:**
- Phase 2 (Server + Terminal) and Phase 3 (Design Direction) can run in parallel. Phase 3 produces a document, not code, and has no server dependency.
- Phase 4 (UI Core) depends on BOTH Phase 2 (server APIs must be available) and Phase 3 (design direction must exist). Additionally, Phase 2 Stage D (PTY gate) must pass before Phase 4 terminal UI work begins.
- Phase 5 (UI Features) and Phase 6 (Multi-Project, server side) can overlap. The frontend portions of Phase 6 depend on Phase 4.
- Phase 7 (Design Review) must wait until Phase 5 and Phase 6 UI work are complete so the designer can review all components in context.

---

## Approach Comparison

| Approach | Description | Key Tradeoff | Selected? |
|----------|-------------|-------------|-----------|
| A: Vite + Express with proxy | Vite dev server for HMR, Express API server, Vite proxies API/WS in dev. Production: Express serves Vite-built static files. Single npm package. | Requires proxy config in dev; simple production deployment. | Yes -- chosen by CD. Best DX with HMR, clean production story, single-process constraint satisfied. |
| B: Express serves everything | Express serves both API and UI in all modes. Vite used only as build tool, no dev server. | No HMR during development; slower iteration on UI. | No -- unacceptable DX for heavy UI development. |
| C: Separate packages (monorepo) | Server and UI as separate packages in a monorepo with shared types package. | Over-engineered for a single-process tool; adds build complexity, violates single-package constraint. | No -- violates spec constraint C7 (single package build). |

## Agent Skill Loading

| Agent | Load These Skills |
|-------|------------------|
| software-architect | N/A (scaffolding only, no skill dispatch needed) |
| backend-developer | N/A (direct implementation, reads knowledge context files listed per phase) |
| frontend-developer | N/A (direct implementation, reads knowledge context files listed per phase) |
| ui-ux-designer | N/A (design direction document + review, reads knowledge context files listed per phase) |
| code-reviewer | N/A (post-execution review, reads knowledge context files from agent-context-map) |

---

## Testing

### Manual Testing

1. **Build verification:** `npm run build` succeeds with zero errors for both server (tsc) and UI (Vite). TypeScript strict mode, no `any` escape hatches in type definitions.
2. **Test runner verification:** `npm test` exits zero. Vitest configured with node (server) and jsdom (UI) environments.
3. **Dev mode:** `npm run dev` starts Vite HMR and Express API. Changing a React component triggers hot reload. API calls from the browser proxy correctly to Express.
4. **CLI flags:** `mc --port 4000 --bind 0.0.0.0 --no-open ~/some/path` starts correctly with all flags honored.
5. **Claude binary missing:** Remove `claude` from PATH temporarily. Verify `mc` starts, dashboard loads, terminal features show disabled state with clear message.
6. **Kanban rendering:** Start `mc` in a project with deliverables in various states. Verify cards appear in correct columns.
7. **Live updates:** Create/rename/delete files in `docs/current_work/` while dashboard is open. Verify cards move within 1 second without page refresh.
8. **Terminal sessions:** Open a Claude Code session. Verify ANSI colors, cursor movement, and interactive permission prompts work. Type commands and verify responses.
9. **PTY stress tests:** Send rapid output (1000+ lines), resize terminal mid-session, trigger non-zero exit. Verify stability.
10. **Multiple sessions:** Open 3+ concurrent sessions in separate tabs. Verify independent operation and tab switching preserves output.
11. **Skill dispatch:** Click each skill dispatch button. Verify a new terminal tab opens with the correct pre-filled command.
12. **Markdown preview:** Click a deliverable card. Verify spec/plan renders as formatted markdown with code highlighting and Mermaid diagrams. Verify multi-doc tabs (Spec/Plan/Result).
13. **Chronicle browser:** Verify archived deliverables from `docs/chronicle/` are listed and searchable.
14. **Ad hoc tracker:** Verify untracked commits appear. Click "Reconcile" and verify it dispatches the correct skill session.
15. **Session persistence:** Close a session. Navigate to Session History. Verify the log is browsable and searchable.
16. **Multi-project:** Run `mc` with no args. Verify project picker appears. Switch projects. Verify kanban updates. Run `mc ~/other-project`. Verify direct open.
17. **Config override:** Create a `.mc.json` with custom columns. Restart `mc`. Verify custom columns appear.
18. **Graceful shutdown:** Send SIGTERM. Verify child processes are terminated and server exits cleanly.
19. **Path traversal:** Attempt `GET /api/files/../../package.json`. Verify 403 or 400 response.
20. **WebSocket reconnection:** Kill and restart the server while the UI is open. Verify the UI reconnects, re-fetches state, and reattaches terminal sessions.
21. **Latency measurement:** Note time from `mc` command to dashboard visible (target: <2s). Note time from file change to card update (target: <1s).

### Automated Tests

**Unit tests:**
- [ ] `sdlcParser` -- given mock docs/ structure, verify correct state derivation
- [ ] `catalogParser` -- given sample `_index.md`, verify parsed entries
- [ ] `gitParser` -- given mock git log output, verify untracked commit filtering
- [ ] WebSocket message serialization -- verify channel multiplexing encode/decode
- [ ] CLI argument parsing -- verify flag combinations and defaults
- [ ] `projectRegistry` -- path resolution, detection logic, registration
- [ ] Path traversal prevention -- verify `../` and symlink attacks are blocked on file content endpoint

**Integration tests:**
- [ ] File watcher to WebSocket -- create file in docs/, verify WebSocket update within 500ms
- [ ] Session lifecycle -- POST create, verify WebSocket channel, DELETE kill, verify exit event
- [ ] Session store -- after session exit, verify log file exists, metadata persisted, auto-prune works with backdated timestamps

**E2E tests (Playwright):**
- [ ] Kanban renders and updates on file creation in docs/current_work/
- [ ] Skill dispatch button click opens a new terminal tab with correct command
- [ ] Multiple sessions operate independently (open 2, type in each, verify isolation)

---

## Verification Checklist

- [ ] All 7 phases complete
- [ ] All 15 REST endpoints functional and matching spec response shapes
- [ ] WebSocket multiplexing works for terminal and watcher channels
- [ ] WebSocket heartbeat active (30s ping, close on 2 missed pongs)
- [ ] Terminal sessions render Claude Code output with full fidelity (ANSI, colors, interactive prompts)
- [ ] Kanban updates in real time from filesystem changes
- [ ] Multi-project support: picker, switcher, per-project scoping
- [ ] Session persistence: logs saved, history browsable, auto-prune functional
- [ ] `.mc.json` configuration overrides work
- [ ] Graceful shutdown handles SIGTERM/SIGINT correctly (cleanup callbacks invoked)
- [ ] Visual design meets SC7 verifiable checklist (see Phase 7 acceptance criteria)
- [ ] Design direction document exists and was followed
- [ ] `npm i -g` installation works as a single package
- [ ] `claude` binary check works (clear error, dashboard still loads without it)
- [ ] Path traversal prevention verified
- [ ] Manual QA items from testing section all pass
- [ ] Automated unit, integration, and E2E tests pass
- [ ] WCAG AA contrast verified
- [ ] Focus indicators and ARIA labels present

---

## Post-Execution Review

All completed work across all phases must be reviewed before the deliverable is marked complete. The review should be conducted by all relevant domain agents:

- **code-reviewer:** Full code review of server and UI implementation for quality, patterns, security, and maintainability
- **software-architect:** Architecture review to verify the implementation matches the spec's design, layering, and constraints
- **sdet:** Test coverage review and execution of all manual and automated test cases
- **ui-ux-designer:** Visual review against the Phase 3 design direction document and SC7 verifiable checklist

Each reviewing agent should read their mapped knowledge context files from `ops/sdlc/knowledge/agent-context-map.yaml` before conducting the review.

---

## Notes

- **node-pty risk (spec unknown U1):** The terminal system is the highest-risk component. Phase 2 Stage D includes a PTY testing gate -- if smoke tests fail, Phase 4 terminal UI work must not begin. If issues arise, investigate xterm.js addons or alternative encoding strategies early.
- **node-pty native compilation:** Use `node-pty-prebuilt-multiarch` or `prebuild-install` to reduce native compilation friction. Document troubleshooting in error output for failed installations.
- **Catalog parser leniency (spec unknown U2):** The catalog parser should extract deliverable IDs via lenient regex, fall back to filesystem-only derivation if `_index.md` is unparseable, and log warnings rather than failing on unrecognized lines.
- **Terminal data encoding (spec unknown U3):** The implementation should benchmark base64 encoding in JSON vs. binary WebSocket messages for terminal data. Start with base64 in JSON for simplicity; switch to binary if performance is insufficient. Use type: "input" for client-to-server keystrokes and type: "data" for server-to-client output.
- **Session log size (spec unknown U4):** Stream writes to log files (append-only). Cap at 10MB per session. Index metadata separately from log content.
- **Project switching with active sessions (spec unknown U5):** Sessions are scoped to projects. Switching does not kill sessions. Show a warning when switching away from a project with active sessions.
- **shared/types.ts vs ui/types/ relationship:** `src/shared/types.ts` defines API contracts (request/response shapes, WebSocket message envelopes) shared between server and UI. `src/ui/types/` re-exports shared types and extends them with UI-specific types (component props, store state, display-only types).
- **Dev server management is out of scope:** The `.mc.json` `processes` config will be accepted and validated but not acted on. This is deferred to Phase 3 of the product roadmap (not Phase 3 of this plan).
- **WsMessage type extension required:** The spec's `WsMessage` TypeScript union type must be extended during Phase 2 to include `{ channel: \`terminal:\${string}\`; type: 'input'; data: string }` for client-to-server keystrokes. The plan is authoritative on this point (post-dates the spec).
- **Runtime spawn failure handling:** `POST /api/sessions` must return a structured error (e.g., 500 with `{ error: "spawn_failed", message: "..." }`) if `node-pty` fails to create the PTY at runtime (binary removed, PTY exhaustion, invalid cwd). The UI should display the error in the terminal tab, not a blank panel.
- **.mc.json parse failures:** If `.mc.json` contains invalid JSON or schema, log a warning with the parse error, fall back to defaults entirely, and continue startup. Do not partially merge a malformed config.
- **Session auto-prune timing:** Pruning runs on startup and on each session close (lazy pruning). No periodic timers.
- **WebSocket channel cleanup on session end:** When a session exits or is killed, the server sends the exit event and removes the channel from its routing table. The client cleans up its channel handler on receiving the exit event.
- **PTY smoke test pass criteria:** The smoke test must (a) receive exact expected output bytes from the test binary and (b) confirm resize updates PTY dimensions without error.
- **Session log 10MB cap test:** Integration tests must include writing synthetic output exceeding 10MB and verifying the log is capped.
- **E2E session isolation assertion:** Playwright test for multiple sessions must assert that content typed into session A does not appear in session B's terminal container.

---

## Domain Agent Reviews

Key feedback incorporated:

- [software-architect] Phase 6 had a hidden dependency on Phase 3 (terminal system) for session-scoping acceptance criteria — added to dependency table
- [software-architect] No error handling for missing `claude` binary — added startup PATH check with clear error message and graceful degradation
- [software-architect] WebSocket reconnect had no state resynchronization protocol — added re-subscribe + full state fetch + terminal reattach to useWebSocket hook
- [software-architect] node-pty native compilation risk to NF5 — added prebuild-install recommendation and troubleshooting guidance
- [software-architect] WsMessage type needs "input" variant for client-to-server keystrokes — documented as spec extension required in Phase 2
- [software-architect] Runtime spawn failures need structured error responses — added to Phase 2 notes
- [backend-developer] Phase 2 was too large with implicit service ordering — added 4-stage internal sequencing with explicit initialization order
- [backend-developer] Graceful shutdown didn't cover PTY process cleanup — added cleanup callback registry pattern with terminalManager.killAll()
- [backend-developer] WebSocket heartbeat missing — added 30s ping/pong with 2-miss disconnect
- [backend-developer] Terminal data direction ambiguity — added type: "input" for client-to-server, "data" for server-to-client
- [frontend-developer] ChakraProvider not initialized in Phase 4 — added as first acceptance criterion with base theme from design direction
- [frontend-developer] FileViewer dependency gap between Phase 4 and 5 — Phase 4 card click now opens placeholder stub, full preview in Phase 5
- [frontend-developer] xterm.js acceptance criteria insufficient — expanded with addon-fit, disposal on unmount, instance preservation on tab switch
- [ui-ux-designer] Design direction must come before Phase 4, not after — added new Phase 3 (Design Direction) that runs parallel with Phase 2
- [ui-ux-designer] SC7 was not testable — replaced with verifiable checklist (custom tokens, 3 accent colors, 2 transitions, custom font, typography scale)
- [ui-ux-designer] Information density unaddressed — added fixed card height, scrollable columns, information hierarchy, compact mode
- [ui-ux-designer] Layout proportions unspecified — added to Phase 3 design direction requirements (60/40 split, 150px min, collapse behavior)
- [ui-ux-designer] Interaction patterns unspecified — added card body vs action button click targets, preview dismissal, timeline chevron toggle
- [sdet] No test runner in Phase 1 — added Vitest + Playwright setup with placeholder tests
- [sdet] PTY testing protocol missing — added Phase 2 Stage D with smoke test, manual test matrix, and blocking gate
- [sdet] No E2E testing — added 3 Playwright scenarios (kanban update, skill dispatch, session isolation)
- [sdet] Path traversal test missing — added to manual QA, unit tests, and acceptance criteria
- [sdet] Session store integration test missing — added log file verification, metadata persistence, auto-prune with backdated timestamps
