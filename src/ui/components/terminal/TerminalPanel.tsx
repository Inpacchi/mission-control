import { useCallback, useRef, useEffect } from 'react';
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
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          backgroundColor: '#0D1117',
        }}
      >
        <TerminalIcon size={32} color="#4E5C72" />
        <span style={{ fontSize: '0.875rem', color: '#8B99B3' }}>
          No active sessions
        </span>
        <button
          onClick={handleNewSession}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: '#2F74D0',
            border: 'none',
            borderRadius: '8px',
            color: '#E8EDF4',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#4D8FE8';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#2F74D0';
          }}
        >
          <Plus size={16} />
          New Session
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="tabpanel"
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    />
  );
}
