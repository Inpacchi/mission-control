import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useStdout } from 'ink';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Deliverable } from '../shared/types.js';
import { isDeckZone, isPlaymatZone, isGraveyardZone } from '../shared/zones.js';
import { ZoneStrip, EMPTY_ZONE_HEIGHT } from './components/ZoneStrip.js';
import { ZONE_GLYPH } from './theme.js';
import { BottomBar } from './components/HelpBar.js';
import { HeaderBar, getHeaderHeight } from './components/HeaderBar.js';
import type { ViewportMode } from './components/HeaderBar.js';
import { DetailPanel } from './components/DetailPanel.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useFileWatcher } from './hooks/useFileWatcher.js';
import { ChronicleList } from './ChronicleList.js';
import { SessionBrowser } from './SessionBrowser.js';
import { AdhocBrowser } from './AdhocBrowser.js';
import { FileBrowser } from './FileBrowser.js';
import type { ViewMode } from './hooks/useKeyboard.js';

// Side zones (Deck, Graveyard) fixed width — 20 chars; minimum and cap are both 20
const SIDE_MAX = 20;

/** Shared layout wrapper for sub-views: child + BottomBar */
function ViewLayout({ children, height, width, zones, viewMode, searchMode }: {
  children: React.ReactNode;
  height: number;
  width: number;
  zones: Zone[];
  viewMode: ViewMode;
  searchMode?: boolean;
}): React.ReactElement {
  return (
    <Box flexDirection="column" height={height}>
      <Box flexDirection="column" flexGrow={1}>
        {children}
      </Box>
      <BottomBar zones={zones} width={width} viewMode={viewMode} searchMode={searchMode} />
    </Box>
  );
}

interface Zone {
  name: string;
  cards: Deliverable[];
  type: 'deck' | 'playmat' | 'graveyard';
}

interface BoardAppProps {
  projectPath: string;
  initialDeliverables: Deliverable[];
}

function HelpOverlay({ width }: { width: number }): React.ReactElement {
  const lines = [
    '',
    '  Mission Control — Keyboard Reference',
    '  ─────────────────────────────────────',
    '',
    '',
    '  Board:',
    '  ←→          Navigate between zones',
    '  ↑↓          Navigate between cards',
    '  Enter        View card detail',
    '  n            Open project notes in $EDITOR',
    '  c            Browse chronicle',
    '  s            Browse sessions',
    '  a            Show adhoc commits',
    '  f            Browse files',
    '  ?            Toggle this help overlay',
    '  q            Quit Mission Control',
    '',
    '',
    '  Detail Panel:',
    '  ↑↓           Scroll content',
    '  u / d        Scroll half page up / down',
    '  pgup / pgdn  Scroll full page up / down',
    '  1 / 2 / 3   Switch to spec / plan / result',
    '  /            Search in document',
    '  n / p        Next / previous match',
    '  Esc          Clear search (or back to board)',
    '  b            Back to board',
    '',
    '',
    '  Sub-views (chronicle / sessions / adhoc / files):',
    '  b / Esc      Back to board',
    '  /            Search / filter',
    '  n / p        Next / previous match',
    '  Enter        Open selected item',
    '',
    '',
    '  Chronicle detail:',
    '  1 / 2 / 3   Switch to spec / plan / result',
    '',
    '',
    '  Session detail:',
    '  ↑↓ / j/k     Scroll  /: search  n/p: matches',
    '',
  ];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      width={Math.min(width, 60)}
    >
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  );
}

/**
 * Classify viewport into a 2D mode based on width and height.
 * Evaluation order matters — narrower/smaller checks come first.
 */
function classifyViewport(width: number, height: number): ViewportMode {
  if (width < 28) return 'too-narrow';
  if (width < 50 && height > 12) return 'quarter-col';
  if (width < 50 && height <= 12) return 'quarter-quadrant';
  // Thirds panel: 50-79 cols — same single-zone behavior as quarter
  if (width < 80 && height > 12) return 'thirds-col';
  if (width < 80 && height <= 12) return 'thirds-quadrant';
  if (width >= 80 && width < 160) return 'half-col';
  if (width >= 160 && height <= 12) return 'half-row';
  // width >= 160 && height > 12
  return 'full';
}

