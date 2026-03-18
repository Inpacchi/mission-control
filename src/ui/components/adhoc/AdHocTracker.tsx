import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, GitBranch, GitCommit } from 'lucide-react';
import type { UntrackedCommit, WsMessage } from '@shared/types';
import { useDashboardStore } from '../../stores/dashboardStore';

interface AdHocTrackerProps {
  wsSend: (msg: WsMessage) => void;
  defaultCollapsed?: boolean;
}

function formatCommitDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate().toString().padStart(2, ' ');
    return `${month} ${day}`;
  } catch {
    return '';
  }
}

export function AdHocTracker({ wsSend, defaultCollapsed = true }: AdHocTrackerProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [commits, setCommits] = useState<UntrackedCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const { addSession, toggleTerminal } = useDashboardStore();

  const fetchUntracked = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sdlc/untracked');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCommits(data.commits ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load untracked commits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!collapsed && commits.length === 0) {
      fetchUntracked();
    }
  }, [collapsed, commits.length, fetchUntracked]);

  const handleReconcile = useCallback(async () => {
    setReconciling(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: '/sdlc-reconciliation',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.session) {
        addSession(data.session);
        toggleTerminal(false); // Expand terminal
      }
    } catch {
      // Session creation failed — user can see in terminal
    } finally {
      setReconciling(false);
    }
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#1C2333',
        borderRadius: '12px',
        border: '1px solid #1E2A3B',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          color: '#E8EDF4',
          transition: 'background-color 100ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#232D3F';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <GitBranch size={16} color="#A78BFA" />
        <span
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            flex: 1,
            textAlign: 'left',
          }}
        >
          Ad Hoc Commits
        </span>
        {commits.length > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '20px',
              height: '20px',
              padding: '0 6px',
              backgroundColor: '#A78BFA26',
              color: '#A78BFA',
              borderRadius: '9999px',
              fontSize: '0.6875rem',
              fontWeight: 700,
            }}
          >
            {commits.length}
          </span>
        )}
        <ChevronDown
          size={14}
          color="#4E5C72"
          style={{
            transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        />
      </button>

      {/* Collapsible body */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: collapsed ? '0fr' : '1fr',
          transition: collapsed
            ? 'grid-template-rows 200ms cubic-bezier(0.4, 0, 1, 1)'
            : 'grid-template-rows 250ms cubic-bezier(0, 0, 0.2, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              borderTop: '1px solid #1E2A3B',
              padding: '12px 16px',
            }}
          >
            {loading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  color: '#4E5C72',
                  fontSize: '0.75rem',
                }}
              >
                Loading...
              </div>
            )}

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#2D0A0A',
                  borderRadius: '8px',
                  color: '#F87171',
                  fontSize: '0.75rem',
                }}
              >
                <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {!loading && !error && commits.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  color: '#4E5C72',
                  fontSize: '0.75rem',
                }}
              >
                No untracked ad hoc commits
              </div>
            )}

            {!loading && !error && commits.length > 0 && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                  {commits.map((commit) => (
                    <div
                      key={commit.hash}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        transition: 'background-color 100ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#232D3F';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <GitCommit size={12} color="#4E5C72" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.6875rem',
                          color: '#7EB8F7',
                          flexShrink: 0,
                        }}
                      >
                        {commit.hash.slice(0, 7)}
                      </span>
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: '#E8EDF4',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {commit.message}
                      </span>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          color: '#4E5C72',
                          fontFamily: "'JetBrains Mono', monospace",
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {formatCommitDate(commit.date)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reconcile button */}
                <button
                  onClick={handleReconcile}
                  disabled={reconciling}
                  aria-label="Reconcile untracked commits"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: '#232D3F',
                    border: '1px solid #2A3750',
                    borderRadius: '8px',
                    color: '#8B99B3',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: reconciling ? 'not-allowed' : 'pointer',
                    opacity: reconciling ? 0.4 : 1,
                    transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
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
                    if (!reconciling) {
                      e.currentTarget.style.backgroundColor = '#2A3750';
                      e.currentTarget.style.borderColor = '#3D5070';
                      e.currentTarget.style.color = '#E8EDF4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#232D3F';
                    e.currentTarget.style.borderColor = '#2A3750';
                    e.currentTarget.style.color = '#8B99B3';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.transition = 'transform 150ms cubic-bezier(0, 0, 0.2, 1)';
                  }}
                >
                  <GitBranch size={14} />
                  {reconciling ? 'Reconciling...' : 'Reconcile'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
