import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateSlug } from '../projectRegistry.js';

// We need to mock the session store's base directory to use a temp dir.
// The sessionStore module uses hardcoded paths under ~/.mc/sessions/,
// so we'll test the public API against a real (but unique) project path
// to avoid collisions.

let tmpProjectPath: string;
let sessionDir: string;

function makeTmpProjectDir(): string {
  // Create a unique project path in temp so session files go to ~/.mc/sessions/<slug>
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mc-ss-test-'));
}

beforeEach(() => {
  tmpProjectPath = makeTmpProjectDir();
});

afterEach(() => {
  // Clean up the session store directory for this test project
  const slug = generateSlug(tmpProjectPath);
  sessionDir = path.join(os.homedir(), '.mc', 'sessions', slug);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
  if (fs.existsSync(tmpProjectPath)) {
    fs.rmSync(tmpProjectPath, { recursive: true, force: true });
  }
});

describe('sessionStore', () => {
  it('creates a session with metadata and log file', async () => {
    const { createSession } = await import('../sessionStore.js');

    const entry = await createSession(tmpProjectPath, 'test-command');

    expect(entry.id).toBeTruthy();
    expect(entry.projectPath).toBe(tmpProjectPath);
    expect(entry.command).toBe('test-command');
    expect(entry.startedAt).toBeTruthy();
    expect(entry.logFile).toBeTruthy();

    // Log file should exist and be empty
    expect(fs.existsSync(entry.logFile)).toBe(true);
    expect(fs.readFileSync(entry.logFile, 'utf-8')).toBe('');

    // Metadata file should exist
    const slug = generateSlug(tmpProjectPath);
    const metaFile = path.join(
      os.homedir(),
      '.mc',
      'sessions',
      slug,
      `${entry.id}.meta.json`
    );
    expect(fs.existsSync(metaFile)).toBe(true);

    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    expect(meta.id).toBe(entry.id);
    expect(meta.command).toBe('test-command');
  });

  it('lists sessions sorted by startedAt descending', async () => {
    const { createSession, listSessions } = await import('../sessionStore.js');

    const entry1 = await createSession(tmpProjectPath, 'first');
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));
    const entry2 = await createSession(tmpProjectPath, 'second');

    const sessions = await listSessions(tmpProjectPath);
    expect(sessions.length).toBeGreaterThanOrEqual(2);

    // Find our sessions in the list
    const ids = sessions.map((s) => s.id);
    expect(ids).toContain(entry1.id);
    expect(ids).toContain(entry2.id);

    // Second should come before first (descending)
    const idx1 = ids.indexOf(entry1.id);
    const idx2 = ids.indexOf(entry2.id);
    expect(idx2).toBeLessThan(idx1);
  });

  it('appends data to session log', async () => {
    const { createSession, appendLog, getSessionLog } = await import(
      '../sessionStore.js'
    );

    const entry = await createSession(tmpProjectPath);
    await appendLog(entry.id, tmpProjectPath, 'hello ');
    await appendLog(entry.id, tmpProjectPath, 'world');

    const log = await getSessionLog(entry.id, tmpProjectPath);
    expect(log).toBe('hello world');
  });

  it('finalizes a session with endedAt timestamp', async () => {
    const { createSession, finalizeSession, listSessions } = await import(
      '../sessionStore.js'
    );

    const entry = await createSession(tmpProjectPath);
    await finalizeSession(entry.id, tmpProjectPath);

    const sessions = await listSessions(tmpProjectPath);
    const finalized = sessions.find((s) => s.id === entry.id);
    expect(finalized).toBeTruthy();
    expect(finalized!.endedAt).toBeTruthy();
  });

  it('enforces 10MB log size cap', async () => {
    const { createSession, appendLog } = await import('../sessionStore.js');

    const entry = await createSession(tmpProjectPath);

    // Write chunks to approach the 10MB limit
    const chunk = 'x'.repeat(1024 * 1024); // 1MB chunk
    for (let i = 0; i < 11; i++) {
      await appendLog(entry.id, tmpProjectPath, chunk);
    }

    // File size should not exceed 10MB
    const stat = fs.statSync(entry.logFile);
    expect(stat.size).toBeLessThanOrEqual(10 * 1024 * 1024 + 1024 * 1024); // Allow one chunk overshoot
  });

  it('prunes sessions older than 30 days on finalize', async () => {
    const { createSession, finalizeSession, listSessions } = await import(
      '../sessionStore.js'
    );

    // Create a session and backdate it
    const oldEntry = await createSession(tmpProjectPath, 'old-session');

    // Backdate the metadata to 31 days ago
    const slug = generateSlug(tmpProjectPath);
    const metaFile = path.join(
      os.homedir(),
      '.mc',
      'sessions',
      slug,
      `${oldEntry.id}.meta.json`
    );
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    meta.startedAt = oldDate;
    meta.endedAt = oldDate;
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));

    // Create a new session and finalize it (triggers pruning)
    const newEntry = await createSession(tmpProjectPath, 'new-session');
    await finalizeSession(newEntry.id, tmpProjectPath);

    const sessions = await listSessions(tmpProjectPath);
    const oldSession = sessions.find((s) => s.id === oldEntry.id);
    const newSession = sessions.find((s) => s.id === newEntry.id);

    // Old session should have been pruned
    expect(oldSession).toBeUndefined();
    // New session should still exist
    expect(newSession).toBeTruthy();
  });

  it('rejects invalid session IDs', async () => {
    const { appendLog } = await import('../sessionStore.js');

    await expect(appendLog('../../../etc/passwd', tmpProjectPath, 'exploit')).rejects.toThrow(
      'Invalid session ID'
    );
    await expect(appendLog('id with spaces', tmpProjectPath, 'exploit')).rejects.toThrow(
      'Invalid session ID'
    );
    await expect(appendLog('id;rm -rf', tmpProjectPath, 'exploit')).rejects.toThrow(
      'Invalid session ID'
    );
  });
});
