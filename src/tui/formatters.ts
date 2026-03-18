import chalk from 'chalk';
import type { DeliverableComplexity } from '../shared/types.js';
import { complexityToRarity, RARITY_COLOR } from './theme.js';

export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

export function setupChalk(): void {
  if (!isTTY()) {
    chalk.level = 0;
  }
}

export function formatEffort(effort?: number): string {
  if (!effort) return '';
  const filled = chalk.yellow.dim('*'.repeat(effort));
  const empty = chalk.dim('.'.repeat(5 - effort));
  return filled + empty;
}

export function formatDeliverableId(id: string, complexity?: DeliverableComplexity): string {
  const rarity = complexityToRarity(complexity);
  const colorFn = RARITY_COLOR[rarity];
  return colorFn(id);
}
