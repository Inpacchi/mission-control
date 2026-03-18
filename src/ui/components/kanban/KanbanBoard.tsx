import { useMemo } from 'react';
import { Box, Flex, Skeleton } from '@chakra-ui/react';
import { KanbanColumn } from './KanbanColumn';
import { useConfig } from '../../hooks/useConfig';
import type { Deliverable, ColumnConfig, WsMessage } from '@shared/types';

interface KanbanBoardProps {
  deliverables: Deliverable[];
  loading: boolean;
  wsSend: (msg: WsMessage) => void;
}

/**
 * Maps a column's id or semantic color name to a hex color value.
 * Priority: column ID lookup in the known column palette, then color name lookup.
 */
const columnIdColors: Record<string, string> = {
  idea: '#A78BFA',
  spec: '#60A5FA',
  plan: '#34D399',
  'in-progress': '#F59E0B',
  inprogress: '#F59E0B',
  review: '#FB923C',
  complete: '#22C55E',
  blocked: '#F87171',
};

const colorNameMap: Record<string, string> = {
  gray: '#8B99B3',
  blue: '#60A5FA',
  purple: '#A78BFA',
  violet: '#A78BFA',
  orange: '#F59E0B',
  yellow: '#FB923C',
  green: '#22C55E',
  red: '#F87171',
  amber: '#F59E0B',
};

function resolveColumnColor(col: ColumnConfig): string {
  // Try by column id first
  if (columnIdColors[col.id]) return columnIdColors[col.id];
  // Try by color name
  if (colorNameMap[col.color]) return colorNameMap[col.color];
  // If the color is already a hex value, use it directly
  if (col.color.startsWith('#')) return col.color;
  // Fallback
  return '#8B99B3';
}

function SkeletonColumn({ color, extraCards }: { color: string; extraCards?: boolean }) {
  return (
    <Flex
      w="260px"
      minW="260px"
      direction="column"
      gap="2"
    >
      {/* Skeleton column header */}
      <Box
        h="52px"
        bg={`${color}14`}
        borderTop={`2px solid ${color}99`}
        borderTopLeftRadius="md"
        borderTopRightRadius="md"
      />
      <Skeleton h="88px" borderRadius="md" />
      <Skeleton h="88px" borderRadius="md" />
      {extraCards && <Skeleton h="88px" borderRadius="md" />}
    </Flex>
  );
}

/** Placeholder skeleton columns shown while config is loading */
const fallbackSkeletonColors = [
  '#A78BFA', '#60A5FA', '#34D399', '#F59E0B', '#FB923C', '#22C55E', '#F87171',
];

export function KanbanBoard({ deliverables, loading, wsSend }: KanbanBoardProps) {
  const { columns: configColumns, loading: configLoading } = useConfig();

  const columnData = useMemo(() => {
    return configColumns.map((col) => ({
      ...col,
      resolvedColor: resolveColumnColor(col),
      deliverables: deliverables.filter((d) =>
        col.statuses.includes(d.status)
      ),
    }));
  }, [configColumns, deliverables]);

  const showSkeleton = loading || configLoading;

  return (
    <Flex
      flex={1}
      overflowX="auto"
      overflowY="hidden"
      p="4 5 6 5"
      gap="3"
      minW={0}
    >
      {showSkeleton
        ? (configColumns.length > 0 ? configColumns : fallbackSkeletonColors.map((c, i) => ({
            id: String(i),
            color: c,
          }))).map((col, i) => {
            const color = 'resolvedColor' in col
              ? (col as (typeof columnData)[number]).resolvedColor
              : typeof col === 'object' && 'color' in col
                ? (col.color.startsWith('#') ? col.color : colorNameMap[col.color] || col.color)
                : fallbackSkeletonColors[i] || '#8B99B3';
            return (
              <SkeletonColumn
                key={'id' in col ? col.id : i}
                color={color}
                extraCards={i === 0}
              />
            );
          })
        : columnData.map((col) => (
            <KanbanColumn
              key={col.id}
              label={col.label}
              statuses={col.statuses}
              deliverables={col.deliverables}
              color={col.resolvedColor}
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
    </Flex>
  );
}
