import path from 'node:path';
import React from 'react';
import { render } from 'ink';
import { listClaudeSessions, getClaudeSessionLog } from '../../server/services/claudeSessions.js';
import { isTTY, setupChalk } from '../formatters.js';
import { Pager } from '../Pager.js';

export async function runLog(sessionId: string | undefined, projectDir: string): Promise<void> {
  setupChalk();

  const projectPath = path.resolve(projectDir);

  // If no session ID, use the most recent
  let targetId = sessionId;
  if (!targetId) {
    const sessions = await listClaudeSessions(projectPath, 1);
    if (sessions.length === 0) {
      console.log('No Claude Code sessions found for this project.');
      process.exit(0);
    }
    targetId = sessions[0].id;
  }

  const log = await getClaudeSessionLog(projectPath, targetId);
  if (!log) {
    console.error(`Error: No session found with ID ${targetId}`);
    process.exit(1);
  }

  if (!isTTY()) {
    process.stdout.write(log + '\n');
    process.exit(0);
  }

  // TTY: launch pager
  process.stdout.write('\x1b[?1049h');

  const restoreScreen = () => {
    process.stdout.write('\x1b[?1049l');
    process.stdout.write('\x1b[?25h');
  };

  process.once('SIGTERM', () => {
    restoreScreen();
    process.exit(0);
  });

  try {
    const { waitUntilExit } = render(
      React.createElement(Pager, { title: `Session Log: ${targetId.slice(0, 8)}…`, content: log, titleColor: 'cyan' }),
      { exitOnCtrlC: true }
    );
    await waitUntilExit();
  } finally {
    restoreScreen();
  }
}
