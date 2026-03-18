# D1: Mission Control MVP — Specification

**Status:** Complete
**Created:** 2026-03-16
**Author:** software-architect
**Depends On:** None

---

## 1. Problem Statement

The current workflow for directing Claude Code agents is fragmented across multiple terminal windows, raw file inspection, and mental state tracking. The CD (Claude Director) role has no single pane of glass for:

- **Deliverable visibility** — status lives in filenames scattered across `docs/current_work/`, requiring manual `ls` and `cat` to understand project state.
- **Session management** — each Claude Code conversation runs in a separate terminal tab, with no unified view, no session history, and no way to dispatch skills without typing commands from memory.
- **Workflow continuity** — when a session closes or a terminal is lost, the conversation output is gone. There is no browsable history of what agents did, when, or in which order.
- **Multi-project context switching** — moving between projects requires navigating directories, remembering which terminals belong to which project, and mentally reconstructing state.

Mission Control replaces this fragmented workflow with a single local web UI that provides a visual kanban board (derived from the filesystem), tabbed Claude Code terminal sessions (via PTY), one-click skill dispatch, session persistence, and multi-project support.

---

## 2. Requirements

### Functional

- [ ] **F1: Kanban Board** — Display deliverables as cards in columns derived from filesystem state (`docs/_index.md`, `docs/current_work/`, `docs/chronicle/`). Columns: Idea, Spec, Plan, In Progress, Review, Complete, Blocked.
- [ ] **F2: Live Kanban Updates** — File watcher monitors `docs/` recursively and pushes state changes over WebSocket. Cards move between columns automatically when files are created, renamed, or moved.
- [ ] **F3: Interactive Terminal Sessions** — Spawn real `claude` binary via `node-pty` in a PTY, pipe stdin/stdout over WebSocket to xterm.js in the browser. Full ANSI color, cursor movement, and interactive permission prompts must work.
- [ ] **F4: Multiple Concurrent Sessions** — Support multiple Claude Code sessions as tabs. Tab switching preserves session output. Sessions can be started and killed independently.
- [ ] **F5: Skill Dispatch Buttons** — Global actions (New Deliverable, SDLC Status, Reconcile Ad Hoc, Compliance Audit, Ad Hoc Plan) and per-deliverable context actions (Start Planning, Execute Plan, Resume Work, Review Code, Create Tests, Archive) that open new terminal sessions with pre-filled commands.
- [ ] **F6: Catalog Stats Bar** — Top-of-dashboard summary showing total, in-progress, blocked, complete, and untracked ad hoc counts, parsed from `docs/_index.md` and filesystem state.
- [ ] **F7: Inline Markdown Preview** — Click a deliverable card to view rendered spec/plan/result in a side panel. GitHub-flavored markdown, syntax-highlighted code blocks, Mermaid diagram support. Read-only.
- [ ] **F8: Deliverable Timeline** — Each card expands to show progression with timestamps (spec created, plan created, execution start, etc.) derived from file creation/modification times.
- [ ] **F9: Chronicle Browser** — Collapsible section showing archived deliverables from `docs/chronicle/`. Searchable by name, ID, or content.
- [ ] **F10: Ad Hoc Work Tracker** — Parse recent git commits lacking a `d<N>:` prefix. Display in a separate section with a "Reconcile" button that triggers `/sdlc-reconciliation`.
- [ ] **F11: Session Persistence** — Save terminal output as log files on session close (or crash). Store at `~/.mc/sessions/{project-slug}/`. Browsable history panel with search by date and content. Auto-prune sessions older than 30 days.
- [ ] **F12: Multi-Project Support** — Project picker on launch (`mc` with no args), direct open (`mc <path>`), project switcher in UI, per-project kanban/sessions/config. Project registry at `~/.mc/projects.json`.
- [ ] **F13: CLI Entry Point** — `mc` command with flags: `--port` (default 3002), `--no-open`, `--bind` (default 127.0.0.1), and optional positional `<path>` argument.
- [ ] **F14: Data-Driven Config** — `.mc.json` in project root allows overriding column definitions, action mappings, and other configuration without code changes.
- [ ] **F15: Project Detection** — On startup, detect project markers (`CLAUDE.md`, `docs/_index.md`, `.claude/`, `.mc.json`) to determine which features to enable. Terminal sessions work for any directory; kanban requires SDLC markers.

