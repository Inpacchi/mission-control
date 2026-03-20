---
tier: full
type: feature
complexity: arch
effort: 5
flavor: "Ink, Zustand, six commands — the TUI takes shape."
created: 2026-03-17
author: CC
agents: [software-architect, frontend-developer]
---

# D4: Terminal-First Mission Control -- Implementation Plan

**Spec:** `d4_terminal_first_mission_control_spec.md`

---

## Overview

Transform Mission Control from a browser-required tool to a terminal-native CLI. The default `mc` command launches an interactive Ink TUI board with TCG zone layout. One-shot commands (`status`, `view`, `adhoc`, `log`) call services directly, print, and exit. The web UI moves behind `mc --web`. The existing service layer is reused without modification -- TUI components call `parseDeliverables()`, `listSessions()`, `getUntrackedCommits()`, etc. directly.

**Import disambiguation:** There are two `listSessions` functions in the codebase. TUI code must always use `import { listSessions, getSessionLog } from '../../server/services/sessionStore.js'` -- this returns persisted session log entries for a given project path. Do NOT use `terminalManager.listSessions()` -- that returns in-memory active PTY sessions (web-only, always empty in TUI mode).

**Scope note:** This deliverable is intentionally read-only. The TUI displays state but does not dispatch agents or modify deliverables. Read-only is a conscious Phase 1 decision, not a permanent product posture. The next capability boundary is dispatch-from-TUI (e.g., `mc dispatch D7 "execute the plan"`).

---

## Component Impact

| Component / Package | Changes |
|--------------------|---------|
| `src/cli.ts` | Major rewrite: Commander subcommands, `--web` flag gates server path, default action becomes TUI board |
| `src/tui/` (new) | Entire new directory: Ink components, hooks, theme, formatters |
| `src/shared/zones.ts` (new) | Zone-membership filter functions shared between TUI and web UI |
| `package.json` | Add `ink`, `chalk`, `ink-testing-library`, `react` (move from devDeps to deps for Ink) |
| `tsconfig.server.json` | Add `src/tui/**/*` to `include` array |
| `src/server/` | No changes -- services already export standalone functions |
| `src/ui/` | Minor change -- `TacticalField.tsx` updated to use shared zone filters from `src/shared/zones.ts` |
| `src/shared/types.ts` | No changes -- TUI consumes existing types |

## Interface / Adapter Changes

- `src/cli.ts` -- Completely restructured with Commander subcommands. The single default action (start server) becomes branched: `--web` starts server, bare `mc` launches TUI board.
- `src/shared/zones.ts` -- New shared module consumed by both TUI and web UI.
- No service interface changes. No new HTTP endpoints.

## Migration Required

- [x] No migration needed

---

## Prerequisites

- [x] D1 (MVP) complete -- service layer exists and is functional
- [x] D3 (TCG Card Design System) complete -- zone model and rarity mappings established in web UI
- [x] Service functions are decoupled from Express (confirmed: `parseDeliverables(projectPath)`, `listSessions(projectPath)`, `getUntrackedCommits(projectPath)`, etc.)

---

## Implementation Steps

### Phase 1: Foundation -- Ink Build Pipeline

**Agent:** backend-developer
**Outcome:** Ink renders a hello-world component via the project's existing build pipeline. Dual React (Ink renderer + React DOM) is proven to work without conflicts.

**Files:**
- `package.json` -- add dependencies
- `tsconfig.server.json` -- expand `include` to cover `src/tui/`
- `src/tui/App.tsx` -- minimal Ink component (hello world)
- `src/tui/index.ts` -- entry point that calls `render()` from Ink

**Implementation guidance:**

1. Install Ink and its peer dependency. React is already in `devDependencies` at `^19.0.0` -- move it to `dependencies` since Ink needs it at runtime. Add `ink` and `chalk` to `dependencies`. Add `ink-testing-library` to `devDependencies`.

   ```
   dependencies: { "ink": "^6.8.0", "react": "^19.0.0", "chalk": "^5.0.0" }
   devDependencies: { "ink-testing-library": "^4.0.0" }
   ```

   Note: Ink 6 is the React 19 release -- no compatibility concerns. React `^19.0.0` is the correct peer.

   Note: `chalk@^5` is pure ESM. Use `import chalk from 'chalk'` (not require). Do not rely on chalk being available as a transitive dependency -- it must be listed as a direct dependency.

   Note: `react-devtools-core` may appear as a peer dependency warning from Ink. This is optional and can be safely ignored.

2. Expand `tsconfig.server.json` include array:
   ```json
   "include": [
     "src/cli.ts",
     "src/server/**/*",
     "src/shared/**/*",
     "src/tui/**/*"
   ]
   ```
   The existing `"jsx": "react-jsx"` in `tsconfig.server.json` is already correct for Ink's JSX. No separate tsconfig needed unless a conflict surfaces (see constraint below).

3. Create `src/tui/App.tsx` with a minimal Ink component:
   ```tsx
   import { render, Text } from 'ink';
   export function App() { return <Text>Mission Control TUI</Text>; }
   export function launch() { render(<App />); }
   ```

4. Create `src/tui/index.ts` that re-exports `launch()`.

5. Verify: `npm run build:server` succeeds. Then `node dist/server/tui/index.js` prints "Mission Control TUI" to terminal.

**Acceptance criteria:**
- [ ] `npm run build:server` compiles `src/tui/**/*.tsx` without errors alongside existing server code
- [ ] Running the built TUI entry point renders text to terminal via Ink
- [ ] `npm run build:ui` (Vite) still works -- web UI unaffected
- [ ] `npm test` passes -- no regressions from dependency changes
- [ ] No duplicate React warnings in Ink output

**Constraints:**
- If `tsc` fails on JSX in `src/tui/` due to module resolution conflicts with the web UI's React types, create `tsconfig.tui.json` extending `tsconfig.server.json` with a separate `include` and adjust the build script to compile TUI separately. This is the fallback, not the default path.

