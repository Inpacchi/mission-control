import React from 'react';
import { Box, Text } from 'ink';
import type { Deliverable } from '../../shared/types.js';
import { TYPE_ICON, complexityToRarity, RARITY_GLYPH, RARITY_INK_COLOR } from '../theme.js';

interface DeliverableCardProps {
  deliverable: Deliverable;
  isSelected: boolean;
  width: number;
}

const STATUS_LABEL: Record<string, string> = {
  idea: 'idea',
  spec: 'spec',
  plan: 'plan',
  'in-progress': 'active',
  review: 'review',
  complete: 'done',
  blocked: 'BLOCKED',
};

const STATUS_BORDER_COLOR: Record<string, string> = {
  idea: 'gray',
  spec: 'blue',
  plan: 'magenta',
  'in-progress': 'yellow',
  review: 'cyan',
  complete: 'green',
  blocked: 'red',
};

export function DeliverableCard({ deliverable, isSelected, width }: DeliverableCardProps): React.ReactElement {
  const { id, name, status, cardType, complexity, effort, flavor, specPath, planPath, resultPath } = deliverable;

  const rarity = complexityToRarity(complexity);
  const rarityGlyph = RARITY_GLYPH[rarity] ?? '·';
  const idColor = RARITY_INK_COLOR[rarity] ?? 'white';
  const idBold = rarity === 'rare' || rarity === 'epic' || rarity === 'mythic';
  const rarityDim = rarity === 'common';
  const rarityColor = rarityDim ? undefined : idColor;

  const borderColor = STATUS_BORDER_COLOR[status] ?? 'gray';
  const statusLabel = STATUS_LABEL[status] ?? status;
  const isBlocked = status === 'blocked';

  const icon = cardType ? (TYPE_ICON[cardType] ?? '') : '';
  const typeLabel = cardType ?? '';

  // Effort pips: ●○
  const effortVal = effort ?? 0;
  const filledPips = effortVal > 0 ? '●'.repeat(Math.min(effortVal, 5)) : '';
  const emptyPips = effortVal > 0 ? '○'.repeat(Math.max(0, 5 - Math.min(effortVal, 5))) : '';
  const hasPips = effortVal > 0;

  // Selection indicator: pointer + thick bar when selected, space + thin bar otherwise
  const pointer = isSelected ? '▸' : ' ';
  const bar = isSelected ? '┃' : '│';
  const barColor = isSelected ? 'white' : borderColor;

  // Doc pills: [S][P][R] — suppressed when zone width < 50
  const showPills = width >= 50;

  // Name truncation for row 1
  // Layout: pointer (1) + "bar " (2) + rarity glyph + space (2) + "[id]" (id.length + 2) + " name " (leading space from name segment counted in idSegmentWidth + 1) + pips (5+1 if present, else 0)
  const idSegmentWidth = id.length + 3; // "[" + id + "]" + leading space of name segment
  const pipsWidth = hasPips ? 6 : 0; // " " + 5 pips
  const glyphWidth = 2; // rarity glyph + space
  const nameAvailable = Math.max(4, width - 3 - glyphWidth - idSegmentWidth - pipsWidth);
  const truncName = name.length > nameAvailable ? name.slice(0, nameAvailable - 1) + '…' : name;

  // Flavor text available width: row 3-4 prefix is space (1) + bar + space (2) = 3 chars
  // The rarity glyph is only on row 1, not row 3.
  // Flavor wraps to 2 lines if it overflows.
  const flavorAvailable = width - 3;
  const flavorLine1Max = flavorAvailable;
  const flavorLine2Max = flavorAvailable;

  return (
    <Box flexDirection="column" width={width}>
      {/* Row 1: pointer + border + rarity glyph + ID + name + pips */}
      <Box>
        <Text color={isSelected ? 'yellow' : undefined}>{pointer}</Text>
        <Text color={barColor} bold={isSelected}>{bar} </Text>
        <Text color={rarityColor} bold={idBold} dimColor={rarityDim}>{rarityGlyph} </Text>
        <Text color={idColor} bold={idBold}>[{id}]</Text>
        <Text bold={isSelected} inverse={isSelected}> {truncName} </Text>
        {hasPips && (
          <>
            <Text color="yellow">{filledPips}</Text>
            <Text dimColor>{emptyPips}</Text>
          </>
        )}
      </Box>
      {/* Row 2: pointer + border + type icon + type label + · + status + doc pills (right) */}
      <Box>
        <Text> </Text>
        <Text color={barColor} bold={isSelected}>{bar} </Text>
        {icon !== '' && <Text>{icon} </Text>}
        <Text dimColor>{typeLabel}</Text>
        <Text dimColor> · </Text>
        <Text color={borderColor} bold={isBlocked}>{statusLabel}</Text>
        {isBlocked && <Text color="red" bold> !</Text>}
        {showPills && (
          <Box flexGrow={1} justifyContent="flex-end">
            <Text color={specPath ? 'blue' : undefined} dimColor={!specPath}>[S]</Text>
            <Text color={planPath ? 'magenta' : undefined} dimColor={!planPath}>[P]</Text>
            <Text color={resultPath ? 'green' : undefined} dimColor={!resultPath}>[R]</Text>
          </Box>
        )}
      </Box>
      {/* Row 3 (+ optional row 4): flavor text — wraps to 2 lines if it overflows */}
      {flavor && (() => {
        if (flavor.length <= flavorLine1Max) {
          return (
            <Box>
              <Text> </Text>
              <Text color={barColor} bold={isSelected}>{bar} </Text>
              <Text dimColor italic>{flavor}</Text>
            </Box>
          );
        }
        // Wrap: break at last space within line 1, or hard-break if no space
        const breakAt = flavor.lastIndexOf(' ', flavorLine1Max);
        const splitPos = breakAt > 0 ? breakAt : flavorLine1Max;
        const line1 = flavor.slice(0, splitPos);
        const line2Raw = flavor.slice(splitPos).trimStart();
        const line2 = line2Raw.length > flavorLine2Max ? line2Raw.slice(0, flavorLine2Max - 1) + '…' : line2Raw;
        return (
          <>
            <Box>
              <Text> </Text>
              <Text color={barColor} bold={isSelected}>{bar} </Text>
              <Text dimColor italic>{line1}</Text>
            </Box>
            <Box>
              <Text> </Text>
              <Text color={barColor} bold={isSelected}>{bar} </Text>
              <Text dimColor italic>{line2}</Text>
            </Box>
          </>
        );
      })()}
    </Box>
  );
}
