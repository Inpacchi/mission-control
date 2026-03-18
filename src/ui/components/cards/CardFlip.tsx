import type { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';

interface CardFlipProps {
  front: ReactNode;
  back: ReactNode;
  flipped: boolean;
  onFlip: () => void;
}

/**
 * 3D flip wrapper for TCG cards.
 * Uses CSS perspective + rotateY(180deg) with backface-visibility:hidden on both faces.
 * Transition: transform 0.6s ease.
 */
export function CardFlip({ front, back, flipped, onFlip }: CardFlipProps) {
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={flipped ? 'Flip card to front' : 'Flip card to back'}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFlip();
        }
      }}
      style={{ perspective: '1000px', cursor: 'pointer' }}
      _focusVisible={{ outline: 'none', boxShadow: '0 0 0 3px rgba(47,116,208,0.5)', borderRadius: 'md' }}
      position="relative"
    >
      {/* Inner container — rotates on flip */}
      <Box
        position="relative"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s ease',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <Box
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {front}
        </Box>

        {/* Back face — pre-rotated 180deg so it starts facing away */}
        <Box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </Box>
      </Box>
    </Box>
  );
}
