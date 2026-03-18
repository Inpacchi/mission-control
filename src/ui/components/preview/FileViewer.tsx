import { useCallback, useEffect, useRef, useState } from 'react';
import { X, FileText, Map, CheckSquare, AlertTriangle, RotateCcw } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import type { Deliverable } from '@shared/types';

interface FileViewerProps {
  deliverable: Deliverable | null;
  open: boolean;
  onClose: () => void;
}

type DocTab = 'spec' | 'plan' | 'result';

interface TabDef {
  key: DocTab;
  label: string;
  icon: typeof FileText;
  path: string | undefined;
}

export function FileViewer({ deliverable, open, onClose }: FileViewerProps) {
  const [activeTab, setActiveTab] = useState<DocTab | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fadeState, setFadeState] = useState<'visible' | 'fading-out' | 'fading-in'>('visible');
  const panelRef = useRef<HTMLDivElement>(null);

  // Determine available tabs
  const tabs: TabDef[] = deliverable
    ? [
        { key: 'spec', label: 'Spec', icon: FileText, path: deliverable.specPath },
        { key: 'plan', label: 'Plan', icon: Map, path: deliverable.planPath },
        { key: 'result', label: 'Result', icon: CheckSquare, path: deliverable.resultPath },
      ].filter((t) => t.path) as TabDef[]
    : [];

  // Select default tab when deliverable changes
  useEffect(() => {
    if (!deliverable || tabs.length === 0) {
      setActiveTab(null);
      setContent('');
      return;
    }

    // Default: most advanced stage first (Result > Plan > Spec)
    const priority: DocTab[] = ['result', 'plan', 'spec'];
    const defaultTab = priority.find((p) => tabs.some((t) => t.key === p));
    setActiveTab(defaultTab ?? tabs[0].key);
  }, [deliverable?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch content when active tab changes
  useEffect(() => {
    if (!activeTab || !deliverable) return;

    const tab = tabs.find((t) => t.key === activeTab);
    if (!tab?.path) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    // tab.path is an absolute filesystem path; the API expects a path relative to docs/
    const docsSegment = '/docs/';
    const docsIdx = tab.path.indexOf(docsSegment);
    const relativePath = docsIdx !== -1
      ? tab.path.slice(docsIdx + docsSegment.length)
      : tab.path;

    fetch(`/api/files/${relativePath}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setContent(data.content ?? '');
          setLoading(false);
          setFadeState('visible');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load file');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, deliverable?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle tab switch with fade animation
  const switchTab = useCallback(
    (tab: DocTab) => {
      if (tab === activeTab) return;
      setFadeState('fading-out');
      setTimeout(() => {
        setActiveTab(tab);
        setFadeState('fading-in');
        setTimeout(() => setFadeState('visible'), 150);
      }, 80);
    },
    [activeTab]
  );

  // Escape key closes panel
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const showTabs = tabs.length > 1;

  return (
    <div
      ref={panelRef}
      role="complementary"
      aria-label={deliverable ? `${deliverable.name} preview` : 'Preview panel'}
      style={{
        width: open ? '380px' : '0px',
        minWidth: open ? '380px' : '0px',
        height: '100%',
        overflow: 'hidden',
        transition: open
          ? 'width 250ms cubic-bezier(0, 0, 0.2, 1), min-width 250ms cubic-bezier(0, 0, 0.2, 1)'
          : 'width 200ms cubic-bezier(0.4, 0, 1, 1), min-width 200ms cubic-bezier(0.4, 0, 1, 1)',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: '380px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1C2333',
          borderLeft: '1px solid #2A3750',
          boxShadow: open ? '-4px 0 24px rgba(0,0,0,0.5)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          opacity: open ? 1 : 0.6,
          transition: open
            ? 'transform 250ms cubic-bezier(0, 0, 0.2, 1), opacity 250ms cubic-bezier(0, 0, 0.2, 1)'
            : 'transform 200ms cubic-bezier(0.4, 0, 1, 1), opacity 200ms cubic-bezier(0.4, 0, 1, 1)',
        }}
      >
        {/* Header — 48px */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '48px',
            minHeight: '48px',
            padding: '0 16px',
            borderBottom: '1px solid #1E2A3B',
          }}
        >
          {deliverable && (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 6px',
                  backgroundColor: '#0D1117',
                  border: '1px solid #1E2A3B',
                  borderRadius: '4px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#7EB8F7',
                  flexShrink: 0,
                  marginRight: '8px',
                }}
              >
                {deliverable.id.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#E8EDF4',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                }}
              >
                {deliverable.name}
              </span>
            </>
          )}

          <button
            onClick={onClose}
            aria-label="Close preview"
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
              flexShrink: 0,
              marginLeft: '8px',
              transition: 'background-color 100ms ease, color 100ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2A3750';
              e.currentTarget.style.color = '#8B99B3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#4E5C72';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab bar — 40px, only if multiple docs */}
        {showTabs && (
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              height: '40px',
              minHeight: '40px',
              backgroundColor: '#1C2333',
              borderBottom: '1px solid #1E2A3B',
              position: 'relative',
            }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => switchTab(tab.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 16px',
                    height: '100%',
                    border: 'none',
                    borderBottom: isActive ? '2px solid #4D8FE8' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: isActive ? '#E8EDF4' : '#8B99B3',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'color 150ms ease, background-color 150ms ease, border-color 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#2A3750';
                      e.currentTarget.style.color = '#E8EDF4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#8B99B3';
                    }
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: '20px 24px',
            overflowY: 'auto',
            opacity: fadeState === 'fading-out' ? 0 : 1,
            transition:
              fadeState === 'fading-out'
                ? 'opacity 80ms ease-in'
                : 'opacity 150ms ease-out',
          }}
        >
          {loading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100px',
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <AlertTriangle size={28} color="#F87171" />
              <span style={{ fontSize: '0.875rem', color: '#E8EDF4' }}>
                Failed to load file
              </span>
              <span style={{ fontSize: '0.75rem', color: '#8B99B3' }}>{error}</span>
              <button
                onClick={() => {
                  setError(null);
                  // Re-trigger fetch by toggling tab off and back on
                  const current = activeTab;
                  setActiveTab(null);
                  setTimeout(() => setActiveTab(current), 0);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                  padding: '6px 14px',
                  backgroundColor: '#232D3F',
                  border: '1px solid #2A3750',
                  borderRadius: '8px',
                  color: '#8B99B3',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2A3750';
                  e.currentTarget.style.borderColor = '#3D5070';
                  e.currentTarget.style.color = '#E8EDF4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#232D3F';
                  e.currentTarget.style.borderColor = '#2A3750';
                  e.currentTarget.style.color = '#8B99B3';
                }}
              >
                <RotateCcw size={14} />
                Retry
              </button>
            </div>
          )}

          {!loading && !error && content && <MarkdownPreview content={content} />}

          {!loading && !error && !content && deliverable && tabs.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '24px',
                textAlign: 'center',
                color: '#4E5C72',
              }}
            >
              <FileText size={28} />
              <span style={{ fontSize: '0.875rem', color: '#8B99B3' }}>
                No documents yet
              </span>
              <span style={{ fontSize: '0.75rem' }}>
                Create a spec or plan to see it here
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
