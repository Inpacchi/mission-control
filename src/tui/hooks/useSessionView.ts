import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import type { ClaudeSession } from '../../server/services/claudeSessions.js';
import { listClaudeSessions, getClaudeSessionLog } from '../../server/services/claudeSessions.js';
import { useListNavigation } from './useListNavigation.js';
import { useSearchInput } from './useSearchInput.js';
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
  // Pager search state
  pagerSearchQuery: string;
  pagerSearchMode: boolean;
  pagerActiveSearch: string;
  pagerCurrentMatchIndex: number;
  pagerMatchingLines: number[];
}

const DEFAULT_STATE: SessionViewState = {
  sessions: [],
  filteredSessions: [],
  loading: true,
  selectedIndex: 0,
  listScrollOffset: 0,
  searchQuery: '',
  searchMode: false,
  sessionContent: null,
  detailScrollOffset: 0,
  detailTitle: '',
  pagerSearchQuery: '',
  pagerSearchMode: false,
  pagerActiveSearch: '',
  pagerCurrentMatchIndex: 0,
  pagerMatchingLines: [],
};

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
  const [searchMode, setSearchMode] = useState(false);
  const [sessionContent, setSessionContent] = useState<string | null>(null);
  const [detailScrollOffset, setDetailScrollOffset] = useState(0);
  const [detailTitle, setDetailTitle] = useState('');
  // Pager search state
  const [pagerSearchMode, setPagerSearchMode] = useState(false);
  const [pagerActiveSearch, setPagerActiveSearch] = useState('');
  const [pagerCurrentMatchIndex, setPagerCurrentMatchIndex] = useState(0);

  const searchInput = useSearchInput();
  const searchQuery = searchInput.query;
  const pagerSearchInput = useSearchInput();

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

  // Load sessions once on mount (cached — only fetches when sessions list is empty)
  useEffect(() => {
    if (sessions.length > 0) return;
    let cancelled = false;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  // Compute pager matching lines whenever activeSearch or content changes
  const pagerLines = useMemo(() => {
    if (!sessionContent) return [];
    return sessionContent.replace(/\n{3,}/g, '\n\n').trim().split('\n');
  }, [sessionContent]);

  const pagerMatchingLines = useMemo(() => {
    if (!pagerActiveSearch) return [];
    const q = pagerActiveSearch.toLowerCase();
    return pagerLines.reduce<number[]>((acc, line, i) => {
      if (stripAnsi(line).toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [pagerLines, pagerActiveSearch]);

  const pagerMaxScroll = useMemo(() => {
    const contentHeight = rows - 3;
    return Math.max(0, pagerLines.length - contentHeight);
  }, [pagerLines, rows]);

  // Helper: scroll to a target line, placing it ~25% from top of viewport
  const pagerScrollToLine = useCallback(
    (line: number): number => {
      const contentHeight = rows - 3;
      return Math.max(0, Math.min(line - Math.floor(contentHeight / 4), pagerMaxScroll));
    },
    [rows, pagerMaxScroll],
  );

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
        // Pager search input mode
        if (pagerSearchMode) {
          if (key.return) {
            const query = pagerSearchInput.query;
            setPagerActiveSearch(query);
            setPagerSearchMode(false);
            if (query) {
              const q = query.toLowerCase();
              const allMatches = pagerLines.reduce<number[]>((acc, line, i) => {
                if (stripAnsi(line).toLowerCase().includes(q)) acc.push(i);
                return acc;
              }, []);
              const idx = allMatches.findIndex((m) => m >= detailScrollOffset);
              if (idx >= 0) {
                setPagerCurrentMatchIndex(idx);
                setDetailScrollOffset(pagerScrollToLine(allMatches[idx]));
              } else if (allMatches.length > 0) {
                setPagerCurrentMatchIndex(0);
                setDetailScrollOffset(pagerScrollToLine(allMatches[0]));
              }
            }
            return true;
          }
          const consumed = pagerSearchInput.handleKey(input, key);
          if (consumed) {
            if (key.escape) {
              setPagerSearchMode(false);
            }
            return true;
          }
          return true;
        }

        // Pager normal mode
        if (input === 'b' || input === 'B') {
          setViewMode('sessions');
          setSessionContent(null);
          setDetailScrollOffset(0);
          setPagerActiveSearch('');
          pagerSearchInput.reset();
          setPagerCurrentMatchIndex(0);
          setPagerSearchMode(false);
          return true;
        }
        if (key.escape) {
          if (pagerActiveSearch) {
            setPagerActiveSearch('');
            pagerSearchInput.reset();
            setPagerCurrentMatchIndex(0);
          }
          return true;
        }
        if (input === '/') {
          pagerSearchInput.reset();
          setPagerSearchMode(true);
          return true;
        }
        if (input === 'n' && pagerActiveSearch && pagerMatchingLines.length > 0) {
          const nextIdx = (pagerCurrentMatchIndex + 1) % pagerMatchingLines.length;
          setPagerCurrentMatchIndex(nextIdx);
          setDetailScrollOffset(pagerScrollToLine(pagerMatchingLines[nextIdx]));
          return true;
        }
        if (input === 'p' && pagerActiveSearch && pagerMatchingLines.length > 0) {
          const prevIdx = (pagerCurrentMatchIndex - 1 + pagerMatchingLines.length) % pagerMatchingLines.length;
          setPagerCurrentMatchIndex(prevIdx);
          setDetailScrollOffset(pagerScrollToLine(pagerMatchingLines[prevIdx]));
          return true;
        }
        const contentHeight = rows - 3;
        if (key.upArrow) {
          setDetailScrollOffset((o) => Math.max(0, o - 1));
          return true;
        }
        if (key.downArrow) {
          setDetailScrollOffset((o) => Math.min(o + 1, pagerMaxScroll));
          return true;
        }
        if (key.pageUp) {
          setDetailScrollOffset((o) => Math.max(0, o - contentHeight));
          return true;
        }
        if (key.pageDown) {
          setDetailScrollOffset((o) => Math.min(o + contentHeight, pagerMaxScroll));
          return true;
        }
        if (input === 'd') {
          setDetailScrollOffset((o) => Math.min(o + Math.floor(contentHeight / 2), pagerMaxScroll));
          return true;
        }
        if (input === 'u') {
          setDetailScrollOffset((o) => Math.max(0, o - Math.floor(contentHeight / 2)));
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
      pagerSearchInput,
      pagerSearchMode,
      pagerActiveSearch,
      pagerMatchingLines,
      pagerCurrentMatchIndex,
      pagerMaxScroll,
      pagerScrollToLine,
      pagerLines,
      detailScrollOffset,
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
    pagerSearchQuery: pagerSearchInput.query,
    pagerSearchMode,
    pagerActiveSearch,
    pagerCurrentMatchIndex,
    pagerMatchingLines,
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
