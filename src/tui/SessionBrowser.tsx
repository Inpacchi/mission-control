/**
 * SessionBrowser — presentational component.
 *
 * Pure rendering only. No useInput, no useApp, no exit() calls.
 * All state is managed by useSessionView and passed as props.
 * Visual output is identical to the previous standalone version.
 *
 * Session detail is rendered inline via PagerView (viewMode === 'session-detail')
 * instead of launching a separate Ink instance.
 */
import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { ClaudeSession } from '../server/services/claudeSessions.js';
import type { ViewMode } from './hooks/useKeyboard.js';
import { formatDate } from './formatters.js';
import { PagerView } from './PagerView.js';

interface SessionBrowserProps {
  sessions: ClaudeSession[];
  filteredSessions: ClaudeSession[];
  loading: boolean;
  searching: boolean; // true while grep is running
  selectedIndex: number;
  listScrollOffset: number;
  searchQuery: string;
  searchMode: boolean; // true when /search input is active
  viewMode: ViewMode; // 'sessions' | 'session-search' | 'session-detail'
  // Detail / pager props
  sessionContent: string | null;
  detailScrollOffset: number;
  detailTitle: string;
  detailActiveSearch: string;
  detailCurrentMatchIndex: number;
  detailMatchingLines: number[];
  height?: number;
}

export function SessionBrowser({
  sessions,
  filteredSessions,
  loading,
  searching,
  selectedIndex,
  listScrollOffset,
  searchQuery,
  searchMode,
  viewMode,
  sessionContent,
  detailScrollOffset,
  detailTitle,
  detailActiveSearch,
  detailCurrentMatchIndex,
  detailMatchingLines,
  height: heightProp,
}: SessionBrowserProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = heightProp ?? stdout?.rows ?? 24;

  // ── Session detail view ──────────────────────────────────────────────────────
  if (viewMode === 'session-detail') {
    if (!sessionContent) {
      // Loading state while content is being built (markdown rendering is async)
      return (
        <Box flexDirection="column" height={height}>
          <Text dimColor>Rendering session…</Text>
        </Box>
      );
    }
    return (
      <PagerView
        title={detailTitle}
        content={sessionContent}
        scrollOffset={detailScrollOffset}
        activeSearch={detailActiveSearch}
        currentMatchIndex={detailCurrentMatchIndex}
        matchingLines={detailMatchingLines}
        titleColor="cyan"
        height={height}
      />
    );
  }

  // ── List loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box flexDirection="column" height={height}>
        <Text dimColor>Loading Claude sessions…</Text>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" height={height} paddingX={1}>
        <Text bold color="cyan">Claude Sessions</Text>
        <Text dimColor>{'─'.repeat(Math.max(0, width - 2))}</Text>
        <Text dimColor>No Claude Code sessions found for this project.</Text>
        <Text> </Text>
        <Text dimColor>Press b to go back, q to quit.</Text>
      </Box>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  const listViewportHeight = Math.max(1, height - 3);
  const visibleSessions = filteredSessions.slice(listScrollOffset, listScrollOffset + listViewportHeight);
  const isSearchActive = searchQuery.length > 0;

  return (
    <Box flexDirection="column" height={height}>
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text bold color="cyan">Claude Sessions  </Text>
          {searchMode ? (
            <Text>
              <Text color="cyan">/</Text>{searchQuery}<Text color="cyan">▎</Text>
              {'  '}
              {searching
                ? <Text dimColor>searching…</Text>
                : <Text dimColor>({filteredSessions.length} found)</Text>
              }
            </Text>
          ) : isSearchActive ? (
            <Text>
              <Text dimColor>search: </Text><Text color="yellow">{searchQuery}</Text>
              {'  '}
              {searching
                ? <Text dimColor>searching…</Text>
                : <Text dimColor>({filteredSessions.length} found)</Text>
              }
            </Text>
          ) : (
            <Text dimColor>({sessions.length} total)</Text>
          )}
        </Box>
        <Text dimColor>{'─'.repeat(Math.max(0, width - 2))}</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {filteredSessions.length === 0 && isSearchActive ? (
          <Text dimColor>No sessions match "{searchQuery}"</Text>
        ) : (
          visibleSessions.map((session, i) => {
            const absoluteIndex = listScrollOffset + i;
            const isSelected = absoluteIndex === selectedIndex;
            const dateStr = formatDate(session.timestamp, true);
            const msgCount = `${session.messageCount}msg`;
            const branch = session.gitBranch ? `[${session.gitBranch}]` : '';
            const title = session.title.length > width - 40
              ? session.title.slice(0, width - 43) + '...'
              : session.title;

            const shortId = session.id.slice(-8);

            if (isSelected) {
              return (
                <Text key={session.id} bold inverse>
                  {` ${shortId}  ${dateStr}  ${msgCount.padEnd(7)}  ${branch ? branch + ' ' : ''}${title}`}
                </Text>
              );
            }
            return (
              <Box key={session.id}>
                <Text color="gray">{shortId}  </Text>
                <Text dimColor>{dateStr}  </Text>
                <Text color="yellow">{msgCount.padEnd(7)}  </Text>
                {branch && <Text color="magenta">{branch} </Text>}
                <Text>{title}</Text>
              </Box>
            );
          })
        )}
      </Box>

    </Box>
  );
}
