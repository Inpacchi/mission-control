import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Deliverable } from '../../shared/types.js';
import { DeliverableCard } from './DeliverableCard.js';

type ZoneType = 'deck' | 'active' | 'review' | 'graveyard';

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
  active: 'yellow',
  review: 'cyan',
  graveyard: 'green',
};

const SUBZONE_ORDER: Record<string, number> = {
  spec: 0,
  plan: 1,
  'in-progress': 2,
  blocked: 3,
};

const SUBZONE_COLOR: Record<string, string> = {
  spec: 'blue',
  plan: 'magenta',
  'in-progress': 'yellow',
  blocked: 'red',
};

// 3 rows per card (id+name, type+status, flavor) + 1 divider line.
// All current deliverable cards carry flavor text, so 4 is accurate.
// If cards without flavor are added, this will overestimate slightly and
// overflow:hidden on the Ink box will clip the excess — acceptable trade-off.
const CARD_HEIGHT = 4;
const HEADER_HEIGHT = 2; // zone name + border line
const SUBZONE_HEADER_HEIGHT = 1;

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

  // Sort active zone cards by subzone order
  const sortedCards = useMemo(() => {
    if (!showSubzones) return cards;
    return [...cards].sort((a, b) => {
      const orderA = SUBZONE_ORDER[a.status] ?? 99;
      const orderB = SUBZONE_ORDER[b.status] ?? 99;
      return orderA - orderB;
    });
  }, [cards, showSubzones]);

  // Virtual scroll: compute visible window
  const availableLines = height - HEADER_HEIGHT - (showSubzones ? SUBZONE_HEADER_HEIGHT : 0);
  const visibleCount = Math.max(1, Math.floor(availableLines / CARD_HEIGHT));

  // Keep selected card in view — centers the selection so both up and down
  // navigation remain visible without requiring stateful tracking.
  const scrollOffset = useMemo(() => {
    if (selectedCard < 0 || sortedCards.length === 0) return 0;
    const maxOffset = Math.max(0, sortedCards.length - visibleCount);
    const idealOffset = Math.max(0, selectedCard - Math.floor(visibleCount / 2));
    return Math.min(idealOffset, maxOffset);
  }, [selectedCard, sortedCards.length, visibleCount]);

  const visibleCards = sortedCards.slice(scrollOffset, scrollOffset + visibleCount);

  // Count label
  const countLabel = `(${cards.length})`;
  const titleAvailable = width - countLabel.length - 3; // 3 for padding
  const truncatedName =
    name.length > titleAvailable ? name.slice(0, Math.max(0, titleAvailable - 1)) + '…' : name;

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

      {/* Subzone labels for Active Zone */}
      {showSubzones && (
        <Box paddingX={1} gap={1}>
          {(['spec', 'plan', 'in-progress', 'blocked'] as const).map((sub) => {
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
        {visibleCards.length === 0 ? (
          <Text dimColor>— empty —</Text>
        ) : (
          visibleCards.map((card, i) => {
            const absoluteIndex = i + scrollOffset;
            return (
              <React.Fragment key={card.id}>
                {i > 0 && (
                  <Text dimColor>{'─'.repeat(Math.max(0, width - 4))}</Text>
                )}
                <DeliverableCard
                  deliverable={card}
                  isSelected={isSelected && absoluteIndex === selectedCard}
                  width={width - 4} // outer border (2) + paddingX={1} on cards container (2)
                />
              </React.Fragment>
            );
          })
        )}
      </Box>

      {/* Scroll indicator when there are more cards than visible */}
      {sortedCards.length > visibleCount && (
        <Box justifyContent="flex-end" paddingX={1}>
          <Text dimColor>
            {scrollOffset + visibleCount < sortedCards.length ? '▼' : ''}
            {scrollOffset > 0 ? '▲' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
}
