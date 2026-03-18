import { useState, useCallback, useEffect } from 'react';
import { useInput } from 'ink';
import type { Deliverable } from '../../shared/types.js';

export type ViewMode = 'board' | 'detail';

export type BoardAction = 'files' | 'chronicle' | 'adhoc' | 'sessions' | null;

interface Zone {
  name: string;
  cards: Deliverable[];
  type: 'deck' | 'active' | 'review' | 'graveyard';
}

interface UseKeyboardOptions {
  zones: Zone[];
  viewMode: ViewMode;
  onExit: () => void;
  onOpenEditor?: () => void;
  collapsed?: boolean;
}

export type DocType = 'auto' | 'spec' | 'plan' | 'result';

interface UseKeyboardResult {
  selectedZone: number;
  selectedCard: number;
  viewMode: ViewMode;
  showHelp: boolean;
  expandedCardId: string | null;
  detailScrollOffset: number;
  activeDocType: DocType;
  pendingAction: BoardAction;
}

export function useKeyboard({
  zones,
  viewMode: initialViewMode,
  onExit,
  onOpenEditor,
  collapsed = false,
}: UseKeyboardOptions): UseKeyboardResult {
  const [selectedZone, setSelectedZone] = useState<number>(1); // Default to Active Zone
  const [selectedCard, setSelectedCard] = useState<number>(0);
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(initialViewMode);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [activeDocType, setActiveDocType] = useState<DocType>('auto');
  const [detailScrollOffset, setDetailScrollOffset] = useState<number>(0);
  const [pendingAction, setPendingAction] = useState<BoardAction>(null);

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

  useInput((input, key) => {
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

      // Launch subcommands (exit board, run command, re-enter board)
      if (input === 'f') { setPendingAction('files'); return; }
      if (input === 'c') { setPendingAction('chronicle'); return; }
      if (input === 'a') { setPendingAction('adhoc'); return; }
      if (input === 's') { setPendingAction('sessions'); return; }

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
      if (key.escape || input === 'q' || input === 'Q') {
        setExpandedCardId(null);
        setCurrentViewMode('board');
        setDetailScrollOffset(0);
        setActiveDocType('auto');
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
        setDetailScrollOffset((prev) => Math.min(prev + 1, 10000));
        return;
      }
    }
  });

  return {
    selectedZone,
    selectedCard,
    viewMode: currentViewMode,
    showHelp,
    expandedCardId,
    detailScrollOffset,
    activeDocType,
    pendingAction,
  };
}
