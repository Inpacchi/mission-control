import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Deliverable } from '../../shared/types.js';
import { DeliverableCard } from './DeliverableCard.js';

type ZoneType = 'deck' | 'playmat' | 'graveyard';

interface ZoneStripProps {
  name: string;
  type: ZoneType;
  cards: Deliverable[];
  width: number;
  height: number;
  isSelected: boolean;
  selectedCard: number;
  showSubzones?: boolean;
}

// Single color map used for both zone header text and border (values are identical).
const ZONE_COLOR: Record<ZoneType, string> = {
  deck: 'gray',
  playmat: 'yellow',
  graveyard: 'green',
};

const SUBZONE_COLOR: Record<string, string> = {
  spec: 'blue',
  plan: 'magenta',
  'in-progress': 'yellow',
  blocked: 'red',
  review: 'cyan',
};

const EMPTY_PERSONALITY: Record<ZoneType, string> = {
  deck: 'shuffle some ideas in',
  playmat: 'all quiet on the field',
  graveyard: 'the graveyard rests quiet',
};

// 3-4 content rows per card (id+name, type+status, flavor up to 2 lines) + 1 divider line.
// Flavor text wraps to 2 lines when it overflows, so worst case is 5 rows.
// Cards with short/no flavor use fewer rows; Ink clips the excess.
const CARD_HEIGHT = 5;
const HEADER_HEIGHT = 2; // zone name + border line
const SUBZONE_HEADER_HEIGHT = 1;

// Collapsed height for empty zones — single row: ZoneName (0)  — personality text
export const EMPTY_ZONE_HEIGHT = 1;

export function ZoneStrip({
  name,
  type,
  cards,
  width,
  height,
  isSelected,
  selectedCard,
  showSubzones = false,
}: ZoneStripProps): React.ReactElement {
  const headerColor = ZONE_COLOR[type];
  const borderColor = ZONE_COLOR[type];

  // Virtual scroll: compute visible window
  const availableLines = height - HEADER_HEIGHT - (showSubzones ? SUBZONE_HEADER_HEIGHT : 0);
  const visibleCount = Math.max(1, Math.floor(availableLines / CARD_HEIGHT));

  // Keep selected card in view — centers the selection so both up and down
  // navigation remain visible without requiring stateful tracking.
  const scrollOffset = useMemo(() => {
    if (selectedCard < 0 || cards.length === 0) return 0;
    const maxOffset = Math.max(0, cards.length - visibleCount);
    const idealOffset = Math.max(0, selectedCard - Math.floor(visibleCount / 2));
    return Math.min(idealOffset, maxOffset);
  }, [selectedCard, cards.length, visibleCount]);

  const visibleCards = cards.slice(scrollOffset, scrollOffset + visibleCount);

  // Count label
  const countLabel = `(${cards.length})`;
  const titleAvailable = width - countLabel.length - 3; // 3 for padding
  const truncatedName =
    name.length > titleAvailable ? name.slice(0, Math.max(0, titleAvailable - 1)) + '…' : name;

  // Empty zone: render as single collapsed row — no border, no padding
  if (cards.length === 0) {
    const personality = EMPTY_PERSONALITY[type];
    const label = `${name} (0)`;
    const fullText = `${label}  — ${personality}`;
    const maxWidth = Math.max(4, width - 2); // 1-char margin each side
    const displayText = fullText.length > maxWidth ? fullText.slice(0, maxWidth - 1) + '…' : fullText;
    return (
      <Box width={width}>
        <Text color={headerColor} bold={isSelected}>{displayText}</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="single"
      borderColor={isSelected ? 'white' : borderColor}
      paddingX={0}
    >
      {/* Zone header */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text bold color={isSelected ? 'white' : headerColor}>
          {truncatedName}
        </Text>
        <Text dimColor>{countLabel}</Text>
      </Box>

      {/* Subzone labels for Playmat */}
      {showSubzones && (
        <Box paddingX={1} gap={1}>
          {(['spec', 'plan', 'in-progress', 'blocked', 'review'] as const).map((sub) => {
            const subCount = cards.filter((c) => c.status === sub).length;
            if (subCount === 0) return null;
            return (
              <Text key={sub} color={SUBZONE_COLOR[sub]} dimColor>
                [{sub}:{subCount}]
              </Text>
            );
          })}
        </Box>
      )}

      {/* Cards */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {visibleCards.map((card, i) => {
          const absoluteIndex = i + scrollOffset;
          return (
            <React.Fragment key={card.id}>
              {i > 0 && (
                <Text dimColor>{'╌'.repeat(Math.max(0, width - 4))}</Text>
              )}
              <DeliverableCard
                deliverable={card}
                isSelected={isSelected && absoluteIndex === selectedCard}
                width={width - 4} // outer border (2) + paddingX={1} on cards container (2)
              />
            </React.Fragment>
          );
        })}
      </Box>

      {/* Scroll indicator when there are more cards than visible */}
      {cards.length > visibleCount && (
        <Box justifyContent="flex-end" paddingX={1}>
          <Text dimColor>
            {scrollOffset + visibleCount < cards.length ? '▼' : ''}
            {scrollOffset > 0 ? '▲' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
}
