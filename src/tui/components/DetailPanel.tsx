import React, { useMemo, useCallback } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { Deliverable } from '../../shared/types.js';
import { type DocType, type DetailSearchMode } from '../hooks/useKeyboard.js';
import { MarkdownPanel, useMarkdownLines } from './MarkdownPanel.js';
import { useFileContent } from '../hooks/useFileContent.js';
import { stripAnsi } from '../renderMarkdown.js';
import { complexityToRarity } from '../theme.js';
import { formatDate } from '../formatters.js';

const RARITY_INK_COLOR: Record<string, string> = {
  common: 'white',
  uncommon: 'green',
  rare: 'cyan',
  epic: 'yellow',
  mythic: 'yellow',
};

interface DetailPanelProps {
  deliverable: Deliverable;
  projectPath: string;
  width: number;
  height: number;
  scrollOffset: number;
  maxScrollRef?: React.RefObject<number>;
  activeDocType?: DocType;
  // Search props from useKeyboard
  detailSearchMode?: DetailSearchMode;
  detailSearchQuery?: string;
  detailActiveSearch?: string;
  detailCurrentMatchIndex?: number;
  detailMatchLinesRef?: React.RefObject<number[]>;
}

export function DetailPanel({
  deliverable,
  projectPath,
  width: _width,
  height,
  scrollOffset,
  maxScrollRef,
  activeDocType = 'auto',
  detailSearchMode: _detailSearchMode = 'normal',
  detailSearchQuery: _detailSearchQuery = '',
  detailActiveSearch = '',
  detailCurrentMatchIndex = 0,
  detailMatchLinesRef,
}: DetailPanelProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = _width || stdout?.columns || 80;

  // Pick file based on activeDocType
  const filePath: string | undefined =
    activeDocType === 'spec' ? deliverable.specPath
    : activeDocType === 'plan' ? deliverable.planPath
    : activeDocType === 'result' ? deliverable.resultPath
    : deliverable.resultPath ?? deliverable.planPath ?? deliverable.specPath;

  // Which doc type is actually being shown
  const shownType: string =
    filePath === deliverable.specPath ? 'spec'
    : filePath === deliverable.planPath ? 'plan'
    : filePath === deliverable.resultPath ? 'result'
    : 'doc';

  // useFileContent must be called unconditionally (before any early return).
  const { content, loading, error } = useFileContent(filePath, projectPath);

  // Hook must be called unconditionally (before early returns)
  const lines = useMarkdownLines(content);

  // Compute matching line indices whenever the active search or lines change.
  const matchingLines = useMemo<number[]>(() => {
    if (!detailActiveSearch) return [];
    const query = detailActiveSearch.toLowerCase();
    return lines.reduce<number[]>((acc, line, i) => {
      if (stripAnsi(line).toLowerCase().includes(query)) acc.push(i);
      return acc;
    }, []);
  }, [lines, detailActiveSearch]);

  // Write matching line indices back to the ref so useKeyboard can use them for n/p navigation.
  if (detailMatchLinesRef) {
    detailMatchLinesRef.current = matchingLines;
  }

  // Custom line renderer that applies search highlights.
  const matchSet = useMemo(() => new Set(matchingLines), [matchingLines]);

  const renderLine = useCallback(
    (line: string, absoluteIndex: number): React.ReactElement => {
      if (!detailActiveSearch) {
        return <Text key={absoluteIndex} wrap="truncate">{line || ' '}</Text>;
      }
      const isActiveMatch =
        matchingLines.length > 0 && matchingLines[detailCurrentMatchIndex] === absoluteIndex;
      const isOtherMatch =
        !isActiveMatch && matchSet.has(absoluteIndex);

      if (isActiveMatch) {
        return (
          <Text key={absoluteIndex} backgroundColor="yellow" color="black" bold wrap="truncate">
            {stripAnsi(line) || ' '}
          </Text>
        );
      }
      if (isOtherMatch) {
        return (
          <Text key={absoluteIndex} backgroundColor="gray" color="white" wrap="truncate">
            {stripAnsi(line) || ' '}
          </Text>
        );
      }
      return <Text key={absoluteIndex} wrap="truncate">{line || ' '}</Text>;
    },
    [detailActiveSearch, matchingLines, detailCurrentMatchIndex, matchSet]
  );

  // Rarity color for the deliverable ID
  const rarity = complexityToRarity(deliverable.complexity);
  const idColor = RARITY_INK_COLOR[rarity] ?? 'white';

  if (!filePath) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>
          <Text color={idColor}>[{deliverable.id}]</Text>
          {' '}
          <Text color="cyan">{deliverable.name}</Text>
        </Text>
        <Text dimColor>No documents available yet.</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>
          <Text color={idColor}>[{deliverable.id}]</Text>
          {' '}
          <Text color="cyan">{deliverable.name}</Text>
        </Text>
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  if (!content) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>
          <Text color={idColor}>[{deliverable.id}]</Text>
          {' '}
          <Text color="cyan">{deliverable.name}</Text>
        </Text>
        <Text color="red">{error ?? 'Could not read file.'}</Text>
      </Box>
    );
  }

  // Header: 3 lines (title row, metadata row, separator)
  const headerHeight = 3;
  const contentHeight = Math.max(1, height - headerHeight);
  const maxScroll = Math.max(0, lines.length - contentHeight);
  if (maxScrollRef) maxScrollRef.current = maxScroll;
  const clampedOffset = Math.min(scrollOffset, maxScroll);

  return (
    <Box flexDirection="column" height={height}>
      {/* Header — ChronicleList style: no border, rarity color, metadata line */}
      <Box flexDirection="column" paddingX={1}>
        <Box justifyContent="space-between">
          <Text bold>
            <Text color={idColor}>[{deliverable.id}]</Text>
            {' '}
            <Text color="cyan">{deliverable.name}</Text>
          </Text>
          {/* Doc type tabs */}
          <Box gap={1}>
            {deliverable.specPath && (
              <Text color={shownType === 'spec' ? 'cyan' : undefined} bold={shownType === 'spec'} dimColor={shownType !== 'spec'}>
                [1]Spec
              </Text>
            )}
            {deliverable.planPath && (
              <Text color={shownType === 'plan' ? 'cyan' : undefined} bold={shownType === 'plan'} dimColor={shownType !== 'plan'}>
                [2]Plan
              </Text>
            )}
            {deliverable.resultPath && (
              <Text color={shownType === 'result' ? 'cyan' : undefined} bold={shownType === 'result'} dimColor={shownType !== 'result'}>
                [3]Result
              </Text>
            )}
          </Box>
        </Box>
        <Text dimColor>
          {deliverable.lastModified ? formatDate(deliverable.lastModified) : ''}
          {deliverable.complexity ? `  Complexity: ${deliverable.complexity}` : ''}
        </Text>
        <Text dimColor>{'─'.repeat(Math.max(0, width - 2))}</Text>
      </Box>

      {/* Content */}
      <MarkdownPanel
        content={content}
        height={contentHeight}
        scrollOffset={clampedOffset}
        renderLine={renderLine}
      />
    </Box>
  );
}
