import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

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

function projectSlug(projectPath: string): string {
  return path.basename(projectPath).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function ensureSessionDir(projectPath: string): string {
  const dir = path.join(SESSIONS_DIR, projectSlug(projectPath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function metaPath(sessionDir: string, sessionId: string): string {
  return path.join(sessionDir, `${sessionId}.meta.json`);
}

function logPath(sessionDir: string, sessionId: string): string {
  return path.join(sessionDir, `${sessionId}.log`);
}

export function createSession(projectPath: string, command?: string): SessionLogEntry {
  const id = crypto.randomUUID();
  const dir = ensureSessionDir(projectPath);
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
  fs.writeFileSync(metaPath(dir, id), JSON.stringify(entry, null, 2), 'utf-8');

  // Create empty log file
  fs.writeFileSync(logFile, '', 'utf-8');

  return entry;
}

export function appendLog(sessionId: string, projectPath: string, data: string): void {
  validateSessionId(sessionId);
  const dir = ensureSessionDir(projectPath);
  const lp = logPath(dir, sessionId);

  // Check size cap
  try {
    const stat = fs.statSync(lp);
    if (stat.size >= MAX_LOG_SIZE) return;
  } catch {
    // File might not exist yet
    return;
  }

  fs.appendFileSync(lp, data, 'utf-8');
}

export function finalizeSession(sessionId: string, projectPath: string): void {
  validateSessionId(sessionId);
  const dir = ensureSessionDir(projectPath);
  const mp = metaPath(dir, sessionId);

  if (!fs.existsSync(mp)) return;

  try {
    const entry = JSON.parse(fs.readFileSync(mp, 'utf-8')) as SessionLogEntry;
    entry.endedAt = new Date().toISOString();
    fs.writeFileSync(mp, JSON.stringify(entry, null, 2), 'utf-8');
  } catch {
    // Ignore parse errors
  }

  // Run pruning
  pruneOldSessions(projectPath);
}

export function listSessions(projectPath: string, limit = 50): SessionLogEntry[] {
  const dir = ensureSessionDir(projectPath);
  const entries: SessionLogEntry[] = [];

  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.meta.json'));

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
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

export function getSessionLog(sessionId: string, projectPath: string): string | null {
  validateSessionId(sessionId);
  const dir = ensureSessionDir(projectPath);
  const lp = logPath(dir, sessionId);

  if (!fs.existsSync(lp)) return null;

  try {
    return fs.readFileSync(lp, 'utf-8');
  } catch {
    return null;
  }
}

export function searchSessions(projectPath: string, query: string, limit = 20): SessionLogEntry[] {
  const all = listSessions(projectPath, 100);
  const results: SessionLogEntry[] = [];

  for (const entry of all) {
    if (results.length >= limit) break;

    // Search in command and log file
    if (entry.command?.includes(query)) {
      results.push(entry);
      continue;
    }

    try {
      if (fs.existsSync(entry.logFile)) {
        const content = fs.readFileSync(entry.logFile, 'utf-8');
        if (content.includes(query)) {
          results.push(entry);
        }
      }
    } catch {
      // Skip unreadable logs
    }
  }

  return results;
}

function pruneOldSessions(projectPath: string): void {
  const dir = ensureSessionDir(projectPath);
  const cutoff = Date.now() - PRUNE_AGE_MS;

  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.meta.json'));

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        const entry = JSON.parse(raw) as SessionLogEntry;
        const entryDate = new Date(entry.endedAt || entry.startedAt).getTime();

        if (entryDate < cutoff) {
          const sessionId = file.replace('.meta.json', '');
          const lp = logPath(dir, sessionId);

          fs.unlinkSync(path.join(dir, file));
          if (fs.existsSync(lp)) fs.unlinkSync(lp);
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
export function initSessionStore(projectPath: string): void {
  try {
    pruneOldSessions(projectPath);
  } catch {
    // Non-fatal
  }
}
