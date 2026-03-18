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
    const watcher = createFileWatcher({
      projectPath,
      onUpdate: setDeliverables,
      onStats: (s) => setStats({ ...s, untracked: 0 }),
    });

    return () => {
      watcher.close();
    };
  }, [projectPath]);

  return { deliverables, stats };
}
