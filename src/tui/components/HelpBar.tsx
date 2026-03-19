import React, { useMemo } from 'react';
import { Text } from 'ink';
import chalk from 'chalk';
import type { Deliverable } from '../../shared/types.js';
import type { ViewMode } from '../hooks/useKeyboard.js';

interface Zone {
  name: string;
  cards: Deliverable[];
  type: 'deck' | 'active' | 'review' | 'graveyard';
}

interface BottomBarProps {
  zones: Zone[];
  width: number;
  viewMode?: ViewMode;
  searchMode?: boolean;
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

type Shortcut = { key: string; label: string };

// Composable shortcut building blocks
const S = {
  navigate:  { key: '↑↓', label: 'navigate' },
  scroll:    { key: '↑↓', label: 'scroll' },
  halfPage:  { key: 'u/d', label: 'half page' },
  page:      { key: 'PgUp/Dn', label: 'page' },
  search:    { key: '/', label: 'search' },
  nextPrev:  { key: 'n/p', label: 'next/prev' },
  open:      { key: 'Enter', label: 'open' },
  docType:   { key: '1/2/3', label: 'doc type' },
  grep:      { key: 'g', label: 'grep' },
  edit:      { key: 'e', label: 'edit' },
  back:      { key: 'b', label: 'back' },
  quit:      { key: 'q', label: 'quit' },
} as const;

// Common combos
const BACK = [S.back];
const LIST_BASE = [S.navigate, S.search, S.open, ...BACK];
const DETAIL_SCROLL = [S.scroll, S.halfPage, S.page, S.search, S.nextPrev];
const DETAIL_BASE = [...DETAIL_SCROLL, ...BACK];
const DETAIL_WITH_DOCS = [...DETAIL_SCROLL, S.docType, ...BACK];
const SEARCH_MODE: Shortcut[] = [
  { key: 'Enter', label: 'confirm' },
  { key: 'Esc', label: 'cancel' },
];

function getShortcuts(viewMode: ViewMode): Shortcut[] {
  switch (viewMode) {
    case 'board':
      return [
        { key: 'c', label: 'chronicle' },
        { key: 's', label: 'sessions' },
        { key: 'a', label: 'adhoc' },
        { key: 'f', label: 'files' },
        { key: 'n', label: 'notes' },
        { key: '?', label: 'help' },
        S.quit,
      ];
    case 'detail':
    case 'chronicle-detail':
      return DETAIL_WITH_DOCS;
    case 'chronicle':
      return [S.navigate, S.search, S.open, ...BACK];
    case 'sessions':
    case 'session-search':
      return LIST_BASE;
    case 'session-detail':
      return DETAIL_BASE;
    case 'adhoc':
    case 'adhoc-search':
      return LIST_BASE;
    case 'adhoc-detail':
    case 'adhoc-detail-search':
      return DETAIL_BASE;
    case 'files':
    case 'file-search':
    case 'file-grep-input':
    case 'file-grep-results':
      return [S.navigate, S.search, S.open, S.grep, ...BACK];
    default: {
      const _exhaustive: never = viewMode;
      return [S.quit];
    }
  }
}

export function BottomBar({ zones, width, viewMode = 'board', searchMode = false }: BottomBarProps): React.ReactElement {
  // Row 1: keyboard shortcuts — memoized on viewMode + width + searchMode
  const row1Str = useMemo(() => {
    const shortcuts = searchMode ? SEARCH_MODE : getShortcuts(viewMode);
    const content = ' ' + shortcuts.map((s) => `${s.key}:${s.label}`).join('  ');
    const pad = Math.max(0, width - content.length);
    return chalk.bgGray.white(content + ' '.repeat(pad));
  }, [viewMode, width, searchMode]);

  // Row 2: zone counts — memoized on zones + width
  const row2Str = useMemo(() => {
    const mcPart = chalk.bgBlack.white.bold(' MC  ');
    const zonePartsStr = zones
      .map((z, i) => {
        const colorFn = ZONE_CHALK_COLOR[z.type] ?? ((s: string) => s);
        const sep = i > 0 ? chalk.bgBlack('  ') : '';
        return sep + chalk.bgBlack(colorFn.call(null, `${ZONE_SHORT[z.type]}:`)) + chalk.bgBlack.white(`${z.cards.length}`);
      })
      .join('');
    const row2Content = mcPart + zonePartsStr;
    const row2Visible = ` MC  ` + zones.map((z, i) => (i > 0 ? '  ' : '') + `${ZONE_SHORT[z.type]}:${z.cards.length}`).join('');
    const pad = Math.max(0, width - row2Visible.length);
    return row2Content + chalk.bgBlack(' '.repeat(pad));
  }, [zones, width]);

  return (
    <>
      <Text>{row1Str}</Text>
      <Text>{row2Str}</Text>
    </>
  );
}
