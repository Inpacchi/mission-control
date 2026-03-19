import path from 'node:path';
import fs from 'node:fs/promises';
import React from 'react';
import { getDeliverable } from '../../server/services/sdlcParser.js';
import { isTTY } from '../formatters.js';
import { renderMarkdownToAnsi } from '../renderMarkdown.js';
import { Pager } from '../Pager.js';
import { launchTuiScreen } from '../launchScreen.js';

export async function runView(id: string, projectDir: string, docType?: 'spec' | 'plan' | 'result'): Promise<void> {
  const projectPath = path.resolve(projectDir);
  const normalizedId = id.toUpperCase().startsWith('D') ? id.toUpperCase() : `D${id.toUpperCase()}`;

  const deliverable = await getDeliverable(projectPath, normalizedId);

  if (!deliverable) {
    console.error(`Error: Deliverable ${normalizedId} not found.`);
    process.exit(1);
  }

  // Idea-status: no documents yet
  if (!deliverable.specPath && !deliverable.planPath && !deliverable.resultPath) {
    console.log(`${deliverable.id} -- ${deliverable.name} (Idea): No documents available yet.`);
    process.exit(0);
  }

  // Pick file: explicit flag, or auto (resultPath > planPath > specPath)
  let filePath: string | undefined;
  if (docType === 'spec') {
    filePath = deliverable.specPath;
    if (!filePath) { console.error(`No spec found for ${deliverable.id}.`); process.exit(1); }
  } else if (docType === 'plan') {
    filePath = deliverable.planPath;
    if (!filePath) { console.error(`No plan found for ${deliverable.id}.`); process.exit(1); }
  } else if (docType === 'result') {
    filePath = deliverable.resultPath;
    if (!filePath) { console.error(`No result found for ${deliverable.id}.`); process.exit(1); }
  } else {
    filePath = deliverable.resultPath ?? deliverable.planPath ?? deliverable.specPath;
  }

  if (!filePath) {
    console.log(`${deliverable.id} -- ${deliverable.name} (Idea): No documents available yet.`);
    process.exit(0);
  }

  // PATH TRAVERSAL GUARD
  const resolvedFile = path.resolve(projectPath, filePath);
  const normalizedProject = projectPath.endsWith(path.sep) ? projectPath : projectPath + path.sep;
  if (!resolvedFile.startsWith(normalizedProject) && resolvedFile !== projectPath) {
    console.error(`Error: File path escapes project directory.`);
    process.exit(1);
  }

  let content: string;
  try {
    content = await fs.readFile(resolvedFile, 'utf-8');
  } catch {
    console.error(`Error: Could not read file at ${resolvedFile}`);
    process.exit(1);
  }

  if (!isTTY()) {
    // Piped output: raw markdown, no ANSI
    process.stdout.write(content);
    return;
  }

  // TTY output: launch full-screen pager
  const rendered = renderMarkdownToAnsi(content);
  const label = docType ? docType.charAt(0).toUpperCase() + docType.slice(1) : 'Document';
  const title = `${deliverable.id} — ${deliverable.name} (${label})`;

  // Enter alternate screen buffer
  await launchTuiScreen(
    React.createElement(Pager, { title, content: rendered, filePath: resolvedFile }),
  );
}
