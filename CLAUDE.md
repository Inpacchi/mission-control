# CLAUDE.md — Mission Control

## Project Overview

Mission Control is a standalone global CLI tool (`mc`) that provides a web-based UI for managing SDLC workflows and interacting with Claude Code. It replaces the raw terminal as the primary interface for directing Claude Code agents, providing a visual dashboard for deliverable tracking.

**One command. One process. Works with any project.**

```bash
npm i -g mission-control
mc                           # opens project picker or last-used project
mc ~/Projects/sleeved        # opens directly to a specific project
```

## Architecture

- **Server:** Node.js 20+, Express 5, WebSocket (`ws`), `node-pty` for PTY-backed Claude CLI sessions, `chokidar` for file watching
- **UI:** React 19, Vite 6, xterm.js (terminal), Chakra UI (styling), Zustand (state), Lucide React (icons)
- **Port:** 3002 (default)
- **Config:** `.mc.json` in project root (columns, actions, managed processes)
- **Storage:** `~/.mc/` (session history, project registry)

```
Browser (localhost:3002)
  ├── HTTP: React SPA (kanban, file viewer, settings)
  ├── WebSocket: terminal sessions (xterm.js <-> claude process)
  └── WebSocket: file watcher (live kanban updates)
Local Node Server (single process)
  ├── Express: static UI + REST API
  ├── File Watcher: monitors docs/ for deliverable state
  ├── Terminal Manager: spawns claude via node-pty
  └── Dev Server Manager: managed dev processes
```

## Project Structure

```
mission-control/
  src/
    cli.ts                     # entry point, arg parsing
    server/
      index.ts                 # Express + WebSocket setup
      routes/                  # sdlc, sessions, processes, files
      services/                # sdlcParser, catalogParser, fileWatcher, terminalManager, processManager, gitParser
    ui/
      main.tsx
      App.tsx
      components/
        layout/                # Dashboard, StatsBar
        kanban/                # KanbanBoard, KanbanColumn, DeliverableCard, SkillActions
        terminal/              # TerminalTabs, TerminalPanel, SessionControls
        preview/               # MarkdownPreview, FileViewer
        processes/             # ProcessCards, LogViewer
      hooks/                   # useWebSocket, useSdlcState, useTerminalSession
      stores/                  # dashboardStore
      types/                   # deliverable, session, config
```

## Key Design Decisions

- Spawns real `claude` binary (not API) to inherit full Claude Code environment (CLAUDE.md, .claude/, permissions, MCP)
- Local-only by default (127.0.0.1); remote access via Tailscale/LAN binding
- PTY-backed terminals via `node-pty` for full ANSI/interactive prompt support
- Data-driven config (`.mc.json`) — column definitions and skill mappings are JSON, not code
- No cloud deployment — security surface too large for remote code execution

---

## SDLC Process

This project follows a lightweight SDLC framework. Reference material lives in `ops/sdlc/`.

The SDLC defines what artifacts a deliverable requires; two skills define how CC produces them:
- `sdlc-plan` — spec + plan (domain agents write and review)
- `sdlc-execute` — implement + review + commit (domain agents execute and review)

### Roles
- **CD (Claude Director):** Human — sets direction, approves specs, makes product decisions
- **CC (Claude Code):** The entire agent system — specs, plans, implements, reviews via domain-agent-driven skills

### Deliverable Workflow
Idea → Spec (CD approves) → Plan (reviewed) → Execute → Review → Result → Chronicle

CC produces SDLC artifacts across two skills:
- **Spec** → `docs/current_work/specs/dNN_name_spec.md` (planning skill, CD must approve)
- **Plan** → `docs/current_work/planning/dNN_name_plan.md` (planning skill, agents review)
- **Result** → `docs/current_work/results/dNN_name_result.md` (execution skill, domain agents review)
- **Complete** → renamed to `dNN_name_COMPLETE.md`, archived to `docs/chronicle/`

### Deliverable Tracking
- **IDs:** Sequential: D1, D2, ... Dnn (never reused). Sub-deliverables use letter suffixes: D1a, D1b.
- **Assign an ID** when work is expected to touch more than one file or take more than 30 minutes.
- **Catalog:** `docs/_index.md`
- **Active work:** `docs/current_work/`
- **Archived work:** `docs/chronicle/`

### File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Spec | `dNN_name_spec.md` | `d1_auth_spec.md` |
| Plan | `dNN_name_plan.md` | `d1_auth_plan.md` |
| Result | `dNN_name_result.md` | `d1_auth_result.md` |
| Complete | `dNN_name_COMPLETE.md` | `d1_auth_COMPLETE.md` |
| Blocked | `dNN_name_BLOCKED.md` | `d1_auth_BLOCKED.md` |

