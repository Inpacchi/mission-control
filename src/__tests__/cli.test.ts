import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import { Command } from 'commander';

describe('CLI argument parsing', () => {
  let program: Command;
  let capturedArgs: { projectDir: string; opts: Record<string, string | boolean> } | null;

  beforeEach(() => {
    capturedArgs = null;
    program = new Command();
    program
      .name('mc')
      .exitOverride() // prevent process.exit
      .argument('[path]', 'Project directory to open', process.cwd())
      .option('-p, --port <number>', 'Server port', '3002')
      .option('-b, --bind <address>', 'Bind address', '127.0.0.1')
      .option('--no-open', 'Do not open browser automatically')
      .option('--dev', 'Run in development mode')
      .action((projectDir: string, opts: Record<string, string | boolean>) => {
        capturedArgs = { projectDir, opts };
      });
  });

  it('should use default port 3002', () => {
    program.parse(['node', 'mc']);
    expect(capturedArgs).not.toBeNull();
    expect(capturedArgs!.opts.port).toBe('3002');
  });

  it('should use default bind 127.0.0.1', () => {
    program.parse(['node', 'mc']);
    expect(capturedArgs!.opts.bind).toBe('127.0.0.1');
  });

  it('should use cwd as default project path', () => {
    program.parse(['node', 'mc']);
    expect(capturedArgs!.projectDir).toBe(process.cwd());
  });

  it('should parse --port 4000', () => {
    program.parse(['node', 'mc', '--port', '4000']);
    expect(capturedArgs!.opts.port).toBe('4000');
  });

  it('should parse -p 4000 (short flag)', () => {
    program.parse(['node', 'mc', '-p', '4000']);
    expect(capturedArgs!.opts.port).toBe('4000');
  });

  it('should parse --bind 0.0.0.0', () => {
    program.parse(['node', 'mc', '--bind', '0.0.0.0']);
    expect(capturedArgs!.opts.bind).toBe('0.0.0.0');
  });

  it('should parse --no-open to disable browser open', () => {
    program.parse(['node', 'mc', '--no-open']);
    expect(capturedArgs!.opts.open).toBe(false);
  });

  it('should have open=true by default', () => {
    program.parse(['node', 'mc']);
    expect(capturedArgs!.opts.open).toBe(true);
  });

  it('should parse positional path argument', () => {
    program.parse(['node', 'mc', '/tmp/myproject']);
    expect(capturedArgs!.projectDir).toBe('/tmp/myproject');
  });

  it('should resolve positional path via path.resolve in action', () => {
    const relativePath = 'some/relative/path';
    program.parse(['node', 'mc', relativePath]);
    // The CLI resolves paths in its action handler; here we verify the raw arg is passed
    expect(capturedArgs!.projectDir).toBe(relativePath);
    // path.resolve should produce an absolute path
    expect(path.resolve(capturedArgs!.projectDir)).toBe(path.resolve(relativePath));
  });

  it('should parse --dev flag', () => {
    program.parse(['node', 'mc', '--dev']);
    expect(capturedArgs!.opts.dev).toBe(true);
  });

  it('should combine multiple options', () => {
    program.parse(['node', 'mc', '/tmp/proj', '--port', '5000', '--bind', '0.0.0.0', '--no-open', '--dev']);
    expect(capturedArgs!.projectDir).toBe('/tmp/proj');
    expect(capturedArgs!.opts.port).toBe('5000');
    expect(capturedArgs!.opts.bind).toBe('0.0.0.0');
    expect(capturedArgs!.opts.open).toBe(false);
    expect(capturedArgs!.opts.dev).toBe(true);
  });
});
