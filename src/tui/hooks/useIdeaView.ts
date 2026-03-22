import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import type { Deliverable } from '../../shared/types.js';
import type { DocType } from './useKeyboard.js';
import { useListNavigation } from './useListNavigation.js';
import { useSearchInput } from './useSearchInput.js';
import { useDetailSearch } from './useDetailSearch.js';
import { useFileContent } from './useFileContent.js';
import { useMarkdownLines } from '../components/MarkdownPanel.js';

export interface IdeaViewState {
  entries: Deliverable[];
  filteredEntries: Deliverable[];
  selectedIndex: number;
  scrollOffset: number;
  searchQuery: string;
  searchMode: boolean;
  selectedFilePath: string | undefined;
  activeDocType: DocType;
  detailScrollOffset: number;
  detailMaxScrollRef: React.RefObject<number>;
  detailSearchMode: boolean;
  detailActiveSearch: string;
  detailCurrentMatchIndex: number;
  detailMatchingLines: number[];
}

interface UseIdeaViewResult {
  state: IdeaViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
}

function resolveDocPath(entry: Deliverable): string | undefined {
  // Ideas typically have a single file; prefer result, then plan, then spec
  return entry.resultPath ?? entry.planPath ?? entry.specPath;
}

export function useIdeaView(
  cards: Deliverable[],
  projectPath: string,
  setViewMode: (mode: ViewMode) => void,
  terminalHeight?: number,
): UseIdeaViewResult {
  const [searchMode, setSearchMode] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(undefined);
  const [activeDocType, setActiveDocType] = useState<DocType>('auto');
  const [detailScrollOffset, setDetailScrollOffset] = useState(0);
  const detailMaxScrollRef = useRef<number>(Infinity);

  const searchInput = useSearchInput();
  const searchQuery = searchInput.query;

  // Filtered entries derived from search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q),
    );
  }, [cards, searchQuery]);

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
      if (viewMode !== 'ideas' && viewMode !== 'idea-detail') return false;

      if (viewMode === 'ideas') {
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
          const filePath = resolveDocPath(entry);
          if (!filePath) {
            setSelectedFilePath(undefined);
            setDetailScrollOffset(0);
            setViewMode('idea-detail');
            return true;
          }
          if (filePath === selectedFilePath) {
            setDetailScrollOffset(0);
            setViewMode('idea-detail');
            return true;
          }
          setSelectedFilePath(filePath);
          setDetailScrollOffset(0);
          setViewMode('idea-detail');
          return true;
        }
        return false;
      }

      // idea-detail mode

      // Delegate search state machine (/, Enter, Esc, n, p) to useDetailSearch
      const searchConsumed = handleDetailSearchKey(input, key);
      if (searchConsumed) return true;

      // Escape / b: go back to list
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode('ideas');
        setSelectedFilePath(undefined);
        setActiveDocType('auto');
        setDetailScrollOffset(0);
        resetDetailSearch();
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

  const state: IdeaViewState = {
    entries: cards,
    filteredEntries,
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
