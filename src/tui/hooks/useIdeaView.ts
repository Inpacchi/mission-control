/**
 * useIdeaView — thin wrapper around useBrowserView for the Deck (ideas) view.
 *
 * All search, navigation, detail, and keyboard logic lives in useBrowserView.
 * This module provides the domain-specific wiring: ViewMode pair, backTarget,
 * resolveDocPath, and disables doc-type switching (ideas have a single file).
 */
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import type { Deliverable } from '../../shared/types.js';
import type { DocType } from './useKeyboard.js';
import { useBrowserView } from './useBrowserView.js';
import type { BrowserViewState } from './useBrowserView.js';

/** Re-exported for callers that import IdeaViewState by name. */
export type IdeaViewState = BrowserViewState;

interface UseIdeaViewResult {
  state: IdeaViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
}

function resolveIdeaDocPath(entry: Deliverable, _docType: DocType): string | undefined {
  // Ideas have a single file — docType is ignored since doc switching is disabled
  // (enableDocTypeSwitch: false). Prefer result, then plan, then spec.
  return entry.resultPath ?? entry.planPath ?? entry.specPath;
}

export function useIdeaView(
  cards: Deliverable[],
  projectPath: string,
  setViewMode: (mode: ViewMode) => void,
  terminalHeight?: number,
): UseIdeaViewResult {
  return useBrowserView({
    entries: cards,
    viewModes: { list: 'ideas', detail: 'idea-detail' },
    backTarget: 'board',
    projectPath,
    setViewMode,
    terminalHeight,
    enableDocTypeSwitch: false,
    resolveDocPath: resolveIdeaDocPath,
  });
}
