---
tier: full
type: feature
complexity: arch
effort: 5
flavor: "The battlefield moved to the terminal. No browser required."
created: 2026-03-17
completed: 2026-03-17
author: CC
---

# D4: Terminal-First Mission Control -- Result

**Spec:** `d4_terminal_first_mission_control_spec.md`

---

## Summary

Transformed Mission Control from a browser-required tool to a terminal-native CLI. The default `mc` command now launches an interactive Ink TUI board with TCG zone layout. One-shot commands (`mc status`, `mc view`, `mc adhoc`, `mc log`) call services directly and print to stdout. Interactive browsers (`mc sessions`, `mc chronicle`) provide navigable list views. The web UI is available via `mc --web`, preserving exact pre-D4 behavior.

## What Was Built

### Phase 1: Ink Build Pipeline
- Added Ink 6, chalk 5, marked 16 as dependencies
- Moved React from devDeps to deps for Ink runtime
- Expanded tsconfig.server.json to compile src/tui/
- Resolved noEmit inheritance issue from base tsconfig

### Phase 2: CLI Restructuring
- Rewrote src/cli.ts with Commander subcommands
- `mc` (bare) launches TUI board, `mc --web` starts server
- Dynamic imports keep Ink out of --web path
- One-time migration notice on first TUI launch

### Phase 3: One-Shot Commands + TCG ANSI Theme
- `mc status` — zone summary with colored labels, pipe-safe
- `mc view <id>` — markdown rendering with custom marked v16 renderer, path traversal guard
- `mc adhoc` — untracked commit list
- `mc log [id]` — session log viewer
- TCG theme with rarity colors, zone colors, unicode card-type icons

### Phase 4: Board TUI
- Four-zone horizontal layout (Deck, Active, Review, Graveyard)
- Responsive: full (120+), collapsed badges (80-120), vertical stack (60-80), too-narrow guard (<60)
- Keyboard navigation between zones and cards with virtual scroll
- Shared zone filters extracted to src/shared/zones.ts (used by both TUI and web UI)
- Alternate screen buffer with explicit escape sequences
- initialDeliverables pre-loaded to prevent empty-zone flash

### Phase 5: Live Updates + Detail Panel
- File watcher hook (useFileWatcher) wrapping chokidar for live board updates
- Detail panel with markdown content, scroll support, loading/error states
- Mermaid blocks replaced with placeholder text
- Guards against console.warn corruption from missing docs/

### Phase 6: Interactive Browsers
- `mc sessions` — scrollable session list with log detail view
- `mc chronicle` — archived deliverable browser with document view
- TTY guard and alternate screen on both entry points

### Phase 7: Polish
- Terminal resize handling via process.stdout resize listener
- SIGTERM handler on all interactive entry points (process.once)
- Cursor visibility restored on all exit paths
- Terminal capability detection utilities

## Files Created

```
src/shared/zones.ts
src/tui/App.tsx
src/tui/index.ts
src/tui/theme.ts
src/tui/formatters.ts
src/tui/BoardApp.tsx
src/tui/SessionBrowser.tsx
src/tui/ChronicleList.tsx
src/tui/components/ZoneStrip.tsx
src/tui/components/DeliverableCard.tsx
src/tui/components/StatusBar.tsx
src/tui/components/HelpBar.tsx
src/tui/components/DetailPanel.tsx
src/tui/hooks/useKeyboard.ts
src/tui/hooks/useDeliverables.ts
src/tui/hooks/useFileWatcher.ts
src/tui/commands/status.ts
src/tui/commands/view.ts
src/tui/commands/adhoc.ts
src/tui/commands/log.ts
src/tui/commands/sessions.tsx
src/tui/commands/chronicle.tsx
src/tui/utils/terminal.ts
```

## Files Modified

```
src/cli.ts (rewrite)
src/ui/components/warTable/TacticalField.tsx (shared zone filters)
package.json (new dependencies)
tsconfig.server.json (include src/tui/, noEmit override)
```

## Worker Agent Reviews

Key feedback incorporated:

- [frontend-developer] ZoneStrip virtual scroll used useMemo which couldn't track previous state -- replaced with centering formula that handles both up and down navigation
- [frontend-developer] DetailPanel scroll offset grew unbounded past document end -- added end-of-document indicator and page number clamping
- [frontend-developer] SessionBrowser and ChronicleList had no error handling on async data fetches -- added .catch() handlers to prevent stuck loading spinners
- [frontend-developer] BoardApp selectedZone not reset when terminal resizes from full to collapsed layout -- added useEffect to snap selection to navigable zone
- [frontend-developer] HelpOverlay pushed content below instead of replacing it (Ink has no absolute positioning) -- early-return pattern replaces zone layout when help is shown
- [code-reviewer] process.on('SIGTERM') would accumulate listeners on repeated calls -- changed to process.once across all three interactive entry points
- [code-reviewer] Dead launch() function in index.ts never called -- removed, keeping only launchBoard()
- [code-reviewer] Scroll offset state in SessionBrowser, ChronicleList, and useKeyboard grew unbounded -- clamped at content length or practical cap
- [backend-developer] Confirmed all service imports correct (sessionStore not terminalManager), path traversal guard functional, ESM import conventions followed

## Verification

- [x] `mc` launches interactive board
- [x] `mc --web` works identically to pre-D4 behavior
- [x] `mc status | cat` produces no ANSI codes (setupChalk disables color when not TTY)
- [x] Live file updates appear via chokidar watcher
- [x] Both builds pass: npm run build:server, npm run build:ui
