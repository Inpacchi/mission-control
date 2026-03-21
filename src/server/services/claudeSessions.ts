import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { createReadStream } from 'node:fs';
import { cleanText } from '../../shared/parseLogContent.js';

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects');

// Finding 12: validate sessionId before any path construction
const SAFE_SESSION_ID_RE = /^[a-zA-Z0-9_-]+$/;

export interface ClaudeSession {
  id: string;
  title: string;
  firstPrompt: string;
  timestamp: string;
  messageCount: number;
  gitBranch?: string;
}

function projectSlug(projectPath: string): string {
  return projectPath.replace(/\//g, '-');
}

// Finding 6: single private helper used by parseSessionSummary, scanSession,
// getClaudeSessionLog, and getSessionTurns.
function extractTextContent(content: unknown, mode: 'first' | 'all'): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const textParts = (content as Array<{ type: string; text?: string }>).filter(
      (p) => p.type === 'text',
    );
    if (mode === 'first') {
      return textParts[0]?.text ?? '';
    }
    return textParts.map((p) => p.text ?? '').join('\n');
  }
  return '';
}

/**
 * List Claude Code sessions for a project, sorted by most recent first.
 */
export async function listClaudeSessions(projectPath: string, limit = 50): Promise<ClaudeSession[]> {
  const slug = projectSlug(projectPath);
  const dir = path.join(CLAUDE_DIR, slug);

  let files: string[];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.jsonl'));
  } catch {
    return [];
  }

  const sessions: ClaudeSession[] = [];

  for (const file of files) {
    const sessionId = file.replace('.jsonl', '');
    const fp = path.join(dir, file);

    try {
      const info = await parseSessionSummary(fp, sessionId);
      if (info) sessions.push(info);
    } catch {
      // Skip unparseable files
    }
  }

  sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return sessions.slice(0, limit);
}

/**
 * Parse summary info from a session JSONL file without reading the whole thing.
 * Reads the first few lines for metadata and counts total lines for message count.
 */
async function parseSessionSummary(filePath: string, sessionId: string): Promise<ClaudeSession | null> {
  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let title = '';
  let firstPrompt = '';
  let timestamp = '';
  let gitBranch: string | undefined;
  let messageCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    messageCount++;

    try {
      const entry = JSON.parse(line);

      // Grab timestamp from first entry
      if (!timestamp && entry.timestamp) {
        timestamp = entry.timestamp;
      }

      // Grab git branch from first entry
      if (!gitBranch && entry.gitBranch) {
        gitBranch = entry.gitBranch;
      }

      // Grab custom title
      if (entry.type === 'custom-title' && entry.customTitle) {
        title = entry.customTitle;
      }

      // Grab first user prompt (text content)
      if (!firstPrompt && entry.type === 'user' && entry.message?.role === 'user') {
        firstPrompt = extractTextContent(entry.message.content, 'first');
      }
    } catch {
      // Skip unparseable lines
    }
  }

  if (!timestamp) return null;

  // Clean internal XML framing then truncate — order matters to avoid slicing mid-tag
  firstPrompt = cleanText(firstPrompt).slice(0, 200);

  return {
    id: sessionId,
    title: title || firstPrompt.slice(0, 60) || '(empty session)',
    firstPrompt,
    timestamp,
    messageCount,
    gitBranch,
  };
}

/**
 * Search session JSONL files for a query string within message content.
 * Returns sessions whose user or assistant messages contain the query.
 */
export async function searchSessionContent(
  projectPath: string,
  query: string,
  limit = 50,
): Promise<ClaudeSession[]> {
  if (!query.trim()) return [];

  const slug = projectSlug(projectPath);
  const dir = path.join(CLAUDE_DIR, slug);

  let files: string[];
  try {
    // readdir order is arbitrary. listClaudeSessions already sorts by mtime
    // via parseSessionSummary timestamps — but that function opens each file.
    // For search we want newest-first without blocking on 50+ stat() calls
    // before the first file is even read. Sort by the numeric session-id suffix
    // as a cheap proxy (UUIDs are time-based in Claude's naming scheme), then
    // fall back to lexicographic order. The early-exit guard (results.length >=
    // limit) ensures we stop as soon as we have enough matches.
    files = (await fs.readdir(dir))
      .filter((f) => f.endsWith('.jsonl'))
      .sort((a, b) => b.localeCompare(a)); // descending: newer UUIDs sort later alphabetically
  } catch {
    return [];
  }

  const queryLower = query.toLowerCase();
  const results: ClaudeSession[] = [];

  for (const file of files) {
    if (results.length >= limit) break;
    const sessionId = file.replace('.jsonl', '');
    const fp = path.join(dir, file);

    try {
      // Finding 2: single-pass scan replaces sessionContainsQuery + parseSessionSummary
      const { matched, session } = await scanSession(fp, sessionId, queryLower);
      if (matched && session) results.push(session);
    } catch {
      // Skip unreadable files
    }
  }

  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return results.slice(0, limit);
}

