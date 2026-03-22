import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import type { Deliverable } from '../../shared/types.js';
import type { DocType } from './useKeyboard.js';
import { parseChronicle } from '../../server/services/sdlcParser.js';
import { useListNavigation } from './useListNavigation.js';
import { useSearchInput } from './useSearchInput.js';
import { useDetailSearch } from './useDetailSearch.js';
import { useFileContent } from './useFileContent.js';
import { useMarkdownLines } from '../components/MarkdownPanel.js';

export interface ChronicleViewState {
  // List state
  entries: Deliverable[];
  filteredEntries: Deliverable[];
  loading: boolean;
  selectedIndex: number;
  scrollOffset: number; // list scroll offset
  searchQuery: string;
  searchMode: boolean;
  // Detail state
  selectedFilePath: string | undefined;
  activeDocType: DocType;
  detailScrollOffset: number;
  detailMaxScrollRef: React.RefObject<number>;
  // Detail search (array-based, from useDetailSearch)
  detailSearchMode: boolean;
  detailActiveSearch: string;
  detailCurrentMatchIndex: number;
  detailMatchingLines: number[];
}

interface UseChronicleViewResult {
  state: ChronicleViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
}

function resolveDocPath(entry: Deliverable, docType: DocType): string | undefined {
  if (docType === 'spec') return entry.specPath;
  if (docType === 'plan') return entry.planPath;
  if (docType === 'result') return entry.resultPath;
  // 'auto': prefer result, fall back to plan, then spec
  return entry.resultPath ?? entry.planPath ?? entry.specPath;
}

