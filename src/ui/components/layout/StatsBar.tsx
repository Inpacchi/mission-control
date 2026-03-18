import type { SdlcStats } from '@shared/types';

interface StatsBarProps {
  stats: SdlcStats | null;
  loading: boolean;
}

interface StatItemProps {
  value: number;
  label: string;
  color: string;
  loading: boolean;
}

function StatItem({ value, label, color, loading }: StatItemProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <span
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          lineHeight: 1.3,
          letterSpacing: '-0.02em',
          color,
          filter: loading ? 'blur(2px)' : 'none',
          opacity: loading ? 0.5 : 1,
          transition: 'filter 200ms ease, opacity 200ms ease',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: '0.6875rem',
          fontWeight: 400,
          lineHeight: 1.4,
          letterSpacing: '0.06em',
          color: '#4E5C72',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: '1px',
        height: '28px',
        backgroundColor: '#1E2A3B',
        alignSelf: 'center',
      }}
    />
  );
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  const total = stats?.total ?? 0;
  const inProgress = stats?.byStatus?.['in-progress'] ?? 0;
  const blocked = stats?.byStatus?.blocked ?? 0;
  const complete = stats?.byStatus?.complete ?? 0;
  const untracked = stats?.untracked ?? 0;

  return (
    <div
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        height: '100%',
      }}
    >
      <StatItem value={total} label="Total" color="#E8EDF4" loading={loading} />
      <Divider />
      <StatItem value={inProgress} label="In Progress" color="#F59E0B" loading={loading} />
      <Divider />
      <StatItem value={blocked} label="Blocked" color="#F87171" loading={loading} />
      <Divider />
      <StatItem value={complete} label="Complete" color="#22C55E" loading={loading} />
      <Divider />
      <StatItem value={untracked} label="Untracked" color="#A78BFA" loading={loading} />
    </div>
  );
}
