import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';

interface UseListNavigationResult {
  selectedIndex: number;
  scrollOffset: number;
  handleUp: () => void;
  handleDown: () => void;
  handlePageUp: () => void;
  handlePageDown: () => void;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
}

export function useListNavigation(
  itemCount: number,
  viewportHeight: number
): UseListNavigationResult {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Clamp selectedIndex when itemCount decreases
  useEffect(() => {
    setSelectedIndex(prev => {
      if (itemCount === 0) return 0;
      if (prev >= itemCount) return itemCount - 1;
      return prev;
    });
  }, [itemCount]);

  // Trailing-edge scroll: keep selectedIndex visible at the bottom edge
  const scrollOffset = Math.max(0, selectedIndex - viewportHeight + 1);

  const handleUp = useCallback((): void => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleDown = useCallback((): void => {
    setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, itemCount - 1)));
  }, [itemCount]);

  const handlePageUp = useCallback((): void => {
    setSelectedIndex((prev) => Math.max(0, prev - viewportHeight));
  }, [viewportHeight]);

  const handlePageDown = useCallback((): void => {
    setSelectedIndex((prev) => Math.min(prev + viewportHeight, Math.max(0, itemCount - 1)));
  }, [itemCount, viewportHeight]);

  return {
    selectedIndex,
    scrollOffset,
    handleUp,
    handleDown,
    handlePageUp,
    handlePageDown,
    setSelectedIndex,
  };
}
