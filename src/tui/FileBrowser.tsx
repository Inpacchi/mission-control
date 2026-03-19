/**
 * FileBrowser — presentational component.
 *
 * Pure rendering only. No useInput, no useApp, no exit() calls.
 * All state is managed by useFileView and passed as props.
 * Visual output is identical to the previous standalone version.
 *
 * INTENTIONAL EXCEPTION: The useEffect that persists collapsed directory state
 * to disk stays here rather than being hoisted to useFileView. This is because
 * it does not involve useInput and hoisting it would cause spurious disk writes
 * on every view-mode transition (the hook is always mounted, not just when the
 * files view is active).
 */
import React, { useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { ViewMode } from './hooks/useKeyboard.js';
import type { FileNode, GrepResult } from './hooks/useFileView.js';
import { saveCollapsedState } from './hooks/useFileView.js';
import path from 'node:path';

interface FileBrowserProps {
  projectPath: string;
  viewMode: ViewMode; // 'files' | 'file-search' | 'file-grep-input' | 'file-grep-results'
  // Tree state
  allFiles: FileNode[];
  collapsed: Set<string>;
  selectedIndex: number;
  visibleEntries: FileNode[];
  searchQuery: string;
  // Grep state
  grepQuery: string;
  grepResults: GrepResult[];
  grepSelectedIndex: number;
  grepRunning: boolean;
  height?: number;
}

// File icon by extension
function fileIcon(name: string): string {
  if (name.endsWith('.md')) return '◇';
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return '◆';
  if (name.endsWith('.js') || name.endsWith('.jsx')) return '◆';
  if (name.endsWith('.json')) return '◈';
  if (name.endsWith('.css')) return '◉';
  return '○';
}

function fileColor(name: string): string {
  if (name.endsWith('.md')) return 'white';
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'cyan';
  if (name.endsWith('.js') || name.endsWith('.jsx')) return 'yellow';
  if (name.endsWith('.json')) return 'green';
  return 'gray';
}

export function FileBrowser({
  projectPath,
  viewMode,
  allFiles,
  collapsed,
  selectedIndex,
  visibleEntries,
  searchQuery,
  grepQuery,
  grepResults,
  grepSelectedIndex,
  grepRunning,
  height: heightProp,
}: FileBrowserProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = heightProp ?? stdout?.rows ?? 24;
  const contentHeight = height - 2; // header + separator

  // INTENTIONAL EXCEPTION: persist collapsed directory state to disk on change.
  // This useEffect stays here (not in useFileView) to avoid spurious writes when
  // the files view is not active — the hook is always mounted in the unified app.
  useEffect(() => {
    if (allFiles.length > 0) {
      saveCollapsedState(projectPath, collapsed);
    }
  }, [collapsed, projectPath, allFiles.length]);

  if (allFiles.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>No files found.</Text>
        <Text dimColor>b: back  q: quit</Text>
      </Box>
    );
  }

  // ── Grep input view ──────────────────────────────────────────────────────────
  if (viewMode === 'file-grep-input') {
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
      </Box>
    );
  }

  // ── Grep results view ────────────────────────────────────────────────────────
  if (viewMode === 'file-grep-results') {
    const grepContentHeight = height - 2;
    const grepScrollOffset = Math.max(0, Math.min(
      grepSelectedIndex - Math.floor(grepContentHeight / 4),
      Math.max(0, grepResults.length - grepContentHeight),
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
      </Box>
    );
  }

  // ── Browse / search view ─────────────────────────────────────────────────────
  const isSearchMode = viewMode === 'file-search';

  // Virtual scroll for file tree (centered: selectedIndex ~25% from top)
  const scrollOffset = Math.max(0, Math.min(
    selectedIndex - Math.floor(contentHeight / 4),
    Math.max(0, visibleEntries.length - contentHeight),
  ));
  const visible = visibleEntries.slice(scrollOffset, scrollOffset + contentHeight);

  return (
    <Box flexDirection="column" height={height}>
      <Box paddingX={1}>
        <Text bold color="cyan">Files — {path.basename(projectPath)}</Text>
        {isSearchMode && (
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
          const relPath = isSearchMode
            ? path.relative(projectPath, entry.path)
            : entry.name;

          return (
            <Text key={entry.path} inverse={isSelected} bold={isSelected}>
              {isSearchMode ? '' : indent}
              <Text dimColor>{icon} </Text>
              <Text color={fileColor(entry.name)}>{relPath}</Text>
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}
