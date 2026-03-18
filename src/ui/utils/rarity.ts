import type { DeliverableComplexity, DeliverableStatus, DeliverableType, RarityTier } from '@shared/types';

/**
 * Maps a deliverable complexity tier to its rarity display tier.
 * Handles undefined input gracefully by returning 'common'.
 */
export function complexityToRarity(complexity?: DeliverableComplexity): RarityTier {
  switch (complexity) {
    case 'simple':   return 'common';
    case 'moderate': return 'uncommon';
    case 'complex':  return 'rare';
    case 'arch':     return 'mythic';
    case 'moonshot': return 'epic';
    default:         return 'common';
  }
}

/**
 * Maps a deliverable card type to its theme color hex value.
 * Handles undefined input gracefully by returning the feature color.
 * Values mirror the cardType.* tokens in the Chakra theme.
 */
export function cardTypeToColor(cardType?: DeliverableType): string {
  switch (cardType) {
    case 'feature':      return '#F59E0B';
    case 'bugfix':       return '#A78BFA';
    case 'refactor':     return '#E879A8';
    case 'research':     return '#34D399';
    case 'architecture': return '#60A5FA';
    default:             return '#F59E0B';
  }
}

/**
 * Shared status-to-accent color map.
 * Use this instead of defining local copies in each component.
 */
export const STATUS_ACCENT: Record<DeliverableStatus, string> = {
  idea:          '#A78BFA',
  spec:          '#60A5FA',
  plan:          '#34D399',
  'in-progress': '#F59E0B',
  review:        '#FB923C',
  complete:      '#22C55E',
  blocked:       '#F87171',
};

/**
 * Shared artifact pill styles with WCAG AA contrast.
 * Use this instead of defining local copies in each component.
 */
export const ARTIFACT_PILL_STYLES = {
  spec:   { bg: '#2563EB', color: '#EFF6FF' },
  plan:   { bg: '#059669', color: '#ECFDF5' },
  result: { bg: '#16A34A', color: '#F0FDF4' },
} as const;

/**
 * Human-readable labels for deliverable card types.
 */
export const TYPE_LABELS: Record<string, string> = {
  feature:      'Feature',
  bugfix:       'Bugfix',
  refactor:     'Refactor',
  research:     'Research',
  architecture: 'Architecture',
};
