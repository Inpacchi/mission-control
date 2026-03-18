import { execSync } from 'node:child_process';
import type { UntrackedCommit } from '../../shared/types.js';

const DELIVERABLE_PREFIX_RE = /^[Dd]\d+[a-z]?\s*:/;

export function getUntrackedCommits(projectPath: string): UntrackedCommit[] {
  try {
    const output = execSync(
      'git log --oneline --since="30 days ago" -100 --format="%H%x00%s%x00%an%x00%aI"',
      {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000,
      }
    );

    const lines = output.trim().split('\n').filter((l) => l.length > 0);
    const untracked: UntrackedCommit[] = [];

    for (const line of lines) {
      const parts = line.split('\0');
      if (parts.length < 4) continue;

      const hash = parts[0];
      const message = parts[1];
      const author = parts[2];
      const date = parts[3];

      // Filter OUT commits that have a deliverable prefix
      if (DELIVERABLE_PREFIX_RE.test(message)) continue;

      untracked.push({ hash, message, author, date });
    }

    return untracked;
  } catch (err) {
    // Not a git repo or git not installed
    console.warn('[gitParser] Failed to run git log:', (err as Error).message);
    return [];
  }
}
