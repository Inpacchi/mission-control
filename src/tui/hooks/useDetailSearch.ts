/**
 * useDetailSearch — shared detail-pane search state machine.
 *
 * Encapsulates the committed-search pattern used across all detail views:
 *   - Enter `/` to begin typing a search query
 *   - Press Enter to commit the query (activates highlighting + n/p navigation)
 *   - Press `n`/`p` to navigate between matches
 *   - Press Esc to clear the active search
 *
 * The hook computes matching line indices from the provided `lines` array.
 * For views where the line data lives inside a component (e.g. DetailPanel with
 * a write-back ref), use the ref-based approach in the calling hook instead.
 *
 * @param lines     - Array of ANSI-styled lines to search within.
 * @param scrollOffset - Current scroll position (read-only; used for initial match jump).
 * @param setScrollOffset - Setter for scroll offset (called when navigating to a match).
 * @param stripAnsi - Function to strip ANSI codes before matching.
 */
import { useState, useMemo, useCallback } from 'react';
import type { Key } from 'ink';
import { useSearchInput } from './useSearchInput.js';
import { stripAnsi } from '../renderMarkdown.js';

export interface UseDetailSearchResult {
  /** True when the user is actively typing a search query (before committing) */
  detailSearchMode: boolean;
  /** The live query being typed (shown in UI as `/query▎`) */
  detailSearchQuery: string;
  /** The committed search term used for highlighting and navigation */
  detailActiveSearch: string;
  /** Index into detailMatchingLines of the currently highlighted match */
  detailCurrentMatchIndex: number;
  /** Absolute line indices that contain a match for detailActiveSearch */
  detailMatchingLines: number[];
  /** Maximum scroll offset: Math.max(0, lines.length - contentHeight) */
  detailMaxScroll: number;

  /**
   * Process a key event for the detail search state machine.
   * Returns true if the key was consumed, false if it should fall through.
   */
  handleSearchKey: (input: string, key: Key) => boolean;

  /** Reset all search state (call when leaving the detail view) */
  resetSearch: () => void;
}

interface UseDetailSearchOptions {
  lines: string[];
  scrollOffset: number;
  setScrollOffset: (updater: number | ((prev: number) => number)) => void;
  /** Height of the visible viewport (used to compute scroll-to position). Defaults to 20. */
  contentHeight?: number;
}

export function useDetailSearch({
  lines,
  scrollOffset,
  setScrollOffset,
  contentHeight = 20,
}: UseDetailSearchOptions): UseDetailSearchResult {
  const [detailSearchMode, setDetailSearchMode] = useState(false);
  const [detailActiveSearch, setDetailActiveSearch] = useState('');
  const [detailCurrentMatchIndex, setDetailCurrentMatchIndex] = useState(0);

  const searchInput = useSearchInput();
  const { query: searchInputQuery, handleKey: searchInputHandleKey, reset: searchInputReset } = searchInput;

  const detailMatchingLines = useMemo(() => {
    if (!detailActiveSearch) return [];
    const q = detailActiveSearch.toLowerCase();
    return lines.reduce<number[]>((acc, line, i) => {
      if (stripAnsi(line).toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [lines, detailActiveSearch]);

  const detailMaxScroll = Math.max(0, lines.length - contentHeight);

  /** Scroll so that `targetLine` appears ~25% from the top of the viewport */
  const scrollToLine = useCallback(
    (targetLine: number): void => {
      const maxScroll = Math.max(0, lines.length - contentHeight);
      const offset = Math.max(0, Math.min(targetLine - Math.floor(contentHeight / 4), maxScroll));
      setScrollOffset(offset);
    },
    [lines.length, contentHeight, setScrollOffset],
  );

  const handleSearchKey = useCallback(
    (input: string, key: Key): boolean => {
      // ── Search input mode ──────────────────────────────────────────────────
      if (detailSearchMode) {
        if (key.return) {
          const query = searchInputQuery;
          setDetailActiveSearch(query);
          setDetailSearchMode(false);
          if (query) {
            const q = query.toLowerCase();
            const allMatches = lines.reduce<number[]>((acc, line, i) => {
              if (stripAnsi(line).toLowerCase().includes(q)) acc.push(i);
              return acc;
            }, []);
            const idx = allMatches.findIndex((m) => m >= scrollOffset);
            if (idx >= 0) {
              setDetailCurrentMatchIndex(idx);
              scrollToLine(allMatches[idx]);
            } else if (allMatches.length > 0) {
              setDetailCurrentMatchIndex(0);
              scrollToLine(allMatches[0]);
            }
          }
          return true;
        }
        const consumed = searchInputHandleKey(input, key);
        if (consumed) {
          if (key.escape) setDetailSearchMode(false);
          return true;
        }
        // Unhandled keys (e.g. arrows) fall through to navigation
        return false;
      }

      // ── Normal mode ────────────────────────────────────────────────────────

      // Enter search mode
      if (input === '/') {
        searchInputReset();
        setDetailSearchMode(true);
        return true;
      }

      // Clear active search
      if (key.escape && detailActiveSearch) {
        setDetailActiveSearch('');
        searchInputReset();
        setDetailCurrentMatchIndex(0);
        return true;
      }

      // Next match
      if (input === 'n' && detailActiveSearch && detailMatchingLines.length > 0) {
        const nextIdx = (detailCurrentMatchIndex + 1) % detailMatchingLines.length;
        setDetailCurrentMatchIndex(nextIdx);
        scrollToLine(detailMatchingLines[nextIdx] ?? 0);
        return true;
      }

      // Previous match
      if (input === 'p' && detailActiveSearch && detailMatchingLines.length > 0) {
        const prevIdx = (detailCurrentMatchIndex - 1 + detailMatchingLines.length) % detailMatchingLines.length;
        setDetailCurrentMatchIndex(prevIdx);
        scrollToLine(detailMatchingLines[prevIdx] ?? 0);
        return true;
      }

      return false;
    },
    [
      detailSearchMode,
      detailActiveSearch,
      detailMatchingLines,
      detailCurrentMatchIndex,
      searchInputQuery,
      searchInputHandleKey,
      searchInputReset,
      lines,
      scrollOffset,
      scrollToLine,
    ],
  );

  const resetSearch = useCallback((): void => {
    setDetailSearchMode(false);
    setDetailActiveSearch('');
    setDetailCurrentMatchIndex(0);
    searchInputReset();
  }, [searchInputReset]);

  return {
    detailSearchMode,
    detailSearchQuery: searchInputQuery,
    detailActiveSearch,
    detailCurrentMatchIndex,
    detailMatchingLines,
    detailMaxScroll,
    handleSearchKey,
    resetSearch,
  };
}
