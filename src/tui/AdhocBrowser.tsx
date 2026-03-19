import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { execFile } from 'node:child_process';
import chalk from 'chalk';
import type { UntrackedCommit } from '../shared/types.js';
import { formatDate } from './formatters.js';

interface AdhocBrowserProps {
  commits: UntrackedCommit[];
  projectPath: string;
  fromBoard?: boolean;
}

const SUMMARY_RE = /\d+ files? changed/;

function renderStatLine(line: string): string {
  if (SUMMARY_RE.test(line)) {
    return chalk.bold(line);
  }
  // File-change lines contain a pipe character separating the name from the bar
  if (line.includes('|')) {
    const pipeIdx = line.indexOf('|');
    const filePart = line.slice(0, pipeIdx);
    const rest = line.slice(pipeIdx);
    return chalk.dim(filePart) + rest;
  }
  return line;
}

export function AdhocBrowser({
  commits,
  projectPath,
  fromBoard = false,
}: AdhocBrowserProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = stdout?.rows ?? 24;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailContent, setDetailContent] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<UntrackedCommit | null>(null);

  const detailLines = useMemo(
    () => (detailContent ? detailContent.split('\n') : []),
    [detailContent]
  );

  const unmounted = useRef(false);
  useEffect(() => {
    return () => {
      unmounted.current = true;
    };
  }, []);

  const openDetail = useCallback(
    (commit: UntrackedCommit) => {
      setSelectedCommit(commit);
      setViewMode('detail');
      setScrollOffset(0);
      setDetailContent(null);
      setDetailLoading(true);

      execFile(
        'git',
        ['show', '--stat', commit.hash],
        { cwd: projectPath },
        (err, stdout) => {
          if (unmounted.current) return;
          if (err) {
            setDetailContent(`(error: ${err.message})`);
          } else {
            setDetailContent(stdout);
          }
          setDetailLoading(false);
        }
      );
    },
    [projectPath]
  );

  useInput((input, key) => {
    if (viewMode === 'list') {
      if (input === 'q') {
        console.clear();
        if (fromBoard) {
          process.exit(0);
        }
        exit();
        return;
      }
      if (input === 'b' || key.escape) {
        exit();
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(commits.length - 1, i + 1));
        return;
      }
      if (key.return && commits[selectedIndex]) {
        openDetail(commits[selectedIndex]);
        return;
      }
    }

    if (viewMode === 'detail') {
      if (input === 'q' || key.escape) {
        setViewMode('list');
        setDetailContent(null);
        setSelectedCommit(null);
        return;
      }
      if (key.upArrow) {
        setScrollOffset((o) => Math.max(0, o - 1));
        return;
      }
      if (key.downArrow) {
        const contentHeight = Math.max(1, height - 5);
        const maxScroll = Math.max(0, detailLines.length - contentHeight);
        setScrollOffset((o) => Math.min(o + 1, maxScroll));
        return;
      }
    }
  });

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (viewMode === 'detail') {
    const headerHeight = 4;
    const footerHeight = 1;
    const contentHeight = Math.max(1, height - headerHeight - footerHeight);

    const statLines = detailLines;
    const maxScroll = Math.max(0, statLines.length - contentHeight);
    const clampedOffset = Math.min(scrollOffset, maxScroll);
    const visibleLines = statLines.slice(clampedOffset, clampedOffset + contentHeight);

    const commit = selectedCommit!;
    const shortHash = commit.hash.slice(0, 7);
    const dateStr = formatDate(commit.date);

    return (
      <Box flexDirection="column" height={height}>
        {/* Header */}
        <Box flexDirection="column" paddingX={1}>
          <Text bold>
            <Text dimColor>{shortHash}</Text>
            {'  '}
            <Text>{commit.message}</Text>
          </Text>
          <Text dimColor>{dateStr}</Text>
          <Text dimColor>{'─'.repeat(Math.max(0, width - 3))}</Text>
        </Box>

        {/* Body */}
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {detailLoading ? (
            <Text dimColor>Loading commit details…</Text>
          ) : (
            visibleLines.map((line, i) => (
              <Text key={i}>{renderStatLine(line)}</Text>
            ))
          )}
        </Box>

        {/* Footer */}
        <Box paddingX={1}>
          <Text dimColor>
            {'↑↓: scroll  Esc/q: back'}
            {!detailLoading && statLines.length > 0
              ? `  ${clampedOffset + 1}-${Math.min(clampedOffset + contentHeight, statLines.length)}/${statLines.length} lines`
              : ''}
          </Text>
        </Box>
      </Box>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  const headerHeight = 3;
  const footerHeight = 1;
  const listHeight = Math.max(1, height - headerHeight - footerHeight);

  const listStart = Math.max(0, selectedIndex - listHeight + 1);
  const visibleCommits = commits.slice(listStart, listStart + listHeight);

  // Column widths: hash (7) + 2 spaces + date (10) + 2 spaces + message (rest)
  const HASH_W = 7;
  const DATE_W = 10;
  const FIXED_W = HASH_W + 2 + DATE_W + 2;
  const messageAvail = Math.max(10, width - FIXED_W - 3); // -3 for paddingX

  return (
    <Box flexDirection="column" height={height}>
      {/* Header */}
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="yellow">
          Untracked Commits{'  '}
          <Text dimColor>({commits.length} found)</Text>
        </Text>
        <Text dimColor>{'─'.repeat(Math.max(0, width - 3))}</Text>
      </Box>

      {/* Commit list */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {visibleCommits.map((commit, i) => {
          const absoluteIndex = listStart + i;
          const isSelected = absoluteIndex === selectedIndex;
          const shortHash = commit.hash.slice(0, 7);
          const dateStr = formatDate(commit.date);
          const msg =
            commit.message.length > messageAvail
              ? commit.message.slice(0, Math.max(1, messageAvail - 1)) + '…'
              : commit.message;

          if (isSelected) {
            return (
              <Text key={commit.hash} bold inverse>
                {` ${shortHash}  ${dateStr}  ${msg}`}
              </Text>
            );
          }
          return (
            <Box key={commit.hash}>
              <Text dimColor>{shortHash}</Text>
              <Text>{'  '}</Text>
              <Text dimColor>{dateStr}</Text>
              <Text>{'  '}</Text>
              <Text>{msg}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>
          {'↑↓: navigate  Enter: view'}{fromBoard ? '  b: back  q: quit' : '  Esc/q: quit'}
        </Text>
      </Box>
    </Box>
  );
}
