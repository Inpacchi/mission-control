import { describe, it, expect, afterEach, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateSlug } from '../projectRegistry.js';

// Check if node-pty is available (ESM-compatible: use dynamic import)
async function checkPtyAvailable(): Promise<boolean> {
  try {
    await import('node-pty');
    return true;
  } catch {
    return false;
  }
}

const canSpawnPty = await checkPtyAvailable();

let tmpProjectPath: string;
const sessionIds: string[] = [];

function makeTmpProjectDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mc-sl-test-'));
}

function cleanup() {
  if (tmpProjectPath) {
    const slug = generateSlug(tmpProjectPath);
    const sessionDir = path.join(os.homedir(), '.mc', 'sessions', slug);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    if (fs.existsSync(tmpProjectPath)) {
      fs.rmSync(tmpProjectPath, { recursive: true, force: true });
    }
  }
}

afterEach(() => {
  // Kill any lingering sessions
});

afterAll(async () => {
  // Give time for PTY processes to clean up
  await new Promise((r) => setTimeout(r, 500));
  cleanup();
});

describe.skipIf(!canSpawnPty)('Session lifecycle (PTY integration)', () => {
  it('creates a session, captures output, and handles exit', async () => {
    tmpProjectPath = makeTmpProjectDir();

    // We import terminalManager dynamically because it loads node-pty
    const terminalManager = await import('../terminalManager.js');
    const sessionStore = await import('../sessionStore.js');

    // The terminalManager.createSession spawns 'claude' by default.
    // We cannot easily override the command since it's hardcoded to 'claude'.
    // Instead, test the sessionStore directly for lifecycle, and only test
    // terminalManager if claude binary is available.

    // Test session store lifecycle directly
    const entry = await sessionStore.createSession(tmpProjectPath, 'echo hello');
    sessionIds.push(entry.id);

    expect(entry.id).toBeTruthy();
    expect(entry.logFile).toBeTruthy();
    expect(fs.existsSync(entry.logFile)).toBe(true);

    // Append some log data (simulating PTY output)
    await sessionStore.appendLog(entry.id, tmpProjectPath, 'hello\r\n');

    const log = await sessionStore.getSessionLog(entry.id, tmpProjectPath);
    expect(log).toBe('hello\r\n');

    // Finalize (simulating PTY exit)
    await sessionStore.finalizeSession(entry.id, tmpProjectPath);

    // Verify session is finalized
    const sessions = await sessionStore.listSessions(tmpProjectPath);
    const finalized = sessions.find((s: { id: string }) => s.id === entry.id);
    expect(finalized).toBeTruthy();
    expect(finalized!.endedAt).toBeTruthy();
  });

  it('terminalManager.listSessions returns in-memory sessions', async () => {
    const terminalManager = await import('../terminalManager.js');

    // listSessions returns only in-memory (active PTY) sessions.
    // Since we haven't spawned any PTY processes, it should be an array.
    const sessions = terminalManager.listSessions();
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('terminalManager.getSession returns undefined for unknown IDs', async () => {
    const terminalManager = await import('../terminalManager.js');

    const session = terminalManager.getSession('nonexistent-id');
    expect(session).toBeUndefined();
  });

  it('terminalManager.sendInput returns false for unknown session', async () => {
    const terminalManager = await import('../terminalManager.js');

    const result = terminalManager.sendInput('nonexistent-id', 'test');
    expect(result).toBe(false);
  });

  it('terminalManager.killSession returns false for unknown session', async () => {
    const terminalManager = await import('../terminalManager.js');

    const result = terminalManager.killSession('nonexistent-id');
    expect(result).toBe(false);
  });

  it('terminalManager.resize returns false for unknown session', async () => {
    const terminalManager = await import('../terminalManager.js');

    const result = terminalManager.resize('nonexistent-id', 120, 40);
    expect(result).toBe(false);
  });
});
