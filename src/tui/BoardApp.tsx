import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useStdout } from 'ink';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Deliverable } from '../shared/types.js';
import { isDeckZone, isActiveZone, isReviewZone, isGraveyardZone } from '../shared/zones.js';
import { ZoneStrip } from './components/ZoneStrip.js';
import { BottomBar } from './components/HelpBar.js';
import { DetailPanel } from './components/DetailPanel.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useFileWatcher } from './hooks/useFileWatcher.js';
import { ChronicleList } from './ChronicleList.js';
import { SessionBrowser } from './SessionBrowser.js';
import { AdhocBrowser } from './AdhocBrowser.js';
import { FileBrowser } from './FileBrowser.js';
import type { ViewMode } from './hooks/useKeyboard.js';

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
  type: 'deck' | 'active' | 'review' | 'graveyard';
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

  // Zone data
  const deckCards = useMemo(
    () => deliverables.filter((d) => isDeckZone(d.status)),
    [deliverables]
  );
  const activeCards = useMemo(
    () => deliverables.filter((d) => isActiveZone(d.status)),
    [deliverables]
  );
  const reviewCards = useMemo(
    () => deliverables.filter((d) => isReviewZone(d.status)),
    [deliverables]
  );
  const graveyardCards = useMemo(
    () => deliverables.filter((d) => isGraveyardZone(d.status)),
    [deliverables]
  );

  const zones = useMemo(
    () => [
      { name: 'Deck', cards: deckCards, type: 'deck' as const },
      { name: 'Active Zone', cards: activeCards, type: 'active' as const },
      { name: 'Review', cards: reviewCards, type: 'review' as const },
      { name: 'Graveyard', cards: graveyardCards, type: 'graveyard' as const },
    ],
    [deckCards, activeCards, reviewCards, graveyardCards]
  );

  // Responsive breakpoints
  const isTooNarrow = width < 60;
  const isVertical = width >= 60 && width < 80;
  const isCollapsed = width >= 80 && width < 120;
  // width >= 120: full layout

  const collapsed = isCollapsed;

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
  if (isTooNarrow) {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>Terminal too narrow for board view.</Text>
        <Text dimColor>Resize to at least 60 columns, or use `mc status` instead.</Text>
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

  // Bottom bar: 2 rows (shortcuts + zone counts)
  const BOTTOM_BARS_HEIGHT = 2;
  const zoneHeight = Math.max(5, height - BOTTOM_BARS_HEIGHT);

  // Vertical layout (80 <= width < 120 collapse, or width < 80 stack)
  if (isVertical) {
    if (showHelp) {
      return (
        <Box flexDirection="column" height={height}>
          <HelpOverlay width={width} />
          <BottomBar zones={zones} width={width} viewMode={viewMode} />
        </Box>
      );
    }
    const zoneH = Math.floor(zoneHeight / zones.length);
    return (
      <Box flexDirection="column" height={height}>
        <Box flexDirection="column" flexGrow={1}>
          {zones.map((zone, i) => (
            <ZoneStrip
              key={zone.type}
              name={zone.name}
              type={zone.type}
              cards={zone.cards}
              width={width}
              height={zoneH}
              isSelected={selectedZone === i}
              selectedCard={selectedZone === i ? selectedCard : -1}
              showSubzones={zone.type === 'active'}
            />
          ))}
        </Box>
        <BottomBar zones={zones} width={width} viewMode={viewMode} />
      </Box>
    );
  }

  // Collapsed layout (80 <= width < 120): Deck and Graveyard become badges
  if (collapsed) {
    if (showHelp) {
      return (
        <Box flexDirection="column" height={height}>
          <HelpOverlay width={width} />
          <BottomBar zones={zones} width={width} viewMode={viewMode} />
        </Box>
      );
    }

    const badgeWidth = 8;
    const availableWidth = width - badgeWidth * 2;
    // Proportional: split by card count, minimum 20% each when non-empty
    const activeCount = activeCards.length;
    const reviewCount = reviewCards.length;
    const totalCards = activeCount + reviewCount;
    let activeWidth: number;
    let reviewWidth: number;
    if (totalCards === 0) {
      activeWidth = Math.floor(availableWidth / 2);
      reviewWidth = availableWidth - activeWidth;
    } else {
      const activePct = Math.max(0.2, Math.min(0.8, activeCount / totalCards));
      activeWidth = Math.max(16, Math.floor(availableWidth * activePct));
      reviewWidth = Math.max(16, availableWidth - activeWidth);
      // Re-adjust if both minimums exceeded available
      if (activeWidth + reviewWidth > availableWidth) {
        activeWidth = availableWidth - 16;
        reviewWidth = 16;
      }
    }

    return (
      <Box flexDirection="column" height={height}>
        <Box flexDirection="row" flexGrow={1}>
          {/* Deck badge */}
          <Box width={badgeWidth} flexDirection="column" alignItems="center" paddingTop={1}>
            <Text dimColor>{`D[${deckCards.length}]`}</Text>
          </Box>

          {/* Active Zone */}
          <ZoneStrip
            name="Active Zone"
            type="active"
            cards={activeCards}
            width={activeWidth}
            height={zoneHeight}
            isSelected={selectedZone === 1}
            selectedCard={selectedZone === 1 ? selectedCard : -1}
            showSubzones
          />

          {/* Review */}
          <ZoneStrip
            name="Review"
            type="review"
            cards={reviewCards}
            width={reviewWidth}
            height={zoneHeight}
            isSelected={selectedZone === 2}
            selectedCard={selectedZone === 2 ? selectedCard : -1}
          />

          {/* Graveyard badge */}
          <Box width={badgeWidth} flexDirection="column" alignItems="center" paddingTop={1}>
            <Text dimColor>{`G[${graveyardCards.length}]`}</Text>
          </Box>
        </Box>
        <BottomBar zones={zones} width={width} viewMode={viewMode} />
      </Box>
    );
  }

  // Full layout (width >= 120)
  if (showHelp) {
    return (
      <Box flexDirection="column" height={height}>
        <HelpOverlay width={width} />
        <BottomBar zones={zones} width={width} viewMode={viewMode} />
      </Box>
    );
  }

  // Proportional zone widths: Deck/Graveyard get 12% each min, Active/Review split remainder by card count
  const sideMin = Math.floor(width * 0.12);
  const deckWidth = Math.max(sideMin, deckCards.length > 0 ? sideMin : 8);
  const graveyardWidth = Math.max(sideMin, graveyardCards.length > 0 ? sideMin : 8);
  const centerWidth = width - deckWidth - graveyardWidth;
  const activeCount = activeCards.length;
  const reviewCount = reviewCards.length;
  const totalCenter = activeCount + reviewCount;
  let activeWidth: number;
  let reviewWidth: number;
  if (totalCenter === 0) {
    activeWidth = Math.floor(centerWidth * 0.6);
    reviewWidth = centerWidth - activeWidth;
  } else {
    const activePct = Math.max(0.25, Math.min(0.75, activeCount / totalCenter));
    activeWidth = Math.max(20, Math.floor(centerWidth * activePct));
    reviewWidth = Math.max(20, centerWidth - activeWidth);
    if (activeWidth + reviewWidth > centerWidth) {
      activeWidth = centerWidth - 20;
      reviewWidth = 20;
    }
  }

  return (
    <Box flexDirection="column" height={height}>
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

        {/* Active Zone */}
        <ZoneStrip
          name="Active Zone"
          type="active"
          cards={activeCards}
          width={activeWidth}
          height={zoneHeight}
          isSelected={selectedZone === 1}
          selectedCard={selectedZone === 1 ? selectedCard : -1}
          showSubzones
        />

        {/* Review */}
        <ZoneStrip
          name="Review"
          type="review"
          cards={reviewCards}
          width={reviewWidth}
          height={zoneHeight}
          isSelected={selectedZone === 2}
          selectedCard={selectedZone === 2 ? selectedCard : -1}
        />

        {/* Graveyard */}
        <ZoneStrip
          name="Graveyard"
          type="graveyard"
          cards={graveyardCards}
          width={graveyardWidth}
          height={zoneHeight}
          isSelected={selectedZone === 3}
          selectedCard={selectedZone === 3 ? selectedCard : -1}
        />
      </Box>

      <BottomBar zones={zones} width={width} viewMode={viewMode} />
    </Box>
  );
}
