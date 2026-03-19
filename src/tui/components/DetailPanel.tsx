import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Deliverable } from '../../shared/types.js';
import { type DocType } from '../hooks/useKeyboard.js';
import { MarkdownPanel, useMarkdownLines } from './MarkdownPanel.js';

interface DetailPanelProps {
  deliverable: Deliverable;
  projectPath: string;
  width: number;
  height: number;
  scrollOffset: number;
  maxScrollRef?: React.RefObject<number>;
  activeDocType?: DocType;
}

export function DetailPanel({
  deliverable,
  projectPath,
  width: _width,
  height,
  scrollOffset,
  maxScrollRef,
  activeDocType = 'auto',
}: DetailPanelProps): React.ReactElement {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pick file based on activeDocType
  const filePath: string | undefined =
    activeDocType === 'spec' ? deliverable.specPath
    : activeDocType === 'plan' ? deliverable.planPath
    : activeDocType === 'result' ? deliverable.resultPath
    : deliverable.resultPath ?? deliverable.planPath ?? deliverable.specPath;

  // Which doc type is actually being shown
  const shownType: string =
    filePath === deliverable.specPath ? 'spec'
    : filePath === deliverable.planPath ? 'plan'
    : filePath === deliverable.resultPath ? 'result'
    : 'doc';

  useEffect(() => {
    setLoading(true);
    setContent(null);

    if (!filePath) {
      setLoading(false);
      return;
    }

    const resolved = path.resolve(projectPath, filePath);
    // Path traversal guard: reject any path that escapes the project root
    const normalizedProject = projectPath.endsWith(path.sep) ? projectPath : projectPath + path.sep;
    if (!resolved.startsWith(normalizedProject) && resolved !== projectPath) {
      setContent(null);
      setLoading(false);
      return;
    }

    fs.readFile(resolved, 'utf-8')
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent(null);
        setLoading(false);
      });
  }, [filePath, projectPath]);

  // Hook must be called unconditionally (before early returns)
  const lines = useMarkdownLines(content);

  if (!filePath) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>
          {deliverable.id} — {deliverable.name}
        </Text>
        <Text dimColor>No documents available yet.</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>
          {deliverable.id} — {deliverable.name}
        </Text>
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  if (!content) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>
          {deliverable.id} — {deliverable.name}
        </Text>
        <Text color="red">Could not read file.</Text>
      </Box>
    );
  }

  const contentHeight = height - 4; // reserve header (1) + footer (1) + padding (2)
  const maxScroll = Math.max(0, lines.length - contentHeight);
  if (maxScrollRef) maxScrollRef.current = maxScroll;
  const clampedOffset = Math.min(scrollOffset, maxScroll);
  const totalPages = Math.ceil(lines.length / Math.max(1, contentHeight));
  const currentPage = Math.min(
    Math.floor(clampedOffset / Math.max(1, contentHeight)) + 1,
    totalPages
  );

  return (
    <Box flexDirection="column" height={height}>
      {/* Header with doc type tabs */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">{deliverable.id}</Text>
          <Text dimColor> — </Text>
          <Text bold>{deliverable.name}</Text>
        </Box>
        <Box gap={1}>
          {deliverable.specPath && (
            <Text color={shownType === 'spec' ? 'cyan' : undefined} bold={shownType === 'spec'} dimColor={shownType !== 'spec'}>
              [1]Spec
            </Text>
          )}
          {deliverable.planPath && (
            <Text color={shownType === 'plan' ? 'cyan' : undefined} bold={shownType === 'plan'} dimColor={shownType !== 'plan'}>
              [2]Plan
            </Text>
          )}
          {deliverable.resultPath && (
            <Text color={shownType === 'result' ? 'cyan' : undefined} bold={shownType === 'result'} dimColor={shownType !== 'result'}>
              [3]Result
            </Text>
          )}
        </Box>
      </Box>

      {/* Content */}
      <MarkdownPanel
        content={content}
        height={contentHeight}
        scrollOffset={clampedOffset}
      />

      {/* Footer with scroll hint */}
      <Box paddingX={1} justifyContent="space-between">
        <Text dimColor>[↑/↓] Scroll  [1/2/3] Spec/Plan/Result  [Esc/q] Back</Text>
        {totalPages > 1 && (
          <Text dimColor>
            [{currentPage}/{totalPages}]
          </Text>
        )}
      </Box>
    </Box>
  );
}
