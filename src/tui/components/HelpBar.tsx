import React from 'react';
import { Text, useStdout } from 'ink';
import chalk from 'chalk';
import type { Deliverable } from '../../shared/types.js';

interface Zone {
  name: string;
  cards: Deliverable[];
  type: 'deck' | 'active' | 'review' | 'graveyard';
}

interface BottomBarProps {
  zones: Zone[];
  width?: number;
}

const ZONE_CHALK_COLOR: Record<string, (s: string) => string> = {
  deck: (s) => chalk.gray(s),
  active: (s) => chalk.yellow(s),
  review: (s) => chalk.cyan(s),
  graveyard: (s) => chalk.green(s),
};

const ZONE_SHORT: Record<string, string> = {
  deck: 'D',
  active: 'A',
  review: 'R',
  graveyard: 'G',
};

export function BottomBar({ zones, width: widthProp }: BottomBarProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = widthProp ?? stdout?.columns ?? 80;

  // Row 1: keyboard shortcuts
  const shortcuts = [
    { key: '?', label: 'Help' },
    { key: 'Enter', label: 'View' },
    { key: '←→', label: 'Zone' },
    { key: '↑↓', label: 'Card' },
    { key: 'f', label: 'Files' },
    { key: 's', label: 'Sessions' },
    { key: 'c', label: 'Chronicle' },
    { key: 'a', label: 'Adhoc' },
    { key: 'q', label: 'Quit' },
  ];

  // Row 2: zone counts
  const zoneCounts = zones.map((z) => ({
    short: ZONE_SHORT[z.type],
    count: z.cards.length,
    type: z.type,
  }));

  // Build row 1 as a single chalk-colored string with full-width background
  const row1Content = ' ' + shortcuts.map((s) => `${s.key}:${s.label}`).join('  ');
  const row1Pad = Math.max(0, width - row1Content.length);
  const row1Str = chalk.bgGray.white(row1Content + ' '.repeat(row1Pad));

  // Build row 2 as a single chalk-colored string with full-width background
  const mcPart = chalk.bgBlack.white.bold(' MC  ');
  const zonePartsStr = zoneCounts
    .map((z, i) => {
      const colorFn = ZONE_CHALK_COLOR[z.type] ?? ((s: string) => s);
      const sep = i > 0 ? chalk.bgBlack('  ') : '';
      return sep + chalk.bgBlack(colorFn.call(null, `${z.short}:`)) + chalk.bgBlack.white(`${z.count}`);
    })
    .join('');
  const row2Content = mcPart + zonePartsStr;
  // Measure visible length (strip ANSI escapes for padding calculation)
  const row2Visible = ` MC  ` + zoneCounts.map((z, i) => (i > 0 ? '  ' : '') + `${z.short}:${z.count}`).join('');
  const row2Pad = Math.max(0, width - row2Visible.length);
  const row2Str = row2Content + chalk.bgBlack(' '.repeat(row2Pad));

  return (
    <>
      <Text>{row1Str}</Text>
      <Text>{row2Str}</Text>
    </>
  );
}

// Keep backward-compatible exports
export function HelpBar(): React.ReactElement {
  return <></>;
}
