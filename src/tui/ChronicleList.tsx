/**
 * ChronicleList — Graveyard view presentational component.
 *
 * Thin wrapper around BrowserList with Graveyard-specific branding.
 * Pure rendering only. No useInput, no useApp, no exit() calls.
 * All state is managed by useChronicleView and passed as props.
 */
import React from 'react';
import type { Deliverable } from '../shared/types.js';
import type { DocType, ViewMode } from './hooks/useKeyboard.js';
import { BrowserList } from './components/BrowserList.js';

interface ChronicleListProps {
  entries: Deliverable[];
  filteredEntries: Deliverable[];
  loading: boolean;
  selectedIndex: number;
  listScrollOffset: number;
  searchQuery: string;
  searchMode: boolean;
  viewMode: ViewMode; // 'chronicle' | 'chronicle-detail'
  activeDocType: DocType;
  detailScrollOffset: number;
  projectPath: string;
  detailMaxScrollRef?: React.RefObject<number>;
  detailActiveSearch?: string;
  detailCurrentMatchIndex?: number;
  detailMatchingLines?: number[];
  height?: number;
  // Note: detailViewMode is not in props — it is hardcoded to 'chronicle-detail' in the BrowserList call below.
}

export function ChronicleList(props: ChronicleListProps): React.ReactElement {
  return (
    <BrowserList
      {...props}
      title="Graveyard"
      titleColor="cyan"
      emptyMessage="No archived deliverables. Complete deliverables are archived via 'Let's organize the chronicles'."
      countLabel="archived chronicles"
      showId={true}
      loadingMessage="Loading chronicle…"
      detailViewMode="chronicle-detail"
    />
  );
}
