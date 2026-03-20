import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Deliverable } from '../../shared/types.js';
import { ZONE_GLYPH } from '../theme.js';

// ViewportMode — describes the Zellij/Ghostty pane layout the board occupies.
// Used to drive responsive rendering across HeaderBar and BoardApp.
export type ViewportMode =
  | 'too-narrow'       // < 28 cols — suppress header entirely
  | 'quarter-col'      // 28-49 cols, tall — 3-row header, single zone (or 2 stacked)
  | 'quarter-quadrant' // 28-49 cols, short — 3-row header, single zone
  | 'thirds-col'       // 50-79 cols, tall — 3-row header, single zone (or 2 stacked)
  | 'thirds-quadrant'  // 50-79 cols, short — 3-row header, single zone
  | 'half-col'         // 80-159 cols — 2-row header, Active + Review side by side
  | 'half-row'         // 160+ cols, short — 1-row header, 4 zones side by side
  | 'full';            // 160+ cols, tall — 2-row header, 4 zones side by side

interface HeaderBarProps {
  projectName: string;
  deliverables: Deliverable[];
  width: number;
  height: number;
  viewportMode: ViewportMode;
}

// Zone ordering matches the board column order
const ZONE_ORDER = ['deck', 'active', 'review', 'graveyard'] as const;
type ZoneKey = typeof ZONE_ORDER[number];

const ZONE_FULL_LABEL: Record<ZoneKey, string> = {
  deck: 'Deck',
  active: 'Active',
  review: 'Review',
  graveyard: 'Graveyard',
};

const ZONE_STATUS_MAP: Record<ZoneKey, Deliverable['status'][]> = {
  deck: ['idea'],
  active: ['spec', 'plan', 'in-progress', 'blocked'],
  review: ['review'],
  graveyard: ['complete'],
};

const ZONE_INK_COLOR: Record<ZoneKey, string> = {
  deck: 'gray',
  active: 'yellow',
  review: 'cyan', // matches ZoneStrip ZONE_COLOR and theme.ts ZONE_COLOR for review status
  graveyard: 'green',
};

/**
 * Returns the rendered height this header will occupy given the viewport mode.
 * BoardApp uses this to allocate remaining height to the zone columns.
 */
export function getHeaderHeight(viewportMode: ViewportMode, height: number): number {
  if (viewportMode === 'too-narrow') return 0;
  // Quarter and thirds panels: 3-row header (name, phase, zone counts)
  if (viewportMode === 'quarter-col' || viewportMode === 'quarter-quadrant' ||
      viewportMode === 'thirds-col' || viewportMode === 'thirds-quadrant') return 3;
  if (viewportMode === 'half-row') return 1;
  // half-col and full: 2 rows — but suppress entirely when height is very small
  if (height <= 16) return 0;
  return 2;
}

