import { useCallback, useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { Plus, X, ChevronDown, Loader2 } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useButtonPress } from '../../hooks/useButtonPress';
import type { ButtonPressHandlers } from '../../hooks/useButtonPress';
import type { WsMessage } from '@shared/types';

interface SessionControlsProps {
  wsSend: (msg: WsMessage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function SessionControls({
  wsSend: _wsSend,
  collapsed,
  onToggleCollapse,
}: SessionControlsProps) {
  const { activeSessionId, addSession, removeSession, toggleTerminal } =
    useDashboardStore();
  const [creating, setCreating] = useState(false);
  const pressHandlers = useButtonPress();

  const handleNewSession = useCallback(async () => {
    if (creating) return;
    setCreating(true);
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
    } finally {
      setCreating(false);
    }
  }, [creating, addSession, toggleTerminal]);

  const handleKillSession = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await fetch(`/api/sessions/${activeSessionId}`, { method: 'DELETE' });
      removeSession(activeSessionId);
    } catch (err) {
      console.error('Failed to kill session:', err);
    }
  }, [activeSessionId, removeSession]);

  return (
    <Flex align="center" gap="1" h="100%">
      {/* New session */}
      <IconButton
        icon={creating ? <Loader2 size={16} style={{ animation: 'spin 600ms linear infinite' }} /> : <Plus size={16} />}
        label="New terminal session"
        onClick={handleNewSession}
        pressHandlers={pressHandlers}
      />

      {/* Kill session */}
      {activeSessionId && (
        <IconButton
          icon={<X size={16} />}
          label="Kill session"
          onClick={handleKillSession}
          hoverColor="semantic.error"
          pressHandlers={pressHandlers}
        />
      )}

      {/* Separator */}
      <Box
        w="1px"
        h="20px"
        bg="border.subtle"
        mx="1"
      />

      {/* Collapse/Expand toggle */}
      <IconButton
        icon={
          <ChevronDown
            size={16}
            style={{
              transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        }
        label={collapsed ? 'Expand terminal panel' : 'Collapse terminal panel'}
        onClick={onToggleCollapse}
        pressHandlers={pressHandlers}
      />
    </Flex>
  );
}

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  hoverColor?: string;
  pressHandlers: ButtonPressHandlers;
}

function IconButton({ icon, label, onClick, hoverColor, pressHandlers }: IconButtonProps) {
  return (
    <Flex
      as="button"
      onClick={onClick}
      aria-label={label}
      align="center"
      justify="center"
      w="32px"
      h="32px"
      border="none"
      bg="transparent"
      color="text.muted"
      cursor="pointer"
      borderRadius="md"
      transition="background-color 100ms ease, color 100ms ease"
      _hover={{
        bg: 'bg.overlay',
        color: hoverColor || 'text.secondary',
      }}
      {...pressHandlers}
    >
      {icon}
    </Flex>
  );
}