### When to Use Full Process vs. SDLC-Lite vs. Direct Dispatch
- **Full SDLC (deliverable ID + skill):** New features, architectural changes, new integrations, new subsystems
- **SDLC-Lite:** Complex enough to benefit from a reviewed plan, but doesn't need full tracking
- **Direct dispatch:** CD steers in real-time — agents do the work, no plan file needed
- **Before touching any file:** If you identify non-trivial complexity (cross-domain, non-obvious approach, new subsystems), surface the scope and ask CD which tier to use.

### Workflow Rules

**STOP and invoke `sdlc-plan` when ANY of the following is true:**

- The user asks to build a new feature, new integration, or new subsystem
- The work introduces new architectural patterns
- You are unsure whether something needs full tracking — default to asking, not implementing

**STOP and invoke `sdlc-lite-plan` when:**

- The work is complex enough to benefit from agent review of a plan before execution
- The work will likely span a context clear
- Multiple interacting changes where getting the approach wrong is costly

**Invoke `sdlc-execute` / `sdlc-lite-execute` only when:**
- An approved plan exists at the expected path
- The user explicitly says "execute the plan" or references a specific plan file

**You MUST use domain agents (not do the work yourself) when:**
- The task falls within a domain agent's expertise
- You are writing specs, plans, or reviewing code — dispatch the relevant agents
- The agent with domain expertise writes and reviews. You orchestrate.

**When starting any session:** Check `docs/current_work/` for in-progress deliverables before accepting new work.

### The Failure Pattern (What Not To Do)

This is the exact sequence that bypasses SDLC tracking incorrectly:

1. User mentions improvements to a page or feature
2. Claude Code explores the codebase and reads relevant files
3. Claude Code identifies 4-6 files that need to change, new components needed, store interactions required
4. **Claude Code begins writing code itself instead of dispatching agents**
5. User has to interrupt: "should we make a plan?" or "use the agents"

Step 4 is wrong. After step 3, the correct action is to surface the scope assessment and ask which tier to use — or if the user is already steering, state scope and start dispatching agents.

### Compliance Auditing
Run `"Let's run an SDLC compliance audit"` periodically (~every 2-4 weeks or at each version bump). See `ops/sdlc/process/compliance_audit.md`.

### SDLC Commands

| Command | Action |
|---------|--------|
| "Let's catalog our ad hoc work" | Invokes the `sdlc-reconciliation` skill — reconciles untracked ad hoc commits back into the deliverable catalog |
| "Let's organize the chronicles" | Archive completed deliverables from `current_work/` to `chronicle/`. See `ops/sdlc/process/chronicle_organization.md` |
| "Let's run an SDLC compliance audit" | Audit spec coverage, chronicle freshness, index completeness. See `ops/sdlc/process/compliance_audit.md` |
| "Let's update the SDLC" | Propose process improvement. See `ops/sdlc/process/sdlc_changelog.md` |

### Key References
- `ops/sdlc/process/overview.md` — Full workflow
- `ops/sdlc/templates/` — Document templates (spec, plan, result, concept index)
- `docs/_index.md` — Deliverable catalog

---

## Code Verification Rule

**Never assert how specific code behaves without reading it first.**

This applies to: flag names, function signatures, sync logic, config values, pipeline flow — anything implementation-specific.

The correct workflow is:

```
Read/Search → Reason → Assert
```

Not:

```
Assert (plausible) → Search to confirm → Correct when challenged
```

If you haven't read the relevant file, say so: *"Let me check"* — then check.

---

## Debugging Escalation Rule

If you have spent 3 or more rounds of read/search/grep investigating a bug without identifying the root cause, stop self-investigating and dispatch `debug-specialist` with your findings so far. Pass what you've ruled out, the open hypotheses, and the relevant file paths. Do not continue accumulating context yourself — that context belongs in the agent's dispatch prompt.

---

## Agent Conventions

- **Agent memories committed with code** — domain agent memory files (`.claude/agent-memory/`) are committed alongside the code changes they relate to. Update stale memories when fixes resolve documented issues.
- **Agent frontmatter: single-line descriptions only** — The `description` field in `.claude/agents/*.md` must be a single-line YAML string using `\n` for newlines. Multi-line quoted strings silently break Claude Code's frontmatter parser.

---

## Recommended Claude Code Settings

Add these to your project's `.claude/settings.json` (create if it doesn't exist):

```json
{
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git add*)",
      "Bash(git commit*)"
    ]
  }
}
```

**Optional additions** (tailor to your project's build tooling):

```json
{
  "permissions": {
    "allow": [
      "Bash(npm install)",
      "Bash(npm run build*)",
      "Bash(npm test*)",
      "Bash(npx playwright test*)"
    ]
  }
}
```

See [Claude Code settings documentation](https://docs.anthropic.com/en/docs/claude-code/settings) for the full settings reference.
