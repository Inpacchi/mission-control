import path from 'node:path';
import fs from 'node:fs';
import chokidar from 'chokidar';
import { parseDeliverables } from './sdlcParser.js';
import type { Deliverable, DeliverableStatus } from '../../shared/types.js';

export interface FileWatcherOptions {
  projectPath: string;
  onUpdate: (deliverables: Deliverable[]) => void;
  onStats?: (stats: { total: number; byStatus: Record<DeliverableStatus, number> }) => void;
}

export interface FileWatcherHandle {
  close: () => Promise<void>;
}

export function createFileWatcher(options: FileWatcherOptions): FileWatcherHandle {
  const { projectPath, onUpdate, onStats } = options;
  const docsDir = path.join(projectPath, 'docs');

  // If docs/ doesn't exist, create a no-op watcher
  if (!fs.existsSync(docsDir)) {
    console.warn('[fileWatcher] docs/ directory not found, watcher inactive');
    return {
      close: async () => {},
    };
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const handleChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const deliverables = await parseDeliverables(projectPath);
        onUpdate(deliverables);

        // Compute and broadcast stats (excludes untracked — REST-only)
        if (onStats) {
          const byStatus: Record<DeliverableStatus, number> = {
            idea: 0,
            spec: 0,
            plan: 0,
            'in-progress': 0,
            review: 0,
            complete: 0,
            blocked: 0,
          };
          for (const d of deliverables) {
            byStatus[d.status]++;
          }
          onStats({ total: deliverables.length, byStatus });
        }
      } catch (err) {
        console.error('[fileWatcher] Error parsing deliverables:', err);
      }
    }, 200);
  };

  const watcher = chokidar.watch(docsDir, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  watcher.on('add', handleChange);
  watcher.on('change', handleChange);
  watcher.on('unlink', handleChange);

  return {
    close: async () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      await watcher.close();
    },
  };
}
