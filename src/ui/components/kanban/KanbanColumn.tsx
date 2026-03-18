import {
  Lightbulb,
  FileText,
  Map,
  Cog,
  Eye,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { DeliverableCard } from './DeliverableCard';
import type { Deliverable, DeliverableStatus, WsMessage } from '@shared/types';

interface KanbanColumnProps {
  label: string;
  statuses: DeliverableStatus[];
  deliverables: Deliverable[];
  color: string;
  wsSend: (msg: WsMessage) => void;
}

const emptyStateIcons: Record<string, React.ReactNode> = {
  Idea: <Lightbulb size={24} color="#4E5C72" />,
  Spec: <FileText size={24} color="#4E5C72" />,
  Plan: <Map size={24} color="#4E5C72" />,
  'In Progress': <Cog size={24} color="#4E5C72" />,
  Review: <Eye size={24} color="#4E5C72" />,
  Complete: <CheckCircle size={24} color="#4E5C72" />,
  Blocked: <AlertTriangle size={24} color="#4E5C72" />,
};

const emptyStateMessages: Record<string, string> = {
  Idea: 'No ideas yet',
  Spec: 'No specs',
  Plan: 'No plans',
  'In Progress': 'Nothing in progress',
  Review: 'Nothing to review',
  Complete: 'Nothing completed yet',
  Blocked: 'Nothing blocked',
};

const columnHeaderBgMap: Record<string, string> = {
  Idea: '#1E1A2E',
  Spec: '#0A1628',
  Plan: '#0A2B1E',
  'In Progress': '#2D1A04',
  Review: '#2D1602',
  Complete: '#052E16',
  Blocked: '#2D0A0A',
};

export function KanbanColumn({ label, deliverables, color, wsSend }: KanbanColumnProps) {
  const count = deliverables.length;

  return (
    <div
      style={{
        width: '260px',
        minWidth: '260px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Column header */}
      <div
        style={{
          height: '52px',
          minHeight: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          backgroundColor: columnHeaderBgMap[label] || `${color}14`,
          borderTop: `2px solid ${color}99`,
          borderBottom: '1px solid #1E2A3B',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <span
          style={{
            fontSize: '1.0625rem',
            fontWeight: 600,
            lineHeight: 1.4,
            letterSpacing: '-0.01em',
            color: color,
          }}
        >
          {label}
        </span>

        {/* Count badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '22px',
            height: '22px',
            padding: '0 6px',
            borderRadius: '9999px',
            backgroundColor: `${color}26`, // ~15% opacity
            color: color,
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      </div>

      {/* Card list */}
      <div
        className="kanban-column-body"
        role="list"
        aria-label={`${label} column, ${count} items`}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {deliverables.length === 0 ? (
          <div
            style={{
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {emptyStateIcons[label] || <Lightbulb size={24} color="#4E5C72" />}
            <span
              style={{
                fontSize: '0.75rem',
                color: '#4E5C72',
              }}
            >
              {emptyStateMessages[label] || 'Empty'}
            </span>
          </div>
        ) : (
          deliverables.map((d) => (
            <DeliverableCard
              key={d.id}
              deliverable={d}
              columnColor={color}
              wsSend={wsSend}
            />
          ))
        )}
      </div>
    </div>
  );
}
