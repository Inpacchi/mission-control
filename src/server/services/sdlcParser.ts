import fs from 'node:fs/promises';
import path from 'node:path';
import type { Deliverable, DeliverableStatus, DeliverablePhase, CatalogEntry } from '../../shared/types.js';
import { parse as parseCatalog } from './catalogParser.js';

const DELIVERABLE_FILE_RE = /^d(\d+[a-z]?)_(.+?)_(spec|plan|result|COMPLETE|BLOCKED)\.md$/i;

interface FileInfo {
  id: string;
  name: string;
  type: 'spec' | 'plan' | 'result' | 'complete' | 'blocked';
  filePath: string;
  mtime: Date;
}

async function scanDirectory(dirPath: string): Promise<FileInfo[]> {
  const results: FileInfo[] = [];

  try {
    await fs.access(dirPath);
  } catch {
    return results;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Recurse into subdirectories
      const subResults = await scanDirectory(path.join(dirPath, entry.name));
      results.push(...subResults);
      continue;
    }

    const match = entry.name.match(DELIVERABLE_FILE_RE);
    if (!match) continue;

    const id = `D${match[1]}`;
    const name = match[2].replace(/_/g, ' ');
    const rawType = match[3].toLowerCase();
    let type: FileInfo['type'];

    switch (rawType) {
      case 'spec': type = 'spec'; break;
      case 'plan': type = 'plan'; break;
      case 'result': type = 'result'; break;
      case 'complete': type = 'complete'; break;
      case 'blocked': type = 'blocked'; break;
      default: continue;
    }

    const filePath = path.join(dirPath, entry.name);
    const stat = await fs.stat(filePath);
    results.push({ id, name, type, filePath, mtime: stat.mtime });
  }

  return results;
}

function deriveStatus(files: FileInfo[]): { status: DeliverableStatus; phase: DeliverablePhase } {
  const types = new Set(files.map((f) => f.type));

  if (types.has('complete')) return { status: 'complete', phase: 'done' };
  if (types.has('blocked')) return { status: 'blocked', phase: 'blocked' };
  if (types.has('result')) return { status: 'review', phase: 'reviewing' };
  if (types.has('plan') && types.has('spec')) return { status: 'in-progress', phase: 'executing' };
  if (types.has('plan')) return { status: 'plan', phase: 'planning' };
  if (types.has('spec')) return { status: 'spec', phase: 'specifying' };
  return { status: 'idea', phase: 'idea' };
}

function buildDeliverable(id: string, name: string, files: FileInfo[], catalog?: CatalogEntry): Deliverable {
  const { status, phase } = deriveStatus(files);
  const specFile = files.find((f) => f.type === 'spec');
  const planFile = files.find((f) => f.type === 'plan');
  const resultFile = files.find((f) => f.type === 'result') || files.find((f) => f.type === 'complete');

  // Find the most recent modification time
  const lastModified = files.length > 0
    ? new Date(Math.max(...files.map((f) => f.mtime.getTime()))).toISOString()
    : new Date().toISOString();

  return {
    id,
    name: catalog?.name || name,
    status,
    phase,
    specPath: specFile?.filePath,
    planPath: planFile?.filePath,
    resultPath: resultFile?.filePath,
    lastModified,
    catalog,
  };
}

export async function parseDeliverables(projectPath: string): Promise<Deliverable[]> {
  const currentWorkDir = path.join(projectPath, 'docs', 'current_work');
  const chronicleDir = path.join(projectPath, 'docs', 'chronicle');

  // Scan both directories
  const [currentFiles, chronicleFiles] = await Promise.all([
    scanDirectory(currentWorkDir),
    scanDirectory(chronicleDir),
  ]);
  const allFiles = [...currentFiles, ...chronicleFiles];

  // Parse catalog
  const catalogEntries = await parseCatalog(projectPath);
  const catalogById = new Map(catalogEntries.map((e) => [e.id.toUpperCase(), e]));

  // Group files by deliverable ID
  const filesByDeliverable = new Map<string, FileInfo[]>();
  for (const file of allFiles) {
    const key = file.id.toUpperCase();
    const existing = filesByDeliverable.get(key) || [];
    existing.push(file);
    filesByDeliverable.set(key, existing);
  }

  // Build deliverables from files
  const deliverables = new Map<string, Deliverable>();
  for (const [key, files] of filesByDeliverable) {
    const id = files[0].id;
    const name = files[0].name;
    const catalog = catalogById.get(key);
    deliverables.set(key, buildDeliverable(id, name, files, catalog));
  }

  // Add catalog-only entries (ideas with no files)
  for (const entry of catalogEntries) {
    const key = entry.id.toUpperCase();
    if (!deliverables.has(key)) {
      deliverables.set(key, {
        id: entry.id,
        name: entry.name,
        status: 'idea',
        phase: 'idea',
        lastModified: new Date().toISOString(),
        catalog: entry,
      });
    }
  }

  // Sort by ID
  return Array.from(deliverables.values()).sort((a, b) => {
    const numA = parseInt(a.id.replace(/[Dd]/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/[Dd]/g, ''), 10) || 0;
    return numA - numB;
  });
}

export async function parseChronicle(projectPath: string): Promise<Deliverable[]> {
  const chronicleDir = path.join(projectPath, 'docs', 'chronicle');
  const files = await scanDirectory(chronicleDir);

  const catalogEntries = await parseCatalog(projectPath);
  const catalogById = new Map(catalogEntries.map((e) => [e.id.toUpperCase(), e]));

  const filesByDeliverable = new Map<string, FileInfo[]>();
  for (const file of files) {
    const key = file.id.toUpperCase();
    const existing = filesByDeliverable.get(key) || [];
    existing.push(file);
    filesByDeliverable.set(key, existing);
  }

  const deliverables: Deliverable[] = [];
  for (const [key, dFiles] of filesByDeliverable) {
    const id = dFiles[0].id;
    const name = dFiles[0].name;
    const catalog = catalogById.get(key);
    deliverables.push(buildDeliverable(id, name, dFiles, catalog));
  }

  return deliverables.sort((a, b) => {
    const numA = parseInt(a.id.replace(/[Dd]/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/[Dd]/g, ''), 10) || 0;
    return numA - numB;
  });
}

export async function getDeliverable(projectPath: string, deliverableId: string): Promise<Deliverable | undefined> {
  const all = await parseDeliverables(projectPath);
  return all.find((d) => d.id.toUpperCase() === deliverableId.toUpperCase());
}
