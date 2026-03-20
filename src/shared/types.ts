// Card type categories
export type DeliverableType = 'feature' | 'bugfix' | 'refactor' | 'research' | 'architecture';

// Complexity tiers — 'arch' NOT 'architecture' to avoid collision with DeliverableType
export type DeliverableComplexity = 'simple' | 'moderate' | 'complex' | 'arch' | 'moonshot';

// Rarity derived from complexity
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic';

// Process tier
export type DeliverableTier = 'full' | 'lite';

// Deliverable types
export interface Deliverable {
  id: string; // e.g., "D1"
  name: string;
  status: DeliverableStatus;
  phase: DeliverablePhase;
  specPath?: string;
  planPath?: string;
  resultPath?: string;
  lastModified: string; // ISO date
  createdAt: string; // ISO date — always present
  catalog?: CatalogEntry;
  cardType?: DeliverableType;
  complexity?: DeliverableComplexity;
  effort?: number; // 1-5 scale
  flavor?: string; // flavor text
  agents?: string[]; // agents involved
  dependsOn?: string[]; // [D1, D5] dependencies
  tier?: DeliverableTier; // full (spec+plan+result) or lite (plan only)
}

export type DeliverableStatus =
  | 'idea'
  | 'spec'
  | 'plan'
  | 'in-progress'
  | 'review'
  | 'complete'
  | 'blocked';

export type DeliverablePhase =
  | 'idea'
  | 'specifying'
  | 'planning'
  | 'executing'
  | 'reviewing'
  | 'done'
  | 'blocked';

export interface CatalogEntry {
  id: string;
  name: string;
  status: string;
  specLink?: string;
  planLink?: string;
  resultLink?: string;
}

// Session types
export interface Session {
  id: string;
  projectPath: string;
  command?: string;
  status: 'running' | 'exited';
  exitCode?: number;
  startedAt: string;
  endedAt?: string;
  logPath?: string;
}

// WebSocket message types
export type WsMessage =
  | { channel: `watcher:${string}`; type: 'update'; data: unknown }
  | {
      channel: 'watcher:sdlc';
      type: 'stats';
      data: { total: number; byStatus: Record<DeliverableStatus, number> };
    }
  | { channel: `terminal:${string}`; type: 'data'; data: string }
  | { channel: `terminal:${string}`; type: 'input'; data: string }
  | {
      channel: `terminal:${string}`;
      type: 'resize';
      cols: number;
      rows: number;
    }
  | { channel: `terminal:${string}`; type: 'exit'; code: number }
  | { channel: 'system'; type: 'subscribe'; channels: string[] }
  | { channel: 'system'; type: 'ping' }
  | { channel: 'system'; type: 'pong' };

// Config types
export interface McConfig {
  port: number;
  bind: string;
  columns: ColumnConfig[];
  actions: ActionMapping[];
  compact?: boolean;
  processes?: ProcessConfig[];
  corsOrigins?: string[];
}

export interface ColumnConfig {
  id: string;
  label: string;
  color: string;
  statuses: DeliverableStatus[];
}

export interface ActionMapping {
  status: DeliverableStatus;
  label: string;
  command: string;
}

export interface ProcessConfig {
  name: string;
  command: string;
  cwd?: string;
}

// Project types
export interface Project {
  path: string;
  name: string;
  slug: string;
  lastOpened: string;
  hasClaudeMd: boolean;
  hasIndex: boolean;
  hasClaude: boolean;
  hasMcConfig: boolean;
}

// Stats
export interface SdlcStats {
  total: number;
  byStatus: Record<DeliverableStatus, number>;
  untracked: number;
}

// Chronicle
export interface ChronicleEntry {
  id: string;
  name: string;
  concept: string;
  completePath: string;
}

// Git
export interface UntrackedCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}
