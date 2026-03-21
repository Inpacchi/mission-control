import React, { useMemo } from 'react';
import { Text } from 'ink';
import chalk from 'chalk';
import type { Deliverable } from '../../shared/types.js';
import type { ViewMode } from '../hooks/useKeyboard.js';
import { ZONE_GLYPH } from '../theme.js';

interface Zone {
  name: string;
  cards: Deliverable[];
  type: 'deck' | 'playmat' | 'graveyard';
}

interface BottomBarProps {
  zones: Zone[];
  width: number;
  viewMode?: ViewMode;
  searchMode?: boolean;
  /** When provided, replaces the normal keyboard-shortcut row with this string (single-zone mode). */
  singleZoneHint?: string;
  /** When true, renders a 3-row bottom bar: zone hint, shortcuts, zone counts. */
  threeRowMode?: boolean;
}

const ZONE_FULL_NAME: Record<string, string> = {
  deck: 'Deck',
  playmat: 'Playmat',
  graveyard: 'Grave',
};

const ZONE_CHALK_COLOR: Record<string, (s: string) => string> = {
  deck: (s) => chalk.gray(s),
  playmat: (s) => chalk.yellow(s),
  graveyard: (s) => chalk.green(s),
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

export function BottomBar({ zones, width, viewMode = 'board', searchMode = false, singleZoneHint, threeRowMode = false }: BottomBarProps): React.ReactElement {
  // Row 1: keyboard shortcuts — memoized on viewMode + width + searchMode + singleZoneHint
  const row1Str = useMemo(() => {
    if (singleZoneHint !== undefined) {
      const content = ' ' + singleZoneHint;
      const pad = Math.max(0, width - content.length);
      return chalk.bgGray.white(content + ' '.repeat(pad));
    }
    const shortcuts = searchMode ? SEARCH_MODE : getShortcuts(viewMode);
    const content = ' ' + shortcuts.map((s) => `${s.key}:${s.label}`).join('  ');
    const pad = Math.max(0, width - content.length);
    return chalk.bgGray.white(content + ' '.repeat(pad));
  }, [viewMode, width, searchMode, singleZoneHint]);

  // Row 2: zone counts — memoized on zones + width
  // ≥60 cols: full glyphs + names  e.g. "◇ Deck:0  ◆ Playmat:1  ✦ Grave:0"
  // <60 cols: compact glyph codes  e.g. "◇:0 ◆:1 ✦:0"
  const row2Str = useMemo(() => {
    const mcPart = chalk.bgBlack.white.bold(' MC  ');
    const isNarrow = width < 60;

    const zonePartsStr = zones
      .map((z, i) => {
        const colorFn = ZONE_CHALK_COLOR[z.type] ?? ((s: string) => s);
        const glyph = ZONE_GLYPH[z.type] ?? z.type[0].toUpperCase();
        const sep = i > 0 ? chalk.bgBlack(isNarrow ? ' ' : '  ') : '';
        if (isNarrow) {
          return sep + chalk.bgBlack(colorFn(`${glyph}:`)) + chalk.bgBlack.white(`${z.cards.length}`);
        }
        const fullName = ZONE_FULL_NAME[z.type] ?? z.type;
        return sep + chalk.bgBlack(colorFn(`${glyph} ${fullName}:`)) + chalk.bgBlack.white(`${z.cards.length}`);
      })
      .join('');

    const row2Content = mcPart + zonePartsStr;

    // Visible-length estimate for padding (ANSI-free)
    const visibleZones = zones
      .map((z, i) => {
        const glyph = ZONE_GLYPH[z.type] ?? z.type[0].toUpperCase();
        if (isNarrow) {
          return (i > 0 ? ' ' : '') + `${glyph}:${z.cards.length}`;
        }
        const fullName = ZONE_FULL_NAME[z.type] ?? z.type;
        return (i > 0 ? '  ' : '') + `${glyph} ${fullName}:${z.cards.length}`;
      })
      .join('');
    const row2Visible = ` MC  ` + visibleZones;
    const pad = Math.max(0, width - row2Visible.length);
    return row2Content + chalk.bgBlack(' '.repeat(pad));
  }, [zones, width]);

  // 3-row mode: zone hint (row 1) + shortcuts (row 2) + zone counts (row 3)
  if (threeRowMode && singleZoneHint !== undefined) {
    const hintContent = ' ' + singleZoneHint;
    const hintPad = Math.max(0, width - hintContent.length);
    const row0Str = chalk.bgGray.white(hintContent + ' '.repeat(hintPad));

    // Row 2: shortcuts (without the singleZoneHint override)
    const shortcuts = searchMode ? SEARCH_MODE : getShortcuts(viewMode);
    const shortcutContent = ' ' + shortcuts.map((s) => `${s.key}:${s.label}`).join('  ');
    const shortcutPad = Math.max(0, width - shortcutContent.length);
    const row1ShortcutsStr = chalk.bgGray.white(shortcutContent + ' '.repeat(shortcutPad));

    return (
      <>
        <Text>{row0Str}</Text>
        <Text>{row1ShortcutsStr}</Text>
        <Text>{row2Str}</Text>
      </>
    );
  }

  return (
    <>
      <Text>{row1Str}</Text>
      <Text>{row2Str}</Text>
    </>
  );
}