export function HeaderBar({
  projectName,
  deliverables,
  width,
  height,
  viewportMode,
}: HeaderBarProps): React.ReactElement | null {
  const headerHeight = getHeaderHeight(viewportMode, height);

  // Zone counts — memoized on deliverables
  const zoneCounts = useMemo(() => {
    const counts: Record<ZoneKey, number> = { deck: 0, active: 0, review: 0, graveyard: 0 };
    for (const d of deliverables) {
      for (const zone of ZONE_ORDER) {
        if ((ZONE_STATUS_MAP[zone] as string[]).includes(d.status)) {
          counts[zone]++;
          break;
        }
      }
    }
    return counts;
  }, [deliverables]);

  // Highest-priority active deliverable phase label
  const activePhaseLabel = useMemo(() => {
    const activeCards = deliverables.filter((d) =>
      (ZONE_STATUS_MAP.active as string[]).includes(d.status),
    );
    if (activeCards.length === 0) return 'no active work';
    // Priority order: in-progress > blocked > plan > spec
    const priority: Deliverable['status'][] = ['in-progress', 'blocked', 'plan', 'spec'];
    for (const s of priority) {
      const match = activeCards.find((d) => d.status === s);
      if (match) return match.phase ?? 'in progress';
    }
    return activeCards[0]!.phase ?? 'in progress';
  }, [deliverables]);

  // Render nothing when header is suppressed
  if (headerHeight === 0) return null;

  // --- 3-row mode: quarter and thirds panels ---
  // Row 1: project name (bold, truncated)
  // Row 2: active phase label + total count
  // Row 3: zone counts (compact glyph format)
  if (viewportMode === 'quarter-col' || viewportMode === 'quarter-quadrant' ||
      viewportMode === 'thirds-col' || viewportMode === 'thirds-quadrant') {
    const maxName = Math.max(0, width - 2);
    const truncNameQ = maxName <= 0
      ? ''
      : projectName.length > maxName
        ? projectName.slice(0, Math.max(0, maxName - 1)) + '…'
        : projectName;

    const nq = deliverables.length;
    const totalStrQ = `${nq} deliverable${nq === 1 ? '' : 's'}`;
    const phaseMaxQ = Math.max(4, width - totalStrQ.length - 2);
    const truncPhaseQ = activePhaseLabel.length > phaseMaxQ
      ? activePhaseLabel.slice(0, phaseMaxQ - 1) + '…'
      : activePhaseLabel;

    return (
      <Box flexDirection="column" width={width}>
        <Box width={width}>
          <Text bold>{truncNameQ}</Text>
        </Box>
        <Box width={width} justifyContent="space-between">
          <Text dimColor>{truncPhaseQ}</Text>
          <Text dimColor>{totalStrQ}</Text>
        </Box>
        <Box width={width} gap={1}>
          {ZONE_ORDER.map((zone) => (
            <Box key={zone}>
              <Text color={ZONE_INK_COLOR[zone]}>{ZONE_GLYPH[zone]}:</Text>
              <Text>{zoneCounts[zone]}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  // half-row: zone counts only — ◇:N  ◆:N  ◎:N  ✦:N
  if (viewportMode === 'half-row') {
    return (
      <Box width={width} gap={2}>
        {ZONE_ORDER.map((zone) => (
          <Box key={zone}>
            <Text color={ZONE_INK_COLOR[zone]}>{ZONE_GLYPH[zone]}:</Text>
            <Text>{zoneCounts[zone]}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  // --- 2-row mode (half-col / full) ---

  // Row 1: project name (bold, truncated) + zone counts right-aligned
  // Count string: "◇ Deck:N  ◆ Active:N  ◎ Review:N  ✦ Graveyard:N"
  const countParts = ZONE_ORDER.map((zone) => `${ZONE_GLYPH[zone]} ${ZONE_FULL_LABEL[zone]}:${zoneCounts[zone]}`);
  const countStr = countParts.join('  ');
  // 2 chars padding between name and counts.
  // The counts are rendered inside <Box gap={2}> with 4 children — Ink adds 3 × 2 = 6 gap chars
  // at layout time that are not reflected in countStr.length, so subtract 6 extra chars.
  const nameMaxWidth = Math.max(4, width - countStr.length - 2 - 6);
  const truncName = projectName.length > nameMaxWidth
    ? projectName.slice(0, nameMaxWidth - 1) + '…'
    : projectName;

  // Row 2: phase label of highest-priority active deliverable + total count right-aligned
  const n = deliverables.length;
  const totalStr = `${n} deliverable${n === 1 ? '' : 's'}`;
  const phaseMaxWidth = Math.max(4, width - totalStr.length - 2);
  const truncPhase = activePhaseLabel.length > phaseMaxWidth
    ? activePhaseLabel.slice(0, phaseMaxWidth - 1) + '…'
    : activePhaseLabel;

  return (
    <Box flexDirection="column" width={width}>
      {/* Row 1: project name + zone counts */}
      <Box width={width} justifyContent="space-between">
        <Text bold>{truncName}</Text>
        <Box gap={2}>
          {ZONE_ORDER.map((zone) => (
            <Box key={zone}>
              <Text color={ZONE_INK_COLOR[zone]}>{ZONE_GLYPH[zone]} {ZONE_FULL_LABEL[zone]}:</Text>
              <Text>{zoneCounts[zone]}</Text>
            </Box>
          ))}
        </Box>
      </Box>
      {/* Row 2: active phase label + total deliverable count */}
      <Box width={width} justifyContent="space-between">
        <Text dimColor>{truncPhase}</Text>
        <Text dimColor>{totalStr}</Text>
      </Box>
    </Box>
  );
}
