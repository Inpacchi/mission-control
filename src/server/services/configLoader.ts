import fs from 'node:fs';
import path from 'node:path';
import type { McConfig } from '../../shared/types.js';

const DEFAULT_CONFIG: McConfig = {
  port: 3002,
  bind: '127.0.0.1',
  columns: [
    { id: 'idea', label: 'Idea', statuses: ['idea'] },
    { id: 'spec', label: 'Spec', statuses: ['spec'] },
    { id: 'plan', label: 'Plan', statuses: ['plan'] },
    { id: 'in-progress', label: 'In Progress', statuses: ['in-progress'] },
    { id: 'review', label: 'Review', statuses: ['review'] },
    { id: 'complete', label: 'Complete', statuses: ['complete'] },
    { id: 'blocked', label: 'Blocked', statuses: ['blocked'] },
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

export function loadConfig(projectPath: string): McConfig {
  const configPath = path.join(projectPath, '.mc.json');

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
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
