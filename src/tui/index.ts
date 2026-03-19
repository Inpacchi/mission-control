import React from 'react';
import { render } from 'ink';
import { BoardApp } from './BoardApp.js';
import { parseDeliverables } from '../server/services/sdlcParser.js';

export async function launchBoard(projectPath: string): Promise<void> {
  // TTY guard
  if (!process.stdout.isTTY) {
    console.error(
      'Interactive board requires a TTY. Use `mc status` for pipe-friendly output.'
    );
    process.exit(1);
  }

  // Pre-load deliverables before entering alternate screen to prevent empty-zone flash
  const deliverables = await parseDeliverables(projectPath);

  // Enter alternate screen buffer
  process.stdout.write('\x1b[?1049h');

  // Ensure alternate screen and cursor are always restored
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
      React.createElement(BoardApp, {
        projectPath,
        initialDeliverables: deliverables,
      }),
      { exitOnCtrlC: true },
    );
    await waitUntilExit();
  } finally {
    restoreScreen();
    console.clear();
  }
}
