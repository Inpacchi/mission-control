import React from 'react';
import { Box, Text } from 'ink';
import type { Deliverable } from '../../shared/types.js';
import { TYPE_ICON, complexityToRarity } from '../theme.js';

interface DeliverableCardProps {
  deliverable: Deliverable;
  isSelected: boolean;
  width: number;
}

// Ink color name strings for the terminal renderer.
// Not a duplicate of theme.ts RARITY_COLOR — that map uses chalk functions
// for CLI output (ANSI strings), whereas this map uses Ink's named color
// strings which are passed as JSX props. They serve different renderers.
const RARITY_INK_COLOR: Record<string, string> = {
  common: 'white',
  uncommon: 'green',
  rare: 'cyan',
  epic: 'yellow',
  mythic: 'yellow',
};

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
  const { id, name, status, cardType, complexity, effort, flavor } = deliverable;

  const rarity = complexityToRarity(complexity);
  const idColor = RARITY_INK_COLOR[rarity] ?? 'white';
  const idBold = rarity === 'rare' || rarity === 'epic' || rarity === 'mythic';
  const idUnderline = rarity === 'mythic';

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

  // Name truncation for row 1
  // Layout: pointer (1) + "bar " (2) + "[id] " (id.length + 3) + name + " " (1) + pips (5+1 if present, else 0)
  const idSegmentWidth = id.length + 3; // "[" + id + "]" + " "
  const pipsWidth = hasPips ? 6 : 0; // " " + 5 pips
  const nameAvailable = Math.max(4, width - 3 - idSegmentWidth - pipsWidth);
  const truncName = name.length > nameAvailable ? name.slice(0, nameAvailable - 1) + '…' : name;

  return (
    <Box flexDirection="column" width={width}>
      {/* Row 1: pointer + border + ID + name + pips */}
      <Box>
        <Text color={isSelected ? 'yellow' : undefined}>{pointer}</Text>
        <Text color={barColor} bold={isSelected}>{bar} </Text>
        <Text color={idColor} bold={idBold} underline={idUnderline}>[{id}]</Text>
        <Text bold={isSelected} inverse={isSelected}> {truncName} </Text>
        {hasPips && (
          <>
            <Text color="yellow">{filledPips}</Text>
            <Text dimColor>{emptyPips}</Text>
          </>
        )}
      </Box>
      {/* Row 2: pointer + border + type icon + type label + · + status */}
      <Box>
        <Text> </Text>
        <Text color={barColor} bold={isSelected}>{bar} </Text>
        {icon !== '' && <Text>{icon} </Text>}
        <Text dimColor>{typeLabel}</Text>
        <Text dimColor> · </Text>
        <Text color={borderColor} bold={isBlocked}>{statusLabel}</Text>
        {isBlocked && <Text color="red" bold> !</Text>}
      </Box>
      {/* Row 3: flavor text (if present) */}
      {flavor && (
        <Box>
          <Text> </Text>
          <Text color={barColor} bold={isSelected}>{bar} </Text>
          <Text dimColor italic>{flavor.length > width - 5 ? flavor.slice(0, width - 6) + '…' : flavor}</Text>
        </Box>
      )}
    </Box>
  );
}
