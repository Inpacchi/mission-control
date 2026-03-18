#!/usr/bin/env node

import { Command } from 'commander';
import { execSync } from 'node:child_process';
import path from 'node:path';
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

const program = new Command();

program
  .name('mc')
  .description(
    'Mission Control - Web UI for SDLC workflows and Claude Code interaction'
  )
  .version('0.1.0')
  .argument('[path]', 'Project directory to open', process.cwd())
  .option('-p, --port <number>', 'Server port', '3002')
  .option('-b, --bind <address>', 'Bind address', '127.0.0.1')
  .option('--no-open', 'Do not open browser automatically')
  .option('--dev', 'Run in development mode')
  .action(async (projectDir: string, opts: Record<string, string | boolean>) => {
    const projectPath = path.resolve(String(projectDir));
    const port = parseInt(String(opts.port), 10);
    const bind = String(opts.bind);
    const shouldOpen = opts.open !== false;
    const dev = opts.dev === true;

    console.log('Mission Control v0.1.0');
    console.log('─'.repeat(40));

    // Check for claude binary
    checkClaudeBinary();

    // Start server
    await startServer({ port, bind, projectPath, dev });

    // Open browser
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
  });

program.parse();
