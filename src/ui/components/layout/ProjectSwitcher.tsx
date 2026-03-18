import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, FolderOpen, AlertTriangle, Check } from 'lucide-react';
import { useDashboardStore, type ActiveProject } from '../../stores/dashboardStore';

interface ProjectSwitcherProps {
  projects: ActiveProject[];
  onSwitch: (project: ActiveProject) => void;
}

export function ProjectSwitcher({ projects, onSwitch }: ProjectSwitcherProps) {
  const { activeProject, sessions } = useDashboardStore();
  const [open, setOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingProject, setPendingProject] = useState<ActiveProject | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeSessions = sessions.filter((s) => s.status === 'running');

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowWarning(false);
        setPendingProject(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowWarning(false);
        setPendingProject(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleSelect = useCallback(
    (project: ActiveProject) => {
      if (project.path === activeProject?.path) {
        setOpen(false);
        return;
      }

      // Warn if there are active sessions
      if (activeSessions.length > 0) {
        setPendingProject(project);
        setShowWarning(true);
        return;
      }

      onSwitch(project);
      setOpen(false);
    },
    [activeProject, activeSessions.length, onSwitch]
  );

  const confirmSwitch = useCallback(() => {
    if (pendingProject) {
      onSwitch(pendingProject);
      setOpen(false);
      setShowWarning(false);
      setPendingProject(null);
    }
  }, [pendingProject, onSwitch]);

  if (!activeProject) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          backgroundColor: 'transparent',
          border: '1px solid transparent',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#E8EDF4',
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: '1.5rem',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.2,
          outline: 'none',
          transition: 'all 150ms ease',
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
          e.currentTarget.style.backgroundColor = '#1C2333';
          e.currentTarget.style.borderColor = '#1E2A3B';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
        }}
      >
        {activeProject.name}
        <ChevronDown
          size={16}
          color="#8B99B3"
          style={{
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#232D3F',
            border: '1px solid #2A3750',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.4)',
            zIndex: 1000,
            padding: '4px',
          }}
        >
          {/* Warning banner */}
          {showWarning && pendingProject && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                margin: '4px',
                backgroundColor: '#422006',
                border: '1px solid #D97706',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#F59E0B',
                }}
              >
                <AlertTriangle size={14} />
                {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''} running
              </div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: '#FDE68A',
                  lineHeight: 1.4,
                }}
              >
                Sessions will continue running in the background. Switch to{' '}
                <strong>{pendingProject.name}</strong>?
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowWarning(false);
                    setPendingProject(null);
                  }}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #D97706',
                    borderRadius: '6px',
                    color: '#FDE68A',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSwitch}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#D97706',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#0D1117',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  Switch anyway
                </button>
              </div>
            </div>
          )}

          {/* Project list */}
          {projects.map((project) => {
            const isActive = project.path === activeProject.path;
            return (
              <button
                key={project.path}
                onClick={() => handleSelect(project)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  width: '100%',
                  backgroundColor: isActive ? '#1C233366' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none',
                  transition: 'background-color 100ms ease',
                  fontFamily: "'Inter', system-ui, sans-serif",
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
                  if (!isActive) e.currentTarget.style.backgroundColor = '#1C2333';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
                }}
              >
                <FolderOpen size={16} color={isActive ? '#8B5CF6' : '#4E5C72'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#E8EDF4' : '#8B99B3',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {project.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: '#4E5C72',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    }}
                  >
                    {project.path}
                  </div>
                </div>
                {isActive && <Check size={14} color="#22C55E" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
