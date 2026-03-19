import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import type { UntrackedCommit } from '../../shared/types.js';
import { getUntrackedCommits } from '../../server/services/gitParser.js';
import { useListNavigation } from './useListNavigation.js';
import { useSearchInput } from './useSearchInput.js';
import { useDetailSearch } from './useDetailSearch.js';
import { execFile } from 'node:child_process';

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
  detailActiveSearch: string;
  detailCurrentMatchIndex: number;
  detailSearchMode: boolean; // true when /search input active in detail
  // Derived: matching line indices (computed in hook, used by component)
  detailMatchingLines: number[];
}

interface UseAdhocViewResult {
  state: AdhocViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
}

export function useAdhocView(
  projectPath: string,
  setViewMode: (mode: ViewMode) => void,
  terminalHeight?: number,
): UseAdhocViewResult {
  const [commits, setCommits] = useState<UntrackedCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const lastProjectPathRef = useRef<string | undefined>(undefined);
  const [listSearchMode, setListSearchMode] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<UntrackedCommit | null>(null);
  const [detailContent, setDetailContent] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailScrollOffset, setDetailScrollOffset] = useState(0);
  const listSearchInput = useSearchInput();
  const listSearchQuery = listSearchInput.query;

  // Ref for cancellation of execFile callbacks on unmount
  const unmountedRef = useRef(false);
  useEffect(() => {
    return () => { unmountedRef.current = true; };
  }, []);

  // Ref for stale-load cancellation: if the user selects a new commit before
  // the previous git show resolves, the earlier callback discards its result.
  const detailLoadIdRef = useRef(0);

  // Load untracked commits. Re-fetches when projectPath changes; caches per project.
  // getUntrackedCommits is synchronous (uses execSync internally). We wrap in a useEffect
  // with a brief async yield so the loading state renders before blocking.
  useEffect(() => {
    if (commits.length > 0 && lastProjectPathRef.current === projectPath) return;
    lastProjectPathRef.current = projectPath;
    let cancelled = false;
    setLoading(true);
    setCommits([]);
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
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
  }, [projectPath, commits.length]);

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

  // rows - 5: 3-line header (hash/message, date, separator) + 1 status bar + 1 bottom bar
  const detailContentHeight = Math.max(1, rows - 5);

  const {
    detailSearchMode,
    detailActiveSearch,
    detailCurrentMatchIndex,
    detailMatchingLines,
    detailMaxScroll,
    handleSearchKey: handleDetailSearchKey,
    resetSearch: resetDetailSearch,
  } = useDetailSearch({
    lines: detailLines,
    scrollOffset: detailScrollOffset,
    setScrollOffset: setDetailScrollOffset,
    contentHeight: detailContentHeight,
  });

  const openDetail = useCallback(
    (commit: UntrackedCommit) => {
      setSelectedCommit(commit);
      setDetailContent(null);
      setDetailLoading(true);
      setDetailScrollOffset(0);
      resetDetailSearch();

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
    [projectPath, resetDetailSearch],
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
        // Delegate search state machine (/, Enter, Esc, n, p) to useDetailSearch.
        // Note: adhoc-detail-search viewMode is used for the search-active state;
        // we also need to update viewMode when entering/exiting search.
        if (detailSearchMode || input === '/') {
          if (input === '/') {
            setViewMode('adhoc-detail-search');
          }
          const searchConsumed = handleDetailSearchKey(input, key);
          if (searchConsumed) {
            // When Esc consumed by the search handler, always revert to adhoc-detail.
            // Unconditional: stale viewMode state cannot cause a wrong transition.
            if (key.escape) {
              setViewMode('adhoc-detail');
            }
            return true;
          }
          // Unhandled key in search mode falls through
        }

        // Back / clear search
        if (input === 'b' || key.escape) {
          if (detailActiveSearch) {
            resetDetailSearch();
            if (viewMode === 'adhoc-detail-search') setViewMode('adhoc-detail');
            return true;
          }
          setViewMode('adhoc');
          setDetailContent(null);
          setSelectedCommit(null);
          return true;
        }

        // Scroll navigation
        if (key.upArrow) {
          setDetailScrollOffset((o) => Math.max(0, o - 1));
          return true;
        }
        if (key.downArrow) {
          setDetailScrollOffset((o) => Math.min(o + 1, detailMaxScroll));
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
      detailActiveSearch,
      handleDetailSearchKey,
      resetDetailSearch,
      detailMaxScroll,
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
    detailActiveSearch,
    detailCurrentMatchIndex,
    detailSearchMode,
    detailMatchingLines,
  };

  return { state, handleKey };
}
