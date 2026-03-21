import path from 'node:path';
import fs from 'node:fs';
import chokidar, { type FSWatcher } from 'chokidar';
import { parseCurrentWork } from './sdlcParser.js';
import type { Deliverable, DeliverableStatus } from '../../shared/types.js';

export interface FileWatcherOptions {
  projectPath: string;
  onUpdate: (deliverables: Deliverable[]) => void;
  onStats?: (stats: { total: number; byStatus: Record<DeliverableStatus, number> }) => void;
}

export interface FileWatcherHandle {
  close: () => Promise<void>;
}

const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 3000;

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

  // Only watch active work — chronicle is archived and doesn't change status
  const currentWorkDir = path.join(docsDir, 'current_work');

  if (!fs.existsSync(currentWorkDir)) {
    console.warn('[fileWatcher] docs/current_work not found, watcher inactive');
    return { close: async () => {} };
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let restartCount = 0;
  let watcher: FSWatcher | null = null;
  let closed = false;

  const handleChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const deliverables = await parseCurrentWork(projectPath);
        onUpdate(deliverables);

        // Compute and broadcast stats
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

  function startWatcher() {
    watcher = chokidar.watch(currentWorkDir, {
      ignoreInitial: true,
      persistent: true,
      ignored: /(^|[/\\])\./,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    });

    watcher.on('add', handleChange);
    watcher.on('change', handleChange);
    watcher.on('unlink', handleChange);

    watcher.on('error', (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[fileWatcher] Watcher error:', message);

      if (closed) return;

      if (restartCount < MAX_RESTARTS) {
        restartCount++;
        console.warn(`[fileWatcher] Restarting watcher (attempt ${restartCount}/${MAX_RESTARTS})...`);
        watcher?.close().catch(() => {});
        setTimeout(() => {
          if (!closed) startWatcher();
        }, RESTART_DELAY_MS);
      } else {
        console.error('[fileWatcher] Max restarts reached, watcher permanently stopped. Restart mc to resume live updates.');
      }
    });
  }

  startWatcher();

  return {
    close: async () => {
      closed = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      await watcher?.close();
    },
  };
}
