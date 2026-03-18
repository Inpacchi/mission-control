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

  while (true) {
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

    let nextAction: string | null = null;

    try {
      const { waitUntilExit } = render(
        React.createElement(BoardApp, {
          projectPath,
          initialDeliverables: deliverables,
          onAction: (action: string) => { nextAction = action; },
        }),
        { exitOnCtrlC: true }
      );
      await waitUntilExit();
    } finally {
      restoreScreen();
    }

    // Normal quit (q or Ctrl+C) — clear terminal and exit
    if (!nextAction) {
      console.clear();
      break;
    }

    // Handle the requested action
    if (nextAction === 'files') {
      const { browseFiles } = await import('./commands/files.js');
      await browseFiles(projectPath, true);
    } else if (nextAction === 'chronicle') {
      const { browseChronicle } = await import('./commands/chronicle.js');
      await browseChronicle(projectPath, true);
    } else if (nextAction === 'sessions') {
      const { browseSessions } = await import('./commands/sessions.js');
      await browseSessions(projectPath, true);
    } else if (nextAction === 'adhoc') {
      const { runAdhoc } = await import('./commands/adhoc.js');
      await runAdhoc(projectPath, true);
    }
    // Loop: re-launch the board
  }
}
