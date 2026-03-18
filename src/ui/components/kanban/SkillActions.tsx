import { useState } from 'react';
import { Play, FileText, ClipboardCheck, RotateCcw, Eye, Archive, Loader2 } from 'lucide-react';
import type { DeliverableStatus, WsMessage } from '@shared/types';
import { useDashboardStore } from '../../stores/dashboardStore';

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
    <button
      onClick={handleClick}
      aria-label={`${action.label} for ${deliverableId}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        backgroundColor: '#232D3F',
        border: '1px solid #2A3750',
        borderRadius: '8px',
        color: '#8B99B3',
        fontSize: '0.6875rem',
        fontWeight: 500,
        fontFamily: "'Inter', system-ui, sans-serif",
        cursor: dispatching ? 'wait' : 'pointer',
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms cubic-bezier(0, 0, 0.2, 1), background-color 150ms ease, color 150ms ease',
        pointerEvents: visible ? 'auto' : 'none',
        whiteSpace: 'nowrap',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
        e.currentTarget.style.transition = 'transform 100ms cubic-bezier(0.4, 0, 1, 1)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget;
        t.style.backgroundColor = '#2A3750';
        t.style.borderColor = '#3D5070';
        t.style.color = '#E8EDF4';
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget;
        t.style.backgroundColor = '#232D3F';
        t.style.borderColor = '#2A3750';
        t.style.color = '#8B99B3';
        t.style.transform = 'scale(1)';
        t.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
      }}
    >
      {dispatching ? (
        <Loader2 size={14} style={{ animation: 'spin 600ms linear infinite' }} />
      ) : (
        action.icon
      )}
      {action.label}
    </button>
  );
}
