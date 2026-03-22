/**
 * IdeaBrowser — presentational component.
 *
 * Pure rendering only. No useInput, no useApp, no exit() calls.
 * All state is managed by useIdeaView and passed as props.
 * Follows the same pattern as ChronicleList.
 */
import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { Deliverable } from '../shared/types.js';
import type { DocType, ViewMode } from './hooks/useKeyboard.js';
import { complexityToRarity, RARITY_INK_COLOR } from './theme.js';
import { DetailPanel } from './components/DetailPanel.js';
import { formatDate } from './formatters.js';

interface IdeaBrowserProps {
  entries: Deliverable[];
  filteredEntries: Deliverable[];
  selectedIndex: number;
  listScrollOffset: number;
  searchQuery: string;
  searchMode: boolean;
  viewMode: ViewMode; // 'ideas' | 'idea-detail'
  activeDocType: DocType;
  detailScrollOffset: number;
  projectPath: string;
  detailMaxScrollRef?: React.RefObject<number>;
  // Detail search
  detailActiveSearch?: string;
  detailCurrentMatchIndex?: number;
  detailMatchingLines?: number[];
  height?: number;
}

export function IdeaBrowser({
  entries,
  filteredEntries,
  selectedIndex,
  listScrollOffset,
  searchQuery,
  searchMode,
  viewMode,
  activeDocType,
  detailScrollOffset,
  projectPath,
  detailMaxScrollRef,
  detailActiveSearch,
  detailCurrentMatchIndex,
  detailMatchingLines,
  height: heightProp,
}: IdeaBrowserProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = heightProp ?? stdout?.rows ?? 24;

  const listViewportHeight = Math.max(1, height - 3);

  if (entries.length === 0) {
    return (
      <Box flexDirection="column" height={height} paddingX={1}>
        <Text bold color="gray">Deck</Text>
        <Text dimColor>─────────────────────────────────────</Text>
        <Text dimColor>No ideas yet. Drop a .md file in docs/current_work/ideas/ to get started.</Text>
        <Text> </Text>
        <Text dimColor>Press b to go back, q to quit.</Text>
      </Box>
    );
  }

  // Detail view — delegated to shared DetailPanel
  if (viewMode === 'idea-detail') {
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
          <Text bold color="gray">Deck  </Text>
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
            <Text dimColor>({entries.length} ideas)</Text>
          )}
        </Box>
        <Text dimColor>─{'─'.repeat(Math.max(0, width - 3))}</Text>
      </Box>

      {/* Entry list */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {displayEntries.length === 0 && isSearchActive ? (
          <Text dimColor>No ideas match "{searchQuery}"</Text>
        ) : visibleEntries.map((entry, i) => {
          const absoluteIndex = listScrollOffset + i;
          const isSelected = absoluteIndex === selectedIndex;
          const rarity = complexityToRarity(entry.complexity);
          const color = RARITY_INK_COLOR[rarity] ?? 'white';
          const dateStr = formatDate(entry.lastModified);
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
              <Text color={color}>{truncName}  </Text>
              <Text dimColor>{dateStr}</Text>
            </Box>
          );
        })}
      </Box>

    </Box>
  );
}
