---
tier: full
type: feature
complexity: arch
effort: 5
flavor: "The terminal is not a fallback. It is the battlefield."
created: 2026-03-17
author: CC
depends_on: [D1, D3]
agents: [software-architect, frontend-developer]
---

# D4: Terminal-First Mission Control -- Specification

---

## 1. Problem Statement

Mission Control currently requires a browser to view deliverable state, browse sessions, and interact with SDLC workflows. For developers who live in the terminal -- particularly those using Ghostty + Zellij as their primary environment -- this creates unnecessary context switching. Opening a browser tab, waiting for a web server to start, and navigating a mouse-driven SPA is friction that undermines the "single pane of glass" vision.

The terminal-first pivot makes `mc` a native terminal citizen. The default experience becomes CLI commands and an interactive TUI board that runs directly in a terminal pane. The web UI becomes opt-in via `mc --web`. This aligns Mission Control with the actual workflow of its primary user: viewing board state, checking deliverable details, and browsing history -- all without leaving the terminal multiplexer.

The existing service layer (sdlcParser, catalogParser, gitParser, fileWatcher, sessionStore, projectRegistry) is already decoupled from Express. Services accept `projectPath` and return data. Routes are thin HTTP wrappers. This means the TUI can call services directly -- no HTTP round-trip, no WebSocket bridging, no server process needed for read-only operations.

---

## 2. Requirements

### Functional

- [ ] **F1: Interactive Board TUI** -- `mc` (or `mc board`) launches a persistent full-screen terminal application (like htop or lazygit) displaying deliverables as cards organized into TCG battlefield zones: Deck (ideas), Active Zone (spec/plan/in-progress/blocked), Review, and Graveyard (complete). The Active Zone is the largest area and shows subzone labels for Spec, Plan, and In Progress. Keyboard navigation: arrow keys to move between cards/zones, Enter to expand/view, `q` to quit.
- [ ] **F2: Live File-Watcher Updates** -- The board TUI subscribes to the chokidar file watcher directly (no WebSocket). When deliverable files are created, renamed, or deleted in `docs/`, the board re-renders in place without restart.
- [ ] **F3: Status Summary** -- `mc status` prints a one-shot stats summary to stdout (total deliverables, count per zone, untracked ad hoc commits) and exits. Suitable for shell scripting and Zellij status bar integration.
- [ ] **F4: Deliverable Viewer** -- `mc view <id>` renders the most relevant document (result > plan > spec, by recency) for a deliverable as formatted markdown in the terminal via `ink-markdown`. Falls back to raw text if the terminal lacks color support.
- [ ] **F5: Session Browser** -- `mc sessions` launches an interactive list of past Claude Code sessions (from `~/.mc/sessions/`). Arrow keys to navigate, Enter to view session log.
- [ ] **F6: Session Log Viewer** -- `mc log [session-id]` renders a session's raw log output. Without an ID argument, shows the most recent session. Supports piping (`mc log | less`).
- [ ] **F7: Chronicle Browser** -- `mc chronicle` launches an interactive list of archived deliverables from `docs/chronicle/`. Enter to view the completed deliverable's document.
- [ ] **F8: Ad Hoc Tracker** -- `mc adhoc` prints untracked git commits (commits without `d<N>:` prefix in the last 30 days) to stdout and exits.
- [ ] **F9: Web UI Opt-In** -- `mc --web` starts the Express server, WebSocket layer, and opens the browser, exactly as `mc` works today. `mc --web --no-open` starts the server without opening the browser. All existing web UI functionality is preserved unchanged.
- [ ] **F10: TCG-Flavored ANSI Output** -- Deliverable cards in the board TUI use color-coded borders matching their zone and status (Active Zone cards accent by subzone: spec=blue, plan=magenta, in-progress=yellow, blocked=red; Deck=dim gray; Review=cyan; Graveyard=green). Deliverable IDs display gold ANSI styling for epic/mythic rarity, silver for rare. Effort ratings render as unicode dot pips (e.g., `...` for effort 3/5). Card type icons use unicode symbols (feature=star, bugfix=wrench, research=magnifying glass, etc.).
- [ ] **F11: Service Layer Direct Reuse** -- All TUI commands call existing service functions directly (`parseDeliverables()`, `parseCatalog()`, `getUntrackedCommits()`, `listSessions()`, `getSessionLog()`, `parseChronicle()`, `loadConfig()`). No new HTTP endpoints are created for terminal-mode functionality.
- [ ] **F12: Project Resolution** -- Bare `mc` in a project directory uses `process.cwd()`. `mc ~/path/to/project` opens that project. The project registry (`~/.mc/projects.json`) is updated on each invocation, same as today.

