import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { createReadStream } from 'node:fs';
import { cleanText } from '../../shared/parseLogContent.js';

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects');

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
        const content = entry.message.content;
        if (typeof content === 'string') {
          firstPrompt = content.slice(0, 200);
        } else if (Array.isArray(content)) {
          const textPart = content.find((p: { type: string }) => p.type === 'text');
          if (textPart?.text) {
            firstPrompt = textPart.text.slice(0, 200);
          }
        }
      }
    } catch {
      // Skip unparseable lines
    }
  }

  if (!timestamp) return null;

  // Clean internal XML framing from the first prompt
  firstPrompt = cleanText(firstPrompt);

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
  const slug = projectSlug(projectPath);
  const dir = path.join(CLAUDE_DIR, slug);

  let files: string[];
  try {
    const allFiles = (await fs.readdir(dir)).filter((f) => f.endsWith('.jsonl'));
    // Sort newest first by mtime so recent sessions match quickly
    const withStats = await Promise.all(
      allFiles.map(async (f) => {
        try {
          const stat = await fs.stat(path.join(dir, f));
          return { name: f, mtime: stat.mtimeMs };
        } catch {
          return { name: f, mtime: 0 };
        }
      }),
    );
    withStats.sort((a, b) => b.mtime - a.mtime);
    files = withStats.map((f) => f.name);
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
      const matched = await sessionContainsQuery(fp, queryLower);
      if (matched) {
        const info = await parseSessionSummary(fp, sessionId);
        if (info) results.push(info);
      }
    } catch {
      // Skip unreadable files
    }
  }

  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return results.slice(0, limit);
}

/**
 * Check if a session JSONL file contains the query in any message content.
 * Streams the file line-by-line and bails early on first match.
 */
async function sessionContainsQuery(filePath: string, queryLower: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);
      const content = entry.message?.content;
      if (!content) continue;

      let text = '';
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        text = content
          .filter((p: { type: string }) => p.type === 'text')
          .map((p: { text: string }) => p.text)
          .join(' ');
      }

      if (text.toLowerCase().includes(queryLower)) {
        rl.close();
        return true;
      }
    } catch {
      // Skip unparseable lines
    }
  }

  return false;
}

/**
 * Extract user/assistant conversation from a session JSONL as readable text.
 */
export async function getClaudeSessionLog(projectPath: string, sessionId: string): Promise<string | null> {
  const slug = projectSlug(projectPath);
  const fp = path.join(CLAUDE_DIR, slug, `${sessionId}.jsonl`);

  try {
    await fs.access(fp);
  } catch {
    return null;
  }

  const rl = readline.createInterface({
    input: createReadStream(fp, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  const parts: string[] = [];

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);

      if (entry.type === 'user' && entry.message?.role === 'user') {
        const content = entry.message.content;
        let text = '';
        if (typeof content === 'string') {
          text = content;
        } else if (Array.isArray(content)) {
          const textPart = content.find((p: { type: string }) => p.type === 'text');
          if (textPart?.text) text = textPart.text;
        }
        text = cleanText(text);
        if (text) {
          parts.push(`\x1b[1;33m── User ──\x1b[0m\n${text}\n`);
        }
      }

      if (entry.type === 'assistant' && entry.message?.role === 'assistant') {
        const content = entry.message.content;
        let text = '';
        if (typeof content === 'string') {
          text = content;
        } else if (Array.isArray(content)) {
          text = content
            .filter((p: { type: string }) => p.type === 'text')
            .map((p: { text: string }) => p.text)
            .join('\n');
        }
        text = cleanText(text);
        if (text) {
          parts.push(`\x1b[1;36m── Assistant ──\x1b[0m\n${text}\n`);
        }
      }
    } catch {
      // Skip unparseable lines
    }
  }

  return parts.length > 0 ? parts.join('\n') : null;
}
