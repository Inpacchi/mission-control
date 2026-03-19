import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseChronicle } from '../server/services/sdlcParser.js';
import type { Deliverable } from '../shared/types.js';
import { complexityToRarity } from './theme.js';
import { MarkdownPanel, useMarkdownLines } from './components/MarkdownPanel.js';

interface ChronicleListProps {
  projectPath: string;
  fromBoard?: boolean;
}

const RARITY_INK_COLOR: Record<string, string> = {
  common: 'white',
  uncommon: 'green',
  rare: 'cyan',
  epic: 'yellow',
  mythic: 'yellow',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function ChronicleList({ projectPath, fromBoard = false }: ChronicleListProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = stdout?.rows ?? 24;

  const [entries, setEntries] = useState<Deliverable[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [docContent, setDocContent] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    parseChronicle(projectPath)
      .then((result) => {
        setEntries(result);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [projectPath]);

  // Hook must be called unconditionally (before early returns)
  const renderedLines = useMarkdownLines(docContent);

  useInput((input, key) => {
    if (viewMode === 'list') {
      if (input === 'q') {
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
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(entries.length - 1, i + 1));
        return;
      }
      if (key.return && entries[selectedIndex]) {
        const entry = entries[selectedIndex];
        const filePath = entry.resultPath;
        if (!filePath) {
          setDetailError('No document file found for this deliverable.');
          setDocContent(null);
          setScrollOffset(0);
          setViewMode('detail');
          return;
        }
        setDetailLoading(true);
        setDetailError(null);
        const resolvedPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(projectPath, filePath);
        fs.readFile(resolvedPath, 'utf-8')
          .then((content) => {
            setDocContent(content);
            setScrollOffset(0);
            setViewMode('detail');
            setDetailLoading(false);
          })
          .catch(() => {
            setDetailError(`Could not read file: ${resolvedPath}`);
            setDocContent(null);
            setScrollOffset(0);
            setViewMode('detail');
            setDetailLoading(false);
          });
        return;
      }
    }
    if (viewMode === 'detail') {
      if (input === 'q' || key.escape) {
        setViewMode('list');
        setDocContent(null);
        setDetailError(null);
        return;
      }
      if (key.upArrow) {
        setScrollOffset((o) => Math.max(0, o - 1));
        return;
      }
      if (key.downArrow) {
        setScrollOffset((o) => {
          const contentHeight = Math.max(1, height - 5);
          const maxScroll = Math.max(0, renderedLines.length - contentHeight);
          return Math.min(o + 1, maxScroll);
        });
        return;
      }
    }
  });

  // Loading state
  if (loading) {
    return (
      <Box flexDirection="column" height={height}>
        <Text dimColor>Loading chronicle…</Text>
      </Box>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <Box flexDirection="column" height={height} paddingX={1}>
        <Text bold color="cyan">Chronicle</Text>
        <Text dimColor>─────────────────────────────────────</Text>
        <Text dimColor>No archived deliverables. Complete deliverables are archived via 'Let's organize the chronicles'.</Text>
        <Text> </Text>
        <Text dimColor>{fromBoard ? 'Press b to go back, q to quit.' : 'Press q to quit.'}</Text>
      </Box>
    );
  }

  // Detail view
  if (viewMode === 'detail') {
    const entry = entries[selectedIndex];
    const headerHeight = 4;
    const footerHeight = 1;
    const contentHeight = Math.max(1, height - headerHeight - footerHeight);

    const maxScroll = Math.max(0, renderedLines.length - contentHeight);
    const clampedOffset = Math.min(scrollOffset, maxScroll);

    const rarity = complexityToRarity(entry.complexity);
    const idColor = RARITY_INK_COLOR[rarity] ?? 'white';

    return (
      <Box flexDirection="column" height={height}>
        {/* Header */}
        <Box flexDirection="column" paddingX={1}>
          <Text bold>
            <Text color={idColor}>[{entry.id}]</Text>
            {' '}
            <Text color="cyan">{entry.name}</Text>
          </Text>
          <Text dimColor>
            Completed: {formatDate(entry.lastModified)}
            {entry.complexity ? `  Complexity: ${entry.complexity}` : ''}
          </Text>
          <Text dimColor>─{'─'.repeat(Math.max(0, width - 3))}</Text>
        </Box>

        {/* Document content */}
        {detailLoading ? (
          <Box flexDirection="column" flexGrow={1} paddingX={1}>
            <Text dimColor>Loading document…</Text>
          </Box>
        ) : detailError ? (
          <Box flexDirection="column" flexGrow={1} paddingX={1}>
            <Text color="red">{detailError}</Text>
          </Box>
        ) : docContent === null ? (
          <Box flexDirection="column" flexGrow={1} paddingX={1}>
            <Text dimColor>(no content)</Text>
          </Box>
        ) : renderedLines.length === 0 ? (
          <Box flexDirection="column" flexGrow={1} paddingX={1}>
            <Text dimColor>(empty document)</Text>
          </Box>
        ) : (
          <MarkdownPanel
            content={docContent}
            height={contentHeight}
            scrollOffset={clampedOffset}
          />
        )}

        {/* Footer */}
        <Box paddingX={1}>
          <Text dimColor>
            Esc/q: back  ↑↓: scroll
            {renderedLines.length > 0 ? `  ${clampedOffset + 1}-${Math.min(clampedOffset + contentHeight, renderedLines.length)}/${renderedLines.length} lines` : ''}
          </Text>
        </Box>
      </Box>
    );
  }

  // List view
  const headerHeight = 3;
  const footerHeight = 1;
  const listHeight = Math.max(1, height - headerHeight - footerHeight);

  // Scroll the list to keep selectedIndex in view
  const listStart = Math.max(0, selectedIndex - listHeight + 1);
  const visibleEntries = entries.slice(listStart, listStart + listHeight);

  return (
    <Box flexDirection="column" height={height}>
      {/* Header */}
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="cyan">Chronicle  <Text dimColor>({entries.length} archived)</Text></Text>
        <Text dimColor>─{'─'.repeat(Math.max(0, width - 3))}</Text>
      </Box>

      {/* Entry list */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {visibleEntries.map((entry, i) => {
          const absoluteIndex = listStart + i;
          const isSelected = absoluteIndex === selectedIndex;
          const rarity = complexityToRarity(entry.complexity);
          const idColor = RARITY_INK_COLOR[rarity] ?? 'white';
          const dateStr = formatDate(entry.lastModified);
          const nameAvail = Math.max(10, width - entry.id.length - dateStr.length - 8);
          const truncName =
            entry.name.length > nameAvail
              ? entry.name.slice(0, Math.max(1, nameAvail - 1)) + '…'
              : entry.name;

          if (isSelected) {
            return (
              <Text key={entry.id} bold inverse>
                {` [${entry.id}] ${truncName}  ${dateStr}`}
              </Text>
            );
          }
          return (
            <Box key={entry.id}>
              <Text color={idColor}>[{entry.id}] </Text>
              <Text>{truncName}  </Text>
              <Text dimColor>{dateStr}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>↑↓: navigate  Enter: view document{fromBoard ? '  b: back  q: quit' : '  q: quit'}</Text>
      </Box>
    </Box>
  );
}
