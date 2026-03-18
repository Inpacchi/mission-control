import { useCallback, useMemo, useRef } from 'react';
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0D1117',
        overflow: 'hidden',
      }}
    >
      {/* Reconnection banner */}
      {wsReconnecting && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '6px 20px',
            backgroundColor: '#1C2333',
            borderBottom: '1px solid #1E2A3B',
            color: '#8B99B3',
            fontSize: '0.75rem',
          }}
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
        </div>
      )}

      {/* Header — 48px */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '48px',
          minHeight: '48px',
          padding: '0 20px',
          backgroundColor: '#13181F',
          borderBottom: '1px solid #1E2A3B',
        }}
      >
        {/* Left: Logo + Project switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
          <Rocket size={20} color="#8B5CF6" />
          {onSwitchProject ? (
            <ProjectSwitcher projects={projects} onSwitch={onSwitchProject} />
          ) : (
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: '-0.03em',
                color: '#E8EDF4',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {activeProject?.name ?? 'Mission Control'}
            </span>
          )}
        </div>

        {/* Center: Stats */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <StatsBar stats={stats} loading={loading} />
        </div>

        {/* Right: Connection indicator */}
        <div style={{ minWidth: '200px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '9999px',
              backgroundColor: wsConnected ? '#22C55E' : '#F87171',
              transition: 'background-color 200ms ease',
            }}
          />
          <span style={{ fontSize: '0.6875rem', color: '#4E5C72' }}>
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      {/* Main area: Kanban + Preview (flex: 1) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          backgroundColor: '#13181F',
        }}
      >
        {/* Kanban + supplementary sections */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: previewOpen
              ? 'flex 250ms cubic-bezier(0, 0, 0.2, 1)'
              : 'flex 200ms cubic-bezier(0.4, 0, 1, 1)',
          }}
        >
          {/* Kanban board */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            <KanbanBoard
              deliverables={deliverables}
              loading={loading}
              wsSend={wsSend}
            />
          </div>

          {/* Supplementary sections — Chronicle, Ad Hoc, Session History */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '0 20px 12px 20px',
              overflowX: 'auto',
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: '260px' }}>
              <ChronicleBrowser />
            </div>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <AdHocTracker wsSend={wsSend} />
            </div>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <SessionHistory />
            </div>
          </div>
        </div>

        {/* Side preview panel */}
        <FileViewer
          deliverable={selectedDeliverable}
          open={previewOpen}
          onClose={() => setSelectedCard(null)}
        />
      </div>

      {/* Terminal panel */}
      <div
        className="terminal-context"
        role="region"
        aria-label="Terminal sessions"
        style={{
          height: `${panelHeight}px`,
          transition: 'height 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: '#1C2333',
          borderTop: '1px solid #2A3750',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.4)',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Resize handle */}
        {!terminalCollapsed && (
          <div
            onMouseDown={onResizeStart}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              cursor: 'ns-resize',
              zIndex: 10,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '2px',
                backgroundColor: '#2A3750',
                borderRadius: '1px',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = '#2F74D0';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = '#2A3750';
              }}
            />
          </div>
        )}

        {/* Tab bar + controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '38px',
            minHeight: '38px',
            backgroundColor: '#1C2333',
            borderBottom: terminalCollapsed ? 'none' : '1px solid #1E2A3B',
            paddingRight: '8px',
          }}
        >
          <TerminalTabs />
          <div style={{ flex: 1 }} />
          <SessionControls
            wsSend={wsSend}
            collapsed={terminalCollapsed}
            onToggleCollapse={() => toggleTerminal()}
          />
        </div>

        {/* Terminal content */}
        <div
          style={{
            flex: 1,
            display: terminalCollapsed ? 'none' : 'flex',
            backgroundColor: '#0D1117',
            padding: '8px 8px 0 8px',
            overflow: 'hidden',
          }}
        >
          <TerminalPanel
            wsSend={wsSend}
            wsAddListener={wsAddListener}
            wsSubscribe={wsSubscribe}
            wsConnected={wsConnected}
            activeSessionId={activeSessionId}
            sessions={sessions}
          />
        </div>
      </div>

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
    </div>
  );
}