### Non-Functional

- [ ] **NF1: Startup Speed** — Dashboard visible in browser within 2 seconds of `mc` command.
- [ ] **NF2: Local-Only by Default** — Bind to `127.0.0.1`. LAN/Tailscale access via `--bind 0.0.0.0` opt-in.
- [ ] **NF3: Single Process** — One Node.js process serves UI, REST API, WebSocket, file watcher, and terminal manager. No sidecar processes.
- [ ] **NF4: Environment Inheritance** — Spawned `claude` processes inherit working directory, all environment variables, and access to CLAUDE.md, `.claude/`, and docs/.
- [ ] **NF5: Minimal Install** — Single global npm package (`npm i -g mission-control`). No external database, no Redis, no Docker.
- [ ] **NF6: Terminal Fidelity** — xterm.js must render Claude Code output identically to a native terminal (ANSI escapes, colors, cursor movement, interactive prompts).
- [ ] **NF7: File Watch Efficiency** — chokidar watcher should not cause noticeable CPU usage on idle. Debounce filesystem events (200ms) before pushing WebSocket updates.
- [ ] **NF8: Session Log Size** — Session logs capped at 10MB per session. Older sessions pruned automatically (30-day retention).
- [ ] **NF9: Graceful Shutdown** — SIGTERM/SIGINT handler sends SIGTERM to all child processes, closes WebSocket connections, and exits cleanly.
- [ ] **NF10: Theme and Personality** — Fun, modern, and engaging visual design built for developers. The UI must avoid monotony — it should be appealing and genuinely enjoyable to look at and use. Think personality, not just polish: considered color choices, visual rhythm, purposeful micro-interactions. Not strictly dark or light. This is a tool developers will stare at all day; it should feel like a place they want to be.
- [ ] **NF11: Accessibility** — WCAG AA contrast ratios for all text-on-background combinations. Visible focus indicators on all interactive elements. ARIA labels on icon-only buttons. Keyboard navigable UI.
- [ ] **NF12: Information Density** — Fixed card height in collapsed state. Independently scrollable kanban columns. Information hierarchy: ID+name primary, last modified secondary, actions visible on hover. Compact mode toggle supported via `.mc.json` configuration.
- [ ] **NF13: Interaction Patterns** — Card body click opens preview panel. Action buttons are distinct click targets (not triggered by card body click). Preview panel dismissed by X button or click outside. One preview panel open at a time. Empty state shown for cards with no associated document. Timeline expanded via chevron toggle on card footer. Multi-file card preview shows tabs for each doc type (Spec/Plan/Result), defaulting to most recent.

---

## 3. Scope

### Components Affected

This is a greenfield project. All components are new.

- [ ] `src/cli.ts` — CLI entry point, argument parsing, server startup
- [ ] `src/server/` — Express server, WebSocket setup, REST routes, services
- [ ] `src/ui/` — React SPA (kanban, terminals, preview, stats, settings)
- [ ] `package.json` — package metadata, dependencies, bin entry
- [ ] `tsconfig.json` — TypeScript configuration (server + UI)
- [ ] `vite.config.ts` — Vite bundler configuration for UI

### Domain Scope

- SDLC deliverable lifecycle (idea through chronicle)
- Claude Code terminal session management
- Git commit parsing for ad hoc work detection
- Multi-project state management
- Session persistence and history

### Data Model Changes

All data models are new. See Section 4 for full type definitions.

### Interface / Adapter Changes

All interfaces are new:
- REST API (15 endpoints)
- WebSocket channels (2 channel types)
- CLI interface (flags and arguments)
- Filesystem interface (read docs/, read git log, read/write ~/.mc/)

---

## 4. Design

### Approach

Mission Control is a single-process Node.js application that serves a React SPA over HTTP and communicates with it via WebSocket for real-time updates and terminal I/O. The server derives all SDLC state from the filesystem (no database) and spawns Claude Code sessions as PTY-backed child processes.

The architecture follows a layered pattern:
1. **CLI layer** — parses arguments, resolves project path, starts server, opens browser
2. **Server layer** — Express for HTTP, `ws` for WebSocket, routes delegate to services
3. **Service layer** — stateless parsers (sdlcParser, catalogParser, gitParser) and stateful managers (terminalManager, fileWatcher)
4. **UI layer** — React SPA with Zustand stores, WebSocket hooks, and xterm.js terminal rendering

