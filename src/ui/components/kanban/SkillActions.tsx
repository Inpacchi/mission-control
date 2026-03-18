import { useState } from 'react';
import { Play, FileText, ClipboardCheck, RotateCcw, Eye, Archive, Loader2 } from 'lucide-react';
import { chakra, Flex } from '@chakra-ui/react';
import type { DeliverableStatus, WsMessage } from '@shared/types';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useButtonPress } from '../../hooks/useButtonPress';

interface SkillActionsProps {
  status: DeliverableStatus;
  deliverableId: string;
  visible: boolean;
  wsSend: (msg: WsMessage) => void;
}

interface ActionDef {
  label: string;
  command: string;
  icon: React.ReactNode;
}

const actionMap: Record<DeliverableStatus, ActionDef> = {
  idea: {
    label: 'Start Planning',
    command: '/sdlc-planning',
    icon: <FileText size={14} />,
  },
  spec: {
    label: 'Start Planning',
    command: '/sdlc-planning',
    icon: <FileText size={14} />,
  },
  plan: {
    label: 'Execute Plan',
    command: '/sdlc-execution',
    icon: <Play size={14} />,
  },
  'in-progress': {
    label: 'Resume',
    command: '/sdlc-resume',
    icon: <RotateCcw size={14} />,
  },
  review: {
    label: 'Review',
    command: '/commit-review',
    icon: <Eye size={14} />,
  },
  complete: {
    label: 'Archive',
    command: '/sdlc-archive',
    icon: <Archive size={14} />,
  },
  blocked: {
    label: 'Resume',
    command: '/sdlc-resume',
    icon: <ClipboardCheck size={14} />,
  },
};

export function SkillActions({ status, deliverableId, visible, wsSend: _wsSend }: SkillActionsProps) {
  const [dispatching, setDispatching] = useState(false);
  const { addSession, toggleTerminal } = useDashboardStore();
  const pressHandlers = useButtonPress();

  const action = actionMap[status];
  if (!action) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dispatching) return;

    setDispatching(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `${action.command} ${deliverableId}` }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.session) {
        addSession(data.session);
        toggleTerminal(false); // Expand terminal
      }
    } catch (err) {
      console.error('Failed to dispatch skill:', err);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <chakra.button
      onClick={handleClick}
      aria-label={`${action.label} for ${deliverableId} — Skill actions available`}
      display="flex"
      alignItems="center"
      gap="6px"
      p="1 2.5"
      bg="bg.elevated"
      border="1px solid"
      borderColor="border.default"
      borderRadius="md"
      color="#8B99B3"
      fontSize="xs"
      fontWeight={500}
      fontFamily="body"
      cursor={dispatching ? 'wait' : 'pointer'}
      opacity={visible ? 1 : 0}
      transition="opacity 200ms cubic-bezier(0, 0, 0.2, 1), background-color 150ms ease, color 150ms ease"
      pointerEvents={visible ? 'auto' : 'none'}
      whiteSpace="nowrap"
      {...pressHandlers}
      onMouseEnter={(e) => {
        const t = e.currentTarget;
        t.style.backgroundColor = '#2A3750';
        t.style.borderColor = '#3D5070';
        t.style.color = '#E8EDF4';
      }}
      onMouseLeave={(e) => {
        // Reset press + hover styles
        pressHandlers.onMouseLeave(e);
        const t = e.currentTarget;
        t.style.backgroundColor = '';
        t.style.borderColor = '';
        t.style.color = '';
      }}
    >
      <Flex align="center">
        {dispatching ? (
          <Loader2 size={14} style={{ animation: 'spin 600ms linear infinite' }} />
        ) : (
          action.icon
        )}
      </Flex>
      {action.label}
    </chakra.button>
  );
}
