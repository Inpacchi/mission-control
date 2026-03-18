import { useState } from 'react';
import { Rocket, FolderOpen, Clock, FileText, GitBranch, Settings, ChevronRight } from 'lucide-react';
import type { ActiveProject } from '../../stores/dashboardStore';

interface ProjectPickerProps {
  projects: ActiveProject[];
  onSelect: (project: ActiveProject) => void;
  loading: boolean;
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function MarkerBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.6875rem',
        fontWeight: 500,
        backgroundColor: active ? '#0A1628' : '#1C2333',
        color: active ? '#7EB8F7' : '#4E5C72',
        border: `1px solid ${active ? '#2F74D033' : '#1E2A3B'}`,
        transition: 'all 150ms ease',
      }}
    >
      {label}
    </span>
  );
}

export function ProjectPicker({ projects, onSelect, loading }: ProjectPickerProps) {
  const [pathInput, setPathInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenPath = async () => {
    if (!pathInput.trim()) return;
    setInputError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/projects/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInputError(data.error || 'Failed to open project');
        setSubmitting(false);
        return;
      }
      onSelect(data.project);
    } catch {
      setInputError('Failed to connect to server');
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0D1117',
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: 'auto',
      }}
    >
      {/* Logo + Title */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}
        >
          <Rocket size={32} color="#8B5CF6" />
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#E8EDF4',
              margin: 0,
            }}
          >
            Mission Control
          </h1>
        </div>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#8B99B3',
            margin: 0,
          }}
        >
          Select a project to get started
        </p>
      </div>

      {/* Project list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%',
          maxWidth: '560px',
          padding: '0 24px',
        }}
      >
        {loading && (
          <div
            style={{
              textAlign: 'center',
              color: '#8B99B3',
              fontSize: '0.875rem',
              padding: '32px 0',
            }}
          >
            Loading projects...
          </div>
        )}

        {!loading && projects.length === 0 && !showInput && (
          <div
            style={{
              textAlign: 'center',
              color: '#4E5C72',
              fontSize: '0.875rem',
              padding: '32px 0',
            }}
          >
            No projects registered yet. Open a directory to get started.
          </div>
        )}

        {!loading &&
          projects.map((project) => (
            <button
              key={project.path}
              onClick={() => onSelect(project)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                backgroundColor: '#232D3F',
                border: '1px solid #1E2A3B',
                borderRadius: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                width: '100%',
                outline: 'none',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px) scale(0.97)';
                e.currentTarget.style.transition = 'transform 100ms cubic-bezier(0.4, 0, 1, 1)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px) scale(1)';
                e.currentTarget.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = '#2A3750';
                el.style.borderColor = '#3D5070';
                el.style.transform = 'translateY(-1px)';
                el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.backgroundColor = '#232D3F';
                el.style.borderColor = '#1E2A3B';
                el.style.transform = 'translateY(0) scale(1)';
                el.style.boxShadow = 'none';
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: '#1C2333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FolderOpen size={20} color="#8B5CF6" />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    color: '#E8EDF4',
                    marginBottom: '4px',
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
                    marginBottom: '6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  }}
                >
                  {project.path}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <MarkerBadge label="CLAUDE.md" active={project.hasClaudeMd} />
                  <MarkerBadge label="_index.md" active={project.hasIndex} />
                  <MarkerBadge label=".claude/" active={project.hasClaude} />
                  <MarkerBadge label=".mc.json" active={project.hasMcConfig} />
                </div>
              </div>

              {/* Right: last opened + chevron */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.6875rem',
                    color: '#4E5C72',
                  }}
                >
                  <Clock size={12} />
                  {formatRelativeTime(project.lastOpened)}
                </div>
                <ChevronRight size={16} color="#4E5C72" />
              </div>
            </button>
          ))}

        {/* Open directory button / input */}
        {!showInput ? (
          <button
            onClick={() => setShowInput(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 20px',
              backgroundColor: 'transparent',
              border: '1px solid #2A3750',
              borderRadius: '16px',
              cursor: 'pointer',
              color: '#8B99B3',
              fontSize: '0.875rem',
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'all 200ms ease',
              width: '100%',
              outline: 'none',
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
              e.currentTarget.style.borderColor = '#3D5070';
              e.currentTarget.style.color = '#E8EDF4';
              e.currentTarget.style.backgroundColor = '#1C233322';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2A3750';
              e.currentTarget.style.color = '#8B99B3';
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
            }}
          >
            <FolderOpen size={16} />
            Open a project directory
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '16px 20px',
              backgroundColor: '#232D3F',
              border: '1px solid #1E2A3B',
              borderRadius: '16px',
            }}
          >
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#8B99B3',
              }}
            >
              Project path
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={pathInput}
                onChange={(e) => {
                  setPathInput(e.target.value);
                  setInputError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleOpenPath();
                  if (e.key === 'Escape') {
                    setShowInput(false);
                    setPathInput('');
                    setInputError(null);
                  }
                }}
                placeholder="/path/to/project"
                autoFocus
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#1A2236',
                  border: `1px solid ${inputError ? '#F87171' : '#2A3750'}`,
                  borderRadius: '8px',
                  color: '#E8EDF4',
                  fontSize: '0.875rem',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  outline: 'none',
                  transition: 'border-color 150ms ease',
                }}
                onFocus={(e) => {
                  if (!inputError) e.currentTarget.style.borderColor = '#2F74D0';
                }}
                onBlur={(e) => {
                  if (!inputError) e.currentTarget.style.borderColor = '#2A3750';
                }}
              />
              <button
                onClick={handleOpenPath}
                disabled={submitting || !pathInput.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: submitting ? '#1A4080' : '#2F74D0',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#E8EDF4',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  transition: 'background-color 150ms ease',
                  opacity: !pathInput.trim() ? 0.5 : 1,
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
                  if (!submitting) e.currentTarget.style.backgroundColor = '#4D8FE8';
                }}
                onMouseLeave={(e) => {
                  if (!submitting) e.currentTarget.style.backgroundColor = '#2F74D0';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
                }}
              >
                {submitting ? 'Opening...' : 'Open'}
              </button>
            </div>
            {inputError && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#F87171',
                }}
              >
                {inputError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          color: '#4E5C72',
          fontSize: '0.6875rem',
        }}
      >
        Mission Control v0.1.0
      </div>
    </div>
  );
}
