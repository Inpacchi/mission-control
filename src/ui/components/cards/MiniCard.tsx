import { useState, useEffect } from 'react';
import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { Diamond } from 'lucide-react';
import type { Deliverable } from '@shared/types';
import { complexityToRarity, cardTypeToColor, STATUS_ACCENT, ARTIFACT_PILL_STYLES, TYPE_LABELS } from '../../utils/rarity';
import { TcgCard } from './TcgCard';
import { CardFlip } from './CardFlip';

interface MiniCardProps {
  deliverable: Deliverable;
  isExpanded?: boolean;
  onExpand?: () => void;
  onSelect?: () => void;
}

/**
 * Compact card for the tactical field (kanban columns).
 *
 * At mini scale:
 *   - Effort shown as numeric count + small diamond icon, NOT individual pips
 *   - Name uses 2-line clamp
 *   - Type shown as a colored type label
 *   - Artifact pills at reduced size
 *
 * Three-gesture model:
 *   1. Click mini card body → expand (shows full TcgCard front face via CardFlip)
 *   2. Click expanded card → flip to back face
 *   3. Click "Select" button → load into Intel Panel (stopPropagation prevents flip)
 */
export function MiniCard({ deliverable, isExpanded = false, onExpand, onSelect }: MiniCardProps) {
  const accent = STATUS_ACCENT[deliverable.status] ?? '#A78BFA';
  const rarity = complexityToRarity(deliverable.complexity);
  const typeColor = cardTypeToColor(deliverable.cardType);
  const isEpicOrMythic = rarity === 'epic' || rarity === 'mythic';

  const idGradientStyle: React.CSSProperties | undefined = (() => {
    if (rarity === 'uncommon') {
      return {
        background: 'linear-gradient(135deg, #888 0%, #ccc 25%, #999 50%, #ddd 75%, #aaa 100%)',
        backgroundSize: '200% 200%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'foilShiftBg 4s ease infinite',
      };
    }
    if (rarity === 'rare' || rarity === 'epic' || rarity === 'mythic') {
      return {
        background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 30%, #b8860b 50%, #ffe44d 80%, #b8860b 100%)',
        backgroundSize: '200% 200%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'foilShiftBg 4s ease infinite',
      };
    }
    return undefined;
  })();

  // Local flip state — independent of expand state
  // Starts as false (front face) whenever the card is expanded
  const [localFlipped, setLocalFlipped] = useState(false);

  // Reset flip state when card collapses
  useEffect(() => {
    if (!isExpanded) {
      setLocalFlipped(false);
    }
  }, [isExpanded]);

  const hasArtifacts =
    Boolean(deliverable.specPath) ||
    Boolean(deliverable.planPath) ||
    Boolean(deliverable.resultPath);

  // Mini card front face (always rendered as the compact view)
  const miniFace = (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`${deliverable.id} — ${deliverable.name}. Click to expand.`}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand?.();
        }
      }}
      position="relative"
      borderRadius="8px"
      overflow="hidden"
      background="#232D3F"
      cursor={onExpand ? 'pointer' : 'default'}
      style={{
        border: isEpicOrMythic ? `1.5px solid ${accent}66` : undefined,
        borderLeft: (isEpicOrMythic || rarity === 'rare') ? 'none' : `3px solid ${accent}`,
        '--card-accent': accent,
      } as React.CSSProperties}
      boxShadow="card.sm"
      _hover={onExpand ? {
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(6,15,28,0.6), 0 0 0 1px rgba(47,116,208,0.15)',
      } : undefined}
      _focusVisible={{ outline: 'none', boxShadow: '0 0 0 3px rgba(47,116,208,0.5)' }}
      p="10px 12px"
    >
      {/* Card texture */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="8px"
        pointerEvents="none"
        style={{
          background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.006) 2px, rgba(255,255,255,0.006) 4px)',
        }}
      />

      {/* Row 1: ID + effort count */}
      <Flex align="center" justify="space-between" gap="6px" mb="4px">
        <Text
          as="span"
          fontFamily="mono"
          fontSize="10px"
          fontWeight={600}
          color={idGradientStyle ? undefined : 'text.muted'}
          lineHeight={1}
          style={idGradientStyle}
        >
          {deliverable.id.toUpperCase()}
        </Text>

        {/* Effort: numeric + diamond icon at mini scale */}
        {deliverable.effort != null && (
          <Flex align="center" gap="2px" flexShrink={0}>
            <Text
              as="span"
              fontFamily="mono"
              fontSize="10px"
              fontWeight={600}
              lineHeight={1}
              style={{ color: accent, opacity: 0.85 }}
            >
              {deliverable.effort}
            </Text>
            <Diamond size={8} color={accent} style={{ opacity: 0.7 }} />
          </Flex>
        )}
      </Flex>

      {/* Row 2: Name — 2-line clamp */}
      <Text
        as="p"
        fontSize="12px"
        fontWeight={600}
        color="text.primary"
        lineHeight={1.35}
        style={{
          WebkitLineClamp: 2,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
        }}
      >
        {deliverable.name}
      </Text>

      {/* Row 3: Type dot + label */}
      <Flex align="center" gap="6px" mt="6px">
        <Box
          w="6px"
          h="6px"
          borderRadius="full"
          flexShrink={0}
          style={{ background: typeColor, opacity: 0.85 }}
        />
        <Text
          as="span"
          fontFamily="mono"
          fontSize="9px"
          fontWeight={600}
          color="text.muted"
          letterSpacing="0.04em"
          style={{ textTransform: 'uppercase' }}
        >
          {TYPE_LABELS[deliverable.cardType ?? ''] ?? 'Feature'}
        </Text>
      </Flex>

      {/* Row 4: Artifact pills */}
      {hasArtifacts && (
        <Flex gap="4px" mt="6px" flexWrap="wrap">
          {deliverable.specPath && (
            <Text
              as="span"
              fontFamily="mono"
              fontSize="8px"
              fontWeight={600}
              letterSpacing="0.03em"
              style={{
                textTransform: 'uppercase',
                padding: '1px 5px',
                borderRadius: '9999px',
                background: ARTIFACT_PILL_STYLES.spec.bg,
                color: ARTIFACT_PILL_STYLES.spec.color,
              }}
            >
              Spec
            </Text>
          )}
          {deliverable.planPath && (
            <Text
              as="span"
              fontFamily="mono"
              fontSize="8px"
              fontWeight={600}
              letterSpacing="0.03em"
              style={{
                textTransform: 'uppercase',
                padding: '1px 5px',
                borderRadius: '9999px',
                background: ARTIFACT_PILL_STYLES.plan.bg,
                color: ARTIFACT_PILL_STYLES.plan.color,
              }}
            >
              Plan
            </Text>
          )}
          {deliverable.resultPath && (
            <Text
              as="span"
              fontFamily="mono"
              fontSize="8px"
              fontWeight={600}
              letterSpacing="0.03em"
              style={{
                textTransform: 'uppercase',
                padding: '1px 5px',
                borderRadius: '9999px',
                background: ARTIFACT_PILL_STYLES.result.bg,
                color: ARTIFACT_PILL_STYLES.result.color,
              }}
            >
              Result
            </Text>
          )}
        </Flex>
      )}

      {/* Select button — only when onSelect is provided */}
      {onSelect && (
        <Box mt="8px">
          <chakra.button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSelect();
            }}
            aria-label={`Select ${deliverable.name}`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="100%"
            h="22px"
            borderRadius="4px"
            bg="rgba(255,255,255,0.04)"
            border="1px solid"
            borderColor="border.subtle"
            color="text.muted"
            cursor="pointer"
            fontSize="10px"
            fontWeight={500}
            fontFamily="body"
            style={{ transition: 'all 150ms ease' }}
            _hover={{ background: 'rgba(255,255,255,0.08)', color: 'text.secondary' }}
            _focusVisible={{ outline: 'none', boxShadow: '0 0 0 3px rgba(47,116,208,0.5)' }}
          >
            Select
          </chakra.button>
        </Box>
      )}
    </Box>
  );

  // When expanded, show full TcgCard as the front face with localFlipped state
  // Gesture 1: card is expanded → front face of CardFlip (TcgCard) is visible (localFlipped=false)
  // Gesture 2: click expanded card → flip to back (miniFace, localFlipped=true)
  if (isExpanded) {
    const fullFace = (
      <TcgCard
        deliverable={deliverable}
        onFlip={() => setLocalFlipped((f) => !f)}
        onSelect={onSelect}
      />
    );

    return (
      <CardFlip
        front={fullFace}
        back={miniFace}
        flipped={localFlipped}
        onFlip={() => setLocalFlipped((f) => !f)}
      />
    );
  }

  return miniFace;
}
