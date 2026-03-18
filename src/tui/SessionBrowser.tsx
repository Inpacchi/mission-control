import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { render } from 'ink';
import { listClaudeSessions, getClaudeSessionLog } from '../server/services/claudeSessions.js';
import type { ClaudeSession } from '../server/services/claudeSessions.js';
import { Pager } from './Pager.js';

interface SessionBrowserProps {
  projectPath: string;
  fromBoard?: boolean;
}

type Mode = 'list' | 'search';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function SessionBrowser({ projectPath, fromBoard = false }: SessionBrowserProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = stdout?.rows ?? 24;

  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    listClaudeSessions(projectPath)
      .then((result) => {
        setSessions(result);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [projectPath]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.firstPrompt.toLowerCase().includes(query) ||
        formatDate(s.timestamp).includes(query)
    );
  }, [sessions, searchQuery]);

  // Clamp selection when filtered list changes
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filteredSessions.length - 1)));
  }, [filteredSessions.length]);

  useInput((input, key) => {
    // Search mode input handling
    if (mode === 'search') {
      if (key.return) {
        // Submit: return to list with filtered results (keep query active so list stays filtered)
        setMode('list');
        setSelectedIndex(0);
        return;
      }
      if (key.escape) {
        setMode('list');
        setSearchQuery('');
        setSelectedIndex(0);
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1));
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(filteredSessions.length - 1, i + 1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery((q) => q + input);
        setSelectedIndex(0);
      }
      return;
    }

    // List mode input handling
    if (input === 'q') {
      if (fromBoard) {
        process.exit(0); // hard quit the entire mc process
      }
      console.clear();
      exit(); // standalone: just exit this Ink instance
      return;
    }
    if (input === 'b') {
      exit(); // back to board (or exit if standalone)
      return;
    }
    if (input === '/') {
      setMode('search');
      setSearchQuery('');
      setSelectedIndex(0);
      return;
    }
    if (key.escape && searchQuery) {
      // Clear active filter
      setSearchQuery('');
      setSelectedIndex(0);
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(filteredSessions.length - 1, i + 1));
      return;
    }
    if (key.return && filteredSessions[selectedIndex]) {
      // Exit the browser, then launch the pager for this session
      exit();
      // Defer to next tick so Ink unmounts cleanly before we re-render
      setTimeout(() => {
        void openSessionInPager(projectPath, filteredSessions[selectedIndex]);
      }, 50);
    }
  });

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
        <Text dimColor>{fromBoard ? 'Press b to go back, q to quit.' : 'Press q to quit.'}</Text>
      </Box>
    );
  }

  const headerHeight = 3;
  const footerHeight = 1;
  const listHeight = Math.max(1, height - headerHeight - footerHeight);
  const listStart = Math.max(0, selectedIndex - listHeight + 1);
  const visibleSessions = filteredSessions.slice(listStart, listStart + listHeight);

  const isSearchActive = searchQuery.length > 0;

  return (
    <Box flexDirection="column" height={height}>
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text bold color="cyan">Claude Sessions  </Text>
          {mode === 'search' ? (
            <Text>
              <Text color="cyan">/</Text>{searchQuery}<Text color="cyan">▎</Text>
              {'  '}
              <Text dimColor>({filteredSessions.length}/{sessions.length})</Text>
            </Text>
          ) : isSearchActive ? (
            <Text>
              <Text dimColor>filter: </Text><Text color="yellow">{searchQuery}</Text>
              {'  '}
              <Text dimColor>({filteredSessions.length}/{sessions.length})</Text>
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
            const absoluteIndex = listStart + i;
            const isSelected = absoluteIndex === selectedIndex;
            const dateStr = formatDate(session.timestamp);
            const msgCount = `${session.messageCount}msg`;
            const branch = session.gitBranch ? `[${session.gitBranch}]` : '';
            const title = session.title.length > width - 40
              ? session.title.slice(0, width - 43) + '...'
              : session.title;

            if (isSelected) {
              return (
                <Text key={session.id} bold inverse>
                  {` ${dateStr}  ${msgCount.padEnd(7)}  ${branch ? branch + ' ' : ''}${title}`}
                </Text>
              );
            }
            return (
              <Box key={session.id}>
                <Text dimColor>{dateStr}  </Text>
                <Text color="yellow">{msgCount.padEnd(7)}  </Text>
                {branch && <Text color="magenta">{branch} </Text>}
                <Text>{title}</Text>
              </Box>
            );
          })
        )}
      </Box>

      <Box paddingX={1}>
        {mode === 'search' ? (
          <Text dimColor>Typing: filter sessions  Enter: confirm  Esc: cancel</Text>
        ) : (
          <Text dimColor>
            ↑↓: navigate  /: search  Enter: view
            {isSearchActive ? '  Esc: clear filter' : ''}
            {fromBoard ? '  b: back  q: quit' : '  q: quit'}
          </Text>
        )}
      </Box>
    </Box>
  );
}

async function openSessionInPager(projectPath: string, session: ClaudeSession): Promise<void> {
  const log = await getClaudeSessionLog(projectPath, session.id);
  if (!log) {
    console.error(`Could not read session ${session.id}`);
    process.exit(1);
  }

  const title = `Session: ${session.title}  (${formatDate(session.timestamp)})`;

  // Already in alternate screen from the browser
  try {
    const { waitUntilExit } = render(
      React.createElement(Pager, { title, content: log, titleColor: 'cyan' }),
      { exitOnCtrlC: true }
    );
    await waitUntilExit();
  } finally {
    process.stdout.write('\x1b[?1049l');
    process.stdout.write('\x1b[?25h');
  }
}
