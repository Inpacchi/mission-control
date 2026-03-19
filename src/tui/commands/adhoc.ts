import path from 'node:path';
import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { getUntrackedCommits } from '../../server/services/gitParser.js';
import { isTTY, setupChalk } from '../formatters.js';
import { AdhocBrowser } from '../AdhocBrowser.js';

export async function runAdhoc(projectDir: string, fromBoard = false): Promise<void> {
  setupChalk();

  const projectPath = path.resolve(projectDir);
  const commits = getUntrackedCommits(projectPath);

  if (commits.length === 0) {
    console.log('No untracked commits in the last 30 days.');
    process.exit(0);
  }

  if (!isTTY()) {
    const header = chalk.bold(`Untracked commits (last 30 days): ${commits.length}`);
    const separator = chalk.dim('─'.repeat(60));
    const lines = commits.map((commit) => {
      const shortHash = chalk.dim(commit.hash.substring(0, 7));
      const date = chalk.dim(commit.date.substring(0, 10));
      return `${shortHash}  ${date}  ${commit.message}`;
    });
    process.stdout.write([header, separator, ...lines].join('\n') + '\n');
    process.exit(0);
  }

  // TTY: launch full-screen browser
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
      React.createElement(AdhocBrowser, {
        commits,
        projectPath,
        fromBoard,
      }),
      { exitOnCtrlC: true }
    );
    await waitUntilExit();
  } finally {
    restoreScreen();
    if (!fromBoard) console.clear();
  }
}
