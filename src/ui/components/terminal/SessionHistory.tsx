import { useCallback, useState } from 'react';
import { History, Search, ChevronDown, Terminal, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useSessionHistory } from '../../hooks/useSessionHistory';

interface SessionHistoryProps {
  defaultCollapsed?: boolean;
}

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate().toString().padStart(2, ' ');
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}  ${hours}:${mins}`;
  } catch {
    return '';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SessionHistory({ defaultCollapsed = true }: SessionHistoryProps) {
  const {
    sessions,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    fetchLog,
  } = useSessionHistory();

  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [viewingLog, setViewingLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [logLoading, setLogLoading] = useState(false);

  const handleViewLog = useCallback(
    async (sessionId: string) => {
      if (viewingLog === sessionId) {
        setViewingLog(null);
        setLogContent('');
        return;
      }

      setViewingLog(sessionId);
      setLogLoading(true);
      try {
        const content = await fetchLog(sessionId);
        setLogContent(content);
      } catch {
        setLogContent('Failed to load log content');
      } finally {
        setLogLoading(false);
      }
    },
    [viewingLog, fetchLog]
  );

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
        <History size={16} color="#8B5CF6" />
        <span
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            flex: 1,
            textAlign: 'left',
          }}
        >
          Session History
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            color: '#4E5C72',
            fontWeight: 500,
          }}
        >
          {sessions.length} sessions
        </span>
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
            {/* Search + Date filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  backgroundColor: '#1A2236',
                  border: '1px solid #1E2A3B',
                  borderRadius: '8px',
                  flex: 1,
                }}
              >
                <Search size={14} color="#4E5C72" />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#E8EDF4',
                    fontSize: '0.75rem',
                    outline: 'none',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                />
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#1A2236',
                  border: '1px solid #1E2A3B',
                  borderRadius: '8px',
                  color: '#8B99B3',
                  fontSize: '0.75rem',
                  outline: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  colorScheme: 'dark',
                }}
              />
            </div>

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
                  padding: '8px 12px',
                  backgroundColor: '#2D0A0A',
                  borderRadius: '8px',
                  color: '#F87171',
                  fontSize: '0.75rem',
                }}
              >
                {error}
              </div>
            )}

            {!loading && !error && sessions.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <History size={32} color="#4E5C72" />
                <span style={{ fontSize: '0.875rem', color: '#8B99B3' }}>
                  No session history yet
                </span>
                <span style={{ fontSize: '0.75rem', color: '#4E5C72' }}>
                  Sessions are saved automatically when closed
                </span>
              </div>
            )}

            {!loading && !error && sessions.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                }}
              >
                {sessions.map((session) => {
                  const isViewing = viewingLog === session.id;
                  const exitOk = session.exitCode === 0;

                  return (
                    <div key={session.id}>
                      <div
                        onClick={() => handleViewLog(session.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isViewing ? '#232D3F' : 'transparent',
                          transition: 'background-color 100ms ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isViewing) e.currentTarget.style.backgroundColor = '#232D3F';
                        }}
                        onMouseLeave={(e) => {
                          if (!isViewing) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Exit code indicator */}
                        {session.exitCode !== undefined ? (
                          exitOk ? (
                            <CheckCircle size={12} color="#22C55E" style={{ flexShrink: 0 }} />
                          ) : (
                            <XCircle size={12} color="#F87171" style={{ flexShrink: 0 }} />
                          )
                        ) : (
                          <Terminal size={12} color="#4E5C72" style={{ flexShrink: 0 }} />
                        )}

                        {/* Command */}
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: '#E8EDF4',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            minWidth: 0,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {session.command || 'claude'}
                        </span>

                        {/* Date */}
                        <span
                          style={{
                            fontSize: '0.625rem',
                            color: '#4E5C72',
                            fontFamily: "'JetBrains Mono', monospace",
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {formatDate(session.startedAt)}
                        </span>

                        {/* Log size */}
                        {session.logSize !== undefined && session.logSize > 0 && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.625rem',
                              color: '#4E5C72',
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={10} />
                            {formatBytes(session.logSize)}
                          </span>
                        )}
                      </div>

                      {/* Log viewer */}
                      {isViewing && (
                        <div
                          style={{
                            margin: '4px 0 4px 24px',
                            padding: '12px',
                            backgroundColor: '#0D1117',
                            border: '1px solid #1E2A3B',
                            borderRadius: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                          }}
                        >
                          {logLoading ? (
                            <span style={{ color: '#4E5C72', fontSize: '0.75rem' }}>
                              Loading log...
                            </span>
                          ) : (
                            <pre
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '0.6875rem',
                                lineHeight: 1.5,
                                color: '#C9D1D9',
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                              }}
                            >
                              {logContent || 'No log content available'}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
