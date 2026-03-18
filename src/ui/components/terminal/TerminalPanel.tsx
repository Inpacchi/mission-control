import { useCallback, useRef, useEffect } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { Terminal as TerminalIcon, Plus } from 'lucide-react';
import { useTerminalSession } from '../../hooks/useTerminalSession';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { Session, WsMessage } from '@shared/types';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  wsSend: (msg: WsMessage) => void;
  wsAddListener: (handler: (msg: WsMessage) => void) => () => void;
  wsSubscribe: (channels: string[]) => void;
  wsConnected: boolean;
  activeSessionId: string | null;
  sessions: Session[];
}

export function TerminalPanel({
  wsSend,
  wsAddListener,
  wsSubscribe,
  wsConnected,
  activeSessionId,
  sessions,
}: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { addSession, toggleTerminal } = useDashboardStore();

  const { attachToContainer, fit } = useTerminalSession({
    sessionId: activeSessionId,
    send: wsSend,
    addListener: wsAddListener,
    subscribe: wsSubscribe,
    connected: wsConnected,
  });

  // Attach terminal to container when session or container changes
  useEffect(() => {
    if (containerRef.current && activeSessionId) {
      attachToContainer(containerRef.current);
    }
  }, [activeSessionId, attachToContainer]);

  // Re-fit on visibility changes
  useEffect(() => {
    if (activeSessionId) {
      // Small delay to allow layout to settle
      const timer = setTimeout(() => fit(), 100);
      return () => clearTimeout(timer);
    }
  }, [activeSessionId, fit]);

  const handleNewSession = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.session) {
        addSession(data.session);
        toggleTerminal(false);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }, [addSession, toggleTerminal]);

  // No active session — show empty state
  if (!activeSessionId || sessions.length === 0) {
    return (
      <Flex
        flex={1}
        direction="column"
        align="center"
        justify="center"
        gap="3"
        bg="bg.canvas"
      >
        <TerminalIcon size={32} color="#4E5C72" />
        <Text fontSize="base" color="text.secondary">
          No active sessions
        </Text>
        <Flex
          as="button"
          onClick={handleNewSession}
          align="center"
          gap="6px"
          px="4"
          py="2"
          bg="accent.blue.500"
          border="none"
          borderRadius="md"
          color="text.primary"
          fontSize="base"
          fontWeight={600}
          cursor="pointer"
          transition="background-color 150ms ease"
          _hover={{ bg: 'accent.blue.400' }}
        >
          <Plus size={16} />
          New Session
        </Flex>
      </Flex>
    );
  }

  return (
    <Box
      ref={containerRef}
      role="tabpanel"
      flex={1}
      w="100%"
      h="100%"
      overflow="hidden"
    />
  );
}
