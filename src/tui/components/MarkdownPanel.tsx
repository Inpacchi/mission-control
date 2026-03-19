import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { renderMarkdownToAnsi } from '../renderMarkdown.js';

interface MarkdownPanelProps {
  /** Raw markdown string to render */
  content: string;
  /** Number of visible lines in the viewport */
  height: number;
  /** Current scroll offset (lines from top) */
  scrollOffset: number;
  /** Optional ref to write the max scroll value for clamping */
  maxScrollRef?: React.RefObject<number>;
}

/**
 * Renders markdown content as scrollable ANSI-styled terminal text.
 * Shared by DetailPanel, ChronicleList, and any future markdown viewers.
 */
export function MarkdownPanel({
  content,
  height,
  scrollOffset,
  maxScrollRef,
}: MarkdownPanelProps): React.ReactElement {
  const lines = useMemo(() => {
    const rendered = renderMarkdownToAnsi(content);
    return rendered.replace(/\n{3,}/g, '\n\n').trim().split('\n');
  }, [content]);

  const maxScroll = Math.max(0, lines.length - height);
  if (maxScrollRef) maxScrollRef.current = maxScroll;
  const clampedOffset = Math.min(scrollOffset, maxScroll);
  const visibleLines = lines.slice(clampedOffset, clampedOffset + height);

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
      {visibleLines.map((line, i) => (
        <Text key={`${clampedOffset}-${i}`} wrap="truncate">{line || ' '}</Text>
      ))}
    </Box>
  );
}

/** Hook variant for components that need the line data without the rendering */
export function useMarkdownLines(content: string | null) {
  return useMemo(() => {
    if (!content) return [];
    const rendered = renderMarkdownToAnsi(content);
    return rendered.replace(/\n{3,}/g, '\n\n').trim().split('\n');
  }, [content]);
}
