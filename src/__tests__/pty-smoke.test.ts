import { describe, it, expect } from 'vitest';

/**
 * PTY smoke test — validates node-pty infrastructure.
 * Tests that spawn PTY processes will skip gracefully if the environment
 * does not support PTY spawning (e.g., sandboxed CI environments).
 */

function canSpawnPty(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pty = require('node-pty');
    const proc = pty.spawn('/bin/sh', ['-c', 'exit 0'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
    });
    proc.kill();
    return true;
  } catch {
    return false;
  }
}

const PTY_AVAILABLE = canSpawnPty();

describe('PTY smoke test', () => {
  it('should load node-pty module', async () => {
    const pty = await import('node-pty');
    expect(pty).toBeDefined();
    expect(typeof pty.spawn).toBe('function');
  });

  it.skipIf(!PTY_AVAILABLE)('should spawn a process and receive output', async () => {
    const pty = await import('node-pty');

    const output = await new Promise<string>((resolve, reject) => {
      let buffer = '';
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for PTY output'));
      }, 5000);

      const proc = pty.spawn('/bin/sh', ['-c', 'echo hello'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        env: process.env as Record<string, string>,
      });

      proc.onData((data: string) => {
        buffer += data;
      });

      proc.onExit(() => {
        clearTimeout(timeout);
        resolve(buffer);
      });
    });

    expect(output).toContain('hello');
  });

  it.skipIf(!PTY_AVAILABLE)('should resize PTY without error', async () => {
    const pty = await import('node-pty');

    const proc = pty.spawn('/bin/cat', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      env: process.env as Record<string, string>,
    });

    // Resize should not throw
    expect(() => {
      proc.resize(120, 40);
    }).not.toThrow();

    expect(() => {
      proc.resize(40, 10);
    }).not.toThrow();

    proc.kill();
  });

  it.skipIf(!PTY_AVAILABLE)('should report exit code on process completion', async () => {
    const pty = await import('node-pty');

    const exitCode = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for PTY exit'));
      }, 5000);

      const proc = pty.spawn('/bin/sh', ['-c', 'exit 0'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        env: process.env as Record<string, string>,
      });

      proc.onExit(({ exitCode }: { exitCode: number }) => {
        clearTimeout(timeout);
        resolve(exitCode);
      });
    });

    expect(exitCode).toBe(0);
  });
});
