# Mission Control — Design Document

> **Superseded:** This document was the initial design exploration created before the SDLC was bootstrapped. The authoritative spec is `docs/current_work/specs/d1_mission_control_mvp_spec.md` and the design direction is `docs/current_work/design/d1_design_direction.md`. This file is retained for historical context.

## What Is This

A standalone global CLI tool that provides a web-based UI for managing SDLC workflows and interacting with Claude Code. It replaces the raw terminal as the primary interface for directing Claude Code agents, while providing a visual dashboard for deliverable tracking.

**One command. One process. Works with any project.**

```bash
npm i -g mission-control    # install once
mc                           # opens project picker or last-used project
mc ~/Projects/sleeved        # opens directly to a specific project
```

## Problem Statement

The current workflow for directing Claude Code agents is:

1. Open multiple terminal tabs/windows
2. Manually type SDLC skill commands from memory
3. Switch between terminals to monitor parallel agent work
4. Open WebStorm to view docs, debug, or inspect code
5. Mentally track deliverable status across files in `docs/current_work/`

This works, but it's fragmented. There is no single pane of glass for the CD (Claude Director) role — no visual overview of project state, no streamlined way to dispatch skills, and no pretty interface for interacting with Claude Code sessions.

## Requirements

### Hard Requirements

1. **Single process** — `mc` starts one local server, no sidecar processes
2. **Project-agnostic** — works with any directory, not coupled to any codebase
3. **Full Claude Code fidelity** — spawns the real `claude` binary, inherits CLAUDE.md, `.claude/` (agents, skills, commands, hooks, MCP servers), environment variables, tool permissions
4. **Interactive terminal** — xterm.js rendering of Claude Code sessions, including permission prompts
5. **No cloud dependency** — runs entirely on localhost; remote access via Tailscale/LAN, not a deployed service
6. **React/TypeScript stack** — same technologies as existing projects, no Kotlin/Java

### Soft Requirements

- Accessible from other devices on the network (phone, iPad) via Tailscale or LAN binding
- Minimal install footprint — single global npm package
- Fast startup — dashboard visible in under 2 seconds

## Architecture

```
Browser (localhost:3002 or Tailscale)
    |
    ├── HTTP: React SPA (kanban, file viewer, settings)
    ├── WebSocket: terminal sessions (xterm.js ↔ claude process)
    └── WebSocket: file watcher (live kanban updates)
         |
Local Node Server (single process)
    |
    ├── Express: serves static UI + REST API for SDLC state
    ├── WebSocket: multiplexed channels (terminals + file events)
    ├── File Watcher: monitors docs/ for deliverable state changes
    ├── Terminal Manager: spawns/manages claude child processes
    └── Dev Server Manager: spawns/manages dev processes (api, web, etc.)
         |
Filesystem (cwd)
    |
    ├── docs/_index.md          → deliverable catalog
    ├── docs/current_work/      → active specs, plans, results
    ├── docs/chronicle/         → archived deliverables
    ├── CLAUDE.md               → project instructions
    └── .claude/                → agents, skills, hooks, MCP
```

### Key Design Decisions

**Why not a JetBrains plugin?**
The CD workflow is terminal-centric, not IDE-centric. A plugin would only be available when WebStorm is open, requires Kotlin/Java (different stack), and can't be used with other projects without installing per-IDE.

**Why not baked into `packages/api`?**
Couples dev tooling to a specific project. Can't use with other projects. Forces the API server to run even when you only want the dashboard.

**Why not deployed to the cloud?**
Requires exposing remote code execution on a dev machine to the internet. The security surface is too large (filesystem access, API keys, shell execution). Tailscale provides remote access without these risks.

**Why spawn `claude` binary instead of using the API directly?**
Spawning the real CLI inherits the full Claude Code environment: CLAUDE.md, .claude/ directory (skills, agents, hooks, MCP servers), permission settings, project context. Calling the API directly would require reimplementing all of that.

## Features

### Phase 1 — MVP

The minimum viable product that replaces the terminal workflow.

#### 1.1 SDLC Kanban Board

Visual representation of deliverable status, derived from the filesystem.