**Risk:** This is the highest-risk phase. Dual React renderers in one repo is unusual. Ink 6 targets React 19, so version compatibility is not a concern. The risk is build tooling conflicts between Ink's renderer and React DOM under a single tsconfig.

---

### Phase 2: CLI Restructuring

**Agent:** backend-developer
**Outcome:** `src/cli.ts` uses Commander subcommands. `mc` launches TUI board (placeholder). `mc board` also launches the board. `mc --web` starts the server exactly as today. All other subcommands are stubs.

**Files:**
- `src/cli.ts` -- rewrite

**Implementation guidance:**

The current `cli.ts` is 64 lines with a single `.action()` that calls `startServer()`. Restructure to:

```typescript
program
  .name('mc')
  .version('0.1.0')
  .argument('[path]', 'Project directory', process.cwd())
  .option('--web', 'Start web server and open browser')
  .option('--no-open', 'Do not open browser (with --web)')
  .option('-p, --port <number>', 'Server port (with --web)', '3002')
  .option('-b, --bind <address>', 'Bind address (with --web)', '127.0.0.1')
  .option('--dev', 'Run in development mode');

// Default action: board TUI or web server
program.action(async (projectDir, opts) => {
  const projectPath = path.resolve(String(projectDir));
  if (opts.web) {
    // Existing server startup -- preserve exact current behavior
    await startWebServer(projectPath, opts);
  } else {
    // Show one-time migration notice
    showMigrationNotice();
    // Launch interactive board TUI
    const { launchBoard } = await import('./tui/index.js');
    await launchBoard(projectPath);
  }
});

program.command('board').description('Launch interactive board TUI').argument('[path]', '...', process.cwd()).action(async (projectDir) => {
  const projectPath = path.resolve(String(projectDir));
  const { launchBoard } = await import('./tui/index.js');
  await launchBoard(projectPath);
});
program.command('status').description('Print deliverable stats').argument('[path]', '...', process.cwd()).action(stub);
program.command('view <id>').description('View deliverable document').action(stub);
program.command('sessions').description('Browse past sessions').action(stub);
program.command('log [id]').description('View session log').action(stub);
program.command('chronicle').description('Browse archived deliverables').action(stub);
program.command('adhoc').description('Show untracked commits').action(stub);
```

Key details:
- Extract the current server startup logic into a `startWebServer(projectPath, opts)` function so the `--web` path is isolated. `startWebServer` must receive and pass through `opts.dev` to the server -- the `--dev` flag is relevant only in `--web` mode.
- Use dynamic `import('./tui/index.js')` for the TUI path so that Ink is not loaded when `--web` is used (keeps server startup fast, avoids loading Ink's React renderer when it's not needed).
- Preserve `checkClaudeBinary()` -- call it only in `--web` mode since the TUI is read-only and doesn't need Claude.
- Each subcommand accepts `[path]` argument defaulting to `process.cwd()`.
- Stub actions print `"[command] -- not yet implemented"` and exit.
- `mc board` is a real subcommand that calls `launchBoard()`, matching the spec.

**Migration notice:** When `mc` launches the TUI (not `--web`), print a one-time message: "Tip: Web UI available via `mc --web`". Store a boolean flag in `~/.mc/tui-notice-shown` (or similar) to only show this once. Implementation:

```typescript
function showMigrationNotice() {
  try {
    const noticePath = path.join(os.homedir(), '.mc', 'tui-notice-shown');
    if (!fs.existsSync(noticePath)) {
      console.log('Tip: Web UI available via `mc --web`\n');
      fs.mkdirSync(path.dirname(noticePath), { recursive: true });
      fs.writeFileSync(noticePath, '1');
    }
  } catch {
    // Silently swallow write errors -- the notice not showing is acceptable;
    // crashing the TUI is not.
  }
}
```

**Acceptance criteria:**
- [ ] `mc --web` starts server and opens browser -- identical to current `mc` behavior
- [ ] `mc --web --no-open` starts server without opening browser
- [ ] `mc` (no flags) launches the Phase 1 Ink hello-world and exits cleanly with `q` or Ctrl+C
- [ ] `mc board` launches the same Ink hello-world as bare `mc`
- [ ] `mc status`, `mc view D1`, `mc sessions`, `mc log`, `mc chronicle`, `mc adhoc` all print stub messages and exit
- [ ] `mc --help` shows all subcommands with descriptions
- [ ] `mc ~/some/path --web` resolves project path correctly
- [ ] Existing `--dev` flag still works with `--web` and is passed through to the server
- [ ] First run of `mc` (TUI mode) prints migration notice; second run does not

---

### Phase 3: One-Shot Commands + Theme

**Agent:** frontend-developer
**Outcome:** `mc status`, `mc view <id>`, `mc adhoc`, and `mc log [id]` are fully functional. TCG ANSI theme file established.

**Files:**
- `src/tui/theme.ts` -- TCG ANSI color constants, rarity mappings, unicode symbols
- `src/tui/formatters.ts` -- output formatters for one-shot commands
- `src/tui/commands/status.ts` -- `mc status` implementation
- `src/tui/commands/view.ts` -- `mc view <id>` implementation
- `src/tui/commands/adhoc.ts` -- `mc adhoc` implementation
- `src/tui/commands/log.ts` -- `mc log [id]` implementation
- `src/cli.ts` -- wire subcommand actions to implementations

**Implementation guidance:**

**Theme file (`src/tui/theme.ts`):**
Port the rarity and color mappings from `src/ui/utils/rarity.ts` to ANSI equivalents using `chalk`:

