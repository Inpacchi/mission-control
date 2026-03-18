import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { Diamond } from 'lucide-react';
import type { Deliverable } from '@shared/types';
import { complexityToRarity, cardTypeToColor, STATUS_ACCENT, ARTIFACT_PILL_STYLES, TYPE_LABELS } from '../../utils/rarity';

interface TcgCardProps {
  deliverable: Deliverable;
  onFlip?: () => void;
  onSelect?: () => void;
}

const statusLabels: Record<string, string> = {
  idea:          'Idea',
  spec:          'Spec',
  plan:          'Plan',
  'in-progress': 'In Progress',
  review:        'Review',
  complete:      'Complete',
  blocked:       'Blocked',
};

/** Render effort pips: filled circles up to effort value, empty outlines up to 5 */
function EffortPips({ effort }: { effort?: number }) {
  const count = effort ?? 0;
  return (
    <Flex gap="3px" flexShrink={0} pt="2px">
      {Array.from({ length: 5 }).map((_, i) => (
        <Box
          key={i}
          w="8px"
          h="8px"
          borderRadius="full"
          flexShrink={0}
          style={
            i < count
              ? { background: 'var(--card-accent)', opacity: 0.85 }
              : {
                  background: 'transparent',
                  border: '1.5px solid #5A6578',
                  opacity: 0.4,
                }
          }
        />
      ))}
    </Flex>
  );
}

/**
 * Full-size TCG card component.
 *
 * Five zones:
 *   1. Identity: ID + name + effort pips
 *   2. Type bar: type label + status
 *   3. Ability text: description + flavor
 *   4. Artifact pills: spec/plan/result links
 *   5. Stat block: EFF + set symbol
 *
 * Sets --card-accent as an inline CSS custom property on the root element.
 * Epic/Mythic cards (wrapped externally by GoldBorderWrap) use no left border;
 * a status color inset stripe in the type bar background indicates status.
 */
