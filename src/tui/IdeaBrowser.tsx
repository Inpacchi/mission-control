/**
 * IdeaBrowser — Deck view presentational component.
 *
 * Thin wrapper around BrowserList with Deck-specific branding.
 * Pure rendering only. No useInput, no useApp, no exit() calls.
 * All state is managed by useIdeaView and passed as props.
 */
import React from 'react';
import type { Deliverable } from '../shared/types.js';
import type { DocType, ViewMode } from './hooks/useKeyboard.js';
import { BrowserList } from './components/BrowserList.js';

interface IdeaBrowserProps {
  entries: Deliverable[];
  filteredEntries: Deliverable[];
  selectedIndex: number;
  listScrollOffset: number;
  searchQuery: string;
  searchMode: boolean;
  viewMode: ViewMode; // 'ideas' | 'idea-detail'
  activeDocType: DocType;
  detailScrollOffset: number;
  projectPath: string;
  detailMaxScrollRef?: React.RefObject<number>;
  detailActiveSearch?: string;
  detailCurrentMatchIndex?: number;
  detailMatchingLines?: number[];
  height?: number;
  // Note: detailViewMode is not in props — it is hardcoded to 'idea-detail' in the BrowserList call below.
}

export function IdeaBrowser(props: IdeaBrowserProps): React.ReactElement {
  return (
    <BrowserList
      {...props}
      title="Deck"
      titleColor="gray"
      emptyMessage="No ideas yet. Drop a .md file in docs/current_work/ideas/ to get started."
      countLabel="ideas"
      showId={false}
      detailViewMode="idea-detail"
    />
  );
}