export function BoardApp({ projectPath, initialDeliverables }: BoardAppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { deliverables } = useFileWatcher(projectPath, initialDeliverables);

  const [dimensions, setDimensions] = useState({
    width: stdout?.columns ?? 80,
    height: stdout?.rows ?? 24,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24,
      });
    };
    // Must use process.stdout directly — useStdout().stdout does not emit
    // 'resize' events; only the raw process.stdout stream does.
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  const width = dimensions.width;
  const height = dimensions.height;

  // 2D viewport classification
  const viewportMode = useMemo(() => classifyViewport(width, height), [width, height]);

  // collapsed flag: Deck/Graveyard are hidden from zone columns in these modes
  // quarter/thirds: all 3 zones are keyboard-navigable (single-zone display mode)
  const collapsed =
    viewportMode === 'half-col' ||
    viewportMode === 'half-row';

  // Project name derived from projectPath basename
  const projectName = useMemo(() => path.basename(projectPath), [projectPath]);

  // Zone data
  const deckCards = useMemo(
    () => deliverables.filter((d) => isDeckZone(d.status)),
    [deliverables]
  );
  const playmatCards = useMemo(
    () => deliverables.filter((d) => isPlaymatZone(d.status)),
    [deliverables]
  );
  const graveyardCards = useMemo(
    () => deliverables.filter((d) => isGraveyardZone(d.status)),
    [deliverables]
  );

  const zones = useMemo(
    () => [
      { name: 'Deck', cards: deckCards, type: 'deck' as const },
      { name: 'Playmat', cards: playmatCards, type: 'playmat' as const },
      { name: 'Graveyard', cards: graveyardCards, type: 'graveyard' as const },
    ],
    [deckCards, playmatCards, graveyardCards]
  );

  // Open project notes in $EDITOR (falls back to vi)
  // Toggles alternate screen so the editor renders correctly over the TUI
  const openEditor = useCallback(() => {
    const notesPath = path.join(projectPath, '.mc', 'notes.md');
    fs.mkdirSync(path.dirname(notesPath), { recursive: true });
    if (!fs.existsSync(notesPath)) {
      fs.writeFileSync(notesPath, '', 'utf-8');
    }
    const editor = process.env.EDITOR || 'vi';
    process.stdout.write('\x1b[?1049l'); // leave alternate screen
    spawnSync(editor, [notesPath], { stdio: 'inherit' });
    process.stdout.write('\x1b[?1049h'); // re-enter alternate screen
  }, [projectPath]);

  const {
    viewMode,
    board: {
      selectedZone,
      selectedCard,
      showHelp,
      expandedCardId,
      detailScrollOffset,
      detailMaxScrollRef,
      activeDocType,
      detailActiveSearch,
      detailCurrentMatchIndex,
      detailMatchLinesRef,
    },
    chronicle,
    sessions,
    adhoc,
    files,
  } = useKeyboard({
    zones,
    projectPath,
    onExit: exit,
    onOpenEditor: openEditor,
    collapsed,
    terminalHeight: height,
  });

  // Too narrow to render
  if (viewportMode === 'too-narrow') {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>Terminal too narrow for board view.</Text>
        <Text dimColor>Resize to at least 28 columns, or use `mc status` instead.</Text>
      </Box>
    );
  }

  // Empty state
  if (deliverables.length === 0) {
    return (
      <Box flexDirection="column" height={height}>
        <Text dimColor>No deliverables found.</Text>
        <Text dimColor>Run `mc --web` for the full dashboard, or create docs/current_work/ to get started.</Text>
      </Box>
    );
  }

  // ── View router ─────────────────────────────────────────────────────────────

  // Detail panel view
  if (viewMode === 'detail' && expandedCardId !== null) {
    const expandedDeliverable = deliverables.find((d) => d.id === expandedCardId);
    if (expandedDeliverable) {
      return (
        <ViewLayout height={height} width={width} zones={zones} viewMode={viewMode}>
          <DetailPanel
            deliverable={expandedDeliverable}
            projectPath={projectPath}
            width={width}
            height={height - 2}
            scrollOffset={detailScrollOffset}
            maxScrollRef={detailMaxScrollRef}
            activeDocType={activeDocType}
            detailActiveSearch={detailActiveSearch}
            detailCurrentMatchIndex={detailCurrentMatchIndex}
            detailMatchLinesRef={detailMatchLinesRef}
          />
        </ViewLayout>
      );
    }
  }

  // Chronicle view
  if (viewMode === 'chronicle' || viewMode === 'chronicle-detail') {
    return (
      <ViewLayout height={height} width={width} zones={zones} viewMode={viewMode} searchMode={chronicle.searchMode}>
        <ChronicleList
          entries={chronicle.entries}
          filteredEntries={chronicle.filteredEntries}
          loading={chronicle.loading}
          selectedIndex={chronicle.selectedIndex}
          listScrollOffset={chronicle.scrollOffset}
          searchQuery={chronicle.searchQuery}
          searchMode={chronicle.searchMode}
          viewMode={viewMode}
          activeDocType={chronicle.activeDocType}
          detailScrollOffset={chronicle.detailScrollOffset}
          projectPath={projectPath}
          detailMaxScrollRef={chronicle.detailMaxScrollRef}
          detailActiveSearch={chronicle.detailActiveSearch}
          detailCurrentMatchIndex={chronicle.detailCurrentMatchIndex}
          detailMatchingLines={chronicle.detailMatchingLines}
          height={height - 2}
        />
      </ViewLayout>
    );
  }

  // Session views
  if (viewMode === 'sessions' || viewMode === 'session-search' || viewMode === 'session-detail') {
    return (
      <ViewLayout height={height} width={width} zones={zones} viewMode={viewMode} searchMode={sessions.searchMode}>
        <SessionBrowser
          sessions={sessions.sessions}
          filteredSessions={sessions.filteredSessions}
          loading={sessions.loading}
          searching={sessions.searching}
          selectedIndex={sessions.selectedIndex}
          listScrollOffset={sessions.listScrollOffset}
          searchQuery={sessions.searchQuery}
          searchMode={sessions.searchMode}
          viewMode={viewMode}
          sessionContent={sessions.sessionContent}
          detailScrollOffset={sessions.detailScrollOffset}
          detailTitle={sessions.detailTitle}
          detailActiveSearch={sessions.detailActiveSearch}
          detailCurrentMatchIndex={sessions.detailCurrentMatchIndex}
          detailMatchingLines={sessions.detailMatchingLines}
          height={height - 2}
        />
      </ViewLayout>
    );
  }

  // Adhoc views
  if (
    viewMode === 'adhoc' ||
    viewMode === 'adhoc-search' ||
    viewMode === 'adhoc-detail' ||
    viewMode === 'adhoc-detail-search'
  ) {
    return (
      <ViewLayout height={height} width={width} zones={zones} viewMode={viewMode} searchMode={adhoc.listSearchMode}>
        <AdhocBrowser
          commits={adhoc.commits}
          filteredCommits={adhoc.filteredCommits}
          loading={adhoc.loading}
          selectedIndex={adhoc.selectedIndex}
          listScrollOffset={adhoc.listScrollOffset}
          listSearchQuery={adhoc.listSearchQuery}
          listSearchMode={adhoc.listSearchMode}
          viewMode={viewMode}
          selectedCommit={adhoc.selectedCommit}
          detailContent={adhoc.detailContent}
          detailLoading={adhoc.detailLoading}
          detailScrollOffset={adhoc.detailScrollOffset}
          detailActiveSearch={adhoc.detailActiveSearch}
          detailCurrentMatchIndex={adhoc.detailCurrentMatchIndex}
          detailMatchingLines={adhoc.detailMatchingLines}
          height={height - 2}
        />
      </ViewLayout>
    );
  }

  // File views
  if (
    viewMode === 'files' ||
    viewMode === 'file-search' ||
    viewMode === 'file-grep-input' ||
    viewMode === 'file-grep-results'
  ) {
    return (
      <ViewLayout height={height} width={width} zones={zones} viewMode={viewMode}>
        <FileBrowser
          projectPath={projectPath}
          viewMode={viewMode}
          allFiles={files.allFiles}
          collapsed={files.collapsed}
          selectedIndex={files.selectedIndex}
          visibleEntries={files.visibleEntries}
          searchQuery={files.searchQuery}
          grepQuery={files.grepQuery}
          grepResults={files.grepResults}
          grepSelectedIndex={files.grepSelectedIndex}
          grepRunning={files.grepRunning}
          height={height - 2}
        />
      </ViewLayout>
    );
  }

  // ── Board view ───────────────────────────────────────────────────────────────

  // Bottom bar height: 3 rows for quarter/thirds (hint + shortcuts + counts), 2 rows otherwise
  const isNarrowPanel = viewportMode === 'quarter-col' || viewportMode === 'quarter-quadrant' ||
    viewportMode === 'thirds-col' || viewportMode === 'thirds-quadrant';
  const BOTTOM_BARS_HEIGHT = isNarrowPanel ? 3 : 2;
  const headerHeight = getHeaderHeight(viewportMode, height);
  const zoneHeight = Math.max(5, height - BOTTOM_BARS_HEIGHT - headerHeight);

  // ── Narrow panel mode: quarter and thirds ────────────────────────────────────
  // Single zone fills the full width. Left/right arrows cycle through all 3 zones.
  // Full-height (quarter-col, thirds-col): show 2 zones stacked vertically.
  // Short-height (quarter-quadrant, thirds-quadrant): single zone only.
  if (isNarrowPanel) {
    if (showHelp) {
      return (
        <Box flexDirection="column" height={height}>
          <HelpOverlay width={width} />
          <BottomBar zones={zones} width={width} viewMode={viewMode} threeRowMode />
        </Box>
      );
    }

    const currentZone = zones[selectedZone] ?? zones[1]!;

    // Zone hint for the bottom bar
    const ZONE_SHORT_NAME: Record<string, string> = {
      deck: 'Deck',
      playmat: 'Playmat',
      graveyard: 'Grave',
    };
    const zoneGlyph = ZONE_GLYPH[currentZone.type] ?? currentZone.type[0].toUpperCase();
    const zoneShortName = ZONE_SHORT_NAME[currentZone.type] ?? currentZone.name;
    const zoneIndex = selectedZone >= 0 && selectedZone < zones.length ? selectedZone : 1;
    const singleZoneHint = `${zoneGlyph} ${zoneShortName} (${zoneIndex + 1} of ${zones.length})  ←→ zones  ↑↓ cards  Enter open`;

    // Full-height: show 2 zones stacked (selected zone + next zone)
    const showTwoZones = viewportMode === 'quarter-col' || viewportMode === 'thirds-col';

    if (showTwoZones) {
      const nextZoneIdx = (selectedZone + 1) % zones.length;
      const nextZone = zones[nextZoneIdx]!;
      const topHeight = Math.floor(zoneHeight * 0.6);
      const bottomHeight = zoneHeight - topHeight;

      return (
        <Box flexDirection="column" height={height}>
          <HeaderBar
            projectName={projectName}
            deliverables={deliverables}
            width={width}
            height={height}
            viewportMode={viewportMode}
          />
          <Box flexDirection="column" flexGrow={1}>
            <ZoneStrip
              name={currentZone.name}
              type={currentZone.type}
              cards={currentZone.cards}
              width={width}
              height={topHeight}
              isSelected
              selectedCard={selectedCard}
              showSubzones={currentZone.type === 'playmat'}
            />
            <ZoneStrip
              name={nextZone.name}
              type={nextZone.type}
              cards={nextZone.cards}
              width={width}
              height={bottomHeight}
              isSelected={false}
              selectedCard={-1}
              showSubzones={nextZone.type === 'playmat'}
            />
          </Box>
          <BottomBar zones={zones} width={width} viewMode={viewMode} singleZoneHint={singleZoneHint} threeRowMode />
        </Box>
      );
    }

    // Short-height: single zone only
    return (
      <Box flexDirection="column" height={height}>
        <HeaderBar
          projectName={projectName}
          deliverables={deliverables}
          width={width}
          height={height}
          viewportMode={viewportMode}
        />
        <Box flexGrow={1}>
          <ZoneStrip
            name={currentZone.name}
            type={currentZone.type}
            cards={currentZone.cards}
            width={width}
            height={zoneHeight}
            isSelected
            selectedCard={selectedCard}
            showSubzones={currentZone.type === 'playmat'}
          />
        </Box>
        <BottomBar zones={zones} width={width} viewMode={viewMode} singleZoneHint={singleZoneHint} threeRowMode />
      </Box>
    );
  }

  // ── Collapsed layout: half-col (50–159 cols) ─────────────────────────────────
  // Playmat at full available width. Deck/Graveyard counts in HeaderBar.
  if (viewportMode === 'half-col') {
    if (showHelp) {
      return (
        <Box flexDirection="column" height={height}>
          <HelpOverlay width={width} />
          <BottomBar zones={zones} width={width} viewMode={viewMode} />
        </Box>
      );
    }

    const availableWidth = width; // full width — no badge columns

    return (
      <Box flexDirection="column" height={height}>
        {/* HeaderBar: 2-row when height > 16, suppressed otherwise via getHeaderHeight */}
        <HeaderBar
          projectName={projectName}
          deliverables={deliverables}
          width={width}
          height={height}
          viewportMode={viewportMode}
        />
        <Box flexGrow={1}>
          <ZoneStrip
            name="Playmat"
            type="playmat"
            cards={playmatCards}
            width={availableWidth}
            height={zoneHeight}
            isSelected={selectedZone === 1}
            selectedCard={selectedZone === 1 ? selectedCard : -1}
            showSubzones
          />
        </Box>
        <BottomBar zones={zones} width={width} viewMode={viewMode} />
      </Box>
    );
  }

  // ── Half-row layout: 160+ cols, ≤ 12 rows ───────────────────────────────────
  // HeaderBar at 1 row (zone counts only). 4 columns side by side.
  if (viewportMode === 'half-row') {
    if (showHelp) {
      return (
        <Box flexDirection="column" height={height}>
          <HelpOverlay width={width} />
          <BottomBar zones={zones} width={width} viewMode={viewMode} />
        </Box>
      );
    }

    const deckWidth = SIDE_MAX;
    const graveyardWidth = SIDE_MAX;
    const centerWidth = width - deckWidth - graveyardWidth;

    return (
      <Box flexDirection="column" height={height}>
        {/* HeaderBar: 1-row (zone counts only) */}
        <HeaderBar
          projectName={projectName}
          deliverables={deliverables}
          width={width}
          height={height}
          viewportMode={viewportMode}
        />
        <Box flexDirection="row" flexGrow={1}>
          {/* Deck */}
          <ZoneStrip
            name="Deck"
            type="deck"
            cards={deckCards}
            width={deckWidth}
            height={zoneHeight}
            isSelected={selectedZone === 0}
            selectedCard={selectedZone === 0 ? selectedCard : -1}
          />
          {/* Playmat */}
          <ZoneStrip
            name="Playmat"
            type="playmat"
            cards={playmatCards}
            width={centerWidth}
            height={zoneHeight}
            isSelected={selectedZone === 1}
            selectedCard={selectedZone === 1 ? selectedCard : -1}
            showSubzones
          />
          {/* Graveyard */}
          <ZoneStrip
            name="Graveyard"
            type="graveyard"
            cards={graveyardCards}
            width={graveyardWidth}
            height={zoneHeight}
            isSelected={selectedZone === 2}
            selectedCard={selectedZone === 2 ? selectedCard : -1}
          />
        </Box>
        <BottomBar zones={zones} width={width} viewMode={viewMode} />
      </Box>
    );
  }

  // ── Full layout: 160+ cols, > 12 rows ────────────────────────────────────────
  if (showHelp) {
    return (
      <Box flexDirection="column" height={height}>
        <HelpOverlay width={width} />
        <BottomBar zones={zones} width={width} viewMode={viewMode} />
      </Box>
    );
  }

  // Side zones (Deck, Graveyard) capped at SIDE_MAX chars; empty zones collapse further.
  // Non-empty side zones use a minimum of 20 (the plan-required minimum for all zones).
  const deckWidth =
    deckCards.length > 0
      ? Math.max(20, Math.min(SIDE_MAX, Math.floor(width * 0.12)))
      : Math.max(12, Math.floor(width * 0.08));
  const graveyardWidth =
    graveyardCards.length > 0
      ? Math.max(20, Math.min(SIDE_MAX, Math.floor(width * 0.12)))
      : Math.max(12, Math.floor(width * 0.08));
  const centerWidth = width - deckWidth - graveyardWidth;

  return (
    <Box flexDirection="column" height={height}>
      {/* HeaderBar: 2-row when height > 16, suppressed otherwise */}
      <HeaderBar
        projectName={projectName}
        deliverables={deliverables}
        width={width}
        height={height}
        viewportMode={viewportMode}
      />
      <Box flexDirection="row" flexGrow={1}>
        {/* Deck — full height; empty zone renders as EMPTY_ZONE_HEIGHT strip */}
        {deckCards.length > 0 ? (
          <ZoneStrip
            name="Deck"
            type="deck"
            cards={deckCards}
            width={deckWidth}
            height={zoneHeight}
            isSelected={selectedZone === 0}
            selectedCard={selectedZone === 0 ? selectedCard : -1}
          />
        ) : (
          <Box flexDirection="column" width={deckWidth} height={zoneHeight}>
            <ZoneStrip
              name="Deck"
              type="deck"
              cards={deckCards}
              width={deckWidth}
              height={EMPTY_ZONE_HEIGHT}
              isSelected={selectedZone === 0}
              selectedCard={-1}
            />
          </Box>
        )}

        {/* Playmat */}
        <ZoneStrip
          name="Playmat"
          type="playmat"
          cards={playmatCards}
          width={centerWidth}
          height={zoneHeight}
          isSelected={selectedZone === 1}
          selectedCard={selectedZone === 1 ? selectedCard : -1}
          showSubzones
        />

        {/* Graveyard — full height; empty zone renders as EMPTY_ZONE_HEIGHT strip */}
        {graveyardCards.length > 0 ? (
          <ZoneStrip
            name="Graveyard"
            type="graveyard"
            cards={graveyardCards}
            width={graveyardWidth}
            height={zoneHeight}
            isSelected={selectedZone === 2}
            selectedCard={selectedZone === 2 ? selectedCard : -1}
          />
        ) : (
          <Box flexDirection="column" width={graveyardWidth} height={zoneHeight}>
            <ZoneStrip
              name="Graveyard"
              type="graveyard"
              cards={graveyardCards}
              width={graveyardWidth}
              height={EMPTY_ZONE_HEIGHT}
              isSelected={selectedZone === 2}
              selectedCard={-1}
            />
          </Box>
        )}
      </Box>

      <BottomBar zones={zones} width={width} viewMode={viewMode} />
    </Box>
  );
}
