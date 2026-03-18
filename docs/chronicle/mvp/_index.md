# Concept Chronicle: MVP

The foundational build-out of Mission Control -- from initial web-based MVP through tech debt cleanup, TCG card design system, and the terminal-first pivot.

## Deliverables

| ID | Name | Type | Complexity | Summary |
|----|------|------|------------|---------|
| D1 | Mission Control MVP | Architecture | Moonshot | Web-based dashboard with kanban board, PTY terminal sessions, file viewer, and SDLC workflow management |
| D2 | Tech Debt Cleanup | Refactor | Moderate | Resolved 12 categories of tech debt from D1: theme adoption, deduplication, async I/O, CORS, type drift |
| D3 | TCG Card Design System | Feature | Complex | Trading card game visual metaphor for deliverable cards with rarity treatments, type bars, and war table layout |
| D4 | Terminal-First Mission Control | Feature | Architecture | Pivoted MC to terminal-native TUI as default experience; web UI becomes opt-in `--web` mode |

## Key Decisions

- **PTY over API:** Spawns real `claude` binary via node-pty to inherit full Claude Code environment
- **Local-only:** No cloud deployment; security surface too large for remote code execution
- **Data-driven config:** `.mc.json` drives column definitions and skill mappings (JSON, not code)
- **Terminal-first:** Default experience is CLI/TUI in Ghostty + Zellij; browser is secondary
- **TCG metaphor:** Deliverable cards encode type, complexity, effort, and flavor visually

## Files

### Specs
- `specs/d1_mission_control_mvp_spec.md`
- `specs/d2_tech_debt_cleanup_spec.md`
- `specs/d3_tcg_card_design_system_spec.md`
- `specs/d4_terminal_first_mission_control_spec.md`

### Plans
- `planning/d1_mission_control_mvp_plan.md`
- `planning/d2_tech_debt_cleanup_plan.md`
- `planning/d3_tcg_card_design_system_plan.md`
- `planning/d4_terminal_first_mission_control_plan.md`

### Results
- `results/d1_mission_control_mvp_result.md`
- `results/d2_tech_debt_cleanup_result.md`
- `results/d3_tcg_card_design_system_result.md`
- `results/d4_terminal_first_mission_control_result.md`
