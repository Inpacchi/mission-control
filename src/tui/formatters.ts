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

export function formatDate(iso: string, includeTime = false): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  if (!includeTime) {
    return `${yyyy}-${mm}-${dd}`;
  }
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}
