import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SkillActions } from './SkillActions';
import { TimelineView } from './TimelineView';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { Deliverable, DeliverableStatus, WsMessage } from '@shared/types';

interface DeliverableCardProps {
  deliverable: Deliverable;
  columnColor: string;
  wsSend: (msg: WsMessage) => void;
}

const statusBadgeColors: Record<DeliverableStatus, { bg: string; text: string; border: string }> = {
  idea: { bg: '#1E1A2E', text: '#A78BFA', border: '#A78BFA40' },
  spec: { bg: '#0A1628', text: '#60A5FA', border: '#60A5FA40' },
  plan: { bg: '#0A2B1E', text: '#34D399', border: '#34D39940' },
  'in-progress': { bg: '#2D1A04', text: '#F59E0B', border: '#F59E0B40' },
  review: { bg: '#2D1602', text: '#FB923C', border: '#FB923C40' },
  complete: { bg: '#052E16', text: '#22C55E', border: '#22C55E40' },
  blocked: { bg: '#2D0A0A', text: '#F87171', border: '#F8717140' },
};

const statusLabels: Record<DeliverableStatus, string> = {
  idea: 'IDEA',
  spec: 'SPEC',
  plan: 'PLAN',
  'in-progress': 'IN PROGRESS',
  review: 'REVIEW',
  complete: 'COMPLETE',
  blocked: 'BLOCKED',
};

function formatTimestamp(isoDate: string): string {
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

export function DeliverableCard({ deliverable, columnColor, wsSend }: DeliverableCardProps) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { selectedCardId, setSelectedCard } = useDashboardStore();

  const isSelected = selectedCardId === deliverable.id;
  const badge = statusBadgeColors[deliverable.status];

  const handleCardClick = () => {
    setSelectedCard(isSelected ? null : deliverable.id);
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View ${deliverable.name}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: expanded ? 'auto' : '88px',
        minHeight: '88px',
        backgroundColor: hovered || isSelected ? '#2A3750' : '#232D3F',
        border: `1px solid ${isSelected ? '#2F74D0' : '#1E2A3B'}`,
        borderLeft: `3px solid ${columnColor}`,
        borderRadius: '8px',
        boxShadow: hovered || isSelected
          ? '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5)'
          : '0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)',
        padding: '12px',
        cursor: 'pointer',
        transition: 'background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Row 1: ID + Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '28px',
          minHeight: '28px',
        }}
      >
        {/* ID Badge */}
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
          }}
        >
          {deliverable.id.toUpperCase()}
        </span>

        {/* Name */}
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#E8EDF4',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
          }}
        >
          {deliverable.name}
        </span>

        {/* Skill action (hover) */}
        <SkillActions
          status={deliverable.status}
          deliverableId={deliverable.id}
          visible={hovered}
          wsSend={wsSend}
        />
      </div>

      {/* Row 2: Status badge + timestamp */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '8px',
          height: '20px',
          minHeight: '20px',
        }}
      >
        {/* Status badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            backgroundColor: badge.bg,
            color: badge.text,
            border: `1px solid ${badge.border}`,
            borderRadius: '9999px',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            lineHeight: 1.4,
          }}
        >
          {statusLabels[deliverable.status]}
        </span>

        <div style={{ flex: 1 }} />

        {/* Timestamp */}
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 400,
            lineHeight: 1.4,
            letterSpacing: '0.02em',
            color: '#4E5C72',
            whiteSpace: 'nowrap',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {formatTimestamp(deliverable.lastModified)}
        </span>

        {/* Expand chevron */}
        <button
          onClick={handleExpandToggle}
          aria-label={expanded ? 'Hide timeline' : 'Show timeline'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#4E5C72',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 150ms ease, transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#8B99B3';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#4E5C72';
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Expandable timeline */}
      <TimelineView deliverable={deliverable} expanded={expanded} />
    </div>
  );
}
