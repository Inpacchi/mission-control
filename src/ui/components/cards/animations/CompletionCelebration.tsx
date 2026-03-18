import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import { usePrevious } from '../../../hooks/usePrevious';
import type { DeliverableStatus } from '@shared/types';

interface CompletionCelebrationProps {
  status: DeliverableStatus;
  lastModified: string;
  children: ReactNode;
}

const RECENCY_WINDOW_MS = 60_000;

// 8 particles arranged around a full circle
const PARTICLES: Array<{ tx: string; ty: string; color: string }> = [
  { tx: '0px',    ty: '-36px',  color: '#22C55E' },
  { tx: '25px',   ty: '-25px',  color: '#34D399' },
  { tx: '36px',   ty: '0px',   color: '#4D8FE8' },
  { tx: '25px',   ty: '25px',  color: '#A78BFA' },
  { tx: '0px',    ty: '36px',  color: '#22C55E' },
  { tx: '-25px',  ty: '25px',  color: '#F59E0B' },
  { tx: '-36px',  ty: '0px',   color: '#34D399' },
  { tx: '-25px',  ty: '-25px', color: '#FCD34D' },
];

// SVG path for a checkmark inside a 24x24 viewBox
// Points: (4,12) → (9,17) → (20,6)
const CHECK_PATH = 'M4 12 L9 17 L20 6';

/**
 * Overlays a checkmark-draw + particle burst when status transitions TO 'complete'.
 *
 * Guard conditions:
 *   - Previous status was not 'complete' (avoids re-triggering on same-status re-renders)
 *   - lastModified is within the last 60 seconds (avoids false fire on initial load)
 *   - prefers-reduced-motion is not set
 *
 * All animations use transform + opacity only — GPU-composited.
 * Overlay cleans up after ~1.5 seconds.
 */
export function CompletionCelebration({
  status,
  lastModified,
  children,
}: CompletionCelebrationProps) {
  const prevStatus = usePrevious(status);
  const [celebrating, setCelebrating] = useState(false);

  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (prefersReducedMotion.current) return;

    const isTransitionToComplete =
      prevStatus !== undefined &&
      prevStatus !== 'complete' &&
      status === 'complete';

    if (!isTransitionToComplete) return;

    const isRecent =
      Date.now() - new Date(lastModified).getTime() < RECENCY_WINDOW_MS;

    if (!isRecent) return;

    setCelebrating(true);
  }, [status, prevStatus, lastModified]);

  useEffect(() => {
    if (!celebrating) return;
    const timeout = window.setTimeout(() => setCelebrating(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [celebrating]);

  return (
    <Box position="relative">
      {children}

      {celebrating && (
        <Box
          position="absolute"
          inset={0}
          pointerEvents="none"
          // Overflow visible so particles can escape the card bounds
          overflow="visible"
          style={{ zIndex: 10 }}
          aria-hidden="true"
        >
          {/* SVG checkmark draw */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            width={48}
            height={48}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <path
              d={CHECK_PATH}
              stroke="#22C55E"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 60,
                strokeDashoffset: 60,
                animation: 'drawCheck 500ms ease-out forwards',
              }}
            />
          </svg>

          {/* Particle burst — 8 circles exploding outward */}
          {PARTICLES.map((p, i) => (
            <Box
              key={i}
              position="absolute"
              top="50%"
              left="50%"
              width="7px"
              height="7px"
              borderRadius="full"
              style={{
                background: p.color,
                '--tx': p.tx,
                '--ty': p.ty,
                animation: `burstParticle 900ms ease-out ${i * 40}ms forwards`,
              } as React.CSSProperties}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
