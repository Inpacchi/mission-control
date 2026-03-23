/**
 * useChronicleView — thin wrapper around useBrowserView for the Graveyard (chronicle) view.
 *
 * Owns: async chronicle loading via parseChronicle + loading state.
 * Delegates: all search, navigation, detail, keyboard, and doc-type switching
 *            to useBrowserView.
 */
import { useState, useEffect, useRef } from 'react';
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import type { Deliverable } from '../../shared/types.js';
import type { DocType } from './useKeyboard.js';
import { parseChronicle } from '../../server/services/sdlcParser.js';
import { useBrowserView } from './useBrowserView.js';
import type { BrowserViewState } from './useBrowserView.js';

export interface ChronicleViewState extends BrowserViewState {
  loading: boolean;
}

interface UseChronicleViewResult {
  state: ChronicleViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
}

function resolveDocPath(entry: Deliverable, docType: DocType): string | undefined {
  if (docType === 'spec') return entry.specPath;
  if (docType === 'plan') return entry.planPath;
  if (docType === 'result') return entry.resultPath;
  // 'auto': prefer result, fall back to plan, then spec
  return entry.resultPath ?? entry.planPath ?? entry.specPath;
}

export function useChronicleView(
  projectPath: string,
  setViewMode: (mode: ViewMode) => void,
  terminalHeight?: number,
): UseChronicleViewResult {
  const [entries, setEntries] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const lastProjectPathRef = useRef<string | undefined>(undefined);

  // Load chronicle entries. Re-fetches when projectPath changes; caches per project.
  useEffect(() => {
    if (entries.length > 0 && lastProjectPathRef.current === projectPath) return; // cached
    lastProjectPathRef.current = projectPath;
    let cancelled = false;
    setLoading(true);
    setEntries([]);
    parseChronicle(projectPath)
      .then((result) => {
        if (!cancelled) {
          setEntries(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectPath, entries.length]);

  const { state: browserState, handleKey } = useBrowserView({
    entries,
    viewModes: { list: 'chronicle', detail: 'chronicle-detail' },
    backTarget: 'board',
    projectPath,
    setViewMode,
    terminalHeight,
    enableDocTypeSwitch: true,
    resolveDocPath,
  });

  const state: ChronicleViewState = {
    ...browserState,
    loading,
  };

  return { state, handleKey };
}
