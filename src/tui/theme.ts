import chalk, { type ChalkInstance } from 'chalk';
import type { DeliverableComplexity, RarityTier, DeliverableStatus } from '../shared/types.js';

// Rarity color map — ChalkInstance functions keyed by rarity tier
export const RARITY_COLOR: Record<RarityTier, ChalkInstance> = {
  common: chalk.white,
  uncommon: chalk.green,
  rare: chalk.cyan.bold,
  epic: chalk.yellow.bold,
  // mythic: magenta (not yellow) — intentional departure from original spec.
  // Yellow was already used for epic; magenta provides distinct visual separation.
  mythic: chalk.magenta.bold,
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

// Zone glyphs — single-width geometric shapes for zone indicators
export const ZONE_GLYPH: Record<string, string> = {
  deck: '◇',
  playmat: '◆',
  graveyard: '✦',
};

// Rarity glyphs — keyed by RarityTier (call complexityToRarity() first to convert DeliverableComplexity)
// INVERSION NOTE: arch→mythic, moonshot→epic — getting this backwards silently renders wrong glyphs
export const RARITY_GLYPH: Record<RarityTier, string> = {
  common: '·',
  uncommon: '◆',
  rare: '✦',
  epic: '◈',
  mythic: '⬡',
};

// Review-stage orange — for chalk formatting (terminal strings).
// For Ink <Text color> props use "yellow" as the nearest ANSI approximation — hex doesn't work in Ink color props.
export const REVIEW_ORANGE = chalk.hex('#FB923C');

// Card-type unicode icons
export const TYPE_ICON: Record<string, string> = {
  feature: '\u2605',       // ★
  bugfix: '\u2692',        // ⚒
  refactor: '\u2B6F',      // ⫯
  research: '\u{1F50D}',   // 🔍
  architecture: '\u2302',  // ⌂
};

// Ink color names keyed by rarity tier — used in terminal (Ink) components
export const RARITY_INK_COLOR: Record<string, string> = {
  common: 'white',
  uncommon: 'green',
  rare: 'cyan',
  epic: 'yellow',
  mythic: 'magenta',
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
