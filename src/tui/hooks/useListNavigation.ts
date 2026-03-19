import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

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

  function handleUp(): void {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  }

  function handleDown(): void {
    if (itemCount === 0) return;
    setSelectedIndex((prev) => Math.min(prev + 1, itemCount - 1));
  }

  function handlePageUp(): void {
    setSelectedIndex((prev) => Math.max(0, prev - viewportHeight));
  }

  function handlePageDown(): void {
    if (itemCount === 0) return;
    setSelectedIndex((prev) => Math.min(prev + viewportHeight, itemCount - 1));
  }

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
