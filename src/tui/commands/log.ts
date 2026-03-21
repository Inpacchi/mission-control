import path from 'node:path';
import React from 'react';
import { listClaudeSessions, getClaudeSessionLog } from '../../server/services/claudeSessions.js';
import { isTTY, setupChalk } from '../formatters.js';
import { Pager } from '../Pager.js';
import { launchTuiScreen } from '../launchScreen.js';

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
  await launchTuiScreen(
    React.createElement(Pager, { title: `Session Log: …${targetId.slice(-8)}`, content: log, titleColor: 'cyan' }),
    { skipClear: true },
  );
}