**Data sources:**
- `docs/_index.md` — deliverable catalog (IDs, names, status)
- `docs/current_work/specs/` — spec files existence and content
- `docs/current_work/planning/` — plan files existence and content
- `docs/current_work/results/` — result files existence and content
- File suffixes: `_COMPLETE.md`, `_BLOCKED.md`

**Columns:**
| Column | Derived From |
|--------|-------------|
| Idea | Catalog entry exists, no spec file |
| Spec | `dNN_name_spec.md` exists in specs/ |
| Plan | `dNN_name_plan.md` exists in planning/ |
| In Progress | Plan exists, no result file, no COMPLETE/BLOCKED suffix |
| Review | `dNN_name_result.md` exists in results/ |
| Complete | File has `_COMPLETE.md` suffix or exists in `docs/chronicle/` |
| Blocked | File has `_BLOCKED.md` suffix |

**Card contents:**
- Deliverable ID (D1, D2, etc.)
- Name/title
- Current state badge
- Last modified timestamp
- Click to open inline preview

**Live updates:**
File watcher detects changes in `docs/` and pushes updates over WebSocket. Cards move between columns automatically when files are created, renamed, or moved.

#### 1.2 Claude Code Terminal Sessions

Interactive terminal panels for Claude Code conversations.

**Implementation:**
- xterm.js terminal emulator in the browser
- Server spawns `claude` via `child_process.spawn` in the project's cwd
- stdin/stdout/stderr piped over WebSocket to xterm.js
- Full ANSI color, cursor movement, interactive prompts supported
- Permission approval prompts work natively (it's a real terminal)

**Session management:**
- Start new session: blank `claude` prompt or with a pre-filled command
- Multiple concurrent sessions displayed as tabs
- Session output preserved while switching tabs
- Close session: sends SIGTERM to claude process

**Environment inheritance:**
The spawned claude process inherits:
- Working directory (the project root where `mc` was started)
- All environment variables from the user's shell
- Access to CLAUDE.md, .claude/, docs/ — everything

#### 1.3 SDLC Skill Dispatch

Buttons that start Claude Code sessions with pre-filled skill commands.

**Global actions (always visible):**
| Button | Command Dispatched |
|--------|-------------------|
| New Deliverable | `claude "/sdlc-plan"` |
| SDLC Status | `claude "/sdlc-status"` |
| Reconcile Ad Hoc | `claude "/sdlc-reconciliation"` |
| Compliance Audit | `claude "Let's run an SDLC compliance audit"` |
| SDLC-Lite Plan | `claude "/sdlc-lite-plan"` |

**Per-deliverable actions (on each kanban card):**
| Deliverable State | Action | Command |
|-------------------|--------|---------|
| Idea | Start Planning | `claude "/sdlc-plan"` |
| Spec exists | Review Spec | Opens inline preview |
| Plan exists | Execute Plan | `claude "/sdlc-execute"` |
| In Progress | Resume Work | `claude "/sdlc-resume D{N}"` |
| Any | Review Code | `claude "/commit-review"` |
| Any | Create Tests | `claude "/create-test-suite"` |
| Result exists | Archive | `claude "/sdlc-archive"` |

Each action opens a new terminal session tab with the command pre-filled and executing.

#### 1.4 Catalog Stats Bar

Top-of-dashboard summary:

```
12 total | 3 in progress | 1 blocked | 8 complete | 2 ad hoc untracked
```

Parsed from `docs/_index.md` and file states.

### Phase 2 — Enhanced Visibility

#### 2.1 Inline Markdown Preview

Click a deliverable card to see the spec/plan/result rendered as HTML in a side panel. No need to open the file in an editor.

- Renders GitHub-flavored markdown
- Syntax highlighting for code blocks
- Mermaid diagram support (used in specs)
- Read-only — editing happens through Claude Code sessions

#### 2.2 Deliverable Timeline

Each card expands to show progression with timestamps:

```
D14: Livekit Rooms
  Spec created      Mar 10  14:23
  CD approved       Mar 11  09:15
  Plan created      Mar 11  10:02
  Plan reviewed     Mar 11  10:45
  Execution start   Mar 12  08:30
  ██████░░░░        In Progress
```

Timestamps derived from file creation/modification times.

#### 2.3 Chronicle Browser

Collapsible section below the kanban board showing archived deliverables from `docs/chronicle/`. Searchable by name, ID, or content.

#### 2.4 Ad Hoc Work Tracker

Parses recent git commits that lack a `d<N>:` prefix. Displays as a separate lane or section, with a "Reconcile" button that triggers `/sdlc-reconciliation`.

```bash
# Detected untracked commits:
  fix(api): allow Vercel preview URLs        3 days ago
  docs: add Firestore backup reference       3 days ago
  [Reconcile All]
```

#### 2.5 Session History

Previously closed Claude Code sessions are saved (output log) and browsable. Useful for reviewing what an agent did in a prior session.

### Phase 3 — Dev Server Management

#### 3.1 Managed Dev Processes

Start/stop/monitor development servers from the dashboard.

**Configurable per-project** via a `.mc.json` or similar config in the project root:

```json
{
  "processes": {
    "api": { "command": "pnpm start:api", "port": 8080 },
    "web": { "command": "pnpm dev:web", "port": 3000 },
    "overlay": { "command": "pnpm dev:overlay", "port": 3001 }
  }
}
```

**UI:**
- Process cards showing status (running/stopped), uptime, port
- Start/stop/restart buttons
- Log output in dedicated tabs (same xterm.js rendering)
- Auto-detect port conflicts

#### 3.2 Log Viewer

Dedicated panel for tailing dev server output. Supports:
- Multiple log streams as tabs
- Search/filter within logs
- Auto-scroll with pause-on-scroll-up
- Error highlighting

#### 3.3 Read-Only File Viewer

View source files with syntax highlighting without leaving the dashboard. Not a code editor — just for quick inspection when a Claude Code agent references a file.

- Triggered from Claude Code output (click a file path to view it)
- Syntax highlighting via highlight.js or Shiki
- Line numbers
- Read-only

### Phase 4 — Advanced (Future)

#### 4.1 Rich Output Parsing

Parse Claude Code's terminal output to render structured UI elements:
- Tool calls as collapsible cards
- File diffs with syntax highlighting
- Thinking blocks as collapsible sections
- Progress indicators for long operations

This is complex and depends on Claude Code's output format stability. Phase 4 because xterm.js works well enough in the meantime.

#### 4.2 Approval Workflows

"Approve Spec" button on deliverable cards that appends a `## CD Approval` section with timestamp to the spec file. Agents check for this before proceeding to planning.

#### 4.3 Multi-Project Support

Manage multiple project directories from a single dashboard instance. Switch between projects or view all in a unified kanban.

#### 4.4 Notifications

Desktop notifications when:
- A Claude Code session completes or needs input
- A deliverable changes state (new spec ready for review)
- A dev server crashes

## Technical Details

### CLI

```bash
mc                    # start dashboard for cwd, open browser
mc --port 3002        # custom port (default: 3002)
mc --no-open          # don't auto-open browser
mc --bind 0.0.0.0     # bind to all interfaces (LAN/Tailscale access)
mc ~/Projects/other   # specify project directory
```

### Server

- **Runtime:** Node.js 20+
- **Framework:** Express 5 (static serving + REST API)
- **WebSocket:** ws (same as packages/api uses)
- **File watching:** chokidar (watches `docs/` recursively)
- **Process management:** Node `child_process.spawn` with pty support via `node-pty`
- **Port:** 3002 (avoids conflict with web:3000, overlay:3001, api:8080)

### REST API

```
GET  /api/sdlc/deliverables     # kanban state (parsed from docs/)
GET  /api/sdlc/catalog          # raw _index.md parsed to JSON
GET  /api/sdlc/deliverable/:id  # single deliverable detail + timeline
GET  /api/sdlc/stats            # catalog summary stats
GET  /api/sdlc/untracked        # git commits without d<N>: prefix
GET  /api/files/*               # read-only file content (Phase 3)
GET  /api/config                # project config (.mc.json)
POST /api/sessions              # start new claude session
GET  /api/sessions              # list active sessions
DELETE /api/sessions/:id        # kill a session
POST /api/processes/:name/start # start a managed dev process (Phase 3)
POST /api/processes/:name/stop  # stop a managed dev process (Phase 3)
```

### WebSocket Channels

Multiplexed over a single WebSocket connection using channel prefixes:

```
terminal:{sessionId}   # bidirectional: xterm.js ↔ claude process
watcher:sdlc           # server → client: kanban state updates
watcher:logs           # server → client: dev server log streams (Phase 3)
```

### UI Stack

- **Framework:** React 19
- **Bundler:** Vite 6
- **Terminal:** xterm.js + xterm-addon-fit + xterm-addon-web-links
- **Markdown:** react-markdown + remark-gfm + rehype-highlight
- **Styling:** TBD — Tailwind CSS (simple, no runtime) or Chakra UI (familiar from Sleeved)
- **State:** Zustand (familiar from Sleeved)
- **Icons:** Lucide React (familiar from Sleeved)

### PTY vs Raw Spawn

Claude Code is an interactive terminal application with rich output (colors, cursor movement, interactive prompts). A raw `child_process.spawn` won't handle this correctly — we need a pseudo-terminal.

**Solution:** `node-pty` provides PTY support on macOS/Linux. The server spawns claude in a PTY, which gives it a proper terminal environment. The PTY output (including ANSI escape codes) pipes directly to xterm.js, which renders it correctly.

```
Browser                    Server                     System
xterm.js  ←—WebSocket—→  node-pty  ←—PTY—→  claude CLI
```

### Project Detection

On startup, the server checks for project markers in cwd:
- `CLAUDE.md` — Claude Code project
- `docs/_index.md` — SDLC-tracked project
- `.claude/` — Claude Code config directory
- `.mc.json` — Mission Control config

The kanban board only renders if SDLC markers are found. The terminal sessions work regardless — any directory with Claude Code support works.

### Security Considerations

- **Local-only by default** — binds to `127.0.0.1`, not `0.0.0.0`
- **No authentication** — unnecessary for localhost; LAN/Tailscale access relies on network-level security
- **No cloud deployment** — by design; remote access via Tailscale only
- **Process isolation** — each claude session is a separate child process; killing a session sends SIGTERM
- **No arbitrary command execution** — the only binary spawned is `claude`; dev server commands come from `.mc.json` config checked into the repo
- **File access** — read-only file viewer only; all writes happen through Claude Code sessions

## Project Structure

```
mission-control/
  package.json
  tsconfig.json
  vite.config.ts              # builds the UI
  src/
    cli.ts                     # entry point, arg parsing, starts server
    server/
      index.ts                 # Express + WebSocket setup
      routes/
        sdlc.ts                # SDLC state API
        sessions.ts            # terminal session management
        processes.ts           # dev server management (Phase 3)
        files.ts               # read-only file access (Phase 3)
      services/
        sdlcParser.ts          # reads docs/, parses deliverable state
        catalogParser.ts       # parses _index.md
        fileWatcher.ts         # chokidar watcher, emits events
        terminalManager.ts     # spawns/manages claude processes via node-pty
        processManager.ts      # spawns/manages dev servers (Phase 3)
        gitParser.ts           # parses recent commits for untracked work
    ui/
      index.html
      main.tsx
      App.tsx
      components/
        layout/
          Dashboard.tsx         # main layout: sidebar + content area
          StatsBar.tsx          # catalog summary stats
        kanban/
          KanbanBoard.tsx       # column layout, drag (future), click actions
          KanbanColumn.tsx      # single column with cards
          DeliverableCard.tsx   # card with status, actions, timestamps
          SkillActions.tsx      # action buttons per deliverable state
        terminal/
          TerminalTabs.tsx      # tab bar for multiple sessions
          TerminalPanel.tsx     # xterm.js wrapper
          SessionControls.tsx   # new session, kill session
        preview/
          MarkdownPreview.tsx   # inline markdown rendering (Phase 2)
          FileViewer.tsx        # syntax-highlighted file viewer (Phase 3)
        processes/
          ProcessCards.tsx      # dev server status cards (Phase 3)
          LogViewer.tsx         # log output panel (Phase 3)
      hooks/
        useWebSocket.ts         # WebSocket connection + channel multiplexing
        useSdlcState.ts         # kanban state from WebSocket
        useTerminalSession.ts   # terminal session lifecycle
      stores/
        dashboardStore.ts       # UI state (active tab, selected card, etc.)
      types/
        deliverable.ts          # deliverable, catalog, timeline types
        session.ts              # terminal session types
        config.ts               # .mc.json config types
```

## What This Replaces

| Before | After |
|--------|-------|
| Multiple terminal tabs for claude sessions | Tabbed terminal panels in one UI |
| Mentally tracking deliverable status | Visual kanban board, live-updating |
| Typing SDLC skill commands from memory | Click-to-dispatch buttons |
| Opening WebStorm to read specs/plans | Inline markdown preview |
| `git log` to find untracked work | Ad hoc work tracker with reconcile button |
| Switching between terminals to check agent progress | All sessions visible in tabs |
| Running dev servers in separate terminals | Managed processes with log viewing (Phase 3) |

## What This Does NOT Replace

- **WebStorm/IDE** — still needed for breakpoint debugging, code navigation, refactoring
- **Git CLI** — commits, branches, PRs still managed through terminal or IDE
- **Claude Code itself** — this tool wraps it, not replaces it; the full CLI is always available

## Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Package name | `mission-control`, CLI command `mc` | Clean, short, project-agnostic |
| Config format | `.mc.json` | Simple, no compilation needed |
| Styling | Chakra UI | Familiar from Sleeved, faster to build |
| Session persistence | Last 30 days, saved globally at `~/.mc/sessions/` | Review past agent work across projects |
| Multi-project | Yes, designed from the start | Project selector/switcher, per-project kanban and sessions |
| Extensibility | No plugin system — data-driven config | Opinionated to the SDLC process, but column definitions and action mappings live in `.mc.json` so the process can evolve without code changes |

### Multi-Project Design

- `mc` with no args opens a project picker showing recently used projects
- `mc <path>` opens directly to that project
- Project registry stored at `~/.mc/projects.json` (auto-populated on first use)
- Each project gets its own kanban state, sessions, and config
- UI has a project switcher in the sidebar/header
- Session history stored at `~/.mc/sessions/{project-slug}/`

### Session Persistence

- Terminal output saved as log files on session close (or crash)
- Storage: `~/.mc/sessions/{project-slug}/{timestamp}_{session-name}.log`
- Auto-prune: sessions older than 30 days deleted on startup
- Session History panel in UI shows past sessions, searchable by date and content

### Data-Driven Config

The `.mc.json` in a project root can override default column definitions and actions, so the SDLC process can evolve without code changes:

```json
{
  "columns": [
    { "id": "idea", "label": "Idea", "match": { "hasSpec": false } },
    { "id": "spec", "label": "Spec", "match": { "hasSpec": true, "hasPlan": false } },
    { "id": "plan", "label": "Plan", "match": { "hasPlan": true, "hasResult": false, "isBlocked": false } },
    { "id": "in-progress", "label": "In Progress", "match": { "hasPlan": true, "hasResult": false } },
    { "id": "review", "label": "Review", "match": { "hasResult": true, "isComplete": false } },
    { "id": "complete", "label": "Complete", "match": { "isComplete": true } },
    { "id": "blocked", "label": "Blocked", "match": { "isBlocked": true } }
  ],
  "actions": {
    "idea": [{ "label": "Start Planning", "command": "/sdlc-plan" }],
    "plan": [{ "label": "Execute Plan", "command": "/sdlc-execute" }],
    "in-progress": [{ "label": "Resume", "command": "/sdlc-resume D{id}" }],
    "review": [{ "label": "Archive", "command": "/sdlc-archive" }]
  },
  "processes": {
    "api": { "command": "pnpm start:api", "port": 8080 },
    "web": { "command": "pnpm dev:web", "port": 3000 }
  }
}
```

This means if you add a new SDLC phase, rename columns, or change which skills map to which states, you edit JSON — not source code.
