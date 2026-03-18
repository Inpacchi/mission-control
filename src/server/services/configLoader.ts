import fs from 'node:fs/promises';
import path from 'node:path';
import type { McConfig } from '../../shared/types.js';

const DEFAULT_CONFIG: McConfig = {
  port: 3002,
  bind: '127.0.0.1',
  columns: [
    { id: 'idea', label: 'Idea', color: 'gray', statuses: ['idea'] },
    { id: 'spec', label: 'Spec', color: 'blue', statuses: ['spec'] },
    { id: 'plan', label: 'Plan', color: 'purple', statuses: ['plan'] },
    { id: 'in-progress', label: 'In Progress', color: 'orange', statuses: ['in-progress'] },
    { id: 'review', label: 'Review', color: 'yellow', statuses: ['review'] },
    { id: 'complete', label: 'Complete', color: 'green', statuses: ['complete'] },
    { id: 'blocked', label: 'Blocked', color: 'red', statuses: ['blocked'] },
  ],
  actions: [
    { status: 'idea', label: 'Start Planning', command: '/sdlc-planning' },
    { status: 'spec', label: 'Start Planning', command: '/sdlc-planning' },
    { status: 'plan', label: 'Execute Plan', command: '/sdlc-execution' },
    { status: 'in-progress', label: 'Resume Work', command: '/sdlc-resume' },
    { status: 'review', label: 'Review', command: '/commit-review' },
    { status: 'complete', label: 'Archive', command: '/sdlc-archive' },
  ],
};

export async function loadConfig(projectPath: string): Promise<McConfig> {
  const configPath = path.join(projectPath, '.mc.json');

  try {
    await fs.access(configPath);
  } catch {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw);

    // Merge with defaults — user config overrides specific keys
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      columns: parsed.columns || DEFAULT_CONFIG.columns,
      actions: parsed.actions || DEFAULT_CONFIG.actions,
    };
  } catch (err) {
    console.warn('[configLoader] Failed to parse .mc.json, using defaults:', (err as Error).message);
    return { ...DEFAULT_CONFIG };
  }
}
