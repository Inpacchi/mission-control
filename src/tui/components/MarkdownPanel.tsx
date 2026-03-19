import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { renderMarkdownToAnsi } from '../renderMarkdown.js';

interface MarkdownPanelProps {
  /** Pre-computed ANSI lines from useMarkdownLines. */
  lines: string[];
  /** Number of visible lines in the viewport */
  height: number;
  /** Current scroll offset (lines from top) */
  scrollOffset: number;
  /** Optional ref to write the max scroll value for clamping */
  maxScrollRef?: React.RefObject<number>;
  /**
   * Optional custom line renderer. Receives the ANSI-styled line string and its
   * absolute index within the full lines array. When omitted, lines are rendered
   * as plain <Text> nodes with ANSI passthrough.
   */
  renderLine?: (line: string, absoluteIndex: number) => React.ReactElement;
}

/**
 * Renders markdown content as scrollable ANSI-styled terminal text.
 * Shared by DetailPanel and any future markdown viewers.
 *
 * Callers must pass pre-computed `lines` from useMarkdownLines.
 */
export function MarkdownPanel({
  lines,
  height,
  scrollOffset,
  maxScrollRef,
  renderLine,
}: MarkdownPanelProps): React.ReactElement {

  const maxScroll = Math.max(0, lines.length - height);
  if (maxScrollRef) maxScrollRef.current = maxScroll;
  const clampedOffset = Math.min(scrollOffset, maxScroll);
  const visibleLines = lines.slice(clampedOffset, clampedOffset + height);

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
      {visibleLines.map((line, i) => {
        const absoluteIndex = clampedOffset + i;
        if (renderLine) {
          return renderLine(line, absoluteIndex);
        }
        return (
          <Text key={`${clampedOffset}-${i}`} wrap="truncate">{line || ' '}</Text>
        );
      })}
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
