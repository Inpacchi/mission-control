import React, { useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { renderMarkdownToAnsi, stripAnsi } from '../renderMarkdown.js';

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
          <Text key={`${clampedOffset}-${i}`} wrap="wrap">{line || ' '}</Text>
        );
      })}
    </Box>
  );
}

/**
 * Wrap a single ANSI-styled line to fit within `width` visible characters.
 * Splits at word boundaries when possible, preserving ANSI escape sequences.
 */
function wrapAnsiLine(line: string, width: number): string[] {
  if (width <= 0) return [line];
  const visibleLength = stripAnsi(line).length;
  if (visibleLength <= width) return [line];

  const result: string[] = [];
  let current = '';
  let visibleCount = 0;
  // Track whether we're inside an ANSI escape sequence
  let inEscape = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '\x1b') {
      inEscape = true;
      current += ch;
      continue;
    }
    if (inEscape) {
      current += ch;
      if (ch === 'm') inEscape = false;
      continue;
    }

    if (visibleCount >= width) {
      result.push(current);
      current = '';
      visibleCount = 0;
    }
    current += ch;
    visibleCount++;
  }
  if (current) result.push(current);
  return result;
}

/** Hook variant for components that need the line data without the rendering */
export function useMarkdownLines(content: string | null, width?: number) {
  const { stdout } = useStdout();
  const termWidth = width ?? stdout?.columns ?? 80;
  // Account for paddingX={1} on the MarkdownPanel container (2 chars total)
  const wrapWidth = Math.max(20, termWidth - 2);

  return useMemo(() => {
    if (!content) return [];
    const rendered = renderMarkdownToAnsi(content);
    const rawLines = rendered.replace(/\n{3,}/g, '\n\n').trim().split('\n');
    return rawLines.flatMap((line) => wrapAnsiLine(line, wrapWidth));
  }, [content, wrapWidth]);
}
