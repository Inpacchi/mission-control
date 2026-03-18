import path from 'node:path';
import chalk from 'chalk';
import { parseDeliverables } from '../../server/services/sdlcParser.js';
import { getUntrackedCommits } from '../../server/services/gitParser.js';
import { setupChalk, formatDeliverableId } from '../formatters.js';
import { ZONE_COLOR } from '../theme.js';
import type { DeliverableStatus } from '../../shared/types.js';

const ACTIVE_STATUSES: DeliverableStatus[] = ['spec', 'plan', 'in-progress', 'blocked'];

export async function runStatus(projectDir: string): Promise<void> {
  setupChalk();

  const projectPath = path.resolve(projectDir);
  const deliverables = await parseDeliverables(projectPath);
  const untracked = getUntrackedCommits(projectPath);

  const projectName = path.basename(projectPath);
  const deck = deliverables.filter((d) => d.status === 'idea').length;
  const active = deliverables.filter((d) => ACTIVE_STATUSES.includes(d.status)).length;
  const review = deliverables.filter((d) => d.status === 'review').length;
  const graveyard = deliverables.filter((d) => d.status === 'complete').length;

  // Header
  console.log(chalk.bold(`Mission Control`) + chalk.dim(` -- `) + chalk.bold(projectName));
  console.log(chalk.dim('─'.repeat(50)));

  // Zone counts
  const deckLabel = ZONE_COLOR['idea']('Deck:');
  const activeLabel = ZONE_COLOR['in-progress']('Active:');
  const reviewLabel = ZONE_COLOR['review']('Review:');
  const graveyardLabel = ZONE_COLOR['complete']('Graveyard:');
  console.log(
    `Deliverables: ${chalk.bold(String(deliverables.length))}  |  ` +
    `${deckLabel} ${deck}  ` +
    `${activeLabel} ${active}  ` +
    `${reviewLabel} ${review}  ` +
    `${graveyardLabel} ${graveyard}`
  );
  console.log(`Untracked commits (30d): ${chalk.yellow(String(untracked.length))}`);

  // Show active deliverables if any
  const activeDeliverables = deliverables.filter((d) => ACTIVE_STATUSES.includes(d.status));
  if (activeDeliverables.length > 0) {
    console.log('');
    console.log(chalk.bold('Active:'));
    for (const d of activeDeliverables) {
      const id = formatDeliverableId(d.id, d.complexity);
      const statusColor = ZONE_COLOR[d.status];
      const statusLabel = statusColor(`[${d.status}]`);
      console.log(`  ${id}  ${d.name}  ${statusLabel}`);
    }
  }

  // Show review deliverables if any
  const reviewDeliverables = deliverables.filter((d) => d.status === 'review');
  if (reviewDeliverables.length > 0) {
    console.log('');
    console.log(chalk.bold('In Review:'));
    for (const d of reviewDeliverables) {
      const id = formatDeliverableId(d.id, d.complexity);
      const statusColor = ZONE_COLOR[d.status];
      console.log(`  ${id}  ${d.name}  ${statusColor('[review]')}`);
    }
  }
}
