import { FileText, Map, CheckSquare, Clock } from 'lucide-react';
import type { Deliverable } from '@shared/types';

interface TimelineViewProps {
  deliverable: Deliverable;
  expanded: boolean;
}

interface TimelineEntry {
  label: string;
  icon: typeof FileText;
  color: string;
  filename: string;
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

function getTimelineEntries(deliverable: Deliverable): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  if (deliverable.specPath) {
    entries.push({
      label: 'Spec created',
      icon: FileText,
      color: '#60A5FA',
      filename: deliverable.specPath.split('/').pop() || '',
    });
  }

  if (deliverable.planPath) {
    entries.push({
      label: 'Plan created',
      icon: Map,
      color: '#34D399',
      filename: deliverable.planPath.split('/').pop() || '',
    });
  }

  if (deliverable.resultPath) {
    entries.push({
      label: 'Result created',
      icon: CheckSquare,
      color: '#22C55E',
      filename: deliverable.resultPath.split('/').pop() || '',
    });
  }

  if (deliverable.status === 'in-progress') {
    entries.push({
      label: 'Execution in progress',
      icon: Clock,
      color: '#F59E0B',
      filename: '',
    });
  }

  if (deliverable.status === 'complete') {
    entries.push({
      label: 'Completed',
      icon: CheckSquare,
      color: '#22C55E',
      filename: '',
    });
  }

  return entries;
}

export function TimelineView({ deliverable, expanded }: TimelineViewProps) {
  const entries = getTimelineEntries(deliverable);
  const hasEntries = entries.length > 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: expanded ? '1fr' : '0fr',
        transition: expanded
          ? 'grid-template-rows 250ms cubic-bezier(0, 0, 0.2, 1)'
          : 'grid-template-rows 200ms cubic-bezier(0.4, 0, 1, 1)',
      }}
    >
      <div style={{ overflow: 'hidden' }}>
        <div
          style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #1E2A3B',
          }}
        >
          {hasEntries ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                position: 'relative',
              }}
            >
              {/* Timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: '7px',
                  top: '10px',
                  bottom: '10px',
                  width: '1px',
                  backgroundColor: '#1E2A3B',
                }}
              />

              {entries.map((entry, i) => {
                const Icon = entry.icon;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '28px',
                      position: 'relative',
                    }}
                  >
                    {/* Dot */}
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        zIndex: 1,
                      }}
                    >
                      <Icon size={11} color={entry.color} />
                    </div>

                    {/* Label */}
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        color: entry.color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.label}
                    </span>

                    {/* Filename */}
                    {entry.filename && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          color: '#4E5C72',
                          fontFamily: "'JetBrains Mono', monospace",
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {entry.filename}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                color: '#4E5C72',
                fontSize: '0.6875rem',
              }}
            >
              No artifacts yet
            </div>
          )}

          {/* Last modified */}
          <div
            style={{
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              color: '#4E5C72',
              fontSize: '0.6875rem',
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: '4px',
            }}
          >
            Last modified: {formatDate(deliverable.lastModified)}
          </div>
        </div>
      </div>
    </div>
  );
}
