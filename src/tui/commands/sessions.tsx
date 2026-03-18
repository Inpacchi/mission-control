import React from 'react';
import path from 'node:path';
import { render } from 'ink';
import { SessionBrowser } from '../SessionBrowser.js';

export async function browseSessions(projectDir: string, fromBoard = false): Promise<void> {
  const projectPath = path.resolve(projectDir);

  if (!process.stdout.isTTY) {
    console.error('Interactive session browser requires a TTY. Use `mc log` for pipe-friendly output.');
    process.exit(1);
  }

  process.stdout.write('\x1b[?1049h');

  const restoreScreen = () => {
    process.stdout.write('\x1b[?1049l');
    process.stdout.write('\x1b[?25h');
  };

  process.once('SIGTERM', () => {
    restoreScreen();
    process.exit(0);
  });

  const { waitUntilExit } = render(
    React.createElement(SessionBrowser, { projectPath, fromBoard }),
    { exitOnCtrlC: true }
  );

  try {
    await waitUntilExit();
  } finally {
    restoreScreen();
    if (!fromBoard) console.clear();
  }
}
