import { useState, useCallback, useEffect, useRef } from 'react';
import { useInput } from 'ink';
import type { Deliverable } from '../../shared/types.js';
import { useSearchInput } from './useSearchInput.js';
import { useChronicleView } from './useChronicleView.js';
import type { ChronicleViewState } from './useChronicleView.js';
import { useSessionView } from './useSessionView.js';
import type { SessionViewState } from './useSessionView.js';
import { useAdhocView } from './useAdhocView.js';
import type { AdhocViewState } from './useAdhocView.js';
import { useFileView } from './useFileView.js';
import type { FileViewState } from './useFileView.js';

export type ViewMode =
  | 'board'
  | 'detail'
  | 'chronicle'
  | 'chronicle-detail'
  | 'sessions'
  | 'session-search'
  | 'session-detail'
  | 'adhoc'
  | 'adhoc-search'
  | 'adhoc-detail'
  | 'adhoc-detail-search'
  | 'files'
  | 'file-search'
  | 'file-grep-input'
  | 'file-grep-results';

export type DetailSearchMode = 'normal' | 'search';

interface Zone {
  name: string;
  cards: Deliverable[];
  type: 'deck' | 'active' | 'review' | 'graveyard';
}

interface UseKeyboardOptions {
  zones: Zone[];
  projectPath: string;
  onExit: () => void;
  onOpenEditor?: () => void;
  collapsed?: boolean;
  terminalHeight?: number;
}

export type DocType = 'auto' | 'spec' | 'plan' | 'result';

export interface BoardViewState {
  selectedZone: number;
  selectedCard: number;
  showHelp: boolean;
  expandedCardId: string | null;
  detailScrollOffset: number;
  detailMaxScrollRef: React.RefObject<number>;
  activeDocType: DocType;
  // Search state
  detailActiveSearch: string;
  detailCurrentMatchIndex: number;
  detailMatchLinesRef: React.RefObject<number[]>;
}

interface UseKeyboardResult {
  viewMode: ViewMode;
  board: BoardViewState;
  chronicle: ChronicleViewState;
  sessions: SessionViewState;
  adhoc: AdhocViewState;
  files: FileViewState;
}

