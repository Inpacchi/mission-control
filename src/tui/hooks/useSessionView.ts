import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import type { ClaudeSession } from '../../server/services/claudeSessions.js';
import { listClaudeSessions, getClaudeSessionLog } from '../../server/services/claudeSessions.js';
import { useListNavigation } from './useListNavigation.js';
import { useSearchInput } from './useSearchInput.js';
import { useDetailSearch } from './useDetailSearch.js';
import { formatDate } from '../formatters.js';
import { renderMarkdownToAnsi, stripAnsi } from '../renderMarkdown.js';
import chalk from 'chalk';

export interface SessionViewState {
  // List state
  sessions: ClaudeSession[];
  filteredSessions: ClaudeSession[];
  loading: boolean;
  selectedIndex: number;
  listScrollOffset: number;
  // Search state
  searchQuery: string;
  searchMode: boolean; // true when /search input is active
  // Detail state
  sessionContent: string | null; // rendered ANSI string for PagerView
  detailScrollOffset: number;
  detailTitle: string;
  // Detail search state
  detailSearchMode: boolean;
  detailActiveSearch: string;
  detailCurrentMatchIndex: number;
  detailMatchingLines: number[];
}

interface UseSessionViewResult {
  state: SessionViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
}

export function useSessionView(
  projectPath: string,
  setViewMode: (mode: ViewMode) => void,
  terminalHeight?: number,
): UseSessionViewResult {
  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionLoadIdRef = useRef(0);
  const lastProjectPathRef = useRef<string | undefined>(undefined);
  const [searchMode, setSearchMode] = useState(false);
  const [sessionContent, setSessionContent] = useState<string | null>(null);
  const [detailScrollOffset, setDetailScrollOffset] = useState(0);
  const [detailTitle, setDetailTitle] = useState('');
  const searchInput = useSearchInput();
  const searchQuery = searchInput.query;

  // Filtered sessions derived from list + search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.firstPrompt.toLowerCase().includes(query) ||
        formatDate(s.timestamp, true).includes(query),
    );
  }, [sessions, searchQuery]);

  const rows = terminalHeight ?? process.stdout.rows ?? 24;
  const listViewportHeight = Math.max(1, rows - 3 - 1);
  const {
    selectedIndex,
    scrollOffset: listScrollOffset,
    handleUp,
    handleDown,
    setSelectedIndex,
  } = useListNavigation(filteredSessions.length, listViewportHeight);

  // Reset selection when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, setSelectedIndex]);

  // Load sessions. Re-fetches when projectPath changes; caches per project.
  useEffect(() => {
    if (sessions.length > 0 && lastProjectPathRef.current === projectPath) return;
    lastProjectPathRef.current = projectPath;
    let cancelled = false;
    setLoading(true);
    setSessions([]);
    listClaudeSessions(projectPath)
      .then((result) => {
        if (!cancelled) {
          setSessions(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectPath, sessions.length]);

  // Compute detail (pager) lines whenever session content changes
  const detailLines = useMemo(() => {
    if (!sessionContent) return [];
    return sessionContent.replace(/\n{3,}/g, '\n\n').trim().split('\n');
  }, [sessionContent]);

  // rows - 3: PagerView has header (1) + separator (1) + footer/status (1)
  const detailContentHeight = rows - 3;

  const detailMaxScroll = useMemo(
    () => Math.max(0, detailLines.length - detailContentHeight),
    [detailLines.length, detailContentHeight],
  );

  const {
    detailSearchMode,
    detailActiveSearch,
    detailCurrentMatchIndex,
    detailMatchingLines,
    handleSearchKey: handleDetailSearchKey,
    resetSearch: resetDetailSearch,
  } = useDetailSearch({
    lines: detailLines,
    scrollOffset: detailScrollOffset,
    setScrollOffset: setDetailScrollOffset,
    contentHeight: detailContentHeight,
  });

  // Helper to switch between sessions list and session-search viewModes
  const setMode = useCallback(
    (mode: 'list' | 'search'): void => {
      if (mode === 'search') {
        setSearchMode(true);
        setViewMode('session-search');
      } else {
        setSearchMode(false);
        setViewMode('sessions');
      }
    },
    [setViewMode],
  );

  const handleKey = useCallback(
    (input: string, key: Key, viewMode: ViewMode): boolean => {
      if (
        viewMode !== 'sessions' &&
        viewMode !== 'session-search' &&
        viewMode !== 'session-detail'
      ) {
        return false;
      }

      // ── Session detail (pager) ──────────────────────────────────────────────
      if (viewMode === 'session-detail') {
        // Delegate search state machine (/, Enter, Esc, n, p) to useDetailSearch
        const searchConsumed = handleDetailSearchKey(input, key);
        if (searchConsumed) return true;

        // Back / clear search
        if (input === 'b' || input === 'B') {
          setViewMode('sessions');
          setSessionContent(null);
          setDetailScrollOffset(0);
          resetDetailSearch();
          return true;
        }

        // Scroll navigation
        // rows - 3: PagerView header (1) + separator (1) + status bar (1)
        if (key.upArrow) {
          setDetailScrollOffset((o) => Math.max(0, o - 1));
          return true;
        }
        if (key.downArrow) {
          setDetailScrollOffset((o) => Math.min(o + 1, detailMaxScroll));
          return true;
        }
        if (key.pageUp) {
          setDetailScrollOffset((o) => Math.max(0, o - detailContentHeight));
          return true;
        }
        if (key.pageDown) {
          setDetailScrollOffset((o) => Math.min(o + detailContentHeight, detailMaxScroll));
          return true;
        }
        if (input === 'd') {
          setDetailScrollOffset((o) => Math.min(o + Math.floor(detailContentHeight / 2), detailMaxScroll));
          return true;
        }
        if (input === 'u') {
          setDetailScrollOffset((o) => Math.max(0, o - Math.floor(detailContentHeight / 2)));
          return true;
        }
        return false;
      }

      // ── Session search input mode ───────────────────────────────────────────
      if (viewMode === 'session-search') {
        if (key.return) {
          setMode('list');
          setSelectedIndex(0);
          return true;
        }
        if (key.upArrow) { handleUp(); return true; }
        if (key.downArrow) { handleDown(); return true; }
        const consumed = searchInput.handleKey(input, key);
        if (consumed) {
          if (key.escape) {
            setMode('list');
            setSelectedIndex(0);
          }
          return true;
        }
        return true;
      }

      // ── Session list mode ───────────────────────────────────────────────────
      if (input === 'b' || input === 'B') {
        setViewMode('board');
        return true;
      }
      if (input === '/') {
        setMode('search');
        searchInput.reset();
        setSelectedIndex(0);
        return true;
      }
      if (key.escape && searchQuery) {
        searchInput.reset();
        setSelectedIndex(0);
        return true;
      }
      if (key.upArrow) { handleUp(); return true; }
      if (key.downArrow) { handleDown(); return true; }
      if (key.return && filteredSessions[selectedIndex]) {
        const session = filteredSessions[selectedIndex];
        const title = `Session: ${session.title}  (${formatDate(session.timestamp, true)})`;
        setDetailTitle(title);
        setDetailScrollOffset(0);
        setSessionContent(null); // triggers loading state in PagerView
        setViewMode('session-detail');

        // Render session content asynchronously. The rendering (renderMarkdownToAnsi per
        // assistant turn) is synchronous and CPU-bound — loading state is shown while
        // this effect runs. We intentionally allow the brief event-loop block.
        // Cancellation guard: if the user navigates away before the promise resolves,
        // the stale result is discarded.
        const loadId = ++sessionLoadIdRef.current;
        const width = process.stdout.columns ?? 80;
        const separator = chalk.dim('─'.repeat(Math.max(0, width - 2)));
        void buildSessionContent(projectPath, session, separator).then((content) => {
          if (loadId === sessionLoadIdRef.current) {
            setSessionContent(content);
          }
        });
        return true;
      }
      return false;
    },
    [
      filteredSessions,
      selectedIndex,
      searchQuery,
      searchInput,
      handleDetailSearchKey,
      resetDetailSearch,
      detailMaxScroll,
      detailContentHeight,
      rows,
      handleUp,
      handleDown,
      setSelectedIndex,
      setMode,
      setViewMode,
      projectPath,
    ],
  );

  const state: SessionViewState = {
    sessions,
    filteredSessions,
    loading,
    selectedIndex,
    listScrollOffset,
    searchQuery,
    searchMode,
    sessionContent,
    detailScrollOffset,
    detailTitle,
    detailSearchMode,
    detailActiveSearch,
    detailCurrentMatchIndex,
    detailMatchingLines,
  };

  return { state, handleKey };
}

// ── Session content builder ─────────────────────────────────────────────────

const USER_SENTINEL = '── User ──';
const ASSISTANT_SENTINEL = '── Assistant ──';

type Turn = { role: 'user' | 'assistant'; body: string };

async function buildSessionContent(
  projectPath: string,
  session: ClaudeSession,
  separator: string,
): Promise<string> {
  const log = await getClaudeSessionLog(projectPath, session.id);
  if (!log) return '(could not read session log)';

  // Strip ANSI so we can split on plain-text sentinel strings
  const plain = stripAnsi(log);

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
    if (parts.length > 0) parts.push(separator);
    if (turn.role === 'user') {
      parts.push(chalk.bold.yellow('── User ──'));
      parts.push(renderMarkdownToAnsi(turn.body));
    } else {
      parts.push(chalk.bold.cyan('── Assistant ──'));
      // renderMarkdownToAnsi is synchronous and CPU-bound; acceptable here
      parts.push(renderMarkdownToAnsi(turn.body));
    }
  }

  return parts.length > 0 ? parts.join('\n') : log;
}
