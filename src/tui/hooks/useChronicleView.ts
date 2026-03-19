import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import type { Deliverable } from '../../shared/types.js';
import type { DocType, DetailSearchMode } from './useKeyboard.js';
import { parseChronicle } from '../../server/services/sdlcParser.js';
import { useListNavigation } from './useListNavigation.js';
import { useSearchInput } from './useSearchInput.js';

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
  // Detail search
  detailSearchMode: DetailSearchMode;
  detailSearchQuery: string;
  detailActiveSearch: string;
  detailCurrentMatchIndex: number;
  detailMatchLinesRef: React.RefObject<number[]>;
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
  const [searchMode, setSearchMode] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(undefined);
  const [activeDocType, setActiveDocType] = useState<DocType>('auto');
  const [detailScrollOffset, setDetailScrollOffset] = useState(0);
  const detailMaxScrollRef = useRef<number>(Infinity);
  const [detailSearchMode, setDetailSearchMode] = useState<DetailSearchMode>('normal');
  const [detailActiveSearch, setDetailActiveSearch] = useState('');
  const [detailCurrentMatchIndex, setDetailCurrentMatchIndex] = useState(0);
  const detailMatchLinesRef = useRef<number[]>([]);

  const searchInput = useSearchInput();
  const detailSearchInput = useSearchInput();
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

  // Load chronicle entries when viewMode transitions to chronicle views.
  // Cache: don't re-fetch if entries already loaded.
  useEffect(() => {
    if (entries.length > 0) return; // cached
    let cancelled = false;
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
    // We intentionally only run this once — entries.length is the cache guard above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

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

        if (input === 'b' || input === 'B') {
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

      // --- Search input mode ---
      if (detailSearchMode === 'search') {
        if (key.return) {
          const query = detailSearchInput.query;
          setDetailActiveSearch(query);
          setDetailSearchMode('normal');
          if (query) setDetailCurrentMatchIndex(0);
          return true;
        }
        const consumed = detailSearchInput.handleKey(input, key);
        if (consumed) {
          if (key.escape) setDetailSearchMode('normal');
          return true;
        }
        return true;
      }

      // --- Normal mode ---

      // Enter search mode
      if (input === '/') {
        detailSearchInput.reset();
        setDetailSearchMode('search');
        return true;
      }

      // Escape / b: clear search first, then go back to list
      if (key.escape || input === 'b' || input === 'B') {
        if (detailActiveSearch) {
          setDetailActiveSearch('');
          detailSearchInput.reset();
          setDetailCurrentMatchIndex(0);
          detailMatchLinesRef.current = [];
          return true;
        }
        setViewMode('chronicle');
        setSelectedFilePath(undefined);
        setActiveDocType('auto');
        setDetailScrollOffset(0);
        setDetailSearchMode('normal');
        setDetailActiveSearch('');
        detailSearchInput.reset();
        setDetailCurrentMatchIndex(0);
        return true;
      }

      // Next match
      if (input === 'n' && detailActiveSearch) {
        const matches = detailMatchLinesRef.current;
        if (matches.length > 0) {
          const nextIdx = (detailCurrentMatchIndex + 1) % matches.length;
          setDetailCurrentMatchIndex(nextIdx);
          setDetailScrollOffset(Math.max(0, (matches[nextIdx] ?? 0) - 2));
        }
        return true;
      }

      // Previous match
      if (input === 'p' && detailActiveSearch) {
        const matches = detailMatchLinesRef.current;
        if (matches.length > 0) {
          const prevIdx = (detailCurrentMatchIndex - 1 + matches.length) % matches.length;
          setDetailCurrentMatchIndex(prevIdx);
          setDetailScrollOffset(Math.max(0, (matches[prevIdx] ?? 0) - 2));
        }
        return true;
      }

      // Doc type switching: 1=spec, 2=plan, 3=result
      if (input === '1' || input === '2' || input === '3') {
        const entry = entries[selectedIndex];
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
      const contentHeight = Math.max(1, rows - 5);
      if (key.upArrow) {
        setDetailScrollOffset((o) => Math.max(0, o - 1));
        return true;
      }
      if (key.downArrow) {
        setDetailScrollOffset((o) => Math.min(o + 1, maxScroll));
        return true;
      }
      if (key.pageUp) {
        setDetailScrollOffset((o) => Math.max(0, o - contentHeight));
        return true;
      }
      if (key.pageDown) {
        setDetailScrollOffset((o) => Math.min(o + contentHeight, maxScroll));
        return true;
      }
      if (input === 'd') {
        setDetailScrollOffset((o) => Math.min(o + Math.floor(contentHeight / 2), maxScroll));
        return true;
      }
      if (input === 'u') {
        setDetailScrollOffset((o) => Math.max(0, o - Math.floor(contentHeight / 2)));
        return true;
      }
      return false;
    },
    [
      entries,
      filteredEntries,
      selectedIndex,
      activeDocType,
      selectedFilePath,
      rows,
      searchMode,
      searchQuery,
      searchInput,
      detailSearchMode,
      detailActiveSearch,
      detailCurrentMatchIndex,
      detailSearchInput,
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
    detailSearchQuery: detailSearchInput.query,
    detailActiveSearch,
    detailCurrentMatchIndex,
    detailMatchLinesRef,
  };

  return { state, handleKey };
}
