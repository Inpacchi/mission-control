#!/usr/bin/env node

import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { startServer } from './server/index.js';

function checkClaudeBinary(): boolean {
  try {
    execSync('which claude', { stdio: 'ignore' });
    return true;
  } catch {
    console.warn(
      '\x1b[33m[warn]\x1b[0m claude binary not found in PATH. ' +
        'Terminal features will be disabled. ' +
        'Install Claude Code: https://docs.anthropic.com/en/docs/claude-code'
    );
    return false;
  }
}

function showMigrationNotice() {
  try {
    const noticePath = path.join(os.homedir(), '.mc', 'tui-notice-shown');
    if (!fs.existsSync(noticePath)) {
      console.log('Tip: Web UI available via `mc --web`\n');
      fs.mkdirSync(path.dirname(noticePath), { recursive: true });
      fs.writeFileSync(noticePath, '1');
    }
  } catch {
    // Silently swallow write errors
  }
}

async function startWebServer(projectPath: string, opts: Record<string, string | boolean>) {
  const port = parseInt(String(opts.port), 10);
  const bind = String(opts.bind);
  const shouldOpen = opts.open !== false;
  const dev = opts.dev === true;

  console.log('Mission Control v0.1.0');
  console.log('─'.repeat(40));

  checkClaudeBinary();

  await startServer({ port, bind, projectPath, dev });

  if (shouldOpen && !dev) {
    try {
      const openModule = await import('open');
      await openModule.default(`http://${bind === '0.0.0.0' ? 'localhost' : bind}:${port}`);
    } catch {
      console.log(
        `Open http://${bind === '0.0.0.0' ? 'localhost' : bind}:${port} in your browser`
      );
    }
  }
}

const program = new Command();

program
  .name('mc')
  .version('0.1.0')
  .argument('[path]', 'Project directory', process.cwd())
  .option('--web', 'Start web server and open browser')
  .option('--no-open', 'Do not open browser (with --web)')
  .option('-p, --port <number>', 'Server port (with --web)', '3002')
  .option('-b, --bind <address>', 'Bind address (with --web)', '127.0.0.1')
  .option('--dev', 'Skip static UI serving and browser open (with --web, expects Vite on :5173)');

// Default action: board TUI or web server
program.action(async (projectDir: string, opts: Record<string, string | boolean>) => {
  const projectPath = path.resolve(String(projectDir));
  if (opts.web) {
    await startWebServer(projectPath, opts);
  } else {
    showMigrationNotice();
    const { launchBoard } = await import('./tui/index.js');
    await launchBoard(projectPath);
  }
});

program
  .command('init-frontmatter')
  .description('Add YAML frontmatter to SDLC templates for Mission Control')
  .argument('[path]', 'Project directory', process.cwd())
  .action(async (projectDir: string) => {
    const { runInitFrontmatter } = await import('./commands/init-frontmatter.js');
    await runInitFrontmatter(projectDir);
  });

program.parse();
