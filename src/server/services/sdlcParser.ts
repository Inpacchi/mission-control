import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { Deliverable, DeliverableStatus, DeliverablePhase, DeliverableType, DeliverableComplexity, DeliverableTier, CatalogEntry } from '../../shared/types.js';
import { parse as parseCatalog } from './catalogParser.js';

const VALID_CARD_TYPES: DeliverableType[] = ['feature', 'bugfix', 'refactor', 'research', 'architecture'];
const VALID_COMPLEXITIES: DeliverableComplexity[] = ['simple', 'moderate', 'complex', 'arch', 'moonshot'];
const VALID_TIERS: DeliverableTier[] = ['full', 'lite'];

const DELIVERABLE_FILE_RE = /^d(\d+[a-z]?)_(.+?)_(spec|plan|result|COMPLETE|BLOCKED)\.md$/i;

interface FileInfo {
  id: string;
  name: string;
  type: 'spec' | 'plan' | 'result' | 'complete' | 'blocked';
  filePath: string;
  mtime: Date;
  content?: string;
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
    const content = await fs.readFile(filePath, 'utf-8');
    results.push({ id, name, type, filePath, mtime: stat.mtime, content });
  }

  return results;
}

const STATUS_PHASE_MAP: Record<DeliverableStatus, DeliverablePhase> = {
  idea: 'idea',
  spec: 'specifying',
  plan: 'planning',
  'in-progress': 'executing',
  review: 'reviewing',
  complete: 'done',
  blocked: 'blocked',
};

function deriveStatus(files: FileInfo[], frontmatterStatus?: DeliverableStatus): { status: DeliverableStatus; phase: DeliverablePhase } {
  // Frontmatter status takes priority — allows execution skills to mark deliverables complete
  if (frontmatterStatus && STATUS_PHASE_MAP[frontmatterStatus]) {
    return { status: frontmatterStatus, phase: STATUS_PHASE_MAP[frontmatterStatus] };
  }

  // Fall back to file-suffix heuristic
  const types = new Set(files.map((f) => f.type));

  if (types.has('complete')) return { status: 'complete', phase: 'done' };
  if (types.has('blocked')) return { status: 'blocked', phase: 'blocked' };
  if (types.has('result')) return { status: 'review', phase: 'reviewing' };
  if (types.has('plan') && types.has('spec')) return { status: 'in-progress', phase: 'executing' };
  if (types.has('plan')) return { status: 'plan', phase: 'planning' };
  if (types.has('spec')) return { status: 'spec', phase: 'specifying' };
  return { status: 'idea', phase: 'idea' };
}

const VALID_STATUSES: DeliverableStatus[] = ['idea', 'spec', 'plan', 'in-progress', 'review', 'complete', 'blocked'];

function parseFrontmatter(content: string): {
  cardType?: DeliverableType;
  complexity?: DeliverableComplexity;
  effort?: number;
  flavor?: string;
  agents?: string[];
  created?: string;
  completed?: string;
  dependsOn?: string[];
  tier?: DeliverableTier;
  frontmatterStatus?: DeliverableStatus;
} {
  try {
    const { data } = matter(content);
    const cardType = VALID_CARD_TYPES.includes(data.type) ? (data.type as DeliverableType) : undefined;
    const complexity = VALID_COMPLEXITIES.includes(data.complexity) ? (data.complexity as DeliverableComplexity) : undefined;
    let effort: number | undefined;
    if (typeof data.effort === 'number') {
      effort = Math.min(5, Math.max(1, data.effort));
    }
    const flavor = typeof data.flavor === 'string' ? data.flavor : undefined;
    const agents = Array.isArray(data.agents) ? data.agents.filter((a: unknown) => typeof a === 'string') : undefined;
    const created = typeof data.created === 'string' ? data.created : undefined;
    const completed = typeof data.completed === 'string' ? data.completed : undefined;
    const dependsOn = Array.isArray(data.depends_on) ? data.depends_on.filter((d: unknown) => typeof d === 'string') : undefined;
    const tier = VALID_TIERS.includes(data.tier) ? (data.tier as DeliverableTier) : undefined;
    const frontmatterStatus = VALID_STATUSES.includes(data.status) ? (data.status as DeliverableStatus) : undefined;
    return { cardType, complexity, effort, flavor, agents, created, completed, dependsOn, tier, frontmatterStatus };
  } catch (err) {
    console.warn(`[sdlcParser] Failed to parse frontmatter: ${err instanceof Error ? err.message : String(err)}`);
    return {};
  }
}