Key architectural principles:
- **Filesystem as source of truth** — no database; all SDLC state derived from file existence, names, and modification times
- **Real binary, not API** — spawns the `claude` CLI to inherit full Claude Code environment
- **PTY for terminal fidelity** — `node-pty` provides pseudo-terminal support so xterm.js renders output identically to a native terminal
- **Channel-multiplexed WebSocket** — single connection carries terminal I/O and file watcher events, distinguished by channel prefix
- **Data-driven configuration** — column definitions and skill mappings live in `.mc.json`, not code

### Key Components

#### Server Components

| Component | File | Purpose |
|-----------|------|---------|
| CLI Entry | `src/cli.ts` | Parse args (`--port`, `--bind`, `--no-open`, `<path>`), resolve project, start server, auto-open browser |
| Server Setup | `src/server/index.ts` | Create Express app, attach WebSocket server, initialize services, serve static UI |
| SDLC Routes | `src/server/routes/sdlc.ts` | REST endpoints for deliverable state, catalog, stats, untracked commits |
| Session Routes | `src/server/routes/sessions.ts` | REST endpoints for creating, listing, killing, and browsing terminal sessions |
| Config Routes | `src/server/routes/config.ts` | REST endpoint for project config and project switching |
| SDLC Parser | `src/server/services/sdlcParser.ts` | Scan `docs/current_work/` and `docs/chronicle/`, derive deliverable states from file existence and naming |
| Catalog Parser | `src/server/services/catalogParser.ts` | Parse `docs/_index.md` into structured deliverable entries |
| Git Parser | `src/server/services/gitParser.ts` | Parse `git log` for recent commits, filter those without `d<N>:` prefix |
| File Watcher | `src/server/services/fileWatcher.ts` | chokidar watcher on `docs/`, debounce events, emit structured changes over WebSocket |
| Terminal Manager | `src/server/services/terminalManager.ts` | Spawn/manage `claude` processes via `node-pty`, bridge PTY I/O to WebSocket channels |
| Session Store | `src/server/services/sessionStore.ts` | Persist session logs to `~/.mc/sessions/`, load history, auto-prune old sessions |
| Project Registry | `src/server/services/projectRegistry.ts` | Manage `~/.mc/projects.json`, track recently used projects, resolve project paths |

#### UI Components

| Component | File | Purpose |
|-----------|------|---------|
| App Shell | `src/ui/App.tsx` | Top-level layout, project context provider, WebSocket connection |
| Dashboard | `src/ui/components/layout/Dashboard.tsx` | Main layout: stats bar, kanban, terminal panel, side panels |
| Stats Bar | `src/ui/components/layout/StatsBar.tsx` | Summary counts (total, in-progress, blocked, complete, untracked) |
| Project Picker | `src/ui/components/layout/ProjectPicker.tsx` | Full-page project selector shown on `mc` with no args |
| Project Switcher | `src/ui/components/layout/ProjectSwitcher.tsx` | Header dropdown for switching between registered projects |
| Kanban Board | `src/ui/components/kanban/KanbanBoard.tsx` | Column layout rendering deliverable cards |
| Kanban Column | `src/ui/components/kanban/KanbanColumn.tsx` | Single column with header, count badge, and card list |
| Deliverable Card | `src/ui/components/kanban/DeliverableCard.tsx` | Card showing ID, name, status badge, last modified, click to preview |
| Skill Actions | `src/ui/components/kanban/SkillActions.tsx` | Context-sensitive action buttons per deliverable state |
| Timeline View | `src/ui/components/kanban/TimelineView.tsx` | Expandable timeline within a card showing progression with timestamps |
| Terminal Tabs | `src/ui/components/terminal/TerminalTabs.tsx` | Tab bar for multiple active sessions |
| Terminal Panel | `src/ui/components/terminal/TerminalPanel.tsx` | xterm.js wrapper, handles resize, WebSocket binding |
| Session Controls | `src/ui/components/terminal/SessionControls.tsx` | New session button, kill session, global skill dispatch buttons |
| Session History | `src/ui/components/terminal/SessionHistory.tsx` | Browse past sessions, search by date and content |
| Markdown Preview | `src/ui/components/preview/MarkdownPreview.tsx` | Render GFM markdown with syntax highlighting and Mermaid support |
| Chronicle Browser | `src/ui/components/chronicle/ChronicleBrowser.tsx` | Collapsible panel for archived deliverables, searchable |
| Ad Hoc Tracker | `src/ui/components/adhoc/AdHocTracker.tsx` | Untracked commit list with reconcile button |

