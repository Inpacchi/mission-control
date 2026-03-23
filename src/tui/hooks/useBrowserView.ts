/**
 * useBrowserView — shared logic for list+detail browser views.
 *
 * Extracted from useChronicleView and useIdeaView to eliminate ~85% duplication.
 * Handles: search, list navigation, detail file loading, detail search, and
 * all keyboard routing for both list and detail modes.
 *
 * Callers pass their specific ViewMode pair and a resolveDocPath function;
 * the hook is agnostic to the underlying domain (chronicles vs ideas).
 */
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

export interface BrowserViewState {
  entries: Deliverable[];
  filteredEntries: Deliverable[];
  selectedIndex: number;
  scrollOffset: number;
  searchQuery: string;
  searchMode: boolean;
  activeDocType: DocType;
  detailScrollOffset: number;
  detailMaxScrollRef: React.RefObject<number>;
  detailActiveSearch: string;
  detailCurrentMatchIndex: number;
  detailMatchingLines: number[];
}

export interface UseBrowserViewOptions {
  /** The items to display. Pass state-owned array for async loaders; pass prop directly for idea cards. */
  entries: Deliverable[];
  /** ViewMode values for this browser's list and detail screens. */
  viewModes: { list: ViewMode; detail: ViewMode };
  /** Where 'b' navigates from the list screen. */
  backTarget: ViewMode;
  projectPath: string;
  setViewMode: (mode: ViewMode) => void;
  terminalHeight?: number;
  /**
   * When true, 1/2/3 keys switch between spec/plan/result doc types.
   * Set false for browsers whose entries have a single document (ideas).
   */
  enableDocTypeSwitch?: boolean;
  /**
   * Given an entry and the current DocType, return the file path to open.
   * Called on Enter (list → detail) and on 1/2/3 doc-type switches.
   */
  resolveDocPath: (entry: Deliverable, docType: DocType) => string | undefined;
}

export interface UseBrowserViewResult {
  state: BrowserViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
}

export function useBrowserView({
  entries,
  viewModes,
  backTarget,
  projectPath,
  setViewMode,
  terminalHeight,
  enableDocTypeSwitch = false,
  resolveDocPath,
}: UseBrowserViewOptions): UseBrowserViewResult {
  const [searchMode, setSearchMode] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | undefined>(undefined);
  const [activeDocType, setActiveDocType] = useState<DocType>('auto');
  const [detailScrollOffset, setDetailScrollOffset] = useState(0);
  const detailMaxScrollRef = useRef<number>(Infinity);

  const searchInput = useSearchInput();
  const searchQuery = searchInput.query;

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q),
    );
  }, [entries, searchQuery]);

  const rows = terminalHeight ?? process.stdout.rows ?? 24;
  // rows - 2 (BottomBar) - 2 (title + separator header) = rows - 4
  const listViewportHeight = Math.max(1, rows - 4);
  const { selectedIndex, scrollOffset, handleUp, handleDown, setSelectedIndex } = useListNavigation(
    filteredEntries.length,
    listViewportHeight,
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, setSelectedIndex]);

  const { content: detailFileContent } = useFileContent(selectedFilePath, projectPath);

  // rows - 5: 3-line header (title, metadata, separator) + 1 status bar + 1 search bar
  const detailContentHeight = Math.max(1, rows - 5);

  const detailLines = useMarkdownLines(detailFileContent);

  const {
    detailSearchMode: _detailSearchMode,
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
      if (viewMode !== viewModes.list && viewMode !== viewModes.detail) return false;

      if (viewMode === viewModes.list) {
        // Search mode: all input goes to search
        if (searchMode) {
          if (key.return || key.escape) {
            setSearchMode(false);
            return true;
          }
          return searchInput.handleKey(input, key);
        }

        if (input === 'b' || input === 'B' || (key.escape && !searchQuery)) {
          setViewMode(backTarget);
          return true;
        }
        if (input === '/') {
          setSearchMode(true);
          return true;
        }
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
            setViewMode(viewModes.detail);
            return true;
          }
          if (filePath === selectedFilePath) {
            setDetailScrollOffset(0);
            setViewMode(viewModes.detail);
            return true;
          }
          setSelectedFilePath(filePath);
          setDetailScrollOffset(0);
          setViewMode(viewModes.detail);
          return true;
        }
        return false;
      }

      // detail mode

      // Delegate search state machine (/, Enter, Esc, n, p) to useDetailSearch
      const searchConsumed = handleDetailSearchKey(input, key);
      if (searchConsumed) return true;

      // Escape / b: go back to list
      if (key.escape || input === 'b' || input === 'B') {
        setViewMode(viewModes.list);
        setSelectedFilePath(undefined);
        setActiveDocType('auto');
        setDetailScrollOffset(0);
        resetDetailSearch();
        return true;
      }

      // Doc type switching: 1=spec, 2=plan, 3=result (chronicle only)
      if (enableDocTypeSwitch && (input === '1' || input === '2' || input === '3')) {
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
      viewModes,
      backTarget,
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
      enableDocTypeSwitch,
      resolveDocPath,
    ],
  );

  const state: BrowserViewState = {
    entries,
    filteredEntries,
    selectedIndex,
    scrollOffset,
    searchQuery,
    searchMode,
    activeDocType,
    detailScrollOffset,
    detailMaxScrollRef,
    detailActiveSearch,
    detailCurrentMatchIndex,
    detailMatchingLines,
  };

  return { state, handleKey };
}
