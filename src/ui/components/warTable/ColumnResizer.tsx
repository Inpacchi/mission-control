import { useCallback, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';

const MIN_PCT = 15;

interface ColumnResizerProps {
  containerRef: React.RefObject<HTMLElement>;
  position: 'left' | 'right';
  onResize: (leftPct: number, centerPct: number, rightPct: number) => void;
  currentWidths: { left: number; center: number; right: number };
}

export function ColumnResizer({
  containerRef,
  position,
  onResize,
  currentWidths,
}: ColumnResizerProps) {
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthsRef = useRef(currentWidths);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      setDragging(true);
      startXRef.current = e.clientX;
      startWidthsRef.current = { ...currentWidths };
    },
    [currentWidths]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.getBoundingClientRect().width;
      if (containerWidth === 0) return;

      const deltaX = e.clientX - startXRef.current;
      const deltaPct = (deltaX / containerWidth) * 100;

      const start = startWidthsRef.current;

      let left = start.left;
      let center = start.center;
      let right = start.right;

      if (position === 'left') {
        // Resizer between left and center
        left = start.left + deltaPct;
        center = start.center - deltaPct;

        // Enforce minimums
        if (left < MIN_PCT) {
          const overflow = MIN_PCT - left;
          left = MIN_PCT;
          center = center - overflow;
        }
        if (center < MIN_PCT) {
          const overflow = MIN_PCT - center;
          center = MIN_PCT;
          left = left - overflow;
        }
        // right stays the same
      } else {
        // Resizer between center and right
        center = start.center + deltaPct;
        right = start.right - deltaPct;

        if (right < MIN_PCT) {
          const overflow = MIN_PCT - right;
          right = MIN_PCT;
          center = center - overflow;
        }
        if (center < MIN_PCT) {
          const overflow = MIN_PCT - center;
          center = MIN_PCT;
          right = right - overflow;
        }
        // left stays the same
      }

      onResize(left, center, right);
    },
    [dragging, containerRef, position, onResize]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      setDragging(false);
    },
    []
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      setDragging(false);
    },
    []
  );

  return (
    <Box
      role="separator"
      aria-label={`Resize ${position === 'left' ? 'terminal and tactical' : 'tactical and intel'} columns`}
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      w="5px"
      flexShrink={0}
      cursor="col-resize"
      bg={dragging ? 'border.accent' : 'border.subtle'}
      transition={dragging ? 'none' : 'background-color 150ms ease'}
      position="relative"
      _hover={{ bg: 'border.strong' }}
      _after={{
        content: '""',
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '-4px',
        right: '-4px',
      }}
    />
  );
}