export function useChronicleView(
  projectPath: string,
  setViewMode: (mode: ViewMode) => void,
  terminalHeight?: number,
): UseChronicleViewResult {
  const [entries, setEntries] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const lastProjectPathRef = useRef<string | undefined>(undefined);
  const [searchMode, setSearchMode] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(undefined);
  const [activeDocType, setActiveDocType] = useState<DocType>('auto');
  const [detailScrollOffset, setDetailScrollOffset] = useState(0);
  const detailMaxScrollRef = useRef<number>(Infinity);

  const searchInput = useSearchInput();
  const searchQuery = searchInput.query;

  // Filtered entries derived from search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q),
    );
  }, [entries, searchQuery]);

  // List navigation — use reactive terminalHeight when provided, else fall back to process.stdout.rows
  const rows = terminalHeight ?? process.stdout.rows ?? 24;
  const listViewportHeight = Math.max(1, rows - 3 - 1);
  const { selectedIndex, scrollOffset, handleUp, handleDown, setSelectedIndex } = useListNavigation(
    filteredEntries.length,
    listViewportHeight,
  );

  // Reset selection when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, setSelectedIndex]);

  // Load chronicle entries. Re-fetches when projectPath changes; caches per project.
  useEffect(() => {
    if (entries.length > 0 && lastProjectPathRef.current === projectPath) return; // cached
    lastProjectPathRef.current = projectPath;
    let cancelled = false;
    setLoading(true);
    setEntries([]);
    parseChronicle(projectPath)
      .then((result) => {
        if (!cancelled) {
          setEntries(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectPath, entries.length]);

  // Load file content for the detail view so we can compute lines for useDetailSearch
  const { content: detailFileContent } = useFileContent(selectedFilePath, projectPath);

  // rows - 5: 3-line header (title, metadata, separator) + 1 status bar + 1 search bar
  const detailContentHeight = Math.max(1, rows - 5);

  // Compute ANSI lines from the loaded file content
  const detailLines = useMarkdownLines(detailFileContent);

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

  const handleKey = useCallback(
    (input: string, key: Key, viewMode: ViewMode): boolean => {
      if (viewMode !== 'chronicle' && viewMode !== 'chronicle-detail') return false;

      if (viewMode === 'chronicle') {
        // Search mode: all input goes to search
        if (searchMode) {
          if (key.return || key.escape) {
            setSearchMode(false);
            return true;
          }
          return searchInput.handleKey(input, key);
        }

        if (input === 'b' || input === 'B' || (key.escape && !searchQuery)) {
          setViewMode('board');
          return true;
        }
        // Enter search mode
        if (input === '/') {
          setSearchMode(true);
          return true;
        }
        // Clear active search filter
        if (key.escape && searchQuery) {
          searchInput.reset();
          return true;
        }
        if (key.upArrow) {
          handleUp();
          return true;
        }
        if (key.downArrow) {
          handleDown();
          return true;
        }
        if (key.return && filteredEntries[selectedIndex]) {
          const entry = filteredEntries[selectedIndex];
          const filePath = resolveDocPath(entry, activeDocType);
          if (!filePath) {
            setSelectedFilePath(undefined);
            setDetailScrollOffset(0);
            setViewMode('chronicle-detail');
            return true;
          }
          if (filePath === selectedFilePath) {
            setDetailScrollOffset(0);
            setViewMode('chronicle-detail');
            return true;
          }
          setSelectedFilePath(filePath);
          setDetailScrollOffset(0);
          setViewMode('chronicle-detail');
          return true;
        }
        return false;
      }

      // chronicle-detail mode

      // Delegate search state machine (/, Enter, Esc, n, p) to useDetailSearch
      const searchConsumed = handleDetailSearchKey(input, key);
      if (searchConsumed) return true;

      // Escape / b: go back to list
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode('chronicle');
        setSelectedFilePath(undefined);
        setActiveDocType('auto');
        setDetailScrollOffset(0);
        resetDetailSearch();
        return true;
      }

      // Doc type switching: 1=spec, 2=plan, 3=result
      if (input === '1' || input === '2' || input === '3') {
        const entry = filteredEntries[selectedIndex];
        if (entry) {
          const nextType: DocType = input === '1' ? 'spec' : input === '2' ? 'plan' : 'result';
          const filePath = resolveDocPath(entry, nextType);
          if (filePath) {
            setActiveDocType(nextType);
            setSelectedFilePath(filePath);
            setDetailScrollOffset(0);
          }
        }
        return true;
      }

      // Scroll: ↑↓ line, u/d half page, PgUp/Dn full page
      const maxScroll = detailMaxScrollRef.current;
      if (key.upArrow) {
        setDetailScrollOffset((o) => Math.max(0, o - 1));
        return true;
      }
      if (key.downArrow) {
        setDetailScrollOffset((o) => Math.min(o + 1, maxScroll));
        return true;
      }
      if (key.pageUp) {
        setDetailScrollOffset((o) => Math.max(0, o - detailContentHeight));
        return true;
      }
      if (key.pageDown) {
        setDetailScrollOffset((o) => Math.min(o + detailContentHeight, maxScroll));
        return true;
      }
      if (input === 'd') {
        setDetailScrollOffset((o) => Math.min(o + Math.floor(detailContentHeight / 2), maxScroll));
        return true;
      }
      if (input === 'u') {
        setDetailScrollOffset((o) => Math.max(0, o - Math.floor(detailContentHeight / 2)));
        return true;
      }
      return false;
    },
    [
      filteredEntries,
      selectedIndex,
      activeDocType,
      selectedFilePath,
      detailContentHeight,
      searchMode,
      searchQuery,
      searchInput,
      handleDetailSearchKey,
      resetDetailSearch,
      handleUp,
      handleDown,
      setViewMode,
    ],
  );

  const state: ChronicleViewState = {
    entries,
    filteredEntries,
    loading,
    selectedIndex,
    scrollOffset,
    searchQuery,
    searchMode,
    selectedFilePath,
    activeDocType,
    detailScrollOffset,
    detailMaxScrollRef,
    detailSearchMode,
    detailActiveSearch,
    detailCurrentMatchIndex,
    detailMatchingLines,
  };

  return { state, handleKey };
}
