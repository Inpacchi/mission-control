/**
 * PagerView — presentational pager component.
 *
 * This is the embedded version of Pager for use inside the unified TUI app.
 * It contains NO useInput, NO useApp, NO exit() calls — all state is managed
 * externally (by useSessionView) and passed as props.
 *
 * Do NOT modify src/tui/Pager.tsx — that standalone component stays for
 * `mc log` and `mc view` commands which launch a separate Ink instance.
 */
import React, { useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { stripAnsi } from './renderMarkdown.js';

interface PagerViewProps {
  title: string;
  content: string;
  scrollOffset: number;
  activeSearch: string; // committed search term (used for highlighting)
  currentMatchIndex: number;
  matchingLines: number[];
  titleColor?: string;
  height?: number;
}

export function PagerView({
  title,
  content,
  scrollOffset,
  activeSearch,
  currentMatchIndex,
  matchingLines,
  titleColor = 'cyan',
  height: heightProp,
}: PagerViewProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const height = heightProp ?? stdout?.rows ?? 24;
  const contentHeight = height - 2; // header + separator

  // Collapse consecutive blank lines and trim
  const lines = useMemo(
    () => content.replace(/\n{3,}/g, '\n\n').trim().split('\n'),
    [content],
  );

  const maxScroll = Math.max(0, lines.length - contentHeight);
  const clampedOffset = Math.min(scrollOffset, maxScroll);
  const visibleLines = lines.slice(clampedOffset, clampedOffset + contentHeight);

  const activeMatchLine = matchingLines.length > 0 ? matchingLines[currentMatchIndex] : -1;
  const matchSet = useMemo(() => new Set(matchingLines), [matchingLines]);

  const renderLine = (line: string, absoluteIndex: number): React.ReactElement => {
    if (activeSearch && absoluteIndex === activeMatchLine) {
      return (
        <Text key={absoluteIndex} backgroundColor="yellow" color="black" bold>
          {stripAnsi(line) || ' '}
        </Text>
      );
    }
    if (activeSearch && matchSet.has(absoluteIndex)) {
      return (
        <Text key={absoluteIndex} backgroundColor="gray" color="white">
          {stripAnsi(line) || ' '}
        </Text>
      );
    }
    return <Text key={absoluteIndex}>{line || ' '}</Text>;
  };

  return (
    <Box flexDirection="column" height={height}>
      {/* Header */}
      <Box paddingX={1}>
        <Text bold color={titleColor}>
          {title}
        </Text>
        {activeSearch && (
          <Text dimColor>
            {'  '}
            /{activeSearch} ({matchingLines.length > 0 ? `${currentMatchIndex + 1}/${matchingLines.length}` : 'no matches'})
          </Text>
        )}
      </Box>

      {/* Separator */}
      <Box>
        <Text dimColor>{'─'.repeat(width)}</Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" height={contentHeight} paddingX={1} overflowY="hidden">
        {visibleLines.map((line, i) => renderLine(line, i + clampedOffset))}
        {Array.from({ length: Math.max(0, contentHeight - visibleLines.length) }, (_, i) => (
          <Text key={`pad-${i}`}>{' '}</Text>
        ))}
      </Box>

    </Box>
  );
}
