import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Key } from 'ink';
import type { ViewMode } from './useKeyboard.js';
import { useListNavigation } from './useListNavigation.js';
import { useSearchInput } from './useSearchInput.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { spawnSync } from 'node:child_process';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  depth: number;
}

export interface GrepResult {
  file: string;
  line: number;
  text: string;
}

// Persist collapsed state between sessions
const STATE_DIR = path.join(os.homedir(), '.mc');
const NO_SAVED_STATE = Symbol('no-saved-state');

function stateFilePath(projectPath: string): string {
  const hash = projectPath.replace(/[^a-zA-Z0-9]/g, '_').slice(-60);
  return path.join(STATE_DIR, `filebrowser-${hash}.json`);
}

function loadCollapsedState(projectPath: string): Set<string> | typeof NO_SAVED_STATE {
  try {
    const data = fs.readFileSync(stateFilePath(projectPath), 'utf-8');
    const paths: string[] = JSON.parse(data);
    return new Set(paths);
  } catch {
    return NO_SAVED_STATE as typeof NO_SAVED_STATE;
  }
}

export function saveCollapsedState(projectPath: string, collapsed: Set<string>): void {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(stateFilePath(projectPath), JSON.stringify([...collapsed]));
  } catch { /* ignore */ }
}

// Directories/files to skip
const IGNORE = new Set([
  'node_modules', '.git', 'dist', '.next', '.cache', '.turbo',
  '.DS_Store', 'thumbs.db', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
]);


function scanAll(dirPath: string, depth: number): FileNode[] {
  const result: FileNode[] = [];
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const sorted = items
      .filter((item) => !IGNORE.has(item.name))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });
    for (const item of sorted) {
      const fullPath = path.join(dirPath, item.name);
      result.push({ name: item.name, path: fullPath, isDirectory: item.isDirectory(), depth });
      if (item.isDirectory()) {
        result.push(...scanAll(fullPath, depth + 1));
      }
    }
  } catch { /* ignore */ }
  return result;
}

export interface FileViewState {
  // Tree state
  allFiles: FileNode[];
  collapsed: Set<string>;
  selectedIndex: number;
  // Browse search state (filename filter)
  searchQuery: string;
  // Grep state
  grepQuery: string;
  grepResults: GrepResult[];
  grepSelectedIndex: number;
  grepRunning: boolean;
  // Derived visible entries (for the component to render)
  visibleEntries: FileNode[];
}

const DEFAULT_STATE: FileViewState = {
  allFiles: [],
  collapsed: new Set(),
  selectedIndex: 0,
  searchQuery: '',
  grepQuery: '',
  grepResults: [],
  grepSelectedIndex: 0,
  grepRunning: false,
  visibleEntries: [],
};

