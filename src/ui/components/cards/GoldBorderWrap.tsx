import type { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import type { RarityTier } from '@shared/types';

interface GoldBorderWrapProps {
  rarity: RarityTier;
  children: ReactNode;
}

/**
 * Gold animated border wrapper for Epic and Mythic cards.
 * For all other rarities, renders children directly (passthrough).
 *
 * Uses goldPulse animation defined in theme/index.ts globalCss.
 * The gold gradient background shows through a 3px padding gap around the inner dark card.
 */
export function GoldBorderWrap({ rarity, children }: GoldBorderWrapProps) {
  if (rarity !== 'epic' && rarity !== 'mythic') {
    return <>{children}</>;
  }

  return (
    <Box
      position="relative"
      borderRadius="14px"
      _hover={{ boxShadow: '0 0 0 1px rgba(47,116,208,0.15)' }}
      style={{
        padding: '3px',
        background: 'linear-gradient(135deg, #B8860B 0%, #FFD700 20%, #B8860B 40%, #FFE44D 60%, #B8860B 80%, #FFD700 100%)',
        backgroundSize: '300% 300%',
        animation: 'goldPulse 4s ease-in-out infinite',
      }}
    >
      {/* Inner dark wrapper clips the card cleanly */}
      <Box
        borderRadius="11px"
        overflow="hidden"
        background="#1C2333"
      >
        {children}
      </Box>
    </Box>
  );
}
