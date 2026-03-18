import { type ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import { CheckCircle } from 'lucide-react';
import type { DeliverableComplexity } from '@shared/types';
import { complexityToRarity } from '../../utils/rarity';
import { GoldBorderWrap } from './GoldBorderWrap';
import { HoloOverlay } from './HoloOverlay';

interface RarityEffectsProps {
  complexity?: DeliverableComplexity;
  isComplete: boolean;
  children: ReactNode;
}

/**
 * Complexity-to-rarity mapper that wraps card children with the appropriate visual treatment.
 *
 * Rarity mapping:
 *   common    → no treatment
 *   uncommon  → foilShift animation on card ID (applied via CSS class)
 *   rare      → borderShimmer animated left-border stripe
 *   epic      → GoldBorderWrap + gold glow shadow
 *   mythic    → GoldBorderWrap + HoloOverlay + holo glow
 *
 * Complete cards: rarity at 50% opacity with green glow + check icon overlay.
 * Both dimmed rarity AND green glow+check are simultaneously visible.
 * Color is never the sole completion indicator — check icon always present.
 */
export function RarityEffects({ complexity, isComplete, children }: RarityEffectsProps) {
  const rarity = complexityToRarity(complexity);

  // Build the rarity-treated content
  let content: ReactNode;

  switch (rarity) {
    case 'common':
      content = children;
      break;

    case 'uncommon':
      // foilShift is defined in theme globalCss keyframes
      // The card itself applies the animation via inline style — we just add a wrapper class marker
      content = (
        <Box position="relative" className="rarity-uncommon-wrap">
          {children}
          {/* Foil overlay: visible background-position sweep + left border accent glow */}
          <Box
            position="absolute"
            inset={0}
            borderRadius="inherit"
            pointerEvents="none"
            zIndex={2}
            style={{
              background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%)',
              backgroundSize: '200% 200%',
              animation: 'foilShift 3s ease-in-out infinite',
              mixBlendMode: 'overlay',
              borderLeft: '3px solid rgba(167,139,250,0.5)',
              boxShadow: 'inset 2px 0 8px rgba(167,139,250,0.15)',
            }}
          />
        </Box>
      );
      break;

    case 'rare':
      // borderShimmer: animated left-border stripe treatment
      // TcgCard self-detects Rare rarity and suppresses its own left border so this stripe is the sole indicator
      content = (
        <Box position="relative" overflow="hidden">
          {children}
          {/* Animated left border stripe */}
          <Box
            position="absolute"
            left={0}
            top={0}
            bottom={0}
            width="3px"
            pointerEvents="none"
            zIndex={1}
            style={{
              background: 'linear-gradient(180deg, var(--card-accent, #2f74d0) 0%, #fff 50%, var(--card-accent, #2f74d0) 100%)',
              backgroundSize: '100% 200%',
              animation: 'borderShimmer 2s ease-in-out infinite',
            }}
          />
        </Box>
      );
      break;

    case 'epic':
      content = (
        <GoldBorderWrap rarity="epic">
          <Box
            position="relative"
            style={{
              boxShadow: '0 0 16px rgba(184,134,11,0.35), 0 0 4px rgba(255,215,0,0.2)',
            }}
          >
            {children}
          </Box>
        </GoldBorderWrap>
      );
      break;

    case 'mythic':
      content = (
        <GoldBorderWrap rarity="mythic">
          <Box
            position="relative"
            data-holo-root
            style={{
              boxShadow: '0 0 24px rgba(168,85,247,0.3), 0 0 8px rgba(59,130,246,0.2)',
              transformStyle: 'preserve-3d',
            }}
          >
            {children}
            <HoloOverlay active />
          </Box>
        </GoldBorderWrap>
      );
      break;

    default:
      content = children;
  }

  // Completed cards: dimmed rarity treatment + green glow + check icon
  if (isComplete) {
    return (
      <Box position="relative">
        {/* Dimmed rarity treatment — 70% opacity keeps text readable */}
        <Box opacity={0.7}>
          {content}
        </Box>

        {/* Green completion glow overlay — sits above dimmed card */}
        <Box
          position="absolute"
          inset={0}
          borderRadius="inherit"
          pointerEvents="none"
          zIndex={20}
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 50%, rgba(34,197,94,0.15) 100%)',
            boxShadow: '0 0 12px rgba(34,197,94,0.4), 0 0 4px rgba(34,197,94,0.2)',
          }}
        />

        {/* Check icon — top-right corner, does not obscure card content */}
        <Box
          position="absolute"
          top="8px"
          right="8px"
          zIndex={21}
          pointerEvents="none"
          role="img"
          aria-label="Completed"
        >
          <CheckCircle
            size={20}
            color="#22C55E"
            strokeWidth={1.5}
            style={{
              filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))',
              opacity: 0.9,
            }}
          />
        </Box>
      </Box>
    );
  }

  return <>{content}</>;
}