interface UseFileViewResult {
  state: FileViewState;
  handleKey: (input: string, key: Key, viewMode: ViewMode) => boolean;
  // Expose setCollapsed so the component can persist collapsed state via its own useEffect
  // (Intentional exception: disk-persistence stays in the component — see FileBrowser.tsx)
  setCollapsed: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useFileView(
  projectPath: string,
  setViewMode: (mode: ViewMode) => void,
  terminalHeight?: number,
): UseFileViewResult {
  const [allFiles, setAllFiles] = useState<FileNode[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [grepQuery, setGrepQuery] = useState('');
  const [grepResults, setGrepResults] = useState<GrepResult[]>([]);
  const [grepSelectedIndex, setGrepSelectedIndex] = useState(0);
  const [grepRunning, setGrepRunning] = useState(false);
  const grepLoadIdRef = useRef(0);

  const searchInput = useSearchInput();
  const searchQuery = searchInput.query;

  // Scan project tree on mount/projectPath change.
  // Deferred via Promise.resolve().then() so the loading render can paint before
  // scanAll() blocks the event loop (mirrors the pattern used in useAdhocView).
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const files = scanAll(projectPath, 0);
      if (cancelled) return;
      setAllFiles(files);

      // Load saved state or collapse all directories by default
      const saved = loadCollapsedState(projectPath);
      if (saved === NO_SAVED_STATE) {
        setCollapsed(new Set(files.filter((f) => f.isDirectory).map((f) => f.path)));
      } else {
        setCollapsed(saved as Set<string>);
      }
    });
    return () => { cancelled = true; };
  }, [projectPath]);

  // Build visible tree based on collapsed state and current mode
  // viewMode is not tracked directly here; searchQuery being non-empty indicates search mode
  const visibleEntries = useMemo(() => {
    if (searchQuery) {
      // Filter: show files matching search, with their relative path
      const query = searchQuery.toLowerCase();
      return allFiles.filter(
        (f) => !f.isDirectory && f.name.toLowerCase().includes(query),
      );
    }

    // Tree view: skip children of collapsed directories
    const result: FileNode[] = [];
    let skipUntilDepth = -1;
    for (const node of allFiles) {
      if (skipUntilDepth >= 0 && node.depth > skipUntilDepth) continue;
      skipUntilDepth = -1;
      result.push(node);
      if (node.isDirectory && collapsed.has(node.path)) {
        skipUntilDepth = node.depth;
      }
    }
    return result;
  }, [allFiles, collapsed, searchQuery]);

  const rows = terminalHeight ?? process.stdout.rows ?? 24;
  const contentHeight = rows - 3;

  // List navigation for browse/search mode
  const {
    selectedIndex,
    handleUp,
    handleDown,
    handlePageUp,
    handlePageDown,
    setSelectedIndex,
  } = useListNavigation(visibleEntries.length, contentHeight);

  // Reset selection when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, setSelectedIndex]);

  // Ref to hold the latest setSelectedIndex for use in setTimeout callbacks
  const setSelectedIndexRef = useRef(setSelectedIndex);
  setSelectedIndexRef.current = setSelectedIndex;

  const handleKey = useCallback(
    (input: string, key: Key, viewMode: ViewMode): boolean => {
      if (
        viewMode !== 'files' &&
        viewMode !== 'file-search' &&
        viewMode !== 'file-grep-input' &&
        viewMode !== 'file-grep-results'
      ) {
        return false;
      }

      // ── Grep input mode ──────────────────────────────────────────────────────
      if (viewMode === 'file-grep-input') {
        if (key.return) {
          if (grepQuery.trim()) {
            setGrepRunning(true);
            setViewMode('file-grep-results');
            const includeArgs = ['*.ts', '*.tsx', '*.md', '*.json', '*.js', '*.jsx', '*.css']
              .flatMap((ext) => ['--include', ext]);
            const args = ['-rn', '-i', ...includeArgs, grepQuery, projectPath];
            const loadId = ++grepLoadIdRef.current;
            execFile('grep', args, { encoding: 'utf-8', maxBuffer: 1024 * 1024 }, (_err, stdout) => {
                if (loadId !== grepLoadIdRef.current) return; // stale result — user navigated away
                const results = (stdout || '')
                  .split('\n')
                  .filter(Boolean)
                  .slice(0, 200)
                  .map((line) => {
                    const match = line.match(/^(.+?):(\d+):(.*)$/);
                    if (!match) return null;
                    return { file: match[1], line: parseInt(match[2], 10), text: match[3].trim() };
                  })
                  .filter((r): r is GrepResult => r !== null);
                setGrepResults(results);
                setGrepSelectedIndex(0);
                setGrepRunning(false);
              },
            );
          } else {
            setViewMode('files');
          }
          return true;
        }
        if (key.escape) {
          setGrepQuery('');
          setViewMode('files');
          return true;
        }
        if (key.backspace || key.delete) {
          setGrepQuery((q) => q.slice(0, -1));
          return true;
        }
        // Raw character accumulation for grep query (not delegated to useSearchInput)
        if (input && !key.ctrl && !key.meta) {
          setGrepQuery((q) => q + input);
        }
        return true;
      }

      // ── Grep results mode ────────────────────────────────────────────────────
      if (viewMode === 'file-grep-results') {
        if (input === 'b') {
          setViewMode('files');
          setGrepResults([]);
          setGrepQuery('');
          return true;
        }
        if (input === 'g') {
          setGrepQuery('');
          setViewMode('file-grep-input');
          return true;
        }
        if (input === '/') {
          setViewMode('file-search');
          searchInput.reset();
          setSelectedIndex(0);
          return true;
        }
        if (key.upArrow) {
          setGrepSelectedIndex((i) => Math.max(0, i - 1));
          return true;
        }
        if (key.downArrow) {
          setGrepSelectedIndex((i) => Math.min(grepResults.length - 1, i + 1));
          return true;
        }
        if (input === 'u') {
          setGrepSelectedIndex((i) => Math.max(0, i - Math.floor(contentHeight / 2)));
          return true;
        }
        if (input === 'd') {
          setGrepSelectedIndex((i) => Math.min(grepResults.length - 1, i + Math.floor(contentHeight / 2)));
          return true;
        }
        if (key.pageUp) {
          setGrepSelectedIndex((i) => Math.max(0, i - contentHeight));
          return true;
        }
        if (key.pageDown) {
          setGrepSelectedIndex((i) => Math.min(grepResults.length - 1, i + contentHeight));
          return true;
        }
        if (key.return && grepResults[grepSelectedIndex]) {
          const result = grepResults[grepSelectedIndex];
          const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
          process.stdout.write('\x1b[?1049l');
          process.stdout.write('\x1b[?25h');
          try {
            spawnSync(editor, [`+${result.line}`, result.file], { stdio: 'inherit' });
          } catch { /* editor error */ }
          process.stdout.write('\x1b[?1049h');
          return true;
        }
        return false;
      }

      // ── Search mode (filename filter) ────────────────────────────────────────
      if (viewMode === 'file-search') {
        if (key.return) {
          const entry = visibleEntries[selectedIndex];
          if (entry) {
            setViewMode('files');
            searchInput.reset();
            const idx = allFiles.findIndex((f) => f.path === entry.path);
            if (idx >= 0) {
              const parents = new Set(collapsed);
              let dir = path.dirname(entry.path);
              while (dir.startsWith(projectPath) && dir !== projectPath) {
                parents.delete(dir);
                dir = path.dirname(dir);
              }
              setCollapsed(parents);
              // Selection will be updated after visibleEntries recomputes
              setTimeout(() => {
                setSelectedIndexRef.current(idx);
              }, 0);
            }
          } else {
            setViewMode('files');
            searchInput.reset();
          }
          return true;
        }
        if (key.upArrow) { handleUp(); return true; }
        if (key.downArrow) { handleDown(); return true; }
        const consumed = searchInput.handleKey(input, key);
        if (consumed) {
          if (key.escape) {
            setViewMode('files');
          }
          return true;
        }
        return true;
      }

      // ── Browse mode ──────────────────────────────────────────────────────────
      if (input === 'b' || input === 'B') {
        setViewMode('board');
        return true;
      }
      if (input === '/') {
        setViewMode('file-search');
        searchInput.reset();
        setSelectedIndex(0);
        return true;
      }
      if (input === 'g') {
        setGrepQuery('');
        setViewMode('file-grep-input');
        return true;
      }
      if (key.upArrow) { handleUp(); return true; }
      if (key.downArrow) { handleDown(); return true; }
      if (key.pageUp) { handlePageUp(); return true; }
      if (key.pageDown) { handlePageDown(); return true; }

      // Expand directory (right arrow or l)
      if ((key.rightArrow || input === 'l') && visibleEntries[selectedIndex]?.isDirectory) {
        const entry = visibleEntries[selectedIndex];
        setCollapsed((prev) => {
          const next = new Set(prev);
          next.delete(entry.path);
          return next;
        });
        return true;
      }

      // Collapse directory (left arrow or h)
      if (key.leftArrow || input === 'h') {
        const entry = visibleEntries[selectedIndex];
        if (entry) {
          if (entry.isDirectory && !collapsed.has(entry.path)) {
            setCollapsed((prev) => new Set(prev).add(entry.path));
          } else {
            const parentPath = path.dirname(entry.path);
            const parentIdx = visibleEntries.findIndex((e) => e.path === parentPath);
            if (parentIdx >= 0) setSelectedIndex(parentIdx);
          }
        }
        return true;
      }

      // Open file in editor
      if (key.return && visibleEntries[selectedIndex] && !visibleEntries[selectedIndex].isDirectory) {
        const entry = visibleEntries[selectedIndex];
        const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
        process.stdout.write('\x1b[?1049l');
        process.stdout.write('\x1b[?25h');
        try {
          spawnSync(editor, [entry.path], { stdio: 'inherit' });
        } catch { /* editor error */ }
        process.stdout.write('\x1b[?1049h');
        return true;
      }

      return false;
    },
    [
      allFiles,
      collapsed,
      visibleEntries,
      selectedIndex,
      searchInput,
      grepQuery,
      grepResults,
      grepSelectedIndex,
      contentHeight,
      projectPath,
      handleUp,
      handleDown,
      handlePageUp,
      handlePageDown,
      setSelectedIndex,
      setViewMode,
    ],
  );

  const state: FileViewState = {
    allFiles,
    collapsed,
    selectedIndex,
    searchQuery,
    grepQuery,
    grepResults,
    grepSelectedIndex,
    grepRunning,
    visibleEntries,
  };

  return { state, handleKey, setCollapsed };
}
