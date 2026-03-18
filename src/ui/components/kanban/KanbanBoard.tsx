import { useMemo } from 'react';
import { KanbanColumn } from './KanbanColumn';
import type { Deliverable, DeliverableStatus, WsMessage } from '@shared/types';

interface KanbanBoardProps {
  deliverables: Deliverable[];
  loading: boolean;
  wsSend: (msg: WsMessage) => void;
}

interface ColumnDef {
  id: string;
  label: string;
  statuses: DeliverableStatus[];
  color: string;
}

const defaultColumns: ColumnDef[] = [
  { id: 'idea', label: 'Idea', statuses: ['idea'], color: '#A78BFA' },
  { id: 'spec', label: 'Spec', statuses: ['spec'], color: '#60A5FA' },
  { id: 'plan', label: 'Plan', statuses: ['plan'], color: '#34D399' },
  { id: 'inprogress', label: 'In Progress', statuses: ['in-progress'], color: '#F59E0B' },
  { id: 'review', label: 'Review', statuses: ['review'], color: '#FB923C' },
  { id: 'complete', label: 'Complete', statuses: ['complete'], color: '#22C55E' },
  { id: 'blocked', label: 'Blocked', statuses: ['blocked'], color: '#F87171' },
];

function SkeletonCard() {
  return (
    <div
      style={{
        height: '88px',
        backgroundColor: '#232D3F',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, #232D3F 0%, #2A3750 50%, #232D3F 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
        }}
      />
    </div>
  );
}

export function KanbanBoard({ deliverables, loading, wsSend }: KanbanBoardProps) {
  const columnData = useMemo(() => {
    return defaultColumns.map((col) => ({
      ...col,
      deliverables: deliverables.filter((d) =>
        col.statuses.includes(d.status)
      ),
    }));
  }, [deliverables]);

  return (
    <div
      style={{
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '16px 20px 24px 20px',
        display: 'flex',
        gap: '12px',
        minWidth: 0,
      }}
    >
      {loading
        ? defaultColumns.map((col) => (
            <div
              key={col.id}
              style={{
                width: '260px',
                minWidth: '260px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Skeleton column header */}
              <div
                style={{
                  height: '52px',
                  backgroundColor: `${col.color}14`,
                  borderTop: `2px solid ${col.color}99`,
                  borderRadius: '8px 8px 0 0',
                }}
              />
              <SkeletonCard />
              <SkeletonCard />
              {col.id === 'idea' && <SkeletonCard />}
            </div>
          ))
        : columnData.map((col) => (
            <KanbanColumn
              key={col.id}
              label={col.label}
              statuses={col.statuses}
              deliverables={col.deliverables}
              color={col.color}
              wsSend={wsSend}
            />
          ))}

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