export function TcgCard({ deliverable, onFlip, onSelect }: TcgCardProps) {
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

  // Epic/Mythic use gold border from GoldBorderWrap — no left accent border on card itself.
  // Rare cards suppress it too: RarityEffects renders an animated stripe overlay as the sole indicator.
  const borderLeft = (isEpicOrMythic || rarity === 'rare') ? 'none' : `3px solid ${accent}`;

  const hasArtifacts =
    Boolean(deliverable.specPath) ||
    Boolean(deliverable.planPath) ||
    Boolean(deliverable.resultPath);

  return (
    <Box
      position="relative"
      width="280px"
      borderRadius="10px"
      overflow="hidden"
      background="#1C2333"
      border={isEpicOrMythic ? 'none' : '1px solid #2A3444'}
      boxShadow="card.md"
      _hover={isEpicOrMythic ? undefined : { boxShadow: '0 4px 12px rgba(6,15,28,0.6), 0 2px 4px rgba(6,15,28,0.7), 0 0 0 1px rgba(47,116,208,0.15)' }}
      style={{
        borderLeft,
        '--card-accent': accent,
      } as React.CSSProperties}
    >
      {/* Card texture: subtle diagonal weave */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="10px"
        pointerEvents="none"
        zIndex={5}
        style={{
          background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)',
        }}
      />

      {/* Zone 1: Identity — ID, name, effort pips */}
      <Flex
        align="flex-start"
        justify="space-between"
        p="12px 14px 8px"
        gap="8px"
      >
        {/* ID */}
        <Text
          as="span"
          fontFamily="mono"
          fontSize="11px"
          fontWeight={600}
          color={idGradientStyle ? undefined : 'text.muted'}
          flexShrink={0}
          pt="2px"
          style={idGradientStyle}
        >
          {deliverable.id.toUpperCase()}
        </Text>

        {/* Name */}
        <Text
          as="span"
          fontSize="14px"
          fontWeight={600}
          lineHeight={1.4}
          color="text.primary"
          flex={1}
          minW={0}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {deliverable.name}
        </Text>

        {/* Effort pips */}
        <EffortPips effort={deliverable.effort} />
      </Flex>

      {/* Zone 2: Type bar */}
      <Flex
        align="center"
        gap="6px"
        px="14px"
        py="5px"
        fontFamily="mono"
        fontSize="10px"
        fontWeight={500}
        letterSpacing="0.06em"
        color="text.secondary"
        style={{
          textTransform: 'uppercase',
          // Epic/Mythic: use status color tint as inset indicator
          background: isEpicOrMythic
            ? `linear-gradient(90deg, ${accent}18 0%, rgba(255,255,255,0.02) 40%)`
            : 'rgba(255,255,255,0.02)',
          borderTop: '1px solid #1E2736',
          borderBottom: '1px solid #1E2736',
        }}
      >
        {/* Type color swatch */}
        <Box
          w="12px"
          h="12px"
          borderRadius="2px"
          flexShrink={0}
          style={{ background: typeColor, opacity: 0.85 }}
        />

        {/* Type label */}
        <Text as="span">
          {TYPE_LABELS[deliverable.cardType ?? ''] ?? 'Feature'}
        </Text>

        {/* Separator dot */}
        <Box
          w="3px"
          h="3px"
          borderRadius="full"
          background="#5A6578"
          flexShrink={0}
        />

        {/* Status */}
        <Text
          as="span"
          style={{ color: accent }}
        >
          {statusLabels[deliverable.status]}
        </Text>
      </Flex>

      {/* Zone 3: Ability text — description + flavor */}
      <Box
        px="14px"
        pt="10px"
        pb={hasArtifacts ? '4px' : '10px'}
        fontSize="12px"
        lineHeight={1.6}
        color="text.secondary"
      >
        {deliverable.catalog?.name ?? deliverable.name}
        {deliverable.flavor && (
          <Text
            as="p"
            fontStyle="italic"
            color="text.muted"
            fontSize="11px"
            mt="4px"
          >
            {deliverable.flavor}
          </Text>
        )}
      </Box>

      {/* Zone 4: Artifact pills */}
      {hasArtifacts && (
        <Flex
          gap="6px"
          px="14px"
          pb="8px"
          flexWrap="wrap"
        >
          {deliverable.specPath && (
            <Text
              as="span"
              fontFamily="mono"
              fontSize="9px"
              fontWeight={600}
              letterSpacing="0.04em"
              style={{
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: ARTIFACT_PILL_STYLES.spec.bg,
                color: ARTIFACT_PILL_STYLES.spec.color,
              }}
            >
              SPEC
            </Text>
          )}
          {deliverable.planPath && (
            <Text
              as="span"
              fontFamily="mono"
              fontSize="9px"
              fontWeight={600}
              letterSpacing="0.04em"
              style={{
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: ARTIFACT_PILL_STYLES.plan.bg,
                color: ARTIFACT_PILL_STYLES.plan.color,
              }}
            >
              PLAN
            </Text>
          )}
          {deliverable.resultPath && (
            <Text
              as="span"
              fontFamily="mono"
              fontSize="9px"
              fontWeight={600}
              letterSpacing="0.04em"
              style={{
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: ARTIFACT_PILL_STYLES.result.bg,
                color: ARTIFACT_PILL_STYLES.result.color,
              }}
            >
              RESULT
            </Text>
          )}
        </Flex>
      )}

      {/* Zone 5: Stat block — EFF only + set symbol */}
      <Flex
        align="center"
        justify="space-between"
        px="14px"
        pt="8px"
        pb="10px"
        borderTop="1px solid #1E2736"
      >
        {/* EFF stat only */}
        <Flex gap="12px">
          <Flex align="center" gap="4px" fontFamily="mono" fontSize="11px" fontWeight={600}>
            <Text as="span" fontSize="9px" fontWeight={500} color="text.muted" letterSpacing="0.04em" style={{ textTransform: 'uppercase' }}>
              EFF
            </Text>
            <Text as="span" color="#F59E0B">
              {deliverable.effort ?? '-'}
            </Text>
          </Flex>
        </Flex>

        {/* Action buttons */}
        <Flex gap="6px" align="center">
          {onFlip && (
            <chakra.button
              onClick={onFlip}
              aria-label="Flip card to see timeline"
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="22px"
              h="22px"
              borderRadius="4px"
              bg="transparent"
              border="1px solid"
              borderColor="border.subtle"
              color="text.muted"
              cursor="pointer"
              fontSize="9px"
              fontFamily="mono"
              fontWeight={700}
              style={{ transition: 'all 150ms ease' }}
              _hover={{ borderColor: 'border.default', color: 'text.secondary', background: 'rgba(255,255,255,0.04)' }}
              _focusVisible={{ outline: 'none', boxShadow: '0 0 0 3px rgba(47,116,208,0.5)' }}
            >
              ↺
            </chakra.button>
          )}

          {/* Set symbol */}
          <Flex
            align="center"
            justify="center"
            w="18px"
            h="18px"
            borderRadius="4px"
            fontFamily="mono"
            fontSize="8px"
            fontWeight={700}
            style={{
              background: accent,
              color: '#0D1117',
              opacity: 0.85,
            }}
          >
            <Diamond size={8} />
          </Flex>
        </Flex>
      </Flex>

      {/* Select button — only rendered when onSelect is provided */}
      {onSelect && (
        <Box
          px="14px"
          pb="10px"
          pt={0}
        >
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
            h="28px"
            borderRadius="6px"
            bg="rgba(255,255,255,0.04)"
            border="1px solid"
            borderColor="border.subtle"
            color="text.secondary"
            cursor="pointer"
            fontSize="11px"
            fontWeight={500}
            style={{ transition: 'all 150ms ease' }}
            _hover={{ background: 'rgba(255,255,255,0.08)', borderColor: 'border.default', color: 'text.primary' }}
            _focusVisible={{ outline: 'none', boxShadow: '0 0 0 3px rgba(47,116,208,0.5)' }}
          >
            Select
          </chakra.button>
        </Box>
      )}
    </Box>
  );
}
