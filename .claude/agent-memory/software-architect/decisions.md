# Architectural Decisions Log

## 2026-03-17: D4 Terminal-First Mission Control Spec

**Decision:** Terminal-first pivot -- `mc` defaults to interactive Ink TUI board; web UI moves behind `--web` flag.

**Approach:** TUI layer (`src/tui/`) calls existing services directly (no HTTP). Ink (React-for-CLI) as TUI framework. One-shot commands (`status`, `view`, `adhoc`, `log`) print and exit. Interactive commands (`board`, `sessions`, `chronicle`) launch full-screen Ink apps. File watcher feeds TUI directly via callback. Separate build pipeline from web UI (tsc for TUI, Vite for web).

**Trade-off accepted:** Two React build targets (Ink renderer for TUI, React DOM for web) introduces build complexity. Separate tsconfig may be needed if JSX targets conflict.

**Key constraints:** No server process for terminal commands. No terminal-based Claude session management (users run `claude` in Zellij panes directly). Web UI unchanged behind `--web`. Single npm package ships both surfaces.

**Open risks:** ink-markdown GFM rendering quality, narrow terminal layout at 80 cols, ESM/CJS interop with Ink ecosystem packages. All have mitigations defined in spec.

## 2026-03-17: D4 Implementation Plan -- Key Planning Decisions

**Decision:** 7-phase plan with foundation-first sequencing. Phase 1 (Ink build pipeline) is isolated as highest-risk work. One-shot commands (Phase 3) and board TUI (Phase 4) can partially overlap since theme file is shared. `marked@16` with custom chalk renderer for one-shot markdown; `ink-markdown` evaluated in Phase 5 detail panel with fallback to same custom renderer.

**Approach:** Dynamic imports for TUI code (`await import('./tui/index.js')`) so Ink is never loaded in `--web` mode. Zone grouping logic extracted to `src/shared/zones.ts` (shared between TUI and web UI). React moved from devDeps to deps since Ink needs it at runtime.

**Trade-off accepted:** Shared zone filters couple the two UI layers at the predicate level. Acceptable because the predicates are pure functions with no renderer dependency.

**Agent assignments:** Phases 1-2 backend-developer (build config, CLI), Phases 3-7 frontend-developer (TUI components, Ink).

## 2026-03-17: D4 Plan Revision -- Review Findings Incorporated

**Decision:** Revised plan based on 21 review findings (4 critical, 17 major). Same 7-phase structure, same agent assignments.

**Key corrections:**
- Ink `^5.1.0` -> `^6.8.0` (Ink 6 is the React 19 release)
- `marked-terminal` removed entirely (peer dep conflict with `marked@16`); replaced by custom chalk-based renderer on `marked@16`
- Zone filter predicates moved from duplicated inline code to `src/shared/zones.ts` (shared module)
- Explicit alternate screen escape sequences added to Phase 4 (`\x1b[?1049h`/`\x1b[?1049l`) -- Ink does NOT handle this
- `process.exit(0)` replaced with `useApp().exit()` throughout for proper React unmount lifecycle
- `chalk@^5` added as direct dependency (pure ESM)
- `mc board` subcommand added
- Path traversal guard on `mc view`
- Virtual scroll per zone strip
- `console.warn` suppression for missing `docs/` in file watcher hook
- Empty state handling for first-run / no deliverables
- Migration notice (one-time "Tip: Web UI available via `mc --web`")
- `complexityToRarity` mapping made explicit (arch->mythic, not epic)
- `--dev` flag passthrough to server in `--web` mode

**Trade-off accepted:** Shared zone filters increase coupling between TUI and web UI layers. Accepted because it eliminates a known D3-era defect source (divergent filter logic).
