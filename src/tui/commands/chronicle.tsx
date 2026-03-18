import React from 'react';
import path from 'node:path';
import { render } from 'ink';
import { ChronicleList } from '../ChronicleList.js';

export async function browseChronicle(projectDir: string, fromBoard = false): Promise<void> {
  const projectPath = path.resolve(projectDir);

  if (!process.stdout.isTTY) {
    console.error('Interactive chronicle browser requires a TTY.');
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
    React.createElement(ChronicleList, { projectPath, fromBoard }),
    { exitOnCtrlC: true }
  );

  try {
    await waitUntilExit();
  } finally {
    restoreScreen();
    if (!fromBoard) console.clear();
  }
}
