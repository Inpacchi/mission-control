/**
 * AdhocBrowser — presentational component.
 *
 * Pure rendering only. No useInput, no useApp, no exit() calls.
 * All state is managed by useAdhocView and passed as props.
 * Visual output is identical to the previous standalone version.
 */
import React, { useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import chalk from 'chalk';
import type { UntrackedCommit } from '../shared/types.js';
import type { ViewMode } from './hooks/useKeyboard.js';
import { formatDate } from './formatters.js';
import { stripAnsi } from './renderMarkdown.js';

interface AdhocBrowserProps {
  commits: UntrackedCommit[];
  filteredCommits: UntrackedCommit[];
  loading: boolean;
  selectedIndex: number;
  listScrollOffset: number;
  listSearchQuery: string;
  listSearchMode: boolean;
  viewMode: ViewMode; // 'adhoc' | 'adhoc-search' | 'adhoc-detail' | 'adhoc-detail-search'
  selectedCommit: UntrackedCommit | null;
  detailContent: string | null;
  detailLoading: boolean;
  detailScrollOffset: number;
  detailActiveSearch: string;
  detailCurrentMatchIndex: number;
  detailMatchingLines: number[];
  height?: number;
}

const SUMMARY_RE = /\d+ files? changed/;

function renderStatLine(line: string): string {
  if (SUMMARY_RE.test(line)) {
    return chalk.bold(line);
  }
  if (line.includes('|')) {
    const pipeIdx = line.indexOf('|');
    const filePart = line.slice(0, pipeIdx);
    const rest = line.slice(pipeIdx);
    return chalk.dim(filePart) + rest;
  }
  return line;
}

export function AdhocBrowser({
  commits,
  filteredCommits,
  loading,
  selectedIndex,
  listScrollOffset,
  listSearchQuery,
  listSearchMode,
  viewMode,
  selectedCommit,
  detailContent,
  detailLoading,
  detailScrollOffset,
  detailActiveSearch,
  detailCurrentMatchIndex,
  detailMatchingLines,
  height: heightProp,
}: AdhocBrowserProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = heightProp ?? stdout?.rows ?? 24;

  const detailLines = useMemo(
    () => (detailContent ? detailContent.split('\n') : []),
    [detailContent],
  );

  // Memoized at top level (unconditionally) to comply with rules of hooks
  const matchSet = useMemo(() => new Set(detailMatchingLines), [detailMatchingLines]);

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (viewMode === 'adhoc-detail' || viewMode === 'adhoc-detail-search') {
    const headerHeight = 4;
    const contentHeight = Math.max(1, height - headerHeight);

    const statLines = detailLines;
    const maxScroll = Math.max(0, statLines.length - contentHeight);
    const clampedOffset = Math.min(detailScrollOffset, maxScroll);
    const visibleLines = statLines.slice(clampedOffset, clampedOffset + contentHeight);

    if (!selectedCommit) {
      return <Box><Text dimColor>Loading…</Text></Box>;
    }
    const commit = selectedCommit;
    const shortHash = commit.hash.slice(0, 7);
    const dateStr = formatDate(commit.date);

    const activeMatchLine = detailMatchingLines.length > 0 ? detailMatchingLines[detailCurrentMatchIndex] : -1;

    const renderDetailLine = (line: string, absoluteIndex: number): React.ReactElement => {
      if (detailActiveSearch && absoluteIndex === activeMatchLine) {
        return (
          <Text key={absoluteIndex} backgroundColor="yellow" color="black" bold>
            {stripAnsi(line) || ' '}
          </Text>
        );
      }
      if (detailActiveSearch && matchSet.has(absoluteIndex)) {
        return (
          <Text key={absoluteIndex} backgroundColor="gray" color="white">
            {stripAnsi(line) || ' '}
          </Text>
        );
      }
      return <Text key={absoluteIndex}>{renderStatLine(line) || ' '}</Text>;
    };

    return (
      <Box flexDirection="column" height={height}>
        {/* Header */}
        <Box flexDirection="column" paddingX={1}>
          <Text bold>
            <Text dimColor>{shortHash}</Text>
            {'  '}
            <Text>{commit.message}</Text>
          </Text>
          <Text dimColor>{dateStr}</Text>
          <Text dimColor>{'─'.repeat(Math.max(0, width - 3))}</Text>
        </Box>

        {/* Body */}
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {detailLoading ? (
            <Text dimColor>Loading commit details…</Text>
          ) : (
            visibleLines.map((line, i) => renderDetailLine(line, clampedOffset + i))
          )}
        </Box>

      </Box>
    );
  }

  // ── List loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box flexDirection="column" height={height}>
        <Text dimColor>Loading untracked commits…</Text>
      </Box>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  const listViewportHeight = Math.max(1, height - 3);
  const visibleCommits = filteredCommits.slice(listScrollOffset, listScrollOffset + listViewportHeight);
  const isSearchActive = listSearchQuery.length > 0;

  const HASH_W = 7;
  const DATE_W = 10;
  const FIXED_W = HASH_W + 2 + DATE_W + 2;
  const messageAvail = Math.max(10, width - FIXED_W - 3);

  return (
    <Box flexDirection="column" height={height}>
      {/* Header */}
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text bold color="yellow">
            Untracked Commits{'  '}
          </Text>
          {listSearchMode ? (
            <Text>
              <Text color="yellow">/</Text>{listSearchQuery}<Text color="yellow">▎</Text>
              {'  '}
              <Text dimColor>({filteredCommits.length}/{commits.length})</Text>
            </Text>
          ) : isSearchActive ? (
            <Text>
              <Text dimColor>filter: </Text><Text color="yellow">{listSearchQuery}</Text>
              {'  '}
              <Text dimColor>({filteredCommits.length}/{commits.length})</Text>
            </Text>
          ) : (
            <Text dimColor>({commits.length} found)</Text>
          )}
        </Box>
        <Text dimColor>{'─'.repeat(Math.max(0, width - 3))}</Text>
      </Box>

      {/* Commit list */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {filteredCommits.length === 0 && isSearchActive ? (
          <Text dimColor>No commits match "{listSearchQuery}"</Text>
        ) : (
          visibleCommits.map((commit, i) => {
            const absoluteIndex = listScrollOffset + i;
            const isSelected = absoluteIndex === selectedIndex;
            const shortHash = commit.hash.slice(0, 7);
            const dateStr = formatDate(commit.date);
            const msg =
              commit.message.length > messageAvail
                ? commit.message.slice(0, Math.max(1, messageAvail - 1)) + '…'
                : commit.message;

            if (isSelected) {
              return (
                <Text key={commit.hash} bold inverse>
                  {` ${shortHash}  ${dateStr}  ${msg}`}
                </Text>
              );
            }
            return (
              <Box key={commit.hash}>
                <Text dimColor>{shortHash}</Text>
                <Text>{'  '}</Text>
                <Text dimColor>{dateStr}</Text>
                <Text>{'  '}</Text>
                <Text>{msg}</Text>
              </Box>
            );
          })
        )}
      </Box>

    </Box>
  );
}
