import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Project } from '../../shared/types.js';

const MC_DIR = path.join(os.homedir(), '.mc');
const PROJECTS_FILE = path.join(MC_DIR, 'projects.json');

interface ProjectsData {
  projects: Project[];
  lastUsed?: string;
}

function ensureMcDir(): void {
  if (!fs.existsSync(MC_DIR)) {
    fs.mkdirSync(MC_DIR, { recursive: true });
  }
}

function readProjectsFile(): ProjectsData {
  ensureMcDir();
  if (!fs.existsSync(PROJECTS_FILE)) {
    return { projects: [] };
  }
  try {
    const raw = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    return JSON.parse(raw) as ProjectsData;
  } catch {
    console.warn('[projectRegistry] Failed to parse projects.json, starting fresh');
    return { projects: [] };
  }
}

function writeProjectsFile(data: ProjectsData): void {
  ensureMcDir();
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function detectMarkers(absPath: string): Pick<Project, 'hasClaudeMd' | 'hasIndex' | 'hasClaude' | 'hasMcConfig'> {
  return {
    hasClaudeMd: fs.existsSync(path.join(absPath, 'CLAUDE.md')),
    hasIndex: fs.existsSync(path.join(absPath, 'docs', '_index.md')),
    hasClaude: fs.existsSync(path.join(absPath, '.claude')),
    hasMcConfig: fs.existsSync(path.join(absPath, '.mc.json')),
  };
}

export function resolve(projectPath: string): string {
  const absPath = path.resolve(projectPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Project path does not exist: ${absPath}`);
  }
  const stat = fs.statSync(absPath);
  if (!stat.isDirectory()) {
    throw new Error(`Project path is not a directory: ${absPath}`);
  }
  return absPath;
}

export function register(projectPath: string): Project {
  const absPath = resolve(projectPath);
  const data = readProjectsFile();
  const now = new Date().toISOString();
  const name = path.basename(absPath);
  const markers = detectMarkers(absPath);

  const existing = data.projects.find((p) => p.path === absPath);
  if (existing) {
    existing.lastOpened = now;
    existing.name = name;
    Object.assign(existing, markers);
    data.lastUsed = absPath;
    writeProjectsFile(data);
    return existing;
  }

  const project: Project = {
    path: absPath,
    name,
    lastOpened: now,
    ...markers,
  };
  data.projects.push(project);
  data.lastUsed = absPath;
  writeProjectsFile(data);
  return project;
}

export function list(): { projects: Project[]; lastUsed?: string } {
  const data = readProjectsFile();
  // Sort by last opened, most recent first
  data.projects.sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime());
  return data;
}

export function switchProject(projectPath: string): Project {
  return register(projectPath);
}

export function getLastUsed(): string | undefined {
  const data = readProjectsFile();
  return data.lastUsed;
}

export function getProject(projectPath: string): Project | undefined {
  const absPath = path.resolve(projectPath);
  const data = readProjectsFile();
  return data.projects.find((p) => p.path === absPath);
}

export function remove(projectPath: string): boolean {
  const absPath = path.resolve(projectPath);
  const data = readProjectsFile();
  const before = data.projects.length;
  data.projects = data.projects.filter((p) => p.path !== absPath);
  if (data.lastUsed === absPath) {
    data.lastUsed = data.projects[0]?.path;
  }
  writeProjectsFile(data);
  return data.projects.length < before;
}
