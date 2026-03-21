import { useState, useEffect } from 'react';
import { createFileWatcher } from '../../server/services/fileWatcher.js';
import { parseDeliverables } from '../../server/services/sdlcParser.js';
import type { Deliverable, SdlcStats } from '../../shared/types.js';
import fs from 'node:fs';
import path from 'node:path';

export function useFileWatcher(projectPath: string, initialDeliverables: Deliverable[]): {
  deliverables: Deliverable[];
  stats: SdlcStats | null;
} {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables);
  const [stats, setStats] = useState<SdlcStats | null>(null);

  useEffect(() => {
    const docsPath = path.join(projectPath, 'docs');
    if (!fs.existsSync(docsPath)) {
      // No docs/ — render empty state, do not create watcher
      return;
    }

    // Refresh from disk to catch changes since pre-load
    parseDeliverables(projectPath).then(setDeliverables);

    // Live updates via chokidar
    // onUpdate receives only current_work deliverables; preserve any entries
    // from the initial load whose IDs are not in the incoming set (e.g.
    // chronicle entries, regardless of status).
    const watcher = createFileWatcher({
      projectPath,
      onUpdate: (incoming) =>
        setDeliverables((prev) => {
          const incomingIds = new Set(incoming.map((d) => d.id));
          const preserved = prev.filter((d) => !incomingIds.has(d.id));
          const merged = [...incoming, ...preserved];
          if (merged.length === prev.length) {
            const prevById = new Map(prev.map((d) => [d.id, d]));
            const unchanged = merged.every((d) => {
              const p = prevById.get(d.id);
              return p !== undefined && d.status === p.status && d.name === p.name && d.lastModified === p.lastModified;
            });
            if (unchanged) return prev;
          }
          return merged;
        }),
      onStats: (s) => setStats({ ...s, untracked: 0 }),
    });

    return () => {
      watcher.close();
    };
  }, [projectPath]);

  return { deliverables, stats };
}
