import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';

export function TerminalTabs() {
  const { sessions, activeSessionId, setActiveSession, removeSession } =
    useDashboardStore();

  const runningSessions = sessions.filter((s) => s.status === 'running' || s.status === 'exited');
  const tabRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    if (!activeSessionId) {
      setIndicatorStyle({ left: 0, width: 0 });
      return;
    }
    const tabEl = tabRefs.current.get(activeSessionId);
    if (tabEl) {
      setIndicatorStyle({ left: tabEl.offsetLeft, width: tabEl.offsetWidth });
    }
  }, [activeSessionId]);

  useEffect(() => {
    updateIndicator();
  }, [activeSessionId, runningSessions.length, updateIndicator]);

  if (runningSessions.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          paddingLeft: '12px',
          color: '#4E5C72',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}
      >
        No sessions
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="tablist"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {runningSessions.map((session) => (
        <Tab
          key={session.id}
          ref={(el) => {
            tabRefs.current.set(session.id, el);
          }}
          sessionId={session.id}
          label={session.command?.split(' ').slice(0, 2).join(' ') || `Session`}
          isActive={activeSessionId === session.id}
          isExited={session.status === 'exited'}
          onSelect={() => setActiveSession(session.id)}
          onClose={() => removeSession(session.id)}
        />
      ))}

      {/* Sliding underline indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          height: '2px',
          backgroundColor: '#8B5CF6',
          transition: 'left 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

interface TabProps {
  sessionId: string;
  label: string;
  isActive: boolean;
  isExited: boolean;
  onSelect: () => void;
  onClose: () => void;
}

import { forwardRef } from 'react';

const Tab = forwardRef<HTMLDivElement, TabProps>(
  function Tab({ sessionId: _sessionId, label, isActive, isExited, onSelect, onClose }, ref) {
    const [hovered, setHovered] = useState(false);

    return (
      <div
        ref={ref}
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={onSelect}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 16px',
          height: '100%',
          cursor: 'pointer',
          backgroundColor: isActive ? '#232D3F' : hovered ? '#2A3750' : 'transparent',
          borderRight: '1px solid #1E2A3B',
          color: isActive ? '#E8EDF4' : hovered ? '#E8EDF4' : '#8B99B3',
          fontSize: '0.75rem',
          fontWeight: 500,
          transition: 'background-color 150ms ease, color 150ms ease',
          position: 'relative',
          maxWidth: '180px',
          minWidth: '80px',
        }}
      >
        {/* Session status dot */}
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '9999px',
            backgroundColor: isExited ? '#F87171' : '#22C55E',
            flexShrink: 0,
          }}
        />

        {/* Label */}
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {label}
        </span>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Kill session"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#4E5C72',
            cursor: 'pointer',
            padding: 0,
            opacity: hovered || isActive ? 1 : 0,
            transition: 'opacity 150ms ease, color 100ms ease',
            borderRadius: '2px',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#8B99B3';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#4E5C72';
          }}
        >
          <X size={12} />
        </button>
      </div>
    );
  }
);