#### Hooks and Stores

| Component | File | Purpose |
|-----------|------|---------|
| useWebSocket | `src/ui/hooks/useWebSocket.ts` | Manage single WebSocket connection, channel multiplexing, reconnection |
| useSdlcState | `src/ui/hooks/useSdlcState.ts` | Subscribe to SDLC WebSocket channel, maintain deliverable state |
| useTerminalSession | `src/ui/hooks/useTerminalSession.ts` | Manage xterm.js instance lifecycle, bind to WebSocket terminal channel |
| useSessionHistory | `src/ui/hooks/useSessionHistory.ts` | Fetch and search past sessions from REST API |
| dashboardStore | `src/ui/stores/dashboardStore.ts` | Zustand store for UI state: active tab, selected card, panel visibility, active project |

#### Type Definitions

| Type File | Purpose |
|-----------|---------|
| `src/ui/types/deliverable.ts` | Deliverable, DeliverableState, CatalogEntry, Timeline types |
| `src/ui/types/session.ts` | TerminalSession, SessionHistory, SessionLog types |
| `src/ui/types/config.ts` | McConfig, ColumnDefinition, ActionMapping types |
| `src/ui/types/project.ts` | Project, ProjectRegistry types |
| `src/shared/types.ts` | Types shared between server and UI (WebSocket message shapes, API response shapes) |

### Data Model

```typescript
// ── Deliverable State ──────────────────────────────────────

type DeliverableState =
  | 'idea'
  | 'spec'
  | 'plan'
  | 'in-progress'
  | 'review'
  | 'complete'
  | 'blocked';

interface Deliverable {
  id: string;              // "D1", "D2a", etc.
  name: string;            // human-readable title
  state: DeliverableState;
  hasSpec: boolean;
  hasPlan: boolean;
  hasResult: boolean;
  isComplete: boolean;
  isBlocked: boolean;
  specPath?: string;       // relative path to spec file
  planPath?: string;       // relative path to plan file
  resultPath?: string;     // relative path to result file
  lastModified: string;    // ISO 8601 timestamp
  timeline: TimelineEntry[];
}

interface TimelineEntry {
  event: string;           // "Spec created", "Plan created", etc.
  timestamp: string;       // ISO 8601
  filePath: string;        // which file triggered this event
}

interface CatalogEntry {
  id: string;
  name: string;
  description?: string;
  rawLine: string;         // original line from _index.md
}

interface CatalogStats {
  total: number;
  idea: number;
  spec: number;
  plan: number;
  inProgress: number;
  review: number;
  complete: number;
  blocked: number;
  untrackedAdHoc: number;
}

// ── Terminal Sessions ──────────────────────────────────────

interface TerminalSession {
  id: string;              // UUID
  projectPath: string;     // absolute path to project
  command: string;         // the command that was dispatched
  startedAt: string;       // ISO 8601
  status: 'running' | 'exited';
  exitCode?: number;
}

interface SessionLogEntry {
  id: string;              // UUID
  projectSlug: string;
  command: string;
  startedAt: string;
  endedAt: string;
  exitCode: number;
  logFile: string;         // path to .log file
  sizeBytes: number;
}

// ── Project ────────────────────────────────────────────────

interface Project {
  path: string;            // absolute path
  name: string;            // directory name or from package.json
  slug: string;            // URL-safe identifier
  lastOpened: string;      // ISO 8601
  hasSdlc: boolean;        // has docs/_index.md
  hasClaude: boolean;      // has CLAUDE.md or .claude/
}

interface ProjectRegistry {
  projects: Project[];
  lastUsed?: string;       // slug of last used project
}

// ── Configuration ──────────────────────────────────────────

interface McConfig {
  columns?: ColumnDefinition[];
  actions?: Record<string, ActionMapping[]>;
  port?: number;
  bind?: string;
}

interface ColumnDefinition {
  id: string;
  label: string;
  match: {
    hasSpec?: boolean;
    hasPlan?: boolean;
    hasResult?: boolean;
    isComplete?: boolean;
    isBlocked?: boolean;
  };
}

interface ActionMapping {
  label: string;
  command: string;         // claude command to dispatch
  icon?: string;           // Lucide icon name
}

// ── WebSocket Messages ─────────────────────────────────────

type WsMessage =
  | { channel: `terminal:${string}`; type: 'data'; data: string }
  | { channel: `terminal:${string}`; type: 'resize'; cols: number; rows: number }
  | { channel: `terminal:${string}`; type: 'exit'; code: number }
  | { channel: 'watcher:sdlc'; type: 'update'; deliverables: Deliverable[] }
  | { channel: 'watcher:sdlc'; type: 'stats'; stats: CatalogStats };
```

