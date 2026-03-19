import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { execSync } from 'node:child_process';
import { stripAnsi } from './renderMarkdown.js';

interface PagerProps {
  title: string;
  content: string;
  titleColor?: string;
  filePath?: string;
  onBack?: () => void;
}

type Mode = 'normal' | 'search';

export function Pager({ title, content, titleColor = 'cyan', filePath, onBack }: PagerProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [scrollOffset, setScrollOffset] = useState(0);
  const [mode, setMode] = useState<Mode>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns ?? 80,
    height: stdout?.rows ?? 24,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24,
      });
    };
    // Must use process.stdout directly — useStdout().stdout does not emit
    // 'resize' events; only the raw process.stdout stream does.
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  // Collapse consecutive blank lines and trim
  const lines = useMemo(
    () => content.replace(/\n{3,}/g, '\n\n').trim().split('\n'),
    [content]
  );
  const contentHeight = dimensions.height - 3; // header + separator + footer
  const maxScroll = Math.max(0, lines.length - contentHeight);
  // Place a target line ~25% from the top of the viewport
  const scrollToLine = (line: number) => Math.max(0, Math.min(line - Math.floor(contentHeight / 4), maxScroll));
  const visibleLines = lines.slice(scrollOffset, scrollOffset + contentHeight);

  // Find all matching line indices (search against stripped ANSI text)
  const matchingLines = useMemo(() => {
    if (!activeSearch) return [];
    const query = activeSearch.toLowerCase();
    return lines.reduce<number[]>((acc, line, i) => {
      if (stripAnsi(line).toLowerCase().includes(query)) acc.push(i);
      return acc;
    }, []);
  }, [lines, activeSearch]);

  const progress =
    maxScroll > 0 ? Math.round((scrollOffset / maxScroll) * 100) : 100;

  useInput((input, key) => {
    // Search input mode
    if (mode === 'search') {
      if (key.return) {
        // Submit search
        setActiveSearch(searchQuery);
        setMode('normal');
        // Jump to first match from current position.
        // We re-compute matches here rather than reading the `matchingLines` memo because
        // setActiveSearch hasn't flushed yet — matchingLines still reflects the *previous*
        // activeSearch value at this point in the render cycle.
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const allMatches = lines.reduce<number[]>((acc, line, i) => {
            if (stripAnsi(line).toLowerCase().includes(query)) acc.push(i);
            return acc;
          }, []);
          // Find the first match at or after current scroll
          const idx = allMatches.findIndex((m) => m >= scrollOffset);
          if (idx >= 0) {
            setCurrentMatchIndex(idx);
            setScrollOffset(scrollToLine(allMatches[idx]));
          } else if (allMatches.length > 0) {
            // Wrap to first match
            setCurrentMatchIndex(0);
            setScrollOffset(scrollToLine(allMatches[0]));
          }
        }
        return;
      }
      if (key.escape) {
        setSearchQuery('');
        setMode('normal');
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1));
        return;
      }
      // Accumulate typed characters
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery((q) => q + input);
      }
      return;
    }

    // Normal mode
    if (input === 'q' || input === 'Q') {
      if (onBack) {
        // Launched from board: q means quit the entire mc process
        console.clear();
        process.exit(0);
      }
      exit();
      return;
    }

    // Open in editor
    if (input === 'e' && filePath) {
      const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
      // Temporarily exit alternate screen for the editor
      process.stdout.write('\x1b[?1049l');
      process.stdout.write('\x1b[?25h');
      try {
        execSync(`${editor} "${filePath}"`, { stdio: 'inherit' });
      } catch { /* editor error */ }
      // Re-enter alternate screen
      process.stdout.write('\x1b[?1049h');
      return;
    }

    // Enter search mode
    if (input === '/') {
      setSearchQuery('');
      setMode('search');
      return;
    }

    // Clear search
    if (key.escape) {
      setActiveSearch('');
      setSearchQuery('');
      setCurrentMatchIndex(0);
      return;
    }

    // Next match
    if (input === 'n' && activeSearch && matchingLines.length > 0) {
      const nextIdx = (currentMatchIndex + 1) % matchingLines.length;
      setCurrentMatchIndex(nextIdx);
      setScrollOffset(scrollToLine(matchingLines[nextIdx]));
      return;
    }

    // Previous match
    if (input === 'p' && activeSearch && matchingLines.length > 0) {
      const prevIdx = (currentMatchIndex - 1 + matchingLines.length) % matchingLines.length;
      setCurrentMatchIndex(prevIdx);
      setScrollOffset(scrollToLine(matchingLines[prevIdx]));
      return;
    }

    if (key.upArrow) {
      setScrollOffset((o) => Math.max(0, o - 1));
      return;
    }
    if (key.downArrow) {
      setScrollOffset((o) => Math.min(o + 1, maxScroll));
      return;
    }
    if (input === 'b' && onBack) {
      onBack();
      exit();
      return;
    }
    if (key.pageUp) {
      setScrollOffset((o) => Math.max(0, o - contentHeight));
      return;
    }
    if (key.pageDown || input === 'f' || input === ' ') {
      setScrollOffset((o) => Math.min(o + contentHeight, maxScroll));
      return;
    }
    if (input === 'd') {
      setScrollOffset((o) => Math.min(o + Math.floor(contentHeight / 2), maxScroll));
      return;
    }
    if (input === 'u') {
      setScrollOffset((o) => Math.max(0, o - Math.floor(contentHeight / 2)));
      return;
    }
  });

  const lineEnd = Math.min(scrollOffset + contentHeight, lines.length);
  const lineInfo = `${scrollOffset + 1}-${lineEnd}/${lines.length}`;
  const atEnd = scrollOffset >= maxScroll;
  const atStart = scrollOffset === 0;
  const statusText =
    atEnd ? '(END)' : atStart && lines.length <= contentHeight ? '(ALL)' : `${progress}%`;

  // The line number of the current (active) match
  const activeMatchLine = matchingLines.length > 0 ? matchingLines[currentMatchIndex] : -1;
  const matchSet = new Set(matchingLines);

  const renderLine = (line: string, absoluteIndex: number) => {
    if (activeSearch && absoluteIndex === activeMatchLine) {
      // Active match: bright yellow highlight
      return <Text key={absoluteIndex} backgroundColor="yellow" color="black" bold>{stripAnsi(line) || ' '}</Text>;
    }
    if (activeSearch && matchSet.has(absoluteIndex)) {
      // Other matches: dim highlight
      return <Text key={absoluteIndex} backgroundColor="gray" color="white">{stripAnsi(line) || ' '}</Text>;
    }
    return <Text key={absoluteIndex}>{line || ' '}</Text>;
  };

  return (
    <Box flexDirection="column" height={dimensions.height}>
      <Box paddingX={1}>
        <Text bold color={titleColor}>
          {title}
        </Text>
        {activeSearch && (
          <Text dimColor>  /{activeSearch} ({matchingLines.length > 0 ? `${currentMatchIndex + 1}/${matchingLines.length}` : 'no matches'})</Text>
        )}
      </Box>

      <Box>
        <Text dimColor>{'─'.repeat(dimensions.width)}</Text>
      </Box>

      <Box flexDirection="column" height={contentHeight} paddingX={1} overflowY="hidden">
        {visibleLines.map((line, i) => renderLine(line, i + scrollOffset))}
        {Array.from({ length: Math.max(0, contentHeight - visibleLines.length) }, (_, i) => (
          <Text key={`pad-${i}`}>{' '}</Text>
        ))}
      </Box>

      <Box width={dimensions.width}>
        <Text backgroundColor="black" color="white">
          {(() => {
            const left = mode === 'search'
              ? ` /${searchQuery}▎`
              : ` ${statusText}  ${lineInfo}`;
            let right: string;
            if (mode === 'search') {
              right = ' [Enter] Search [Esc] Cancel ';
            } else {
              const parts = ['[↑↓] Line', '[u/d] Half', '[PgUp/Dn] Page', '[/] Find'];
              if (activeSearch) parts.push('[p/n] Prev/Next');
              if (filePath) parts.push('[e] Edit');
              if (onBack) parts.push('[b] Back');
              parts.push('[q] Quit');
              right = ' ' + parts.join('  ') + ' ';
            }
            const gap = Math.max(1, dimensions.width - left.length - right.length);
            return left + ' '.repeat(gap) + right;
          })()}
        </Text>
      </Box>
    </Box>
  );
}
