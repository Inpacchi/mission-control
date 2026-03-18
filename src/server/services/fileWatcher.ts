import path from 'node:path';
import fs from 'node:fs';
import chokidar from 'chokidar';
import { parseDeliverables } from './sdlcParser.js';

export interface FileWatcherOptions {
  projectPath: string;
  onUpdate: (deliverables: ReturnType<typeof parseDeliverables>) => void;
}

export interface FileWatcherHandle {
  close: () => Promise<void>;
}

export function createFileWatcher(options: FileWatcherOptions): FileWatcherHandle {
  const { projectPath, onUpdate } = options;
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
    debounceTimer = setTimeout(() => {
      try {
        const deliverables = parseDeliverables(projectPath);
        onUpdate(deliverables);
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