### Non-Functional

- [ ] **NF1: Startup Speed** -- Board TUI visible and interactive within 1 second of invocation. One-shot commands (`status`, `adhoc`, `view`) complete within 500ms.
- [ ] **NF2: Terminal Compatibility** -- Works correctly in Ghostty, Zellij panes, iTerm2, and standard macOS/Linux terminals (Terminal.app, GNOME Terminal). Tested at minimum 80x24 viewport.
- [ ] **NF3: Graceful Color Degradation** -- If the terminal does not support 256-color (detected via `TERM` environment variable or `chalk`'s level detection), fall back to basic 16-color ANSI. TCG rarity styling degrades to bold/underline.
- [ ] **NF4: Clean Exit** -- Ctrl+C and `q` key both exit the board TUI cleanly. The file watcher is stopped, the alternate screen buffer is restored, and the cursor is visible. No orphaned processes.
- [ ] **NF5: Pipe-Friendly Output** -- One-shot commands (`status`, `adhoc`, `log`) detect whether stdout is a TTY. When piped, they omit ANSI color codes and output plain text.
- [ ] **NF6: Minimal New Dependencies** -- Ink (React-for-CLI) is the primary new dependency. Reuse existing `chalk` (already a transitive dep of many packages) for color. Avoid pulling in large TUI frameworks beyond Ink.

---

## 3. Scope

### Components Affected

- [ ] `src/cli.ts` -- Major rewrite. Commander subcommands for `board`, `status`, `view`, `sessions`, `log`, `chronicle`, `adhoc`. Default action changes from "start server" to "launch board TUI". `--web` flag gates the server path.
- [ ] `src/tui/` -- New directory. All Ink-based TUI components live here.
- [ ] `src/tui/BoardApp.tsx` -- Full-screen board TUI application (root Ink component). Maps deliverables to four zones using the same grouping logic as web UI's `TacticalField.tsx`.
- [ ] `src/tui/components/` -- TUI components: `ZoneStrip`, `DeliverableCard`, `StatusBar`, `HelpBar`.
- [ ] `src/tui/SessionBrowser.tsx` -- Interactive session list.
- [ ] `src/tui/ChronicleList.tsx` -- Interactive chronicle browser.
- [ ] `src/tui/DeliverableViewer.tsx` -- Markdown rendering for `mc view`.
- [ ] `src/tui/hooks/` -- TUI-specific hooks: `useFileWatcher`, `useDeliverables`, `useKeyboard`.
- [ ] `src/tui/theme.ts` -- TCG-flavored ANSI color mappings, rarity-to-color maps, unicode symbols.
- [ ] `src/server/services/fileWatcher.ts` -- No changes needed. The existing callback-based API (`onUpdate`, `onStats`) works for both WebSocket push and direct TUI subscription.
- [ ] `package.json` -- Add `ink`, `ink-markdown`, `react` (for Ink's JSX -- note: Ink uses its own React renderer, separate from the web UI's React).
- [ ] `tsconfig.server.json` -- May need JSX configuration for Ink components (tsx transform).

### Domain Scope

- SDLC deliverable lifecycle (read-only display in terminal)
- Session history browsing (read-only)
- Git commit parsing for ad hoc detection (read-only)
- Project resolution and registry (existing behavior)
- CLI argument parsing and routing (major change)

### Data Model Changes

None. The TUI consumes the same `Deliverable`, `Session`, `CatalogEntry`, `UntrackedCommit`, `SdlcStats`, and `McConfig` types from `src/shared/types.ts`. No new types are needed for terminal rendering.

### Interface / Adapter Changes

- **CLI interface** -- Completely restructured. Commander program gains subcommands instead of a single default action. The `--web` flag is added.
- **File watcher consumption** -- No API change. The TUI calls `createFileWatcher({ projectPath, onUpdate, onStats })` directly, passing Ink state-update callbacks instead of WebSocket broadcast functions.
- **Service layer** -- No changes. All services already export standalone functions that accept `projectPath`.

---

## 4. Design

### Approach

The terminal-first surface is a thin presentation layer over the existing service layer. The architecture adds one new layer (TUI) alongside the existing web UI layer, sharing the same services:

```
CLI (src/cli.ts)
  |
  +-- mc --web  -->  Server Layer (Express + WS) --> Web UI (React SPA)
  |
  +-- mc board  -->  TUI Layer (Ink) --> Services (direct call)
  +-- mc status -->  One-shot print --> Services (direct call)
  +-- mc view   -->  One-shot print --> Services (direct call)
  +-- mc adhoc  -->  One-shot print --> Services (direct call)
  ...
```

One-shot commands (`status`, `view`, `adhoc`, `log`) call services, format output, print to stdout, and exit. Interactive commands (`board`, `sessions`, `chronicle`) launch Ink applications that enter the alternate screen buffer and run until the user quits.

The board TUI creates a chokidar file watcher on startup and re-renders when the `onUpdate` callback fires. This gives live updates without a server process. The watcher is cleaned up on exit.

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| CLI Router | `src/cli.ts` | Commander subcommands dispatch to TUI apps or one-shot printers. `--web` flag starts the server instead. |
| Board App | `src/tui/BoardApp.tsx` | Root Ink component. Manages zone layout, card selection state, file watcher subscription. Maps deliverables to zones using the same grouping logic as the web UI's `TacticalField.tsx`. |
| Zone Strip | `src/tui/components/ZoneStrip.tsx` | Single zone strip (Deck, Active, Review, Graveyard) with header, card count, scrollable card list. Active Zone renders subzone labels. Width proportional to zone type. |
| Deliverable Card | `src/tui/components/DeliverableCard.tsx` | Compact card rendering: ID (with rarity color), name, effort pips, card-type icon. Selected state shows border highlight. |
| Status Bar | `src/tui/components/StatusBar.tsx` | Bottom bar showing aggregate stats and help hints. |
| Help Bar | `src/tui/components/HelpBar.tsx` | Keyboard shortcut reference (arrows, Enter, q, ?, etc.). |
| Detail Panel | `src/tui/components/DetailPanel.tsx` | Expanded card view showing spec/plan/result content rendered as markdown. |
| Session Browser | `src/tui/SessionBrowser.tsx` | Interactive list of sessions with metadata. Enter opens log. |
| Chronicle List | `src/tui/ChronicleList.tsx` | Interactive list of archived deliverables. |
| Deliverable Viewer | `src/tui/DeliverableViewer.tsx` | Renders a deliverable's document as terminal markdown. |
| Theme | `src/tui/theme.ts` | Color constants, rarity mappings, status-to-color maps, unicode symbols. |
| useFileWatcher | `src/tui/hooks/useFileWatcher.ts` | Hook that creates a chokidar watcher and returns reactive deliverable state. |
| useKeyboard | `src/tui/hooks/useKeyboard.ts` | Keyboard navigation state machine for the board. Left/right arrows move between zones (Deck, Active, Review, Graveyard). Up/down arrows move between cards within a zone. Enter expands the selected card. `q` quits. |
| Formatters | `src/tui/formatters.ts` | One-shot output formatters for `status`, `adhoc`, etc. Handle TTY detection and color stripping. |

### CLI Structure

```typescript
// src/cli.ts -- restructured

program
  .name('mc')
  .version('0.1.0')
  .argument('[path]', 'Project directory', process.cwd())
  .option('--web', 'Start web server and open browser')
  .option('--no-open', 'Do not open browser (with --web)')
  .option('-p, --port <number>', 'Server port (with --web)', '3002')
  .option('-b, --bind <address>', 'Bind address (with --web)', '127.0.0.1');

// Default action: launch board TUI (unless --web)
program.action(async (projectDir, opts) => {
  if (opts.web) {
    // Existing server startup path
    await startServer({ ... });
  } else {
    // Launch interactive board TUI
    await launchBoard(projectDir);
  }
});

program.command('board').description('Interactive kanban board').action(launchBoard);
program.command('status').description('Print stats summary').action(printStatus);
program.command('view <id>').description('View deliverable document').action(viewDeliverable);
program.command('sessions').description('Browse past sessions').action(browseSessions);
program.command('log [id]').description('View session log').action(viewLog);
program.command('chronicle').description('Browse archived deliverables').action(browseChronicle);
program.command('adhoc').description('Show untracked commits').action(printAdhoc);
```

### Board TUI Layout

The board uses a TCG battlefield zone model (matching the web UI's `TacticalField.tsx` and the POC at `poc/tcg-war-table.html`) rather than equal-width status columns. Four zones are laid out horizontally: Deck and Graveyard are narrow side strips, the Active Zone dominates the center, and Review sits between Active and Graveyard.

```
+-----------------------------------------------------------------------+
| Mission Control -- project-name                    D:12 IP:3 BL:1 C:5 |
+------------------+-------------------------------+-----------+---------+
| DECK             | ACTIVE ZONE                   | REVIEW    | GRAVE   |
| Ideas            | [Spec]  [Plan]  [In Progress] |           | YARD    |
|                  |                               |           |         |
| [D5] auth   *.   | > [D3] tcg cards  *****       | [D10]     | [D1]    |
| [D9] search      |   [D4] terminal   **..        | api rev   | [D2]    |
|                  |   [D7] payments                |           |         |
|                  |   [D8] deploy     **.          |           |         |
|                  |   [D6] api        ** [BLK]    |           |         |
+------------------+-------------------------------+-----------+---------+
| [?] Help  [Enter] View  [<-/->] Zone  [up/dn] Card  [q] Quit         |
+-----------------------------------------------------------------------+
```

The Active Zone gets the most horizontal space (~50% of width). Deck and Graveyard are narrow strips (~15% each). Review fills the remaining space. This mirrors the POC's layout proportions where the battlefield is the visual focus.

The Active Zone displays subzone labels (Spec, Plan, In Progress) as a header row. Cards within the Active Zone show their status as an inline badge colored by subzone. Blocked cards display a `[BLK]` badge in red.

The `>` marker indicates the currently selected card. The selected card's zone gets a highlighted border. Card IDs use rarity-based ANSI coloring (gold for epic/mythic, silver for rare, white for common). Effort pips render as `*` characters (filled) and `.` characters (unfilled) up to 5.

### TCG ANSI Theme Mapping

| Element | ANSI Style |
|---------|------------|
| Card ID (common) | White |
| Card ID (uncommon) | Green |
| Card ID (rare) | Cyan + bold |
| Card ID (epic) | Yellow + bold (gold) |
| Card ID (mythic) | Yellow + bold + underline (gold shimmer) |
| Zone: Deck border | Dim gray |
| Zone: Active Zone border | Yellow (brightest -- primary battlefield) |
| Zone: Review border | Cyan |
| Zone: Graveyard border | Dim green |
| Subzone label: Spec | Blue |
| Subzone label: Plan | Magenta |
| Subzone label: In Progress | Yellow |
| Card status badge: blocked | Red + bold `[BLK]` |
| Effort pips (filled) | Yellow `*` |
| Effort pips (empty) | Dim `.` |
| Selected card | Bright white border + inverse header |

### File Watcher Integration

The board TUI uses the existing `createFileWatcher()` directly:

```typescript
// Inside BoardApp.tsx (conceptual)
const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

useEffect(() => {
  // Initial load
  parseDeliverables(projectPath).then(setDeliverables);

  // Live updates
  const watcher = createFileWatcher({
    projectPath,
    onUpdate: setDeliverables,
    onStats: setStats,
  });

  return () => { watcher.close(); };
}, [projectPath]);
```

No WebSocket layer, no HTTP server. The watcher calls back directly into Ink's React state.

---

## 5. Testing Strategy

- [ ] **Build verification** -- `npm run build` compiles both the TUI layer (Ink/TSX) and server layer. TypeScript strict mode, no type errors.
- [ ] **Manual QA: Board launch** -- Run `mc` in a project with deliverables in various states. Verify cards appear in correct zones (ideas in Deck, spec/plan/in-progress/blocked in Active Zone, review in Review, complete in Graveyard). Verify startup is under 1 second.
- [ ] **Manual QA: Keyboard navigation** -- Arrow keys move between zones and cards. Enter expands a card to show its document. `q` exits cleanly. Verify cursor is restored after exit.
- [ ] **Manual QA: Live updates** -- With the board running, create a new file `docs/current_work/specs/d99_test_spec.md`. Verify a new card appears in the Active Zone (under the Spec subzone) within 1 second without restarting.
- [ ] **Manual QA: One-shot commands** -- `mc status` prints stats and exits. `mc view D1` renders the D1 spec as markdown. `mc adhoc` lists untracked commits. Verify each exits cleanly.
- [ ] **Manual QA: Piped output** -- `mc status | cat` produces no ANSI escape codes. `mc log | head` works without error.
- [ ] **Manual QA: Web mode** -- `mc --web` starts the server and opens the browser, identical to current behavior. All web UI functionality is unchanged.
- [ ] **Manual QA: Terminal compatibility** -- Test board rendering in Ghostty, Zellij pane, and default macOS Terminal.app. Verify no rendering artifacts at 80x24 minimum.
- [ ] **Manual QA: Color degradation** -- Set `TERM=dumb` and run `mc status`. Verify output is readable without color codes.
- [ ] **Unit tests: CLI routing** -- Verify Commander subcommands parse correctly. `mc` with no args invokes board. `mc --web` invokes server. `mc status` invokes status printer.
- [ ] **Unit tests: Formatters** -- Test `formatStatus()`, `formatAdhoc()` output strings against expected content (with TTY and without).
- [ ] **Unit tests: Theme mapping** -- Test rarity-to-color mapping, zone-to-border-color mapping, subzone label color mapping, effort pip rendering.
- [ ] **Snapshot tests: TUI components** -- Use `ink-testing-library` to render Board, ZoneStrip, and Card components and snapshot their output.

---

## 6. Success Criteria

- [ ] **SC1:** Running `mc` in a project directory launches the interactive board TUI within 1 second. The board displays all deliverables in correct zones (Deck, Active Zone, Review, Graveyard).
- [ ] **SC2:** Creating a file `docs/current_work/specs/d99_test_spec.md` while the board is running causes a card to appear in the Active Zone (Spec subzone) within 1 second, without restart.
- [ ] **SC3:** `mc status` prints a stats summary and exits within 500ms. Output is pipe-friendly (no ANSI when piped).
- [ ] **SC4:** `mc view D1` renders the D1 spec as formatted markdown in the terminal.
- [ ] **SC5:** `mc --web` starts the full web server and opens the browser, exactly as `mc` does today.
- [ ] **SC6:** Keyboard navigation in the board (arrows, Enter, q) works correctly. Clean exit restores terminal state.
- [ ] **SC7:** Deliverable cards show TCG-flavored ANSI styling: rarity-colored IDs, zone-colored borders, subzone-colored status badges, effort pips.
- [ ] **SC8:** The board renders correctly in a Zellij pane at 80x24 minimum viewport.
- [ ] **SC9:** No new HTTP endpoints are created. All terminal commands call services directly.
- [ ] **SC10:** `mc sessions` and `mc chronicle` provide interactive browsing of session history and archived deliverables, respectively.

---

## 7. Constraints

- **Ink (React-for-CLI) as TUI framework** -- This is a settled decision. Ink provides a React component model for terminal rendering, consistent with the web UI's React paradigm. Alternatives (blessed, terminal-kit, raw ANSI) are not under consideration.
- **No server process for terminal commands** -- One-shot commands and the board TUI must not start Express or bind a port. They call services directly. This is critical for startup speed and resource usage.
- **Node.js 20+** -- Required for ES module support (existing constraint).
- **macOS/Linux only** -- Existing constraint from D1.
- **Read-only terminal surface** -- The TUI displays state but does not write to the project directory. All writes happen through Claude Code sessions run directly in Zellij panes.
- **No terminal-based Claude session management** -- Users run `claude` directly in their own Zellij panes. Mission Control does not embed or manage Claude sessions in terminal mode. The `terminalManager` service is only used in `--web` mode.
- **Web UI unchanged** -- `mc --web` must produce exactly the same experience as the current `mc`. No web UI regressions.
- **Single npm package** -- The TUI layer ships in the same package. No separate CLI vs. web packages.

---

## 8. Out of Scope

- **Changing the web UI** -- The React SPA, Express routes, and WebSocket layer are untouched. They continue to work behind `--web`.
- **Terminal-based Claude Code sessions** -- No embedded terminal within the TUI. Users run `claude` in separate Zellij panes.
- **Mouse interaction in TUI** -- Keyboard-only navigation. No click targets, no drag-and-drop.
- **Editing deliverables from TUI** -- No inline editing, no spec approval, no file creation from the board. Read-only.
- **TUI-based process management** -- The `processManager` service (dev server start/stop) is not exposed in terminal mode.
- **Custom keybindings** -- Key mappings are hardcoded in D4. Configurable keybindings can be a future enhancement.
- **Search/filter in board** -- The board shows all deliverables. Filtering by status, name, or tag is deferred.
- **Split-pane or tabbed TUI views** -- The TUI is single-view. Users rely on Zellij for pane/tab management.

---

## 9. Open Questions / Unknowns

- [ ] **Unknown:** How does Ink handle rapid re-renders from file watcher events? The chokidar watcher fires on every file change, debounced to 200ms. If multiple files change in quick succession, does Ink's React reconciler handle the state updates smoothly?
  - **Risk:** Flickering or tearing in the board display during rapid file system changes.
  - **Mitigation:** The existing 200ms debounce in `fileWatcher.ts` already coalesces rapid changes. If Ink still flickers, add a secondary debounce (100ms) at the TUI layer using `useRef` + `setTimeout` to batch state updates. Prototype early with a stress test (create 10 files rapidly).

- [ ] **Unknown:** What is the correct way to handle Ink's React dependency alongside the web UI's React? Both use React but in different renderers (Ink's custom renderer vs. React DOM).
  - **Risk:** Dependency version conflicts, duplicate React instances in the bundle, or build-time confusion between JSX targets.
  - **Mitigation:** Ink uses its own `react` peer dependency. Since the TUI code (`src/tui/`) is compiled by the server TypeScript config (not Vite), and the web UI (`src/ui/`) is compiled by Vite, they have separate build pipelines with separate JSX configurations. Verify during initial setup that `tsc` and `vite` do not conflict. If they do, consider separate `tsconfig.tui.json`.

- [ ] **Unknown:** How well does `ink-markdown` render complex GFM content (tables, nested lists, code blocks with syntax highlighting)?
  - **Risk:** Poor rendering quality for deliverable documents that use advanced markdown features (Mermaid diagrams, complex tables, nested blockquotes).
  - **Mitigation:** Test `ink-markdown` against actual spec and plan files from this project. If rendering is insufficient, fall back to `marked` + `marked-terminal` (which has broader GFM support) or implement a custom renderer that uses `chalk` for syntax highlighting. Mermaid diagrams cannot render in terminal; show a placeholder noting "Mermaid diagram -- view in browser with mc --web".

- [ ] **Unknown:** How should the board layout adapt to narrow terminal widths? Four zones at 80 characters wide gives roughly 20 characters per zone -- workable but tight for the Active Zone which needs the most space.
  - **Risk:** Truncated card names, cramped Active Zone, broken layout at small terminal sizes.
  - **Mitigation:** Detect terminal width via `process.stdout.columns`. At widths below 120, collapse Deck and Graveyard to icon-only strips (showing just count badges) to give Active Zone more room. At widths below 80, switch to a stacked vertical layout showing zones as rows instead of columns. Prototype at 80x24 early to validate the layout.

- [ ] **Unknown:** Can `ink-markdown` be reliably imported in an ESM Node.js project? Some Ink ecosystem packages have known CJS/ESM interop issues.
  - **Risk:** Import failures or runtime errors due to module format mismatches.
  - **Mitigation:** Spike the import early. If `ink-markdown` has ESM issues, use `marked` + `marked-terminal` as the markdown renderer instead, or use dynamic `import()` with a CJS wrapper. Both alternatives are well-maintained and ESM-compatible.