// Finding 2: merged single-pass result type
interface ScanResult {
  matched: boolean;
  session: ClaudeSession | null;
}

/**
 * Single-pass scan: checks for query match AND collects session summary metadata
 * in the same readline loop, eliminating the double-read that the old
 * sessionContainsQuery + parseSessionSummary pair caused (Finding 2).
 *
 * Finding 1: holds a reference to the ReadStream so stream.destroy() is called
 * on early match, preventing an fd leak.
 */
async function scanSession(
  filePath: string,
  sessionId: string,
  queryLower: string,
): Promise<ScanResult> {
  const stream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let matched = false;
  let title = '';
  let firstPrompt = '';
  let timestamp = '';
  let gitBranch: string | undefined;
  let messageCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    messageCount++;

    try {
      const entry = JSON.parse(line);

      // Collect summary metadata
      if (!timestamp && entry.timestamp) {
        timestamp = entry.timestamp;
      }
      if (!gitBranch && entry.gitBranch) {
        gitBranch = entry.gitBranch;
      }
      if (entry.type === 'custom-title' && entry.customTitle) {
        title = entry.customTitle;
      }
      if (!firstPrompt && entry.type === 'user' && entry.message?.role === 'user') {
        firstPrompt = extractTextContent(entry.message.content, 'first');
      }

      // Query match check (fast raw scan before JSON content extraction)
      if (!matched && entry.message?.content && line.toLowerCase().includes(queryLower)) {
        const text = extractTextContent(entry.message.content, 'all');
        if (text.toLowerCase().includes(queryLower)) {
          matched = true;
        }
      }

      // Early exit once match confirmed and timestamp is present
      if (matched && timestamp) {
        // Finding 1: destroy stream to release the fd before returning
        stream.destroy();
        rl.close();
        break;
      }
    } catch {
      // Skip unparseable lines
    }
  }

  if (!timestamp) return { matched: false, session: null };

  firstPrompt = cleanText(firstPrompt).slice(0, 200);

  const session: ClaudeSession = {
    id: sessionId,
    title: title || firstPrompt.slice(0, 60) || '(empty session)',
    firstPrompt,
    timestamp,
    messageCount,
    gitBranch,
  };

  return { matched, session };
}

/**
 * Extract user/assistant conversation from a session JSONL as readable text
 * with ANSI turn headers. Kept for backward compatibility (web UI consumer).
 */
export async function getClaudeSessionLog(projectPath: string, sessionId: string): Promise<string | null> {
  // Finding 12: validate sessionId before path construction
  if (!SAFE_SESSION_ID_RE.test(sessionId)) return null;

  const slug = projectSlug(projectPath);
  const fp = path.join(CLAUDE_DIR, slug, `${sessionId}.jsonl`);

  try {
    await fs.access(fp);
  } catch {
    return null;
  }

  const stream = createReadStream(fp, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const parts: string[] = [];

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);

      if (entry.type === 'user' && entry.message?.role === 'user') {
        // Finding 6: use extractTextContent helper
        const text = cleanText(extractTextContent(entry.message.content, 'first'));
        if (text) {
          parts.push(`\x1b[1;33m── User ──\x1b[0m\n${text}\n`);
        }
      }

      if (entry.type === 'assistant' && entry.message?.role === 'assistant') {
        // Finding 6: use extractTextContent helper
        const text = cleanText(extractTextContent(entry.message.content, 'all'));
        if (text) {
          parts.push(`\x1b[1;36m── Assistant ──\x1b[0m\n${text}\n`);
        }
      }
    } catch {
      // Skip unparseable lines
    }
  }

  rl.close();
  return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * Finding 5: raw turn list without ANSI headers.
 * Returns cleaned plain text per turn so TUI consumers can render directly
 * without an ANSI round-trip through parseLogContent.
 */
export async function getSessionTurns(
  projectPath: string,
  sessionId: string,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }> | null> {
  // Finding 12: validate sessionId
  if (!SAFE_SESSION_ID_RE.test(sessionId)) return null;

  const slug = projectSlug(projectPath);
  const fp = path.join(CLAUDE_DIR, slug, `${sessionId}.jsonl`);

  try {
    await fs.access(fp);
  } catch {
    return null;
  }

  const stream = createReadStream(fp, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const turns: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);

      if (entry.type === 'user' && entry.message?.role === 'user') {
        const content = extractTextContent(entry.message.content, 'first').trim();
        if (content) turns.push({ role: 'user', content });
      }

      if (entry.type === 'assistant' && entry.message?.role === 'assistant') {
        const content = extractTextContent(entry.message.content, 'all').trim();
        if (content) turns.push({ role: 'assistant', content });
      }
    } catch {
      // Skip unparseable lines
    }
  }

  rl.close();
  return turns.length > 0 ? turns : null;
}