### API Endpoints

```
GET  /api/sdlc/deliverables
  Response: { deliverables: Deliverable[] }
  Description: Full kanban state derived from docs/.

GET  /api/sdlc/catalog
  Response: { entries: CatalogEntry[] }
  Description: Parsed _index.md catalog.

GET  /api/sdlc/deliverable/:id
  Response: { deliverable: Deliverable }
  Description: Single deliverable with full timeline.

GET  /api/sdlc/stats
  Response: CatalogStats
  Description: Summary counts for stats bar.

GET  /api/sdlc/untracked
  Response: { commits: { hash: string; message: string; date: string; author: string }[] }
  Description: Recent git commits without d<N>: prefix.

GET  /api/sdlc/chronicle
  Response: { deliverables: Deliverable[] }
  Description: Archived deliverables from docs/chronicle/.

POST /api/sessions
  Body: { command?: string; projectPath?: string }
  Response: { session: TerminalSession }
  Description: Start a new Claude Code terminal session. If command is provided,
               it is dispatched as `claude "<command>"`. If omitted, opens a blank
               claude prompt.

GET  /api/sessions
  Response: { sessions: TerminalSession[] }
  Description: List all active terminal sessions.

DELETE /api/sessions/:id
  Response: { success: boolean }
  Description: Kill a terminal session (SIGTERM to claude process).

GET  /api/sessions/history
  Query: ?project=<slug>&search=<term>&limit=<n>
  Response: { sessions: SessionLogEntry[] }
  Description: Browse past session logs.

GET  /api/sessions/history/:id/log
  Response: plain text session log content
  Description: Retrieve the raw log output of a past session.

GET  /api/files/*
  Response: { content: string; language: string }
  Description: Read-only file content for markdown preview. Restricted to docs/ directory.

GET  /api/config
  Response: McConfig
  Description: Current project configuration (merged defaults + .mc.json).

GET  /api/projects
  Response: ProjectRegistry
  Description: List registered projects.

POST /api/projects/switch
  Body: { path: string }
  Response: { project: Project }
  Description: Switch active project context.
```

### WebSocket Channels

Single WebSocket connection at `ws://localhost:3002/ws`, multiplexed via JSON message envelopes:

**Terminal channels** (`terminal:{sessionId}`):
- Client -> Server: `{ channel: "terminal:abc123", type: "data", data: "keystrokes" }` — user input
- Client -> Server: `{ channel: "terminal:abc123", type: "resize", cols: 120, rows: 40 }` — terminal resize
- Server -> Client: `{ channel: "terminal:abc123", type: "data", data: "output bytes" }` — PTY output
- Server -> Client: `{ channel: "terminal:abc123", type: "exit", code: 0 }` — process exited

**SDLC watcher channel** (`watcher:sdlc`):
- Server -> Client: `{ channel: "watcher:sdlc", type: "update", deliverables: [...] }` — kanban state changed
- Server -> Client: `{ channel: "watcher:sdlc", type: "stats", stats: {...} }` — stats updated

**Connection management:**
- Client sends `{ type: "subscribe", channels: ["watcher:sdlc"] }` on connect
- Terminal channels are auto-subscribed when a session is created via REST
- Reconnection with exponential backoff (1s, 2s, 4s, max 30s)

---

## 5. Testing Strategy

