import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { execSync, exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

interface FileBrowserProps {
  projectPath: string;
  fromBoard?: boolean;
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  depth: number;
}

interface GrepResult {
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

function saveCollapsedState(projectPath: string, collapsed: Set<string>): void {
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

// Sanitize a string for safe use in a shell grep argument.
// We pass the query as a grep argument (not interpolated into the pattern),
// but still escape double-quotes to prevent shell injection via the surrounding quotes.
function sanitizeGrepQuery(query: string): string {
  // Remove any characters that could break out of the double-quoted shell argument
  return query.replace(/["\\`$]/g, (c) => `\\${c}`);
}

type Mode = 'browse' | 'search' | 'grep-input' | 'grep-results';

export function FileBrowser({ projectPath, fromBoard = false }: FileBrowserProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [allFiles, setAllFiles] = useState<FileNode[]>([]);

  // Grep state
  const [grepQuery, setGrepQuery] = useState('');
  const [grepResults, setGrepResults] = useState<GrepResult[]>([]);
  const [grepSelectedIndex, setGrepSelectedIndex] = useState(0);
  const [grepRunning, setGrepRunning] = useState(false);

  const width = stdout?.columns ?? 80;
  const height = stdout?.rows ?? 24;
  const contentHeight = height - 3; // header + separator + footer

  // Scan entire project tree (flat list of all files/dirs with depth)
  useEffect(() => {
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
    const files = scanAll(projectPath, 0);
    setAllFiles(files);

    // Load saved state or collapse all directories by default
    const saved = loadCollapsedState(projectPath);
    if (saved === NO_SAVED_STATE) {
      setCollapsed(new Set(files.filter((f) => f.isDirectory).map((f) => f.path)));
    } else {
      setCollapsed(saved as Set<string>);
    }
  }, [projectPath]);

  // Persist collapsed state on change
  useEffect(() => {
    if (allFiles.length > 0) {
      saveCollapsedState(projectPath, collapsed);
    }
  }, [collapsed, projectPath, allFiles.length]);

  // Build visible tree based on collapsed state
  const visibleEntries = useMemo(() => {
    if (mode === 'search' && searchQuery) {
      // Filter: show files matching search, with their relative path
      const query = searchQuery.toLowerCase();
      return allFiles.filter(
        (f) => !f.isDirectory && f.name.toLowerCase().includes(query)
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
  }, [allFiles, collapsed, mode, searchQuery]);

  // Clamp selection when entries change
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, visibleEntries.length - 1)));
  }, [visibleEntries.length]);

  useInput((input, key) => {
    // --- Grep input mode ---
    if (mode === 'grep-input') {
      if (key.return) {
        if (grepQuery.trim()) {
          setGrepRunning(true);
          setMode('grep-results');
          // Run grep asynchronously so loading indicator renders
          const safeQuery = sanitizeGrepQuery(grepQuery);
          const includes = ['*.ts', '*.tsx', '*.md', '*.json', '*.js', '*.jsx', '*.css']
            .map((ext) => `--include='${ext}'`)
            .join(' ');
          exec(
            `grep -rn ${includes} -i "${safeQuery}" "${projectPath}" 2>/dev/null || true`,
            { encoding: 'utf-8', maxBuffer: 1024 * 1024 },
            (_err, stdout) => {
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
            }
          );
        } else {
          setMode('browse');
        }
        return;
      }
      if (key.escape) {
        setGrepQuery('');
        setMode('browse');
        return;
      }
      if (key.backspace || key.delete) {
        setGrepQuery((q) => q.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setGrepQuery((q) => q + input);
      }
      return;
    }

    // --- Grep results mode ---
    if (mode === 'grep-results') {
      if (input === 'q' || input === 'Q') {
        console.clear();
        if (fromBoard) { process.exit(0); }
        exit();
        return;
      }
      if (input === 'b') {
        setMode('browse');
        setGrepResults([]);
        setGrepQuery('');
        return;
      }
      if (input === 'g') {
        // New grep search from results view
        setGrepQuery('');
        setMode('grep-input');
        return;
      }
      if (input === '/') {
        // Enter a new filename search
        setMode('search');
        setSearchQuery('');
        setSelectedIndex(0);
        return;
      }
      if (key.upArrow) {
        setGrepSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setGrepSelectedIndex((i) => Math.min(grepResults.length - 1, i + 1));
        return;
      }
      if (input === 'u') {
        setGrepSelectedIndex((i) => Math.max(0, i - Math.floor(contentHeight / 2)));
        return;
      }
      if (input === 'd') {
        setGrepSelectedIndex((i) => Math.min(grepResults.length - 1, i + Math.floor(contentHeight / 2)));
        return;
      }
      if (key.pageUp) {
        setGrepSelectedIndex((i) => Math.max(0, i - contentHeight));
        return;
      }
      if (key.pageDown) {
        setGrepSelectedIndex((i) => Math.min(grepResults.length - 1, i + contentHeight));
        return;
      }
      if (key.return && grepResults[grepSelectedIndex]) {
        const result = grepResults[grepSelectedIndex];
        const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
        process.stdout.write('\x1b[?1049l');
        process.stdout.write('\x1b[?25h');
        try {
          execSync(`${editor} +${result.line} "${result.file}"`, { stdio: 'inherit' });
        } catch { /* editor error */ }
        process.stdout.write('\x1b[?1049h');
        return;
      }
      return;
    }

    // --- Search mode ---
    if (mode === 'search') {
      if (key.return) {
        // Submit: switch to browse with selection on the matched file
        const entry = visibleEntries[selectedIndex];
        if (entry) {
          // Find this entry in the full tree and expand parents
          setMode('browse');
          setSearchQuery('');
          // Find the index in the next visible tree
          const idx = allFiles.findIndex((f) => f.path === entry.path);
          if (idx >= 0) {
            // Uncollapse all parent directories
            const parents = new Set(collapsed);
            let dir = path.dirname(entry.path);
            while (dir.startsWith(projectPath) && dir !== projectPath) {
              parents.delete(dir);
              dir = path.dirname(dir);
            }
            setCollapsed(parents);
            // Selection will be set after visibleEntries recomputes
            setTimeout(() => {
              setSelectedIndex(idx);
            }, 0);
          }
        } else {
          setMode('browse');
          setSearchQuery('');
        }
        return;
      }
      if (key.escape) {
        setMode('browse');
        setSearchQuery('');
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1));
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(visibleEntries.length - 1, i + 1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery((q) => q + input);
        setSelectedIndex(0);
      }
      return;
    }

    // --- Browse mode ---
    if (input === 'q' || input === 'Q') {
      console.clear();
      if (fromBoard) {
        process.exit(0); // hard quit the entire mc process
      }
      exit(); // standalone: just exit this Ink instance
      return;
    }
    if (input === 'b') {
      exit(); // back to board (or exit if standalone)
      return;
    }

    if (input === '/') {
      setMode('search');
      setSearchQuery('');
      setSelectedIndex(0);
      return;
    }

    if (input === 'g') {
      setGrepQuery('');
      setMode('grep-input');
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(visibleEntries.length - 1, i + 1));
      return;
    }
    if (key.pageUp) {
      setSelectedIndex((i) => Math.max(0, i - contentHeight));
      return;
    }
    if (key.pageDown) {
      setSelectedIndex((i) => Math.min(visibleEntries.length - 1, i + contentHeight));
      return;
    }

    // Expand directory (right arrow or l)
    if ((key.rightArrow || input === 'l') && visibleEntries[selectedIndex]?.isDirectory) {
      const entry = visibleEntries[selectedIndex];
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(entry.path);
        return next;
      });
      return;
    }

    // Collapse directory (left arrow or h)
    if (key.leftArrow || input === 'h') {
      const entry = visibleEntries[selectedIndex];
      if (entry) {
        if (entry.isDirectory && !collapsed.has(entry.path)) {
          // Collapse this directory
          setCollapsed((prev) => new Set(prev).add(entry.path));
        } else {
          // Jump to parent directory
          const parentPath = path.dirname(entry.path);
          const parentIdx = visibleEntries.findIndex((e) => e.path === parentPath);
          if (parentIdx >= 0) setSelectedIndex(parentIdx);
        }
      }
      return;
    }

    // Open file in editor
    if (key.return && visibleEntries[selectedIndex] && !visibleEntries[selectedIndex].isDirectory) {
      const entry = visibleEntries[selectedIndex];
      const editor = process.env.VISUAL || process.env.EDITOR || 'vi';

      process.stdout.write('\x1b[?1049l');
      process.stdout.write('\x1b[?25h');
      try {
        execSync(`${editor} "${entry.path}"`, { stdio: 'inherit' });
      } catch { /* editor error */ }
      process.stdout.write('\x1b[?1049h');
      return;
    }
  });

  // Virtual scroll for file tree
  const scrollOffset = Math.max(0, Math.min(
    selectedIndex - Math.floor(contentHeight / 4),
    Math.max(0, visibleEntries.length - contentHeight)
  ));
  const visible = visibleEntries.slice(scrollOffset, scrollOffset + contentHeight);

  if (allFiles.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>No files found.</Text>
        <Text dimColor>{fromBoard ? '[b] Back  [q] Quit' : '[q] Quit'}</Text>
      </Box>
    );
  }

  // File icon by extension
  const fileIcon = (name: string): string => {
    if (name.endsWith('.md')) return '◇';
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return '◆';
    if (name.endsWith('.js') || name.endsWith('.jsx')) return '◆';
    if (name.endsWith('.json')) return '◈';
    if (name.endsWith('.css')) return '◉';
    return '○';
  };

  const fileColor = (name: string): string => {
    if (name.endsWith('.md')) return 'white';
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'cyan';
    if (name.endsWith('.js') || name.endsWith('.jsx')) return 'yellow';
    if (name.endsWith('.json')) return 'green';
    return 'gray';
  };

  // --- Grep input view ---
  if (mode === 'grep-input') {
    return (
      <Box flexDirection="column" height={height}>
        <Box paddingX={1}>
          <Text bold color="cyan">Files — {path.basename(projectPath)}</Text>
        </Box>
        <Box>
          <Text dimColor>{'─'.repeat(width)}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} paddingX={1} justifyContent="center">
          <Text dimColor>Search file contents using grep.</Text>
          <Text> </Text>
          <Box>
            <Text color="yellow">grep: </Text>
            <Text>{grepQuery}</Text>
            <Text color="cyan">▎</Text>
          </Box>
          <Text> </Text>
          <Text dimColor>Enter: search  Esc: cancel</Text>
        </Box>
        <Box width={width}>
          <Text backgroundColor="black" color="white">
            {' grep mode — type query and press Enter '}
          </Text>
        </Box>
      </Box>
    );
  }

  // --- Grep results view ---
  if (mode === 'grep-results') {
    const grepContentHeight = height - 3;
    const grepScrollOffset = Math.max(0, Math.min(
      grepSelectedIndex - Math.floor(grepContentHeight / 4),
      Math.max(0, grepResults.length - grepContentHeight)
    ));
    const visibleGrepResults = grepResults.slice(grepScrollOffset, grepScrollOffset + grepContentHeight);

    return (
      <Box flexDirection="column" height={height}>
        <Box paddingX={1}>
          <Text bold color="cyan">Grep: </Text>
          <Text color="yellow">{grepQuery}</Text>
          <Text dimColor>  {grepResults.length} result{grepResults.length !== 1 ? 's' : ''}{grepResults.length === 200 ? ' (limit)' : ''}</Text>
        </Box>
        <Box>
          <Text dimColor>{'─'.repeat(width)}</Text>
        </Box>
        <Box flexDirection="column" height={grepContentHeight} paddingX={1} overflowY="hidden">
          {grepRunning ? (
            <Text color="yellow">Searching...</Text>
          ) : grepResults.length === 0 ? (
            <Text dimColor>No matches found for "{grepQuery}"</Text>
          ) : (
            visibleGrepResults.map((result, i) => {
              const absIdx = i + grepScrollOffset;
              const isSelected = absIdx === grepSelectedIndex;
              const relFile = path.relative(projectPath, result.file);
              const lineNum = String(result.line).padStart(4, ' ');
              // Truncate text to fit terminal width
              const maxTextWidth = Math.max(10, width - relFile.length - lineNum.length - 6);
              const displayText = result.text.length > maxTextWidth
                ? result.text.slice(0, maxTextWidth - 1) + '…'
                : result.text;

              return (
                <Text key={`${result.file}:${result.line}:${i}`} inverse={isSelected} bold={isSelected}>
                  <Text dimColor>{relFile}:{lineNum}  </Text>
                  <Text>{displayText}</Text>
                </Text>
              );
            })
          )}
        </Box>
        <Box width={width}>
          <Text backgroundColor="black" color="white">
            {(() => {
              const left = ` ${grepResults.length > 0 ? grepSelectedIndex + 1 : 0}/${grepResults.length}`;
              const right = ' [↑↓] Nav  [u/d] Half  [PgUp/Dn] Page  [/] Find File  [g] New Grep  [Enter] Edit  [b] Back  [q] Quit ';
              const gap = Math.max(1, width - left.length - right.length);
              return left + ' '.repeat(gap) + right;
            })()}
          </Text>
        </Box>
      </Box>
    );
  }

  // --- Browse / search view ---
  return (
    <Box flexDirection="column" height={height}>
      <Box paddingX={1}>
        <Text bold color="cyan">Files — {path.basename(projectPath)}</Text>
        {mode === 'search' && (
          <Text>  <Text color="cyan">/</Text>{searchQuery}<Text color="cyan">▎</Text> ({visibleEntries.length} matches)</Text>
        )}
      </Box>
      <Box>
        <Text dimColor>{'─'.repeat(width)}</Text>
      </Box>
      <Box flexDirection="column" height={contentHeight} paddingX={1} overflowY="hidden">
        {visible.map((entry, i) => {
          const absIdx = i + scrollOffset;
          const isSelected = absIdx === selectedIndex;
          const indent = '  '.repeat(entry.depth);

          if (entry.isDirectory) {
            const isCollapsed = collapsed.has(entry.path);
            const arrow = isCollapsed ? '▸' : '▾';
            return (
              <Text key={entry.path} inverse={isSelected} bold={isSelected}>
                {indent}<Text color="cyan">{arrow} {entry.name}/</Text>
              </Text>
            );
          }

          const icon = fileIcon(entry.name);
          const relPath = mode === 'search'
            ? path.relative(projectPath, entry.path)
            : entry.name;

          return (
            <Text key={entry.path} inverse={isSelected} bold={isSelected}>
              {mode === 'search' ? '' : indent}
              <Text dimColor>{icon} </Text>
              <Text color={fileColor(entry.name)}>{relPath}</Text>
            </Text>
          );
        })}
      </Box>
      <Box width={width}>
        <Text backgroundColor="black" color="white">
          {(() => {
            const left = ` ${visibleEntries.length > 0 ? selectedIndex + 1 : 0}/${visibleEntries.length}`;
            const right = fromBoard
              ? ' [↑↓] Nav [←/→] Collapse/Expand [PgUp/Dn] Page [/] Find File [g] Grep [Enter] Edit [b] Back [q] Quit '
              : ' [↑↓] Nav [←/→] Collapse/Expand [PgUp/Dn] Page [/] Find File [g] Grep [Enter] Edit [q] Quit ';
            const gap = Math.max(1, width - left.length - right.length);
            return left + ' '.repeat(gap) + right;
          })()}
        </Text>
      </Box>
    </Box>
  );
}
