import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import type { UntrackedCommit } from '../../shared/types.js';
import { getUntrackedCommits } from '../../server/services/gitParser.js';
import { useListNavigation } from './useListNavigation.js';
import { useSearchInput } from './useSearchInput.js';
import { execFile } from 'node:child_process';
import { stripAnsi } from '../renderMarkdown.js';

export interface AdhocViewState {
  // List state
  commits: UntrackedCommit[];
  filteredCommits: UntrackedCommit[];
  loading: boolean;
  selectedIndex: number;
  listScrollOffset: number;
  // List search state
  listSearchQuery: string;
  listSearchMode: boolean; // true when /search input is active
  // Detail state
  selectedCommit: UntrackedCommit | null;
  detailContent: string | null;
  detailLoading: boolean;
  detailScrollOffset: number;
  // Detail search state
  detailSearchQuery: string;
  activeDetailSearch: string;
  currentMatchIndex: number;
  detailSearchMode: boolean; // true when /search input active in detail
  // Derived: matching line indices (computed in hook, used by component)
  matchingLines: number[];
}

const DEFAULT_STATE: AdhocViewState = {
  commits: [],
  filteredCommits: [],
  loading: true,
  selectedIndex: 0,
  listScrollOffset: 0,
  listSearchQuery: '',
  listSearchMode: false,
  selectedCommit: null,
  detailContent: null,
  detailLoading: false,
  detailScrollOffset: 0,
  detailSearchQuery: '',
  activeDetailSearch: '',
  currentMatchIndex: 0,
  detailSearchMode: false,
  matchingLines: [],
};

interface UseAdhocViewResult {
  state: AdhocViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
}

const SUMMARY_RE = /\d+ files? changed/;