- [ ] **Build verification** — `npm run build` succeeds for both server (tsc) and UI (Vite). TypeScript strict mode, no `any` escape hatches in type definitions.
- [ ] **Manual QA: Kanban rendering** — Start `mc` in a project with `docs/current_work/` containing deliverables in various states. Verify cards appear in correct columns. Create/rename/delete files and verify cards move in real time.
- [ ] **Manual QA: Terminal sessions** — Open a Claude Code session, verify ANSI colors render correctly, type commands, verify interactive permission prompts work, verify tab switching preserves output.
- [ ] **Manual QA: Skill dispatch** — Click each skill dispatch button, verify a new terminal session opens with the correct pre-filled command.
- [ ] **Manual QA: Markdown preview** — Click a deliverable card, verify spec/plan renders as formatted markdown with code highlighting and Mermaid diagrams.
- [ ] **Manual QA: Multi-project** — Run `mc` with no args, verify project picker appears. Switch projects, verify kanban updates to new project state. Run `mc ~/other-project`, verify direct open.
- [ ] **Manual QA: Session persistence** — Close a session, navigate to Session History, verify the log is browsable and searchable.
- [ ] **Unit tests: SDLC Parser** — Given a mock `docs/` directory structure, verify correct derivation of deliverable states.
- [ ] **Unit tests: Catalog Parser** — Given sample `_index.md` content, verify parsed entries match expected structure.
- [ ] **Unit tests: Git Parser** — Given mock `git log` output, verify untracked commits are correctly identified.
- [ ] **Unit tests: WebSocket message serialization** — Verify channel multiplexing encodes/decodes correctly.
- [ ] **Integration test: File watcher -> WebSocket** — Create a file in `docs/current_work/specs/`, verify WebSocket receives update within 500ms.
- [ ] **Integration test: Session lifecycle** — POST to create session, verify WebSocket terminal channel activates, DELETE to kill, verify exit event received.

---

## 6. Success Criteria

- [ ] **SC1:** `npm i -g mission-control && mc ~/any-project` opens a browser dashboard within 2 seconds showing the project's SDLC kanban state.
- [ ] **SC2:** Creating a file `docs/current_work/specs/d99_test_spec.md` causes a card to appear in the Spec column within 1 second without page refresh.
- [ ] **SC3:** Clicking "Start Planning" on an Idea card opens a new terminal tab running `claude "/sdlc-planning"` with full interactive terminal support.
- [ ] **SC4:** Multiple Claude Code sessions run concurrently in separate tabs without interference.
- [ ] **SC5:** Closing and re-opening `mc` preserves session history. Past sessions are browsable and searchable.
- [ ] **SC6:** Running `mc` with no arguments shows a project picker listing previously used projects.
- [ ] **SC7:** The UI meets all of the following verifiable criteria: (a) custom color tokens applied (non-default Chakra values), (b) minimum 3 accent colors in active use, (c) at least 2 micro-interaction transitions with defined timing and easing, (d) custom font applied, (e) documented typography scale implemented. The overall effect avoids the monotone utilitarian aesthetic common in dev tools. Visual variety, rhythm, and personality are evident.
- [ ] **SC8:** The entire tool installs as a single `npm i -g` package with zero external service dependencies.
- [ ] **SC9:** Claude Code permission prompts (tool approval dialogs) render and respond correctly through the xterm.js terminal.
- [ ] **SC10:** The `.mc.json` configuration file can override column definitions and action mappings, and changes take effect on next server start.

---

## 7. Constraints

- **Node.js 20+** — required for ES module support and modern APIs.
- **macOS/Linux only** — `node-pty` has native compilation requirements. Windows support is not a goal for MVP.
- **`claude` CLI must be installed** — Mission Control wraps the Claude Code CLI; it does not bundle or replace it.
- **No cloud deployment** — the tool spawns shell processes and accesses the local filesystem. The security surface for remote deployment is unacceptable.
- **No authentication** — localhost-only by default. LAN/Tailscale access relies on network-level security, not application-level auth.
- **Read-only file access** — the server reads `docs/` for state and serves file content for preview. All writes happen through Claude Code sessions. The server never writes to the project directory.
- **Single package build** — Vite builds the UI, tsc compiles the server. Both outputs ship in one npm package. No monorepo, no separate packages.
- **Port 3002** — default port chosen to avoid conflicts with common dev server ports (3000, 3001, 8080).

