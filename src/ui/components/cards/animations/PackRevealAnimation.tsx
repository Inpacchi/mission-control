import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Box } from '@chakra-ui/react';

interface PackRevealAnimationProps {
  createdAt: string;
  children: ReactNode;
}

const RECENCY_WINDOW_MS = 60_000;

/**
 * Wraps children in a scale-up entrance animation + shimmer sweep overlay
 * when the card was created within the last 60 seconds.
 *
 * - Fires ONCE per mount; does not repeat on re-renders.
 * - Respects prefers-reduced-motion: skips animation entirely if set.
 * - Uses CSS animation only (transform + opacity) — GPU-composited.
 */
export function PackRevealAnimation({ createdAt, children }: PackRevealAnimationProps) {
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const isRecent = useRef(
    Date.now() - new Date(createdAt).getTime() < RECENCY_WINDOW_MS
  );

  // Only animate if recent AND motion is allowed
  const [animating, setAnimating] = useState(
    isRecent.current && !prefersReducedMotion.current
  );

  // Safety: clear animating state after 600ms (slightly beyond animation duration)
  // in case onAnimationEnd doesn't fire (e.g., element unmounts mid-animation).
  useEffect(() => {
    if (!animating) return;
    const timeout = window.setTimeout(() => setAnimating(false), 600);
    return () => window.clearTimeout(timeout);
  }, [animating]);

  if (!animating) {
    return <>{children}</>;
  }

  return (
    <Box
      position="relative"
      style={{
        animation: 'packRevealScale 400ms ease-out forwards',
      }}
      onAnimationEnd={() => setAnimating(false)}
    >
      {children}

      {/* Shimmer sweep overlay — plays once alongside the scale-up */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="8px"
        pointerEvents="none"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top={0}
          bottom={0}
          width="60%"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
            animation: 'packRevealShimmer 500ms ease-out forwards',
          }}
        />
      </Box>
    </Box>
  );
}
