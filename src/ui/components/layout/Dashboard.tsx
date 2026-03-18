import { useCallback, useMemo, useRef } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { Rocket } from 'lucide-react';
import { StatsBar } from './StatsBar';
import { ProjectSwitcher } from './ProjectSwitcher';
import { KanbanBoard } from '../kanban/KanbanBoard';
import { FileViewer } from '../preview/FileViewer';
import { ChronicleBrowser } from '../chronicle/ChronicleBrowser';
import { AdHocTracker } from '../adhoc/AdHocTracker';
import { SessionHistory } from '../terminal/SessionHistory';
import { TerminalTabs } from '../terminal/TerminalTabs';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { SessionControls } from '../terminal/SessionControls';
import { useSdlcState } from '../../hooks/useSdlcState';
import { useDashboardStore, type ActiveProject } from '../../stores/dashboardStore';
import type { WsMessage } from '@shared/types';

interface DashboardProps {
  wsConnected: boolean;
  wsReconnecting: boolean;
  wsSend: (msg: WsMessage) => void;
  wsSubscribe: (channels: string[]) => void;
  wsUnsubscribe: (channels: string[]) => void;
  wsAddListener: (handler: (msg: WsMessage) => void) => () => void;
  projects?: ActiveProject[];
  onSwitchProject?: (project: ActiveProject) => void;
}

export function Dashboard({
  wsConnected,
  wsReconnecting,
  wsSend,
  wsSubscribe,
  wsAddListener,
  projects = [],
  onSwitchProject,
}: DashboardProps) {
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
    selectedCardId,
    previewOpen,
    setSelectedCard,
    activeProject,
  } = useDashboardStore();

  const selectedDeliverable = useMemo(
    () => deliverables.find((d) => d.id === selectedCardId) ?? null,
    [deliverables, selectedCardId]
  );

  // Resize handle
  const resizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizing.current = true;
      startY.current = e.clientY;
      startHeight.current = terminalHeight;

      const onMove = (ev: MouseEvent) => {
        if (!resizing.current) return;
        const delta = startY.current - ev.clientY;
        setTerminalHeight(startHeight.current + delta);
      };

      const onUp = () => {
        resizing.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [terminalHeight, setTerminalHeight]
  );

  const panelHeight = terminalCollapsed ? 48 : terminalHeight;

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

      {/* Header -- 48px */}
      <Flex
        as="header"
        align="center"
        h="48px"
        minH="48px"
        px="5"
        bg="bg.base"
        borderBottom="1px solid"
        borderColor="border.subtle"
      >
        {/* Left: Logo + Project switcher */}
        <Flex align="center" gap="10px" minW="200px">
          <Rocket size={20} color="#8B5CF6" />
          {onSwitchProject ? (
            <ProjectSwitcher projects={projects} onSwitch={onSwitchProject} />
          ) : (
            <Text
              fontSize="2xl"
              fontWeight={700}
              lineHeight={1.2}
              letterSpacing="-0.03em"
              color="text.primary"
              fontFamily="heading"
            >
              {activeProject?.name ?? 'Mission Control'}
            </Text>
          )}
        </Flex>

        {/* Center: Stats */}
        <Flex flex={1} justify="center">
          <StatsBar stats={stats} loading={loading} />
        </Flex>

        {/* Right: Connection indicator */}
        <Flex minW="200px" justify="flex-end" align="center" gap="2">
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg={wsConnected ? 'semantic.success' : 'semantic.error'}
            transition="background-color 200ms ease"
          />
          <Text fontSize="xs" color="text.muted">
            {wsConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </Flex>
      </Flex>

      {/* Main area: Kanban + Preview (flex: 1) */}
      <Flex
        flex={1}
        overflow="hidden"
        bg="bg.base"
      >
        {/* Kanban + supplementary sections */}
        <Flex
          flex={1}
          direction="column"
          overflow="hidden"
          transition={
            previewOpen
              ? 'flex 250ms cubic-bezier(0, 0, 0.2, 1)'
              : 'flex 200ms cubic-bezier(0.4, 0, 1, 1)'
          }
        >
          {/* Kanban board */}
          <Flex flex={1} overflow="hidden">
            <KanbanBoard
              deliverables={deliverables}
              loading={loading}
              wsSend={wsSend}
            />
          </Flex>

          {/* Supplementary sections -- Chronicle, Ad Hoc, Session History */}
          <Flex
            gap="3"
            px="5"
            pb="3"
            overflowX="auto"
            flexShrink={0}
          >
            <Box flex={1} minW="260px">
              <ChronicleBrowser />
            </Box>
            <Box flex={1} minW="260px">
              <AdHocTracker />
            </Box>
            <Box flex={1} minW="260px">
              <SessionHistory />
            </Box>
          </Flex>
        </Flex>

        {/* Side preview panel */}
        <FileViewer
          deliverable={selectedDeliverable}
          open={previewOpen}
          onClose={() => setSelectedCard(null)}
        />
      </Flex>

      {/* Terminal panel */}
      <Flex
        className="terminal-context"
        role="region"
        aria-label="Terminal sessions"
        h={`${panelHeight}px`}
        transition="height 250ms cubic-bezier(0.4, 0, 0.2, 1)"
        bg="bg.surface"
        borderTop="1px solid"
        borderColor="border.default"
        boxShadow="0 -4px 16px rgba(0,0,0,0.4)"
        borderRadius="lg lg 0 0"
        direction="column"
        position="relative"
      >
        {/* Resize handle */}
        {!terminalCollapsed && (
          <Flex
            onMouseDown={onResizeStart}
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

        {/* Tab bar + controls */}
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

      {/* Global styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .xterm, .xterm-viewport, .xterm-screen {
          height: 100% !important;
          width: 100% !important;
        }
      `}</style>
    </Flex>
  );
}
