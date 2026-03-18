import React from 'react';
import { Box, Text } from 'ink';
import type { Deliverable } from '../../shared/types.js';

interface Zone {
  name: string;
  cards: Deliverable[];
  type: 'deck' | 'active' | 'review' | 'graveyard';
}

interface StatusBarProps {
  zones: Zone[];
}

const ZONE_LABEL_COLOR: Record<string, string> = {
  deck: 'gray',
  active: 'yellow',
  review: 'cyan',
  graveyard: 'green',
};

const ZONE_SHORT: Record<string, string> = {
  deck: 'D',
  active: 'A',
  review: 'R',
  graveyard: 'G',
};

export function StatusBar({ zones }: StatusBarProps): React.ReactElement {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} gap={2}>
      <Text bold dimColor>MC</Text>
      {zones.map((zone) => (
        <Box key={zone.type} gap={0}>
          <Text bold color={ZONE_LABEL_COLOR[zone.type]}>
            {ZONE_SHORT[zone.type]}:
          </Text>
          <Text>{zone.cards.length}</Text>
        </Box>
      ))}
    </Box>
  );
}