---

## 8. Out of Scope

The following are explicitly excluded from D1 and deferred to later phases:

- **Dev server management (Phase 3)** — starting/stopping/monitoring development servers (`pnpm dev:web`, `pnpm start:api`), process cards, log viewer. The `.mc.json` `processes` config will be accepted and validated but not acted on.
- **Read-only source file viewer (Phase 3)** — syntax-highlighted source code viewer for non-markdown files. MVP preview is markdown-only for deliverable documents.
- **Rich output parsing (Phase 4)** — parsing Claude Code terminal output into structured UI elements (tool call cards, collapsible diffs, thinking block accordions). xterm.js renders raw output in MVP.
- **Approval workflows (Phase 4)** — "Approve Spec" button that writes to spec files. All writes go through Claude Code sessions in MVP.
- **Desktop notifications (Phase 4)** — system notifications for session completion, deliverable state changes, or server crashes.
- **Drag-and-drop kanban** — cards are not draggable. State is derived from files; manual card movement would conflict with filesystem-as-source-of-truth.
- **Code editing** — no in-browser code editing. All changes go through Claude Code sessions or external editors.
- **Authentication/authorization** — no login, no user accounts, no role-based access. Local tool.
- **Windows support** — `node-pty` native compilation on Windows is fragile. macOS and Linux only for MVP.

---

## 9. Open Questions / Unknowns

- [ ] **Unknown:** How reliably does `node-pty` handle Claude Code's interactive output across different terminal sizes and ANSI escape sequences?
  - **Risk:** Rendering artifacts, broken permission prompts, or garbled output in xterm.js that does not occur in a native terminal.
  - **Mitigation:** Build a minimal PTY-to-xterm.js prototype early (before full UI). Test with Claude Code's permission prompts, long output streams, and rapid output. If issues arise, investigate xterm.js addons (xterm-addon-unicode11, xterm-addon-ligatures) or alternative terminal emulators.

- [ ] **Unknown:** What is the correct `_index.md` parsing strategy? The catalog format may vary across projects or evolve.
  - **Risk:** Brittle parser that breaks on unexpected catalog formatting.
  - **Mitigation:** Design the catalog parser to be lenient — extract deliverable IDs via regex (`/[Dd]\d+[a-z]?/`), fall back to file-system-only state derivation if `_index.md` is missing or unparseable. Log warnings for unrecognized lines rather than failing.

- [ ] **Unknown:** How should terminal data be encoded over WebSocket for efficient transfer? Raw PTY output is bytes, but WebSocket JSON messages expect strings.
  - **Risk:** Encoding overhead, corrupted binary sequences, or high bandwidth usage on large output streams.
  - **Mitigation:** Use base64 encoding for terminal data within JSON envelopes. Alternatively, use a binary WebSocket message type for terminal channels and JSON for control channels. Benchmark both approaches during prototyping.

- [ ] **Unknown:** How large can session logs get for long-running Claude Code conversations, and what is the performance impact of persisting them?
  - **Risk:** Multi-hundred-megabyte logs from extended sessions consuming disk space and slowing the Session History browser.
  - **Mitigation:** Stream writes to log file (append-only, no buffering in memory). Cap individual session logs at 10MB with a warning. Index session metadata separately from log content so browsing the history list does not require reading log files.

- [ ] **Unknown:** How should the UI handle project switching when terminal sessions are running?
  - **Risk:** Switching projects while sessions are active could orphan processes or confuse the user about which project a session belongs to.
  - **Mitigation:** Sessions are scoped to projects. When switching, keep existing sessions running but visually separate them. Show a warning if switching away from a project with active sessions. Do not kill sessions on project switch.

- [ ] **Unknown:** What is the right Chakra UI theme configuration for a "fun, modern, engaging" aesthetic that has personality?
  - **Risk:** Generic-looking dashboard that feels like every other admin panel.
  - **Mitigation:** Allocate dedicated design time with ui-ux-designer agent. Use Chakra UI's theme extension to define custom color scales, border radii, shadows, and typography. Invest in visual variety and rhythm — accent colors, subtle gradients, micro-animations, considered spacing. Avoid the monotone trap common in dev tool dashboards. Review against SC7 ("developers find it appealing and enjoyable") before shipping.
