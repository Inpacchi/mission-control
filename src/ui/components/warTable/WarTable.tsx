import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { TerminalTabs } from '../terminal/TerminalTabs';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { SessionControls } from '../terminal/SessionControls';
import { useSdlcState } from '../../hooks/useSdlcState';
import { useDashboardStore, type ActiveProject } from '../../stores/dashboardStore';
import { CommandBar } from './CommandBar';
import { TacticalField } from './TacticalField';
import { IntelPanel } from './IntelPanel';
import { ColumnResizer } from './ColumnResizer';
import type { WsMessage } from '@shared/types';

interface WarTableProps {
  wsConnected: boolean;
  wsReconnecting: boolean;
  wsSend: (msg: WsMessage) => void;
  wsSubscribe: (channels: string[]) => void;
  wsAddListener: (handler: (msg: WsMessage) => void) => () => void;
  projects?: ActiveProject[];
  onSwitchProject?: (project: ActiveProject) => void;
}

export function WarTable({
  wsConnected,
  wsReconnecting,
  wsSend,
  wsSubscribe,
  wsAddListener,
  projects = [],
  onSwitchProject,
}: WarTableProps) {
  const { deliverables, stats, loading } = useSdlcState({
    subscribe: wsSubscribe,
    addListener: wsAddListener,
    connected: wsConnected,
  });

  const {
    terminalCollapsed,
    terminalHeight,
    toggleTerminal,
    setTerminalHeight,
    activeSessionId,
    sessions,
    columnWidths,
    setColumnWidths,
  } = useDashboardStore();

  // Terminal resize handle (vertical) — pointer capture pattern (no document listeners)
  const [terminalResizing, setTerminalResizing] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const onTerminalResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      setTerminalResizing(true);
      startY.current = e.clientY;
      startHeight.current = terminalHeight;
    },
    [terminalHeight]
  );

  const onTerminalResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!terminalResizing) return;
      const delta = startY.current - e.clientY;
      setTerminalHeight(startHeight.current + delta);
    },
    [terminalResizing, setTerminalHeight]
  );

  const onTerminalResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      setTerminalResizing(false);
    },
    []
  );

  const onTerminalResizePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      setTerminalResizing(false);
    },
    []
  );

  // Container ref for ColumnResizer
  const columnsRef = useRef<HTMLDivElement>(null);

  const handleColumnResize = useCallback(
    (left: number, center: number, right: number) => {
      setColumnWidths({ left, center, right });
    },
    [setColumnWidths]
  );

  const leftStyle = useMemo(
    () => ({ width: `${columnWidths.left}%` }),
    [columnWidths.left]
  );
  const centerStyle = useMemo(
    () => ({ width: `${columnWidths.center}%` }),
    [columnWidths.center]
  );
  const rightStyle = useMemo(
    () => ({ width: `${columnWidths.right}%` }),
    [columnWidths.right]
  );

  return (
    <Flex
      direction="column"
      h="100vh"
      w="100vw"
      bg="bg.canvas"
      overflow="hidden"
    >
      {/* Reconnection banner */}
      {wsReconnecting && (
        <Flex
          align="center"
          justify="center"
          gap="2"
          px="5"
          py="6px"
          bg="bg.surface"
          borderBottom="1px solid"
          borderColor="border.subtle"
          color="text.secondary"
          fontSize="sm"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          Reconnecting...
        </Flex>
      )}

      {/* CommandBar — 40px */}
      <CommandBar
        projects={projects}
        onSwitchProject={onSwitchProject ?? (() => {})}
        stats={stats}
        loading={loading}
        wsConnected={wsConnected}
      />

      {/* Three-column body */}
      <Flex
        ref={columnsRef as React.RefObject<HTMLDivElement>}
        flex={1}
        overflow="hidden"
        bg="bg.base"
      >
        {/* Left: Terminal column */}
        <Flex
          direction="column"
          overflow="hidden"
          style={leftStyle}
          minW={0}
        >
          {/* Terminal panel — grows to fill left column */}
          <Flex
            className="terminal-context"
            role="region"
            aria-label="Terminal sessions"
            flex={1}
            direction="column"
            overflow="hidden"
            bg="bg.surface"
            borderRight="1px solid"
            borderColor="border.subtle"
            position="relative"
          >
            {/* Terminal resize handle (vertical, top edge) */}
            {!terminalCollapsed && (
              <Flex
                onPointerDown={onTerminalResizePointerDown}
                onPointerMove={onTerminalResizePointerMove}
                onPointerUp={onTerminalResizePointerUp}
                onPointerCancel={onTerminalResizePointerCancel}
                position="absolute"
                top={0}
                left={0}
                right={0}
                h="6px"
                cursor="ns-resize"
                zIndex={10}
                justify="center"
                align="center"
              >
                <Box
                  w="40px"
                  h="2px"
                  bg="border.default"
                  borderRadius="1px"
                  transition="background-color 150ms ease"
                  _hover={{ bg: 'border.accent' }}
                />
              </Flex>
            )}

            {/* Tab bar */}
            <Flex
              align="center"
              h="38px"
              minH="38px"
              bg="bg.surface"
              borderBottom={terminalCollapsed ? 'none' : '1px solid'}
              borderColor="border.subtle"
              pr="2"
            >
              <TerminalTabs />
              <Box flex={1} />
              <SessionControls
                wsSend={wsSend}
                collapsed={terminalCollapsed}
                onToggleCollapse={() => toggleTerminal()}
              />
            </Flex>

            {/* Terminal content */}
            <Flex
              flex={1}
              display={terminalCollapsed ? 'none' : 'flex'}
              bg="bg.canvas"
              p="2 2 0 2"
              overflow="hidden"
            >
              <TerminalPanel
                wsSend={wsSend}
                wsAddListener={wsAddListener}
                wsSubscribe={wsSubscribe}
                wsConnected={wsConnected}
                activeSessionId={activeSessionId}
                sessions={sessions}
              />
            </Flex>
          </Flex>
        </Flex>

        {/* Column resizer: left | center */}
        <ColumnResizer
          containerRef={columnsRef as React.RefObject<HTMLElement>}
          position="left"
          onResize={handleColumnResize}
          currentWidths={columnWidths}
        />

        {/* Center: TacticalField */}
        <Flex
          direction="column"
          overflow="hidden"
          style={centerStyle}
          minW={0}
        >
          <TacticalField deliverables={deliverables} />
        </Flex>

        {/* Column resizer: center | right */}
        <ColumnResizer
          containerRef={columnsRef as React.RefObject<HTMLElement>}
          position="right"
          onResize={handleColumnResize}
          currentWidths={columnWidths}
        />

        {/* Right: IntelPanel */}
        <Flex
          direction="column"
          overflow="hidden"
          style={rightStyle}
          minW={0}
        >
          <IntelPanel
            deliverables={deliverables}
          />
        </Flex>
      </Flex>

      {/* Terminal height indicator — only shown when terminal resizing is in progress */}
      {/* (No separate bottom-docked terminal in WarTable; terminal is embedded in left column) */}

      {/* Connection status text for screen readers */}
      <Text
        as="span"
        position="absolute"
        w="1px"
        h="1px"
        overflow="hidden"
        clip="rect(0,0,0,0)"
        whiteSpace="nowrap"
        aria-live="polite"
        aria-atomic="true"
      >
        {wsConnected ? 'Connected to server' : 'Disconnected from server'}
      </Text>
    </Flex>
  );
}
