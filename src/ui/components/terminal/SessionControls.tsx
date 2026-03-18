import { useCallback, useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        height: '100%',
      }}
    >
      {/* New session */}
      <IconButton
        icon={creating ? <Loader2 size={16} style={{ animation: 'spin 600ms linear infinite' }} /> : <Plus size={16} />}
        label="New terminal session"
        onClick={handleNewSession}
      />

      {/* Kill session */}
      {activeSessionId && (
        <IconButton
          icon={<X size={16} />}
          label="Kill session"
          onClick={handleKillSession}
          hoverColor="#F87171"
        />
      )}

      {/* Separator */}
      <div
        style={{
          width: '1px',
          height: '20px',
          backgroundColor: '#1E2A3B',
          margin: '0 4px',
        }}
      />

      {/* Collapse/Expand toggle */}
      <IconButton
        icon={
          collapsed ? (
            <ChevronUp
              size={16}
              style={{
                transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          ) : (
            <ChevronDown
              size={16}
              style={{
                transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          )
        }
        label={collapsed ? 'Expand terminal panel' : 'Collapse terminal panel'}
        onClick={onToggleCollapse}
      />
    </div>
  );
}

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  hoverColor?: string;
}

function IconButton({ icon, label, onClick, hoverColor }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        border: 'none',
        backgroundColor: 'transparent',
        color: '#4E5C72',
        cursor: 'pointer',
        borderRadius: '8px',
        transition: 'background-color 100ms ease, color 100ms ease',
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
        t.style.color = hoverColor || '#8B99B3';
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget;
        t.style.backgroundColor = 'transparent';
        t.style.color = '#4E5C72';
        t.style.transform = 'scale(1)';
        t.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
      }}
    >
      {icon}
    </button>
  );
}
