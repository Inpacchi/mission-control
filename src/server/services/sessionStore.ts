import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { generateSlug } from './projectRegistry.js';

const MC_DIR = path.join(os.homedir(), '.mc');
const SESSIONS_DIR = path.join(MC_DIR, 'sessions');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const PRUNE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SAFE_SESSION_ID_RE = /^[a-zA-Z0-9_-]+$/;

function validateSessionId(sessionId: string): void {
  if (!SAFE_SESSION_ID_RE.test(sessionId)) {
    throw new Error(`Invalid session ID: ${sessionId}`);
  }
}

export interface SessionLogEntry {
  id: string;
  projectPath: string;
  command?: string;
  startedAt: string;
  endedAt?: string;
  logFile: string;
}

async function ensureSessionDir(projectPath: string): Promise<string> {
  const dir = path.join(SESSIONS_DIR, generateSlug(projectPath));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function metaPath(sessionDir: string, sessionId: string): string {
  return path.join(sessionDir, `${sessionId}.meta.json`);
}

function logPath(sessionDir: string, sessionId: string): string {
  return path.join(sessionDir, `${sessionId}.log`);
}

export async function createSession(projectPath: string, command?: string): Promise<SessionLogEntry> {
  const id = crypto.randomUUID();
  const dir = await ensureSessionDir(projectPath);
  const now = new Date().toISOString();
  const logFile = logPath(dir, id);

  const entry: SessionLogEntry = {
    id,
    projectPath,
    command,
    startedAt: now,
    logFile,
  };

  // Write metadata
  await fs.writeFile(metaPath(dir, id), JSON.stringify(entry, null, 2), 'utf-8');

  // Create empty log file
  await fs.writeFile(logFile, '', 'utf-8');

  return entry;
}

export async function appendLog(sessionId: string, projectPath: string, data: string): Promise<void> {
  validateSessionId(sessionId);
  const dir = await ensureSessionDir(projectPath);
  const lp = logPath(dir, sessionId);

  // Check size cap
  try {
    const stat = await fs.stat(lp);
    if (stat.size >= MAX_LOG_SIZE) return;
  } catch {
    // File might not exist yet
    return;
  }

  await fs.appendFile(lp, data, 'utf-8');
}

export async function finalizeSession(sessionId: string, projectPath: string): Promise<void> {
  validateSessionId(sessionId);
  const dir = await ensureSessionDir(projectPath);
  const mp = metaPath(dir, sessionId);

  try {
    await fs.access(mp);
  } catch {
    return;
  }

  try {
    const entry = JSON.parse(await fs.readFile(mp, 'utf-8')) as SessionLogEntry;
    entry.endedAt = new Date().toISOString();
    await fs.writeFile(mp, JSON.stringify(entry, null, 2), 'utf-8');
  } catch {
    // Ignore parse errors
  }

  // Run pruning
  await pruneOldSessions(projectPath);
}

export async function listSessions(projectPath: string, limit = 50): Promise<SessionLogEntry[]> {
  const dir = await ensureSessionDir(projectPath);
  const entries: SessionLogEntry[] = [];

  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.meta.json'));

    for (const file of files) {
      try {
        const raw = await fs.readFile(path.join(dir, file), 'utf-8');
        entries.push(JSON.parse(raw) as SessionLogEntry);
      } catch {
        // Skip unparseable files
      }
    }
  } catch {
    return [];
  }

  // Sort by startedAt descending
  entries.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return entries.slice(0, limit);
}

export async function getSessionLog(sessionId: string, projectPath: string): Promise<string | null> {
  validateSessionId(sessionId);
  const dir = await ensureSessionDir(projectPath);
  const lp = logPath(dir, sessionId);

  try {
    return await fs.readFile(lp, 'utf-8');
  } catch {
    return null;
  }
}

export async function searchSessions(projectPath: string, query: string, limit = 20): Promise<SessionLogEntry[]> {
  const all = await listSessions(projectPath, 100);
  const results: SessionLogEntry[] = [];

  for (const entry of all) {
    if (results.length >= limit) break;

    // Search in command and log file
    if (entry.command?.includes(query)) {
      results.push(entry);
      continue;
    }

    try {
      const content = await fs.readFile(entry.logFile, 'utf-8');
      if (content.includes(query)) {
        results.push(entry);
      }
    } catch {
      // Skip unreadable logs
    }
  }

  return results;
}

async function pruneOldSessions(projectPath: string): Promise<void> {
  const dir = await ensureSessionDir(projectPath);
  const cutoff = Date.now() - PRUNE_AGE_MS;

  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.meta.json'));

    for (const file of files) {
      try {
        const raw = await fs.readFile(path.join(dir, file), 'utf-8');
        const entry = JSON.parse(raw) as SessionLogEntry;
        const entryDate = new Date(entry.endedAt || entry.startedAt).getTime();

        if (entryDate < cutoff) {
          const sessionId = file.replace('.meta.json', '');
          const lp = logPath(dir, sessionId);

          await fs.unlink(path.join(dir, file));
          try {
            await fs.unlink(lp);
          } catch {
            // Log file may not exist
          }
        }
      } catch {
        // Skip unparseable, don't delete
      }
    }
  } catch {
    // Ignore directory read errors
  }
}

// Run pruning on import (startup)
export async function initSessionStore(projectPath: string): Promise<void> {
  try {
    await pruneOldSessions(projectPath);
  } catch {
    // Non-fatal
  }
}