| Web UI (hex) | ANSI equivalent |
|---|---|
| Card ID common | `chalk.white` |
| Card ID uncommon | `chalk.green` |
| Card ID rare | `chalk.cyan.bold` |
| Card ID epic | `chalk.yellow.bold` |
| Card ID mythic | `chalk.yellow.bold.underline` |
| Zone: Deck | `chalk.dim` |
| Zone: Active | `chalk.yellow` |
| Zone: Review | `chalk.cyan` |
| Zone: Graveyard | `chalk.green.dim` |
| Subzone: Spec | `chalk.blue` |
| Subzone: Plan | `chalk.magenta` |
| Subzone: In Progress | `chalk.yellow` |
| Blocked badge | `chalk.red.bold` |
| Effort pip (filled) | `chalk.yellow.dim('*')` |
| Effort pip (empty) | `chalk.dim('.')` |

Note on effort pips: Use `chalk.yellow.dim('*')` (not `chalk.yellow('*')`) to differentiate pips from Active Zone border and In Progress subzone label, which both use full `chalk.yellow`.

Include `complexityToRarity()` ported from web UI's `rarity.ts`. The explicit mapping is: simple->common, moderate->uncommon, complex->rare, arch->mythic, moonshot->epic. Note this is counterintuitive (arch maps to mythic, not epic) and was a known D3 defect source -- implement exactly as specified.

Unicode card-type icons:
```typescript
export const TYPE_ICON: Record<string, string> = {
  feature: '\u2605',      // star
  bugfix: '\u2692',       // wrench/hammer
  refactor: '\u2B6F',     // recycling
  research: '\u{1F50D}',  // magnifying glass
  architecture: '\u2302', // house/arch
};
```

Note: The hammer symbol (`\u2692`) may not render correctly in Terminal.app on macOS. This is a known limitation and acceptable -- it degrades to a replacement character.

