import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { render } from 'ink';
import chalk from 'chalk';
import { listClaudeSessions, getClaudeSessionLog } from '../server/services/claudeSessions.js';
import type { ClaudeSession } from '../server/services/claudeSessions.js';
import { Pager } from './Pager.js';
import { formatDate } from './formatters.js';
import { renderMarkdownToAnsi, stripAnsi } from './renderMarkdown.js';

interface SessionBrowserProps {
  projectPath: string;
  fromBoard?: boolean;
}

type Mode = 'list' | 'search';


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
        formatDate(s.timestamp, true).includes(query)
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
      console.clear();
      if (fromBoard) {
        process.exit(0); // hard quit the entire mc process
      }
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
            const dateStr = formatDate(session.timestamp, true);
            const msgCount = `${session.messageCount}msg`;
            const branch = session.gitBranch ? `[${session.gitBranch}]` : '';
            const title = session.title.length > width - 40
              ? session.title.slice(0, width - 43) + '...'
              : session.title;

            const shortId = session.id.slice(0, 8);

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

  const title = `Session: ${session.title}  (${formatDate(session.timestamp, true)})`;

  // Render markdown in assistant turns before mounting the Pager.
  // For large sessions the screen will be blank during this synchronous rendering pass.
  const width = process.stdout.columns ?? 80;
  const separator = chalk.dim('─'.repeat(Math.max(0, width - 2)));

  // Strip ANSI from the raw log so we can split on plain-text sentinel strings
  const plain = stripAnsi(log);

  // Split into segments. The first segment (before any header) is discarded if empty.
  // Each subsequent segment belongs to the role whose header preceded it.
  const USER_SENTINEL = '── User ──';
  const ASSISTANT_SENTINEL = '── Assistant ──';

  // Build an ordered list of { role, body } turns by walking the plain text
  type Turn = { role: 'user' | 'assistant'; body: string };
  const turns: Turn[] = [];

  let remaining = plain;
  while (remaining.length > 0) {
    const userIdx = remaining.indexOf(USER_SENTINEL);
    const assistantIdx = remaining.indexOf(ASSISTANT_SENTINEL);

    if (userIdx === -1 && assistantIdx === -1) break;

    let role: 'user' | 'assistant';
    let headerEnd: number;

    if (assistantIdx === -1 || (userIdx !== -1 && userIdx < assistantIdx)) {
      role = 'user';
      headerEnd = userIdx + USER_SENTINEL.length;
    } else {
      role = 'assistant';
      headerEnd = assistantIdx + ASSISTANT_SENTINEL.length;
    }

    remaining = remaining.slice(headerEnd);

    const nextUser = remaining.indexOf(USER_SENTINEL);
    const nextAssistant = remaining.indexOf(ASSISTANT_SENTINEL);
    let bodyEnd: number;

    if (nextUser === -1 && nextAssistant === -1) {
      bodyEnd = remaining.length;
    } else if (nextUser === -1) {
      bodyEnd = nextAssistant;
    } else if (nextAssistant === -1) {
      bodyEnd = nextUser;
    } else {
      bodyEnd = Math.min(nextUser, nextAssistant);
    }

    turns.push({ role, body: remaining.slice(0, bodyEnd) });
    remaining = remaining.slice(bodyEnd);
  }

  const parts: string[] = [];
  for (const turn of turns) {
    if (parts.length > 0) {
      parts.push(separator);
    }
    if (turn.role === 'user') {
      parts.push(chalk.bold.yellow('── User ──'));
      parts.push(turn.body);
    } else {
      parts.push(chalk.bold.cyan('── Assistant ──'));
      parts.push(renderMarkdownToAnsi(turn.body));
    }
  }

  const content = parts.length > 0 ? parts.join('\n') : log;

  // Already in alternate screen from the browser
  try {
    const { waitUntilExit } = render(
      React.createElement(Pager, { title, content, titleColor: 'cyan' }),
      { exitOnCtrlC: true }
    );
    await waitUntilExit();
  } finally {
    process.stdout.write('\x1b[?1049l');
    process.stdout.write('\x1b[?25h');
  }
}
