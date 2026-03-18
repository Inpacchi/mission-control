import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Archive, ChevronDown, Search } from 'lucide-react';
import type { ChronicleEntry } from '@shared/types';

interface ChronicleBrowserProps {
  defaultCollapsed?: boolean;
}

export function ChronicleBrowser({ defaultCollapsed = true }: ChronicleBrowserProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [entries, setEntries] = useState<ChronicleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchChronicle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sdlc/chronicle');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.deliverables ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chronicle');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when expanded
  useEffect(() => {
    if (!collapsed && entries.length === 0) {
      fetchChronicle();
    }
  }, [collapsed, entries.length, fetchChronicle]);

  const filtered = entries.filter((entry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.id.toLowerCase().includes(q) ||
      entry.name.toLowerCase().includes(q) ||
      entry.concept.toLowerCase().includes(q)
    );
  });

  // Group by concept
  const grouped = filtered.reduce<Record<string, ChronicleEntry[]>>((acc, entry) => {
    const key = entry.concept || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

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
        <Archive size={16} color="#8B5CF6" />
        <span
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            flex: 1,
            textAlign: 'left',
          }}
        >
          Chronicle
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            color: '#4E5C72',
            fontWeight: 500,
          }}
        >
          {entries.length} archived
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
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#1A2236',
                border: '1px solid #1E2A3B',
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            >
              <Search size={14} color="#4E5C72" />
              <input
                type="text"
                placeholder="Search by name, ID, or concept..."
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

            {!loading && !error && filtered.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  color: '#4E5C72',
                  fontSize: '0.75rem',
                }}
              >
                {entries.length === 0
                  ? 'No archived deliverables yet'
                  : 'No matching entries'}
              </div>
            )}

            {!loading &&
              !error &&
              Object.entries(grouped).map(([concept, items]) => (
                <div key={concept} style={{ marginBottom: '12px' }}>
                  {/* Concept group header */}
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#4E5C72',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '6px',
                    }}
                  >
                    {concept}
                  </div>

                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {items.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          transition: 'background-color 100ms ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#232D3F';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '1px 5px',
                            backgroundColor: '#0D1117',
                            border: '1px solid #1E2A3B',
                            borderRadius: '4px',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: '#22C55E',
                            flexShrink: 0,
                          }}
                        >
                          {entry.id.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            color: '#E8EDF4',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {entry.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