export function useAdhocView(
  projectPath: string,
  setViewMode: (mode: ViewMode) => void,
  terminalHeight?: number,
): UseAdhocViewResult {
  const [commits, setCommits] = useState<UntrackedCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [listSearchMode, setListSearchMode] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<UntrackedCommit | null>(null);
  const [detailContent, setDetailContent] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailScrollOffset, setDetailScrollOffset] = useState(0);
  const [detailSearchMode, setDetailSearchMode] = useState(false);
  const [activeDetailSearch, setActiveDetailSearch] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const listSearchInput = useSearchInput();
  const listSearchQuery = listSearchInput.query;

  const detailSearchInput = useSearchInput();
  const detailSearchQuery = detailSearchInput.query;

  // Ref for cancellation of execFile callbacks on unmount
  const unmountedRef = useRef(false);
  useEffect(() => {
    return () => { unmountedRef.current = true; };
  }, []);

  // Ref for stale-load cancellation: if the user selects a new commit before
  // the previous git show resolves, the earlier callback discards its result.
  const detailLoadIdRef = useRef(0);

  // Load untracked commits once. getUntrackedCommits is synchronous (uses execSync internally).
  // We wrap in a useEffect with a brief async yield so the loading state renders before blocking.
  useEffect(() => {
    if (commits.length > 0) return; // cached
    let cancelled = false;
    // Use Promise.resolve() to defer to next microtask, allowing loading UI to render first
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        // NOTE: getUntrackedCommits uses execSync internally — this blocks the event loop briefly.
        // This is acceptable for the unified app since it's a one-time startup cost.
        const result = getUntrackedCommits(projectPath);
        if (!cancelled) {
          setCommits(result);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  const filteredCommits = useMemo(() => {
    if (!listSearchQuery) return commits;
    const q = listSearchQuery.toLowerCase();
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(q) ||
        c.hash.toLowerCase().includes(q),
    );
  }, [commits, listSearchQuery]);

  const rows = terminalHeight ?? process.stdout.rows ?? 24;
  const listViewportHeight = Math.max(1, rows - 3 - 1);
  const {
    selectedIndex,
    scrollOffset: listScrollOffset,
    handleUp,
    handleDown,
    setSelectedIndex,
  } = useListNavigation(filteredCommits.length, listViewportHeight);

  // Reset list selection when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [listSearchQuery, setSelectedIndex]);

  const detailLines = useMemo(
    () => (detailContent ? detailContent.split('\n') : []),
    [detailContent],
  );

  const matchingLines = useMemo(() => {
    if (!activeDetailSearch) return [];
    const q = activeDetailSearch.toLowerCase();
    return detailLines.reduce<number[]>((acc, line, i) => {
      if (stripAnsi(line).toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [detailLines, activeDetailSearch]);

  const detailContentHeight = Math.max(1, rows - 5);

  const scrollToDetailLine = useCallback(
    (line: number): number =>
      Math.max(0, Math.min(line - Math.floor(detailContentHeight / 4), Math.max(0, detailLines.length - detailContentHeight))),
    [detailContentHeight, detailLines.length],
  );

  const openDetail = useCallback(
    (commit: UntrackedCommit) => {
      setSelectedCommit(commit);
      setDetailContent(null);
      setDetailLoading(true);
      setDetailScrollOffset(0);
      setDetailSearchMode(false);
      setActiveDetailSearch('');
      detailSearchInput.reset();
      setCurrentMatchIndex(0);

      const loadId = ++detailLoadIdRef.current;
      execFile(
        'git',
        ['show', '--stat', commit.hash],
        { cwd: projectPath },
        (err, stdout) => {
          if (unmountedRef.current) return;
          if (loadId !== detailLoadIdRef.current) return; // stale load
          if (err) {
            setDetailContent(`(error: ${err.message})`);
          } else {
            setDetailContent(stdout);
          }
          setDetailLoading(false);
        },
      );
    },
    [projectPath, detailSearchInput],
  );

  const handleKey = useCallback(
    (input: string, key: Key, viewMode: ViewMode): boolean => {
      if (
        viewMode !== 'adhoc' &&
        viewMode !== 'adhoc-search' &&
        viewMode !== 'adhoc-detail' &&
        viewMode !== 'adhoc-detail-search'
      ) {
        return false;
      }

      // ── Detail view ──────────────────────────────────────────────────────────
      if (viewMode === 'adhoc-detail' || viewMode === 'adhoc-detail-search') {
        // Detail search mode
        if (detailSearchMode) {
          if (key.return) {
            setActiveDetailSearch(detailSearchQuery);
            setDetailSearchMode(false);
            setViewMode('adhoc-detail');
            if (detailSearchQuery) {
              const q = detailSearchQuery.toLowerCase();
              const allMatches = detailLines.reduce<number[]>((acc, line, i) => {
                if (stripAnsi(line).toLowerCase().includes(q)) acc.push(i);
                return acc;
              }, []);
              const idx = allMatches.findIndex((m) => m >= detailScrollOffset);
              if (idx >= 0) {
                setCurrentMatchIndex(idx);
                setDetailScrollOffset(scrollToDetailLine(allMatches[idx]));
              } else if (allMatches.length > 0) {
                setCurrentMatchIndex(0);
                setDetailScrollOffset(scrollToDetailLine(allMatches[0]));
              }
            }
            return true;
          }
          const consumed = detailSearchInput.handleKey(input, key);
          if (consumed) {
            if (key.escape) {
              setDetailSearchMode(false);
              setViewMode('adhoc-detail');
            }
            return true;
          }
          return true;
        }

        // Detail normal mode
        if (input === 'b' || key.escape) {
          if (activeDetailSearch) {
            setActiveDetailSearch('');
            detailSearchInput.reset();
            setCurrentMatchIndex(0);
            return true;
          }
          setViewMode('adhoc');
          setDetailContent(null);
          setSelectedCommit(null);
          return true;
        }
        if (input === '/') {
          detailSearchInput.reset();
          setDetailSearchMode(true);
          setViewMode('adhoc-detail-search');
          return true;
        }
        if (input === 'n' && activeDetailSearch && matchingLines.length > 0) {
          const nextIdx = (currentMatchIndex + 1) % matchingLines.length;
          setCurrentMatchIndex(nextIdx);
          setDetailScrollOffset(scrollToDetailLine(matchingLines[nextIdx]));
          return true;
        }
        if (input === 'p' && activeDetailSearch && matchingLines.length > 0) {
          const prevIdx = (currentMatchIndex - 1 + matchingLines.length) % matchingLines.length;
          setCurrentMatchIndex(prevIdx);
          setDetailScrollOffset(scrollToDetailLine(matchingLines[prevIdx]));
          return true;
        }
        if (key.upArrow) {
          setDetailScrollOffset((o) => Math.max(0, o - 1));
          return true;
        }
        if (key.downArrow) {
          const maxScroll = Math.max(0, detailLines.length - detailContentHeight);
          setDetailScrollOffset((o) => Math.min(o + 1, maxScroll));
          return true;
        }
        return false;
      }

      // ── List search mode ─────────────────────────────────────────────────────
      if (viewMode === 'adhoc-search') {
        if (key.return) {
          setListSearchMode(false);
          setViewMode('adhoc');
          setSelectedIndex(0);
          return true;
        }
        if (key.upArrow) { handleUp(); return true; }
        if (key.downArrow) { handleDown(); return true; }
        const consumed = listSearchInput.handleKey(input, key);
        if (consumed) {
          if (key.escape) {
            setListSearchMode(false);
            setViewMode('adhoc');
            setSelectedIndex(0);
          }
          return true;
        }
        return true;
      }

      // ── List normal mode ─────────────────────────────────────────────────────
      if (input === 'b' || (key.escape && !listSearchQuery)) {
        setViewMode('board');
        return true;
      }
      if (key.escape && listSearchQuery) {
        listSearchInput.reset();
        setSelectedIndex(0);
        return true;
      }
      if (input === '/') {
        setListSearchMode(true);
        listSearchInput.reset();
        setSelectedIndex(0);
        setViewMode('adhoc-search');
        return true;
      }
      if (key.upArrow) { handleUp(); return true; }
      if (key.downArrow) { handleDown(); return true; }
      if (key.return && filteredCommits[selectedIndex]) {
        openDetail(filteredCommits[selectedIndex]);
        setViewMode('adhoc-detail');
        return true;
      }
      return false;
    },
    [
      detailSearchMode,
      detailSearchQuery,
      detailSearchInput,
      activeDetailSearch,
      matchingLines,
      currentMatchIndex,
      detailScrollOffset,
      detailLines,
      detailContentHeight,
      scrollToDetailLine,
      listSearchQuery,
      listSearchInput,
      filteredCommits,
      selectedIndex,
      handleUp,
      handleDown,
      setSelectedIndex,
      setViewMode,
      openDetail,
    ],
  );

  const state: AdhocViewState = {
    commits,
    filteredCommits,
    loading,
    selectedIndex,
    listScrollOffset,
    listSearchQuery,
    listSearchMode,
    selectedCommit,
    detailContent,
    detailLoading,
    detailScrollOffset,
    detailSearchQuery,
    activeDetailSearch,
    currentMatchIndex,
    detailSearchMode,
    matchingLines,
  };

  return { state, handleKey };
}