function buildDeliverable(id: string, name: string, files: FileInfo[], catalog?: CatalogEntry): Deliverable {
  const specFile = files.find((f) => f.type === 'spec');
  const planFile = files.find((f) => f.type === 'plan');
  const resultFile = files.find((f) => f.type === 'result') || files.find((f) => f.type === 'complete');

  // Find the most recent modification time
  const lastModified = files.length > 0
    ? new Date(Math.max(...files.map((f) => f.mtime.getTime()))).toISOString()
    : new Date().toISOString();

  // Derive createdAt from the earliest artifact mtime
  const createdAt = files.length > 0
    ? new Date(Math.min(...files.map((f) => f.mtime.getTime()))).toISOString()
    : new Date().toISOString();

  // Parse frontmatter — prefer spec, fall back to plan, then result
  const primaryFile = specFile || planFile || resultFile;
  const frontmatter = primaryFile?.content ? parseFrontmatter(primaryFile.content) : {};

  // Frontmatter status overrides file-suffix heuristic
  const { status, phase } = deriveStatus(files, frontmatter.frontmatterStatus);

  return {
    id,
    name: catalog?.name || name,
    status,
    phase,
    specPath: specFile?.filePath,
    planPath: planFile?.filePath,
    resultPath: resultFile?.filePath,
    lastModified,
    createdAt,
    catalog,
    ...frontmatter,
  };
}

function buildDeliverablesFromFiles(files: FileInfo[], catalogEntries: CatalogEntry[]): Deliverable[] {
  const catalogById = new Map(catalogEntries.map((e) => [e.id.toUpperCase(), e]));

  // Group files by deliverable ID
  const filesByDeliverable = new Map<string, FileInfo[]>();
  for (const file of files) {
    const key = file.id.toUpperCase();
    const existing = filesByDeliverable.get(key) || [];
    existing.push(file);
    filesByDeliverable.set(key, existing);
  }

  // Build deliverables from files
  const deliverables = new Map<string, Deliverable>();
  for (const [key, dFiles] of filesByDeliverable) {
    const id = dFiles[0].id;
    const name = dFiles[0].name;
    const catalog = catalogById.get(key);
    deliverables.set(key, buildDeliverable(id, name, dFiles, catalog));
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
        createdAt: new Date().toISOString(),
        catalog: entry,
      });
    }
  }

  // Sort by ID — numeric part first, then full string for sub-deliverable suffixes (D3a vs D3b)
  return Array.from(deliverables.values()).sort((a, b) => {
    const numA = parseInt(a.id.replace(/[Dd]/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/[Dd]/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.id.localeCompare(b.id);
  });
}

/** Parse active deliverables from current_work/ only — used by the file watcher */
export async function parseCurrentWork(projectPath: string): Promise<Deliverable[]> {
  const currentWorkDir = path.join(projectPath, 'docs', 'current_work');
  const [files, catalogEntries] = await Promise.all([
    scanDirectory(currentWorkDir),
    parseCatalog(projectPath),
  ]);
  return buildDeliverablesFromFiles(files, catalogEntries);
}

/** Parse all deliverables from current_work/ + chronicle/ — used by REST endpoints */
export async function parseDeliverables(projectPath: string): Promise<Deliverable[]> {
  const currentWorkDir = path.join(projectPath, 'docs', 'current_work');
  const chronicleDir = path.join(projectPath, 'docs', 'chronicle');

  const [currentFiles, chronicleFiles, catalogEntries] = await Promise.all([
    scanDirectory(currentWorkDir),
    scanDirectory(chronicleDir),
    parseCatalog(projectPath),
  ]);

  return buildDeliverablesFromFiles([...currentFiles, ...chronicleFiles], catalogEntries);
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
    if (numA !== numB) return numA - numB;
    return a.id.localeCompare(b.id);
  });
}

export async function getDeliverable(projectPath: string, deliverableId: string): Promise<Deliverable | undefined> {
  const all = await parseDeliverables(projectPath);
  return all.find((d) => d.id.toUpperCase() === deliverableId.toUpperCase());
}