**Formatters (`src/tui/formatters.ts`):**
- `isTTY()`: check `process.stdout.isTTY`
- `stripAnsi(str)`: strip ANSI codes when piped (use chalk's level detection -- set `chalk.level = 0` when not TTY)
- `formatEffort(effort?: number)`: render as `***..` for effort 3/5
- `formatDeliverableId(id, complexity?)`: apply rarity color to ID string

**`mc status`** -- calls `parseDeliverables(projectPath)` and `getUntrackedCommits(projectPath)`. Prints:
```
Mission Control -- project-name
Deliverables: 12  |  Deck: 2  Active: 5  Review: 1  Graveyard: 4
Untracked commits (30d): 3
```
When piped, no color codes. Exit 0.

Note on `getUntrackedCommits()`: This function uses `execSync` (synchronous, blocks the event loop). In one-shot commands this is fine -- the process is short-lived and single-purpose. However, in the board TUI (Phase 4+), `execSync` must ONLY be called during initial data load (before Ink render starts) or in a `setTimeout`/async wrapper -- never inside the React render cycle. The `useFileWatcher` hook (Phase 5) should not trigger an `execSync` call.

**`mc view <id>`** -- calls `getDeliverable(projectPath, id)`. If the deliverable exists but has no `specPath`, `planPath`, or `resultPath` (idea status, no files yet), print a message like `"D5 -- Auth (Idea): No documents available yet."` and exit 0. Do not crash. Otherwise, picks most relevant file: `resultPath > planPath > specPath`. Reads file content with `fs.readFile`.

Path traversal guard: Resolve the file path with `path.resolve(projectPath, filePath)` and validate it starts with `projectPath` before calling `fs.readFile`. Reject paths that escape the project directory with an error message and exit 1.

For TTY output, use `marked@16` with a custom chalk-based renderer for ANSI-formatted markdown output. Do not use `marked-terminal` -- it has a peer dependency on `marked <16` which conflicts with the project's `marked@16.4.2`. Build a lightweight custom renderer that uses chalk for headings, bold, italic, code blocks, and lists. For piped output, print raw markdown. If deliverable not found, print error and exit 1.

**`mc adhoc`** -- calls `getUntrackedCommits(projectPath)`. Prints each commit as `hash_short  date  message`. Exit 0.

**`mc log [id]`** -- calls `listSessions(projectPath)` and `getSessionLog(sessionId, projectPath)` from `import { listSessions, getSessionLog } from '../../server/services/sessionStore.js'`. Do NOT use `terminalManager.listSessions()` -- that is web-only and returns in-memory active PTY sessions (always empty in TUI mode). Without ID, picks the most recent. Prints raw log content. Supports piping.

**Acceptance criteria:**
- [ ] `mc status` prints stats summary and exits within 500ms
- [ ] `mc status | cat` produces no ANSI escape codes
- [ ] `mc view D1` renders the D1 spec as formatted terminal markdown
- [ ] `mc view D1 | cat` outputs raw markdown
- [ ] `mc view D999` (nonexistent) prints error message and exits with code 1
- [ ] `mc view` on an idea-status deliverable (no files) prints `"Dnn -- Name (Idea): No documents available yet."` and exits with code 0
- [ ] `mc view` rejects paths that escape the project directory
- [ ] `mc adhoc` lists untracked commits with short hashes
- [ ] `mc log` shows most recent session log
- [ ] Theme file exports all color/icon constants from the spec's TCG ANSI theme mapping table
- [ ] `complexityToRarity` maps: simple->common, moderate->uncommon, complex->rare, arch->mythic, moonshot->epic
- [ ] `TERM=dumb mc status` produces readable output without color

**Dependencies:** `chalk@^5` added to `dependencies` in `package.json` (Phase 1). `marked@^16` must be added to `dependencies` in `package.json` -- it is currently only a transitive dependency of `mermaid`, not a direct dependency. Add it in Phase 1's `package.json` changes or at the start of Phase 3.

---

### Phase 4: Board TUI -- Zone Layout + Navigation

**Agent:** frontend-developer
**Outcome:** `mc` launches a full-screen interactive Ink board with four TCG zones displaying deliverable cards. Keyboard navigation between zones and cards works. `q` exits cleanly.

**Files:**
- `src/tui/BoardApp.tsx` -- root Ink component, zone layout, state management
- `src/tui/components/ZoneStrip.tsx` -- single zone column with header and scrollable card list
- `src/tui/components/DeliverableCard.tsx` -- compact card rendering with TCG styling
- `src/tui/components/StatusBar.tsx` -- bottom stats bar
- `src/tui/components/HelpBar.tsx` -- keyboard shortcut hints
- `src/tui/hooks/useKeyboard.ts` -- keyboard navigation state machine
- `src/tui/hooks/useDeliverables.ts` -- loads deliverables from services, provides to components
- `src/tui/index.ts` -- update `launchBoard()` to render `BoardApp`
- `src/shared/zones.ts` (new) -- shared zone-membership filter functions
- `src/ui/components/warTable/TacticalField.tsx` -- update to use shared zone filters from `src/shared/zones.ts`

**Implementation guidance:**

**Shared zone filters (`src/shared/zones.ts`):**
Extract zone-membership functions to a shared module used by both TUI and web UI:

```typescript
export function isDeckZone(status: string): boolean {
  return status === 'idea';
}
export function isActiveZone(status: string): boolean {
  return status === 'spec' || status === 'plan' || status === 'in-progress' || status === 'blocked';
}
export function isReviewZone(status: string): boolean {
  return status === 'review';
}
export function isGraveyardZone(status: string): boolean {
  return status === 'complete';
}
```

Update `src/ui/components/warTable/TacticalField.tsx` to import and use these shared functions instead of inline filter predicates. Both TUI and web UI import from the same source.

**Layout model:**

IMPORTANT: The TUI zone layout is HORIZONTAL (`flexDirection='row'` in Ink's `<Box>`). This is the inverse of the web UI's vertical stack in `TacticalField.tsx`. You are porting only the four filter predicates from `TacticalField.tsx` (via `src/shared/zones.ts`) -- not the layout model.

Use Ink's `<Box>` with `flexDirection="row"` for the four-zone horizontal layout. Zone widths as percentages of terminal width (`process.stdout.columns`):
- Deck: 15%
- Active Zone: 50%
- Review: 20%
- Graveyard: 15%

At widths below 120 columns, collapse Deck and Graveyard to count-only badges. Collapsed badges are fixed at 8 characters wide using `D[N]` format (e.g., `D[3]`, `G[7]`). Not percentage-based. Active Zone expands to fill remaining width. At widths below 80, stack zones vertically.

The Active Zone shows subzone labels as a header row: `[Spec]  [Plan]  [In Progress]` with colored text per the theme. Cards within the Active Zone are sorted by status (spec, plan, in-progress, blocked) and rendered in a single scrollable list with inline status badges.

**Virtual scroll for zone strips:**
Track `scrollOffset` per zone. Slice the rendered cards array to fit the available zone height: `Math.floor(availableHeight / cardHeight)`. Up/Down arrows adjust `scrollOffset` within the selected zone. This prevents zones with many cards from overflowing the terminal.

**`DeliverableCard.tsx`:**
```
[D3] tcg cards  *****
```
- ID: rarity-colored via `theme.ts` mappings
- Name: truncated to fit zone width
- Effort: pip rendering from `formatters.ts`
- Selected state: bright white border or inverse text
- Blocked: append `[BLK]` in red bold
- Card-type icon: prepend unicode symbol from theme

Field truncation priority (when card width is constrained):
1. ID -- never truncated
2. Name -- truncated last, minimum 8 characters
3. `[BLK]` badge -- shown in place of pips when blocked
4. Effort pips -- shown only when not blocked and space allows (minimum 3 columns)
5. Card-type icon -- omitted when total line width < 40 columns

**`useKeyboard.ts`:**
Receives `viewMode: 'board' | 'detail'` as input. All key routing goes through this single hook -- the detail panel does NOT register its own `useInput`.

In `board` mode:
- Left/Right: move between zones
- Up/Down: move between cards within current zone (adjusts `scrollOffset` when moving past visible area)
- Enter: set `expandedCardId` (handled in Phase 5)
- `q`: call `useApp().exit()` after cleanup
- `?`: toggle help overlay

In `detail` mode (Phase 5):
- Up/Down: scroll content
- `q` and Escape: return to board mode

Use Ink's `useInput` hook for key handling.

**Exit handling -- `useApp().exit()` instead of `process.exit(0)`:**
All exit paths must use `useApp().exit()` (from Ink's `useApp` hook), NOT `process.exit(0)`. `useApp().exit()` triggers React's unmount lifecycle, allowing `useEffect` cleanup functions (file watcher `.close()`, alternate screen restore) to run before natural process exit. `process.exit(0)` bypasses React unmount and will leak resources.

**`StatusBar.tsx`:**
Bottom-pinned bar showing: `D:2 A:5 R:1 G:4` (counts per zone). The `byStatus` callback from `fileWatcher.ts` returns a per-status map (7 entries). `StatusBar` computes zone counts by aggregating statuses using the shared zone functions from `src/shared/zones.ts`: Deck = sum of statuses where `isDeckZone()`, Active = sum where `isActiveZone()`, Review = sum where `isReviewZone()`, Graveyard = sum where `isGraveyardZone()`. This keeps the computation consistent with the zone display.

**`HelpBar.tsx`:**
`[?] Help  [Enter] View  [<-/->] Zone  [up/dn] Card  [q] Quit`

**Board startup sequence in `launchBoard(projectPath)`:**
1. Resolve project path
2. Call `parseDeliverables(projectPath)` for initial data
3. Enter alternate screen buffer: `process.stdout.write('\x1b[?1049h')`
4. Call Ink's `render(<BoardApp projectPath={projectPath} initialDeliverables={...} />)`
5. Register exit handler to leave alternate screen: `process.stdout.write('\x1b[?1049l')`

Explicit alternate screen escape sequences are required -- Ink's `exitOnCtrlC` option does NOT enter/exit the alternate screen. The exit handler must run on both normal exit (`useApp().exit()`) and Ctrl+C:

```typescript
export async function launchBoard(projectPath: string) {
  // Guard: alternate screen escape sequences require a TTY
  if (!process.stdout.isTTY) {
    console.error('Interactive board requires a TTY. Use `mc status` for pipe-friendly output.');
    process.exit(1);
  }

  const deliverables = await parseDeliverables(projectPath);

  // Enter alternate screen
  process.stdout.write('\x1b[?1049h');

  const { waitUntilExit } = render(
    <BoardApp projectPath={projectPath} initialDeliverables={deliverables} />,
    { exitOnCtrlC: true }
  );

  // Restore on exit
  await waitUntilExit();
  process.stdout.write('\x1b[?1049l');
}
```

**Empty state / first-run handling:**
When no `docs/` directory exists or no deliverables are found, the board shows an empty state message via Ink's `<Text>` component:
```
No deliverables found.
Run `mc --web` for the full dashboard, or create docs/current_work/ to get started.
```
Do not crash or show an empty grid.

**Acceptance criteria:**
- [ ] `mc` launches full-screen board within 1 second
- [ ] Board uses alternate screen buffer (previous terminal content restored on exit)
- [ ] Deliverables appear in correct zones (ideas in Deck, spec/plan/in-progress/blocked in Active, review in Review, complete in Graveyard)
- [ ] Arrow keys navigate between zones (left/right) and cards (up/down)
- [ ] Selected card is visually highlighted
- [ ] `q` exits cleanly via `useApp().exit()` -- alternate screen restored, cursor visible
- [ ] Ctrl+C exits cleanly -- alternate screen restored
- [ ] Active Zone shows subzone labels with correct colors
- [ ] Blocked cards show `[BLK]` badge in red
- [ ] Effort pips render correctly with `chalk.yellow.dim`
- [ ] Card IDs show rarity-based coloring
- [ ] Board renders acceptably at 120x40 and 80x24
- [ ] StatusBar shows accurate counts
- [ ] HelpBar shows keyboard shortcuts
- [ ] Collapsed Deck/Graveyard badges show as `D[N]`/`G[N]` at 8 chars wide below 120 cols
- [ ] Zones with many cards scroll without overflowing terminal height
- [ ] Empty project (no docs/ or no deliverables) shows empty state message, does not crash
- [ ] `launchBoard()` exits with message when `process.stdout.isTTY` is false (e.g., `mc | cat` prints "Interactive board requires a TTY. Use `mc status` for pipe-friendly output.")
- [ ] Resize handling is a known gap -- addressed in Phase 7
- [ ] `TacticalField.tsx` updated to use shared zone filters from `src/shared/zones.ts`

---

### Phase 5: Board TUI -- Live Updates + Detail Panel

**Agent:** frontend-developer
**Outcome:** The board auto-updates when files change in `docs/`. Enter on a card opens a detail panel showing the deliverable's document content.

**Files:**
- `src/tui/hooks/useFileWatcher.ts` -- hook wrapping `createFileWatcher()` for Ink
- `src/tui/components/DetailPanel.tsx` -- expanded card view with markdown content
- `src/tui/BoardApp.tsx` -- integrate file watcher and detail panel

**Implementation guidance:**

**`useFileWatcher.ts`:**
```typescript
import { useState, useEffect } from 'react';
import { createFileWatcher } from '../../server/services/fileWatcher.js';
import { parseDeliverables } from '../../server/services/sdlcParser.js';
import type { Deliverable, SdlcStats } from '../../shared/types.js';
import * as fs from 'fs';
import * as path from 'path';

export function useFileWatcher(projectPath: string, initialDeliverables: Deliverable[]) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables);
  const [stats, setStats] = useState<SdlcStats | null>(null);

  useEffect(() => {
    // Check for docs/ directory before initializing watcher
    const docsPath = path.join(projectPath, 'docs');
    if (!fs.existsSync(docsPath)) {
      // No docs/ directory -- render empty state, do not create watcher
      // (createFileWatcher's console.warn would corrupt Ink's terminal output)
      return;
    }

    // Refresh from disk (supplements initialDeliverables seed to catch any changes since pre-load)
    parseDeliverables(projectPath).then(setDeliverables);

    // Live updates via chokidar
    const watcher = createFileWatcher({
      projectPath,
      onUpdate: setDeliverables,
      onStats: (s) => setStats({ ...s, untracked: 0 }),
    });

    return () => { watcher.close(); };
  }, [projectPath]);

  return { deliverables, stats };
}
```

**Important:** The `console.warn` in `createFileWatcher` for a missing `docs/` directory will corrupt Ink's terminal output if it fires. The hook must check for `docs/` existence BEFORE calling `createFileWatcher` and render an empty state via Ink components instead. The `onStats` callback sets `untracked: 0` intentionally -- untracked commit count is not sourced from the file watcher.

This passes Ink's React `setState` functions directly to the file watcher's callbacks. When chokidar fires, it calls `setDeliverables()` which triggers an Ink re-render. The existing 200ms debounce in `fileWatcher.ts` is sufficient -- do not add a second debounce unless testing reveals flickering.

**Integrating into `BoardApp.tsx`:**
Replace the static `useDeliverables` hook from Phase 4 with `useFileWatcher`. The `initialDeliverables` prop from Phase 4 MUST be preserved and passed through to `useFileWatcher` as the initial seed value for `useState`. This prevents the board from briefly showing empty zones while async data loads. The flow is: `launchBoard()` pre-loads deliverables via `parseDeliverables()` -> passes them as `initialDeliverables` prop to `BoardApp` -> `BoardApp` passes them to `useFileWatcher(projectPath, initialDeliverables)` -> `useFileWatcher` uses them as the `useState` initial value:

```typescript
export function useFileWatcher(projectPath: string, initialDeliverables: Deliverable[]) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables);
  // ... rest of hook
}
```

This ensures the board renders immediately with pre-loaded data. The file watcher then takes over for live updates.

**`DetailPanel.tsx`:**
When `expandedCardId` is set (Enter key), read the most relevant file for that deliverable (`resultPath > planPath > specPath`) using `fs.readFile`. Render markdown content in a scrollable panel.

For markdown rendering in the interactive Ink context:
- Evaluate `ink-markdown` for the detail panel. If `ink-markdown` is stale, incompatible with Ink 6/React 19, or has poor GFM support (tables, code blocks), use the same custom chalk-based `marked@16` renderer built in Phase 3, with output rendered via Ink's `<Text>` component. Make this a binary decision during Phase 5 implementation -- do not ship both paths.
- Note: The spec's reference to `marked-terminal` as a fallback (Section 9, Unknown item 3) is superseded by this plan. `marked-terminal` is prohibited due to its `marked <16` peer dep conflict with the project's `marked@16.4.2`.
- Mermaid diagrams: detect ````mermaid` blocks and replace with `[Mermaid diagram -- view with mc --web]`.
- The detail panel replaces the zone layout when active. Escape or `q` returns to the board view. Use a `viewMode: 'board' | 'detail'` state in BoardApp, routed through `useKeyboard` (as defined in Phase 4).

**Scrolling in detail panel:**
Long documents need vertical scrolling. Track a `scrollOffset` state. Up/Down arrows scroll the content (routed via `useKeyboard` in `detail` mode). The panel shows a scroll indicator (e.g., `-- more --` or `[3/12]` page indicator).

Detail panel should show a loading state while `fs.readFile` is in progress. Reset `scrollOffset` to 0 when switching to a different card.

**Acceptance criteria:**
- [ ] Creating `docs/current_work/specs/d99_test_spec.md` while board is running causes a new card to appear within 1 second
- [ ] Deleting the file causes the card to disappear
- [ ] Renaming a `_spec.md` to `_COMPLETE.md` moves the card from Active Zone to Graveyard
- [ ] Enter on a card opens the detail panel showing rendered markdown
- [ ] Escape returns from detail panel to board view
- [ ] Long documents scroll with up/down arrows in detail panel
- [ ] File watcher is cleaned up on exit (no orphaned chokidar processes)
- [ ] Rapid file changes (create 5 files in 1 second) do not cause flickering or crashes
- [ ] Board with no `docs/` directory shows empty state (no console.warn corruption)
- [ ] Detail panel shows loading state while reading file
- [ ] Switching cards in detail view resets scroll position

---

### Phase 6: Interactive Browsers

**Agent:** frontend-developer
**Outcome:** `mc sessions` and `mc chronicle` launch interactive Ink list views with arrow navigation and Enter to view details.

**Files:**
- `src/tui/SessionBrowser.tsx` -- interactive session list
- `src/tui/ChronicleList.tsx` -- interactive chronicle browser
- `src/tui/commands/sessions.tsx` -- entry point for `mc sessions` (contains JSX)
- `src/tui/commands/chronicle.tsx` -- entry point for `mc chronicle` (contains JSX)
- `src/cli.ts` -- wire subcommand actions

**Implementation guidance:**

Both browsers follow the same pattern: load data, render a scrollable list, Enter opens a detail view.

**`SessionBrowser.tsx`:**
- Calls `listSessions(projectPath)` on mount (import from `../../server/services/sessionStore.js` -- NOT from `terminalManager`)
- Renders a list of sessions: `[date] [duration] [command snippet]`
- Arrow keys navigate
- Enter calls `getSessionLog(sessionId, projectPath)` (from `sessionStore.js`) and displays raw log content in a scrollable view (like the detail panel)
- `q` exits via `useApp().exit()`, Escape returns from log view to list

**`ChronicleList.tsx`:**
- Calls `parseChronicle(projectPath)` on mount
- Renders a list of completed deliverables: `[id] [name] [completion date]`
- Enter reads the `resultPath` file and renders as markdown (reuse detail panel rendering from Phase 5). Note: `parseChronicle()` returns `Deliverable[]` which has no `completePath` field. Use `resultPath` -- for completed deliverables this holds the path to the COMPLETE file.
- `q` exits via `useApp().exit()`

**Entry points (`commands/sessions.tsx`, `commands/chronicle.tsx`):**
```typescript
export async function browseSessions(projectDir: string) {
  const projectPath = path.resolve(projectDir);
  const { render } = await import('ink');
  const { SessionBrowser } = await import('../SessionBrowser.js');
  render(<SessionBrowser projectPath={projectPath} />);
}
```

Dynamic imports keep Ink out of the critical path for one-shot commands.

**TTY guard:** Both `browseSessions` and `browseChronicle` entry points must follow the same pattern as `launchBoard()` in Phase 4: check `process.stdout.isTTY` before rendering (exit with a helpful message if not a TTY), enter the alternate screen buffer, call `render()`, and restore the screen via `waitUntilExit()` on exit. This ensures consistent behavior across all interactive Ink entry points.

**Acceptance criteria:**
- [ ] `mc sessions` launches interactive list of past sessions
- [ ] Arrow keys navigate session list
- [ ] Enter on a session shows its log content
- [ ] Escape returns to session list from log view
- [ ] `q` exits cleanly via `useApp().exit()`
- [ ] `mc chronicle` launches interactive list of archived deliverables
- [ ] Enter on a chronicle entry shows its document as rendered markdown
- [ ] Both browsers handle empty states gracefully (no sessions, no chronicle entries)

---

### Phase 7: Polish + Compatibility

**Agent:** frontend-developer
**Outcome:** Terminal compatibility verified across target environments. Edge cases handled. Color degradation works.

**Files:**
- Various files from Phases 3-6 -- adjustments based on testing
- `src/tui/utils/terminal.ts` (new) -- terminal capability detection utilities

**Implementation guidance:**

**Terminal capability detection (`src/tui/utils/terminal.ts`):**
```typescript
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}
export function getTerminalHeight(): number {
  return process.stdout.rows || 24;
}
export function supportsColor(): boolean {
  // chalk auto-detects, but expose for conditional rendering
  return (process.env.TERM !== 'dumb' && process.stdout.isTTY === true);
}
```

**Compatibility testing matrix:**

| Terminal | Test |
|---|---|
| Ghostty | Board renders correctly, keyboard navigation works, colors display |
| Zellij pane | Board fits in split pane, resize events handled, no artifacts |
| Terminal.app (macOS) | Basic rendering, 256-color fallback |
| GNOME Terminal (Linux) | Basic rendering if available |
| `TERM=dumb` | All commands produce readable output, no escape codes |

**Resize handling:**
Listen to `process.stdout.on('resize', ...)` in `BoardApp`. Re-compute zone widths and re-render. Ink handles the re-render automatically when state changes.

**Clean exit checklist:**
- `q` key: call `useApp().exit()`, stop file watcher, alternate screen restored via `waitUntilExit()` handler
- Ctrl+C: Ink's `exitOnCtrlC` handles this, but verify file watcher cleanup fires via the `useEffect` cleanup function and alternate screen is restored
- SIGTERM: register `process.on('SIGTERM', ...)` for graceful shutdown
- Verify: cursor is visible after exit, alternate screen buffer is restored, no orphaned chokidar processes

**Narrow terminal handling:**
- Below 120 cols: Deck and Graveyard collapse to count badges (`D[N]`/`G[N]`, 8 chars fixed)
- Below 80 cols: vertical stacked layout
- Below 60 cols: print warning "Terminal too narrow for board view. Use mc status instead." and exit

**Color degradation:**
- Use chalk's auto-detection (`chalk.level`). At level 0 (no color), all rarity styling degrades to plain text. At level 1 (basic 16 color), use the basic ANSI colors from the theme. At level 2+ (256 color), use full theme.
- Test: `TERM=dumb mc` should render a readable board with no escape codes.

**Edge cases:**
- Project with no `docs/` directory: board shows empty state message, file watcher is not created (handled in Phase 5's `useFileWatcher`)
- Project with no `.mc.json`: uses default config (already handled by `loadConfig`)
- Project with no git repo: `mc adhoc` prints "Not a git repository" and exits cleanly (already handled by `getUntrackedCommits` which returns `[]`)
- Session with no log file: `mc log` prints "No sessions found" and exits

**Acceptance criteria:**
- [ ] Board renders without artifacts in Ghostty
- [ ] Board renders without artifacts in a Zellij split pane at 80x24
- [ ] Board renders without artifacts in Terminal.app
- [ ] `TERM=dumb mc status` produces readable output with no ANSI codes
- [ ] `TERM=dumb mc` (board) produces readable output or graceful degradation
- [ ] Terminal resize causes board to re-layout without crash
- [ ] Clean exit from all paths: `q`, Ctrl+C, SIGTERM -- alternate screen always restored
- [ ] Empty project (no docs/) shows helpful empty state
- [ ] Narrow terminal (< 60 cols) shows helpful message instead of broken layout

---

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| 1: Foundation | -- | backend-developer | -- |
| 2: CLI Restructuring | Phase 1 | backend-developer | -- |
| 3: One-Shot Commands + Theme | Phase 2 | frontend-developer | Phase 4 (theme file is shared, but can be authored first in Phase 3 and consumed in Phase 4) |
| 4: Board TUI -- Zone Layout | Phase 2, Phase 3 (theme.ts) | frontend-developer | -- |
| 5: Board TUI -- Live Updates | Phase 4 | frontend-developer | Phase 6 |
| 6: Interactive Browsers | Phase 2 (CLI wiring), Phase 5 (detail panel pattern) | frontend-developer | Phase 5 (partially -- can start list UIs while Phase 5 wires file watcher, but detail panel rendering should be shared) |
| 7: Polish | Phases 3-6 | frontend-developer | -- |

**Critical path:** 1 -> 2 -> 3 -> 4 -> 5 -> 7

Phases 3 and 4 can overlap if the theme file is completed early in Phase 3. Phase 6 can overlap with Phase 5 since the browsers are independent components, but should reuse the detail panel pattern established in Phase 5.

---

## Approach Comparison

| Approach | Description | Key Tradeoff | Selected? |
|----------|-------------|-------------|-----------|
| A: Ink (React-for-CLI) | Use Ink's React component model for all TUI rendering. Consistent paradigm with web UI. Component composition, hooks, state management all familiar. | Adds React as a runtime dependency. Dual-React build complexity. Ink ecosystem packages may have ESM issues. | Yes -- settled decision from spec. Component model matches team's React expertise. |
| B: Raw ANSI + blessed | Use blessed or direct ANSI escape sequences. No React dependency for server-side code. | More performant, fewer dependencies. But imperative rendering model is foreign to the team, no component reuse patterns, harder to maintain. | No -- rejected in spec. Imperative model increases maintenance cost. |

## Agent Skill Loading

| Agent | Load These Skills |
|-------|------------------|
| backend-developer | -- (standard Node.js/TypeScript work) |
| frontend-developer | -- (Ink docs should be referenced directly: https://github.com/vadimdemedes/ink) |

---

## Testing

### Manual Testing

1. **Phase 1:** Run `npm run build:server` and execute TUI entry point. Verify Ink renders.
2. **Phase 2:** Run `mc --web` (server starts), `mc` (TUI launches), `mc board` (TUI launches), `mc status` (stub prints). Verify migration notice shows once.
3. **Phase 3:** Run all one-shot commands with real project data. Pipe each through `cat` to verify clean output. Verify `mc view` path traversal guard.
4. **Phase 4:** Launch board with deliverables in all statuses. Navigate all zones. Verify card placement matches shared zone filters. Test at 80x24 and 120x40. Verify alternate screen enter/exit. Test empty project.
5. **Phase 5:** With board running, create/rename/delete files in `docs/`. Verify live updates. Open detail panel on multiple cards. Verify scroll reset on card switch.
6. **Phase 6:** Run `mc sessions` and `mc chronicle`. Navigate lists. View details.
7. **Phase 7:** Test in Ghostty, Zellij, Terminal.app. Test `TERM=dumb`. Test narrow terminals. Test clean exit from all paths.

### Automated Tests

- [ ] Unit tests: `src/tui/__tests__/theme.test.ts` -- rarity-to-color mapping, effort pip rendering, icon mapping, `complexityToRarity` mapping
- [ ] Unit tests: `src/tui/__tests__/formatters.test.ts` -- `formatStatus()`, `formatAdhoc()` output with/without TTY
- [ ] Unit tests: `src/shared/__tests__/zones.test.ts` -- zone-membership filter functions
- [ ] Unit tests: CLI routing tests -- verify Commander subcommands parse correctly
- [ ] Snapshot tests: `src/tui/__tests__/components.test.tsx` -- use `ink-testing-library` to render ZoneStrip, DeliverableCard, StatusBar and snapshot output

---

## Verification Checklist

- [ ] All implementation steps complete (Phases 1-7)
- [ ] Manual testing passes for all phases
- [ ] Automated tests pass
- [ ] No regressions: `mc --web` produces identical behavior to pre-D4 `mc`
- [ ] `npm run build` compiles both TUI and web UI without errors
- [ ] All 10 success criteria from spec are met (SC1-SC10)

---

## Notes

- **React version:** React `^19.0.0` is already in devDependencies. Moving it to dependencies is safe -- Vite bundles its own copy for the web UI regardless of where React sits in package.json. The key is that Ink's renderer and React DOM never load in the same process.

- **Ink version:** Ink 6 (`^6.8.0`) is the React 19 release. No compatibility hedging needed.

- **Markdown rendering strategy:** One-shot commands (Phase 3) use `marked@16` with a custom chalk-based renderer. The detail panel (Phase 5) evaluates `ink-markdown` first; if incompatible with Ink 6/React 19, falls back to the same custom renderer. `marked-terminal` is NOT used anywhere -- it requires `marked <16` which conflicts with the project's `marked@16.4.2`.

- **File watcher lifecycle:** The `createFileWatcher` function returns a `FileWatcherHandle` with a `.close()` method. The `useFileWatcher` hook must call `.close()` in its `useEffect` cleanup. Verify this fires on both `q` exit (via `useApp().exit()`) and Ctrl+C.

- **No new services:** All terminal commands call existing service functions. The only new code is presentation (TUI components, formatters), shared zone filters, and CLI routing. This is intentional -- the service layer was designed for this from D1.

---

## Domain Agent Reviews

Key feedback incorporated:

- [frontend-developer] Ink version must be `^6.8.0` (React 19 release), not `^5.1.0` — wrong major would fail on install
- [frontend-developer] `marked-terminal` has `marked <16` peer dep conflict — replaced with custom chalk-based renderer using `marked@16`
- [frontend-developer] Ink does NOT enter alternate screen via `exitOnCtrlC` — added explicit `\x1b[?1049h`/`\x1b[?1049l` escape sequences
- [frontend-developer] Ink has no native scroll container — added virtual-scroll guidance with `scrollOffset` per zone
- [frontend-developer] `useFileWatcher` must accept `initialDeliverables` (required, no default) to prevent empty-zone flash
- [ui-ux-designer] Zone layout axis is horizontal in TUI (inverse of web UI's vertical) — explicit callout prevents implementor confusion
- [ui-ux-designer] Card field truncation priority defined: ID > Name > BLK badge > Effort pips > Type icon
- [ui-ux-designer] `chalk.yellow` collision across zone border, subzone label, and effort pips — dimmed pips differentiates
- [ui-ux-designer] Collapsed Deck/Graveyard badges fixed at 8 chars, not percentage-based
- [ui-ux-designer] Phase 5 startup regression flagged — `initialDeliverables` preserved as seed value
- [software-architect] `marked` is only a transitive dep of `mermaid` — must be added as direct dependency
- [software-architect] `execSync` in `getUntrackedCommits()` must never run inside Ink render cycle
- [backend-developer] `listSessions`/`getSessionLog` must import from `sessionStore` (not `terminalManager` which returns empty in TUI)
- [backend-developer] `ChronicleList` must use `resultPath` (not nonexistent `completePath`)
- [backend-developer] `--dev` flag passthrough to `startWebServer` must be explicit
- [chief-product-officer] Read-only constraint framed as conscious first-phase decision, not permanent posture
- [chief-product-officer] Empty state / first-run experience defined — helpful message instead of empty grid
- [code-reviewer] `complexityToRarity` mapping stated explicitly (arch→mythic, moonshot→epic) — known D3 defect source
- [code-reviewer] Zone filter predicates extracted to `src/shared/zones.ts` — both TUI and web UI import shared functions
- [code-reviewer] Path traversal guard on `mc view` — resolved path must start with `projectPath`
- [code-reviewer] `process.exit(0)` replaced with `useApp().exit()` throughout — ensures React cleanup fires
- [code-reviewer] `TacticalField.tsx` added to Phase 4 files list to ensure shared zone migration isn't skipped

## Post-Execution Review

After all phases are complete, the executing agent must verify:

1. **Spec compliance:** Walk through each functional requirement (F1-F12) and non-functional requirement (NF1-NF6) in the spec and confirm it is met.
2. **Success criteria:** Verify all 10 success criteria (SC1-SC10) pass.
3. **Regression check:** `mc --web` behavior is identical to pre-D4. Run `npm run build` and `npm test`.
4. **Write result doc:** Create `docs/current_work/results/d4_terminal_first_mission_control_result.md` documenting what was built, any deviations from the plan, and any open issues discovered during implementation.
