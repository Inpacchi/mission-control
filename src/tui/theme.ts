import chalk, { type ChalkInstance } from 'chalk';
import type { DeliverableComplexity, RarityTier, DeliverableStatus } from '../shared/types.js';

// Rarity color map — ChalkInstance functions keyed by rarity tier
export const RARITY_COLOR: Record<RarityTier, ChalkInstance> = {
  common: chalk.white,
  uncommon: chalk.green,
  rare: chalk.cyan.bold,
  epic: chalk.yellow.bold,
  mythic: chalk.yellow.bold.underline,
};

// Zone/status color map
export const ZONE_COLOR: Record<DeliverableStatus, ChalkInstance> = {
  idea: chalk.dim,
  spec: chalk.blue,
  plan: chalk.magenta,
  'in-progress': chalk.yellow,
  review: chalk.cyan,
  complete: chalk.green.dim,
  blocked: chalk.red.bold,
};

// Card-type unicode icons
export const TYPE_ICON: Record<string, string> = {
  feature: '\u2605',       // ★
  bugfix: '\u2692',        // ⚒
  refactor: '\u2B6F',      // ⫯
  research: '\u{1F50D}',   // 🔍
  architecture: '\u2302',  // ⌂
};

/**
 * Map complexity to rarity tier.
 * Note: arch→mythic and moonshot→epic are intentionally counterintuitive per design spec.
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