export function useKeyboard({
  zones,
  projectPath,
  onExit,
  onOpenEditor,
  collapsed = false,
  terminalHeight,
}: UseKeyboardOptions): UseKeyboardResult {
  const [selectedZone, setSelectedZone] = useState<number>(1); // Default to Active Zone
  const [selectedCard, setSelectedCard] = useState<number>(0);
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>('board');
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activeDocType, setActiveDocType] = useState<DocType>('auto');
  const [detailScrollOffset, setDetailScrollOffset] = useState<number>(0);
  const detailMaxScrollRef = useRef<number>(Infinity);

  // Search state for detail panel
  const [detailSearchMode, setDetailSearchMode] = useState<DetailSearchMode>('normal');
  const [detailActiveSearch, setDetailActiveSearch] = useState<string>('');
  const [detailCurrentMatchIndex, setDetailCurrentMatchIndex] = useState<number>(0);
  // DetailPanel writes matching line indices here; hook reads them for n/p navigation
  const detailMatchLinesRef = useRef<number[]>([]);
  const searchInput = useSearchInput();

  // In collapsed mode Deck (0) and Graveyard (3) are badge-only — skip them
  const getNavigableZones = useCallback((): number[] => {
    if (!collapsed) return [0, 1, 2, 3];
    return [1, 2]; // Only Active and Review when collapsed
  }, [collapsed]);

  // When transitioning to collapsed mode, ensure selectedZone is navigable
  useEffect(() => {
    if (collapsed) {
      const navigable = getNavigableZones();
      if (!navigable.includes(selectedZone)) {
        setSelectedZone(navigable[0] ?? 1);
        setSelectedCard(0);
      }
    }
  }, [collapsed, selectedZone, getNavigableZones]);

  const clampCard = useCallback(
    (zone: number, cardIndex: number): number => {
      const count = zones[zone]?.cards.length ?? 0;
      if (count === 0) return 0;
      return Math.max(0, Math.min(cardIndex, count - 1));
    },
    [zones]
  );

  // Per-view hooks — called unconditionally (React rules of hooks)
  const chronicleView = useChronicleView(projectPath, setCurrentViewMode, terminalHeight);
  const sessionView = useSessionView(projectPath, setCurrentViewMode, terminalHeight);
  const adhocView = useAdhocView(projectPath, setCurrentViewMode, terminalHeight);
  const fileView = useFileView(projectPath, setCurrentViewMode, terminalHeight);

  // Board and detail keyboard logic extracted as a closure.
  // Has direct access to all board/detail state variables above.
  function handleBoardKeys(input: string, key: import('ink').Key): void {
    if (currentViewMode === 'board') {
      // Exit
      if (input === 'q' || input === 'Q') {
        onExit();
        return;
      }

      // Help toggle
      if (input === '?') {
        setShowHelp((prev) => !prev);
        return;
      }

      // Open notes in $EDITOR
      if (input === 'n') {
        onOpenEditor?.();
        return;
      }

      // Navigate to sibling views
      if (input === 'f') { setCurrentViewMode('files'); return; }
      if (input === 'c') { setCurrentViewMode('chronicle'); return; }
      if (input === 'a') { setCurrentViewMode('adhoc'); return; }
      if (input === 's') { setCurrentViewMode('sessions'); return; }

      // Zone navigation: Left/Right
      if (key.leftArrow || key.rightArrow) {
        const navigable = getNavigableZones();
        const currentIndex = navigable.indexOf(selectedZone);
        if (currentIndex === -1) {
          setSelectedZone(navigable[0] ?? 1);
          setSelectedCard(0);
          return;
        }
        let nextIndex: number;
        if (key.leftArrow) {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        } else {
          nextIndex = currentIndex < navigable.length - 1 ? currentIndex + 1 : currentIndex;
        }
        const nextZone = navigable[nextIndex] ?? selectedZone;
        setSelectedZone(nextZone);
        setSelectedCard(clampCard(nextZone, 0));
        return;
      }

      // Card navigation: Up/Down
      if (key.upArrow || key.downArrow) {
        const count = zones[selectedZone]?.cards.length ?? 0;
        if (count === 0) return;
        setSelectedCard((prev) => {
          if (key.upArrow) return prev > 0 ? prev - 1 : prev;
          return prev < count - 1 ? prev + 1 : prev;
        });
        return;
      }

      // Enter: expand card into detail view
      if (key.return) {
        const card = zones[selectedZone]?.cards[selectedCard];
        if (card) {
          if (expandedCardId !== card.id) {
            setDetailScrollOffset(0);
          }
          setExpandedCardId(card.id);
          setCurrentViewMode('detail');
        }
        return;
      }

      // Escape: clear selection / close help
      if (key.escape) {
        if (showHelp) {
          setShowHelp(false);
        } else if (expandedCardId) {
          setExpandedCardId(null);
          setCurrentViewMode('board');
        }
        return;
      }
    }

    if (currentViewMode === 'detail') {
      // --- Search input mode ---
      if (detailSearchMode === 'search') {
        if (key.return) {
          // Commit the search and jump to first match
          const query = searchInput.query;
          setDetailActiveSearch(query);
          setDetailSearchMode('normal');
          if (query) {
            // matchLinesRef will be populated by DetailPanel on next render.
            // Jump to index 0 — DetailPanel will reconcile scroll on its next render
            // via the useEffect that watches detailActiveSearch + detailCurrentMatchIndex.
            setDetailCurrentMatchIndex(0);
          }
          return;
        }
        const consumed = searchInput.handleKey(input, key);
        if (consumed) {
          if (key.escape) {
            // Query cleared by hook — also exit search mode without committing
            setDetailSearchMode('normal');
          }
          return;
        }
        return;
      }

      // --- Normal mode ---

      // Enter search mode
      if (input === '/') {
        searchInput.reset();
        setDetailSearchMode('search');
        return;
      }

      // Escape: clear search first, then go back to board
      if (key.escape || input === 'b' || input === 'B') {
        if (detailActiveSearch) {
          setDetailActiveSearch('');
          searchInput.reset();
          setDetailCurrentMatchIndex(0);
          detailMatchLinesRef.current = [];
          return;
        }
        setExpandedCardId(null);
        setCurrentViewMode('board');
        setDetailScrollOffset(0);
        setDetailSearchMode('normal');
        setDetailActiveSearch('');
        searchInput.reset();
        setDetailCurrentMatchIndex(0);
        setActiveDocType('auto');
        return;
      }

      // q/Q quits the entire process from detail view
      if (input === 'q' || input === 'Q') {
        onExit();
        return;
      }

      // Next match
      if (input === 'n' && detailActiveSearch) {
        const matches = detailMatchLinesRef.current;
        if (matches.length > 0) {
          const nextIdx = (detailCurrentMatchIndex + 1) % matches.length;
          setDetailCurrentMatchIndex(nextIdx);
          const targetLine = matches[nextIdx] ?? 0;
          setDetailScrollOffset(Math.max(0, targetLine - 2));
        }
        return;
      }

      // Previous match
      if (input === 'p' && detailActiveSearch) {
        const matches = detailMatchLinesRef.current;
        if (matches.length > 0) {
          const prevIdx = (detailCurrentMatchIndex - 1 + matches.length) % matches.length;
          setDetailCurrentMatchIndex(prevIdx);
          const targetLine = matches[prevIdx] ?? 0;
          setDetailScrollOffset(Math.max(0, targetLine - 2));
        }
        return;
      }

      // Switch document type: 1=spec, 2=plan, 3=result
      if (input === '1') { setActiveDocType('spec'); setDetailScrollOffset(0); return; }
      if (input === '2') { setActiveDocType('plan'); setDetailScrollOffset(0); return; }
      if (input === '3') { setActiveDocType('result'); setDetailScrollOffset(0); return; }

      if (key.upArrow) {
        setDetailScrollOffset((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        setDetailScrollOffset((prev) => Math.min(prev + 1, detailMaxScrollRef.current));
        return;
      }

      // height - 4: DetailPanel header (3 lines: title, metadata, separator) + BottomBar (1)
      const contentHeight = Math.max(1, (terminalHeight ?? process.stdout.rows ?? 24) - 4);

      if (key.pageUp) {
        setDetailScrollOffset((prev) => Math.max(0, prev - contentHeight));
        return;
      }

      if (key.pageDown) {
        setDetailScrollOffset((prev) => Math.min(prev + contentHeight, detailMaxScrollRef.current));
        return;
      }

      if (input === 'd') {
        setDetailScrollOffset((prev) => Math.min(prev + Math.floor(contentHeight / 2), detailMaxScrollRef.current));
        return;
      }

      if (input === 'u') {
        setDetailScrollOffset((prev) => Math.max(0, prev - Math.floor(contentHeight / 2)));
        return;
      }
    }
  }

  const handlerRef = useRef<(input: string, key: import('ink').Key) => void>(() => {});
  handlerRef.current = (input: string, key: import('ink').Key) => {
    if (currentViewMode === 'board' || currentViewMode === 'detail') {
      handleBoardKeys(input, key);
      return;
    }
    if (currentViewMode.startsWith('chronicle')) {
      chronicleView.handleKey(input, key, currentViewMode);
      return;
    }
    if (currentViewMode.startsWith('session')) {
      sessionView.handleKey(input, key, currentViewMode);
      return;
    }
    if (currentViewMode.startsWith('adhoc')) {
      adhocView.handleKey(input, key, currentViewMode);
      return;
    }
    if (currentViewMode.startsWith('file')) {
      fileView.handleKey(input, key, currentViewMode);
      return;
    }
  };
  useInput(useCallback((input: string, key: import('ink').Key) => handlerRef.current(input, key), []));

  const boardState: BoardViewState = {
    selectedZone,
    selectedCard,
    showHelp,
    expandedCardId,
    detailScrollOffset,
    detailMaxScrollRef,
    activeDocType,
    detailActiveSearch,
    detailCurrentMatchIndex,
    detailMatchLinesRef,
  };

  return {
    viewMode: currentViewMode,
    board: boardState,
    chronicle: chronicleView.state,
    sessions: sessionView.state,
    adhoc: adhocView.state,
    files: fileView.state,
  };
}
