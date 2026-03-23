/**
 * BrowserList — shared presentational component for list+detail browser views.
 *
 * Extracted from ChronicleList and IdeaBrowser to eliminate ~90% duplication.
 * Parameterized by title, colors, and display options; delegates detail rendering
 * to DetailPanel exactly as the originals did.
 *
 * Pure rendering only. No useInput, no useApp, no exit() calls.
 */
import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { Deliverable } from '../../shared/types.js';
import type { DocType, ViewMode } from '../hooks/useKeyboard.js';
import { complexityToRarity, RARITY_INK_COLOR } from '../theme.js';
import { DetailPanel } from './DetailPanel.js';
import { formatDate } from '../formatters.js';

export interface BrowserListProps {
  // Branding / labels
  title: string;
  titleColor: string;
  emptyMessage: string;
  /** Label used in the count hint, e.g. "ideas" or "archived chronicles". */
  countLabel: string;
  /**
   * When true, each row shows `[ID] name  date` (Graveyard style).
   * When false, ID is omitted and name fills the available width (Deck style).
   */
  showId: boolean;
  /** Show a loading spinner/message instead of the list. */
  loading?: boolean;
  loadingMessage?: string;

  // View state
  entries: Deliverable[];
  filteredEntries: Deliverable[];
  selectedIndex: number;
  listScrollOffset: number;
  searchQuery: string;
  searchMode: boolean;
  /** The current ViewMode — used to decide list vs detail rendering. */
  viewMode: ViewMode;
  /** The ViewMode string for the detail screen (e.g. 'chronicle-detail', 'idea-detail'). */
  detailViewMode: ViewMode;
  activeDocType: DocType;
  detailScrollOffset: number;
  projectPath: string;
  detailMaxScrollRef?: React.RefObject<number>;
  detailActiveSearch?: string;
  detailCurrentMatchIndex?: number;
  detailMatchingLines?: number[];
  height?: number;
}

export function BrowserList({
  title,
  titleColor,
  emptyMessage,
  countLabel,
  showId,
  loading = false,
  loadingMessage = 'Loading…',
  entries,
  filteredEntries,
  selectedIndex,
  listScrollOffset,
  searchQuery,
  searchMode,
  viewMode,
  detailViewMode,
  activeDocType,
  detailScrollOffset,
  projectPath,
  detailMaxScrollRef,
  detailActiveSearch,
  detailCurrentMatchIndex,
  detailMatchingLines,
  height: heightProp,
}: BrowserListProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = heightProp ?? stdout?.rows ?? 24;

  // height is already terminalHeight - 2 (BottomBar subtracted by BoardApp).
  // Header = 2 lines (title + separator). Available list space = height - 2.
  const listViewportHeight = Math.max(1, height - 2);

  if (loading) {
    return (
      <Box flexDirection="column" height={height}>
        <Text dimColor>{loadingMessage}</Text>
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Box flexDirection="column" height={height} paddingX={1}>
        <Text bold color={titleColor}>{title}</Text>
        <Text dimColor>─{'─'.repeat(Math.max(0, width - 3))}</Text>
        <Text dimColor>{emptyMessage}</Text>
        <Text> </Text>
        <Text dimColor>Press b to go back, q to quit.</Text>
      </Box>
    );
  }

  // Detail view — delegated to shared DetailPanel
  if (viewMode === detailViewMode) {
    const entry = filteredEntries[selectedIndex];
    if (!entry) {
      return (
        <Box flexDirection="column" height={height} paddingX={1}>
          <Text dimColor>No entry selected.</Text>
        </Box>
      );
    }
    return (
      <DetailPanel
        deliverable={entry}
        projectPath={projectPath}
        width={width}
        height={height}
        scrollOffset={detailScrollOffset}
        maxScrollRef={detailMaxScrollRef}
        activeDocType={activeDocType}
        detailActiveSearch={detailActiveSearch}
        detailCurrentMatchIndex={detailCurrentMatchIndex}
        detailMatchingLines={detailMatchingLines}
      />
    );
  }

  // List view
  const displayEntries = filteredEntries;
  const visibleEntries = displayEntries.slice(listScrollOffset, listScrollOffset + listViewportHeight);
  const isSearchActive = searchQuery.length > 0;

  return (
    <Box flexDirection="column" height={height}>
      {/* Header */}
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text bold color={titleColor}>{title}  </Text>
          {searchMode ? (
            <Text>
              <Text color="cyan">/</Text>{searchQuery}<Text color="cyan">▎</Text>
              {'  '}
              <Text dimColor>({displayEntries.length}/{entries.length})</Text>
            </Text>
          ) : isSearchActive ? (
            <Text>
              <Text dimColor>filter: </Text><Text color="yellow">{searchQuery}</Text>
              {'  '}
              <Text dimColor>({displayEntries.length}/{entries.length})</Text>
            </Text>
          ) : (
            <Text dimColor>({entries.length} {countLabel})</Text>
          )}
        </Box>
        <Text dimColor>─{'─'.repeat(Math.max(0, width - 3))}</Text>
      </Box>

      {/* Entry list */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {displayEntries.length === 0 && isSearchActive ? (
          <Text dimColor>No {countLabel} match "{searchQuery}"</Text>
        ) : visibleEntries.map((entry, i) => {
          const absoluteIndex = listScrollOffset + i;
          const isSelected = absoluteIndex === selectedIndex;
          const rarity = complexityToRarity(entry.complexity);
          const idColor = RARITY_INK_COLOR[rarity] ?? 'white';
          const dateStr = formatDate(entry.lastModified);

          if (showId) {
            // Graveyard style: [ID] name  date
            const nameAvail = Math.max(10, width - entry.id.length - dateStr.length - 8);
            const truncName =
              entry.name.length > nameAvail
                ? entry.name.slice(0, Math.max(1, nameAvail - 1)) + '…'
                : entry.name;

            if (isSelected) {
              return (
                <Text key={entry.id} bold inverse>
                  {` [${entry.id}] ${truncName}  ${dateStr}`}
                </Text>
              );
            }
            return (
              <Box key={entry.id}>
                <Text color={idColor}>[{entry.id}] </Text>
                <Text>{truncName}  </Text>
                <Text dimColor>{dateStr}</Text>
              </Box>
            );
          } else {
            // Deck style: name  date (no ID prefix)
            const nameAvail = Math.max(10, width - dateStr.length - 4);
            const truncName =
              entry.name.length > nameAvail
                ? entry.name.slice(0, Math.max(1, nameAvail - 1)) + '…'
                : entry.name;

            if (isSelected) {
              return (
                <Text key={entry.id} bold inverse>
                  {` ${truncName}  ${dateStr}`}
                </Text>
              );
            }
            return (
              <Box key={entry.id}>
                <Text color={idColor}>{truncName}  </Text>
                <Text dimColor>{dateStr}</Text>
              </Box>
            );
          }
        })}
      </Box>
    </Box>
  );
}
