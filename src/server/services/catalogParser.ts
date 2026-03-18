import fs from 'node:fs';
import path from 'node:path';
import type { CatalogEntry } from '../../shared/types.js';

const DELIVERABLE_ID_RE = /[Dd](\d+[a-z]?)/;

interface ParsedRow {
  id: string;
  name: string;
  status: string;
  specLink?: string;
  planLink?: string;
  resultLink?: string;
}

function extractLinks(cell: string): string | undefined {
  const match = cell.match(/\[.*?\]\((.*?)\)/);
  return match ? match[1] : undefined;
}

function parseTableRow(line: string): ParsedRow | null {
  // Split by pipe, trim whitespace
  const cells = line
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  if (cells.length < 2) return null;

  // Try to find a deliverable ID in the first cell
  const idMatch = cells[0].match(DELIVERABLE_ID_RE);
  if (!idMatch) return null;

  const id = `D${idMatch[1]}`;
  const name = cells.length > 1 ? cells[1].replace(/\[.*?\]\(.*?\)/g, '').trim() || cells[1].trim() : '';
  const status = cells.length > 2 ? cells[2].trim() : '';

  // Try to extract links from any cell
  let specLink: string | undefined;
  let planLink: string | undefined;
  let resultLink: string | undefined;

  for (const cell of cells) {
    const lower = cell.toLowerCase();
    const link = extractLinks(cell);
    if (link) {
      if (lower.includes('spec')) specLink = link;
      else if (lower.includes('plan')) planLink = link;
      else if (lower.includes('result') || lower.includes('complete')) resultLink = link;
    }
  }

  return { id, name, status, specLink, planLink, resultLink };
}

export function parse(projectPath: string): CatalogEntry[] {
  const indexPath = path.join(projectPath, 'docs', '_index.md');

  if (!fs.existsSync(indexPath)) {
    return [];
  }

  let content: string;
  try {
    content = fs.readFileSync(indexPath, 'utf-8');
  } catch (err) {
    console.warn('[catalogParser] Failed to read _index.md:', err);
    return [];
  }

  const entries: CatalogEntry[] = [];
  const lines = content.split('\n');
  let inTable = false;
  let headerSeen = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect table start: line with pipes
    if (trimmed.includes('|') && !inTable) {
      inTable = true;
      headerSeen = false;
      continue;
    }

    // Skip separator line (e.g., |---|---|)
    if (inTable && /^[\s|:-]+$/.test(trimmed)) {
      headerSeen = true;
      continue;
    }

    // Parse data rows
    if (inTable && headerSeen && trimmed.includes('|')) {
      const row = parseTableRow(trimmed);
      if (row) {
        entries.push({
          id: row.id,
          name: row.name,
          status: row.status,
          specLink: row.specLink,
          planLink: row.planLink,
          resultLink: row.resultLink,
        });
      } else {
        console.warn(`[catalogParser] Unrecognized table row: ${trimmed}`);
      }
      continue;
    }

    // End of table: non-pipe line after table started
    if (inTable && !trimmed.includes('|') && trimmed.length > 0) {
      inTable = false;
      headerSeen = false;
    }
  }

  return entries;
}
