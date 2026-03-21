/**
 * Shared parser for structured content in session logs.
 * Used by both the TUI (chalk rendering) and web UI (React rendering).
 * No UI dependencies — pure parsing logic.
 */

// ── Data types ──────────────────────────────────────────────────────────────

export interface TaskNotification {
  taskId: string;
  status: string;
  summary: string;
  outputFile?: string;
}

export interface SlashCommand {
  name: string;
  args?: string;
}

export type LogSegment =
  | { type: 'text'; content: string }
  | { type: 'task-notification'; data: TaskNotification }
  | { type: 'command'; data: SlashCommand }
  | { type: 'system-reminder'; content: string }
  | { type: 'caveat'; content: string }
  | { type: 'turn-header'; role: 'user' | 'assistant' };

// ── Regex patterns ──────────────────────────────────────────────────────────

/** Task notifications with optional trailing "Read the output file..." line */
const TASK_NOTIFICATION_RE =
  /<task-notification>[\s\S]*?<\/task-notification>\s*(?:Read the output file to retrieve the result:[^\n]*\n?)?/g;

/** Slash command blocks: <command-name> + optional <command-args> + optional <command-message> */
const COMMAND_BLOCK_RE =
  /(?:<command-message>[^<]*<\/command-message>\s*)?<command-name>\/([^<]+)<\/command-name>\s*(?:<command-args>([^<]*)<\/command-args>)?|<command-name>\/([^<]+)<\/command-name>\s*(?:<command-message>[^<]*<\/command-message>)?\s*(?:<command-args>([^<]*)<\/command-args>)?/g;

/** System reminders */
const SYSTEM_REMINDER_RE = /<system-reminder>[\s\S]*?<\/system-reminder>/g;

/** Local command caveats */
const CAVEAT_RE = /<local-command-caveat>([\s\S]*?)<\/local-command-caveat>/g;

/** Local command stdout (e.g. "Bye!" from /exit) */
const COMMAND_STDOUT_RE = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/g;

/** Orphaned tags: standalone <command-args>, <command-message> not captured by COMMAND_BLOCK_RE */
const ORPHAN_TAG_RE = /<(?:command-args|command-message)>[^<]*<\/(?:command-args|command-message)>/g;

/** User/Assistant turn headers (with or without ANSI color codes) */
const TURN_HEADER_RE = /\x1b\[1;33m── User ──\x1b\[0m|\x1b\[1;36m── Assistant ──\x1b\[0m|── User ──|── Assistant ──/g;

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

interface RawMatch {
  start: number;
  end: number;
  segment: LogSegment;
}

// ── Main parser ─────────────────────────────────────────────────────────────

/**
 * Parse raw log text into structured segments.
 * Each segment is either plain text or a recognized structured block.
 */
export function parseLogContent(raw: string): LogSegment[] {
  const matches: RawMatch[] = [];

  // Task notifications
  for (const m of raw.matchAll(TASK_NOTIFICATION_RE)) {
    const xml = m[0];
    matches.push({
      start: m.index!,
      end: m.index! + xml.length,
      segment: {
        type: 'task-notification',
        data: {
          taskId: extractTag(xml, 'task-id'),
          status: extractTag(xml, 'status'),
          summary: extractTag(xml, 'summary'),
          outputFile: extractTag(xml, 'output-file') || undefined,
        },
      },
    });
  }

  // Slash commands
  for (const m of raw.matchAll(COMMAND_BLOCK_RE)) {
    const name = (m[1] || m[3] || '').trim();
    const args = (m[2] || m[4] || '').trim();
    if (!name) continue;
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      segment: {
        type: 'command',
        data: { name: `/${name}`, args: args || undefined },
      },
    });
  }

  // System reminders — collapse to a label
  for (const m of raw.matchAll(SYSTEM_REMINDER_RE)) {
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      segment: { type: 'system-reminder', content: m[0] },
    });
  }

  // Caveats
  for (const m of raw.matchAll(CAVEAT_RE)) {
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      segment: { type: 'caveat', content: extractTag(m[0], 'local-command-caveat') },
    });
  }

  // Command stdout (e.g. <local-command-stdout>Bye!</local-command-stdout>)
  for (const m of raw.matchAll(COMMAND_STDOUT_RE)) {
    const stdout = m[1]?.trim();
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      segment: { type: 'text', content: stdout || '' },
    });
  }

  // Orphaned tags: standalone <command-args>, <command-message> not captured above
  for (const m of raw.matchAll(ORPHAN_TAG_RE)) {
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      segment: { type: 'text', content: '' }, // strip entirely
    });
  }

  // Turn headers
  for (const m of raw.matchAll(TURN_HEADER_RE)) {
    const isUser = m[0].includes('── User ──');
    matches.push({
      start: m.index!,
      end: m.index! + m[0].length,
      segment: { type: 'turn-header', role: isUser ? 'user' : 'assistant' },
    });
  }

  // Sort by position, remove overlaps (earlier match wins)
  matches.sort((a, b) => a.start - b.start);
  const merged: RawMatch[] = [];
  for (const m of matches) {
    const prev = merged[merged.length - 1];
    if (prev && m.start < prev.end) continue;
    merged.push(m);
  }

  // Build final segment list, interleaving text between matches
  const segments: LogSegment[] = [];
  let lastIndex = 0;

  for (const m of merged) {
    if (m.start > lastIndex) {
      segments.push({ type: 'text', content: raw.slice(lastIndex, m.start) });
    }
    segments.push(m.segment);
    lastIndex = m.end;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: 'text', content: raw.slice(lastIndex) });
  }

  return segments;
}

// ── Plain-text cleaner ──────────────────────────────────────────────────────

/**
 * Convert structured segments to clean plain text.
 * Used by server-side code that needs stripped output (e.g. JSONL extraction).
 */
export function segmentsToPlainText(segments: LogSegment[]): string {
  const parts: string[] = [];

  for (const seg of segments) {
    switch (seg.type) {
      case 'text':
        parts.push(seg.content);
        break;
      case 'task-notification': {
        const { status, summary } = seg.data;
        if (summary) parts.push(`[${status}] ${summary}`);
        break;
      }
      case 'command': {
        const { name, args } = seg.data;
        parts.push(args ? `${name} ${args}` : name);
        break;
      }
      case 'system-reminder':
      case 'caveat':
        // Strip entirely in plain text
        break;
      case 'turn-header':
        // Handled by the caller (getClaudeSessionLog adds its own headers)
        break;
    }
  }

  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Convenience: parse and flatten to clean plain text in one call.
 */
export function cleanText(raw: string): string {
  return segmentsToPlainText(parseLogContent(raw));
}
