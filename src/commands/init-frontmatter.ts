/**
 * mc init-frontmatter
 *
 * Patches SDLC templates with standardized YAML frontmatter for Mission Control.
 * Operates on the project at the given path — does not modify MC's own files.
 */

import fs from 'node:fs';
import path from 'node:path';

const SPEC_FRONTMATTER = `---
tier: full                 # full | lite
type: feature              # feature | bugfix | refactor | research | architecture
complexity: moderate       # simple | moderate | complex | arch | moonshot — initial estimate
effort: 3                  # 1-5 scale — initial estimate
flavor: ""                 # the vision — what this deliverable aspires to be
created: YYYY-MM-DD
author: CC                 # CD | CC
depends_on: []             # [D1, D5] or empty
agents: []                 # [software-architect, frontend-developer, etc.]
---`;

const PLAN_FRONTMATTER = `---
tier: full                 # full | lite
type: feature              # feature | bugfix | refactor | research | architecture
complexity: moderate       # RE-EVALUATE from spec — adjust if planning revealed more/less complexity
effort: 3                  # RE-EVALUATE from spec — adjust if scope grew or shrank during planning
flavor: ""                 # the approach — how this will be built
created: YYYY-MM-DD
author: CC                 # CD | CC
agents: []                 # [frontend-developer, backend-developer, etc.]
---`;

const RESULT_FRONTMATTER = `---
tier: full                 # full | lite
type: feature              # feature | bugfix | refactor | research | architecture
complexity: moderate       # FINAL — adjust from plan if implementation was harder/easier than expected
effort: 3                  # FINAL — the actual effort, not the estimate
flavor: ""                 # the outcome — what was achieved
created: YYYY-MM-DD
completed: YYYY-MM-DD
author: CC                 # CD | CC
---`;

const SDLC_LITE_PLAN_FRONTMATTER = `---
tier: lite                 # full | lite
type: feature              # feature | bugfix | refactor | research | architecture
complexity: moderate       # simple | moderate | complex | arch | moonshot
effort: 3                  # 1-5 scale
flavor: ""                 # the approach — how this will be built
created: YYYY-MM-DD
author: CC                 # CD | CC
agents: []                 # [frontend-developer, backend-developer, etc.]
---`;

const CLAUDE_MD_SECTION = `
### Artifact Frontmatter

All SDLC artifacts (spec, plan, result) use standardized YAML frontmatter. See \`ops/sdlc/templates/\` for the full schema.

**Complexity and effort must be re-evaluated at each stage:**
- **Spec** — initial estimate based on the problem statement
- **Plan** — re-evaluate after planning reveals actual scope. If the approach is harder or simpler than the spec assumed, adjust.
- **Result** — final values reflecting actual implementation. If it was easier or harder than planned, adjust.

Each artifact gets its own **flavor text** reflecting that stage: the spec captures the vision, the plan captures the approach, the result captures the outcome.
`;

// Inline bold metadata patterns that frontmatter replaces
const OBSOLETE_METADATA_RE = /^\*\*(Status|Created|Author|Depends On|Completed):\*\*.*\n/gm;

interface PatchResult {
  file: string;
  action: 'patched' | 'skipped' | 'not-found';
  reason?: string;
}

function hasFrontmatter(content: string): boolean {
  return content.startsWith('---\n') || content.startsWith('---\r\n');
}

function patchTemplate(
  filePath: string,
  frontmatter: string,
): PatchResult {
  const rel = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    return { file: rel, action: 'not-found' };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  if (hasFrontmatter(content)) {
    return { file: rel, action: 'skipped', reason: 'already has frontmatter' };
  }

  // Remove obsolete inline metadata that frontmatter replaces
  const cleaned = content.replace(OBSOLETE_METADATA_RE, '');

  const patched = frontmatter + '\n\n' + cleaned;
  fs.writeFileSync(filePath, patched, 'utf-8');

  return { file: rel, action: 'patched' };
}

function patchClaudeMd(projectPath: string): PatchResult {
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  if (!fs.existsSync(claudeMdPath)) {
    return { file: 'CLAUDE.md', action: 'not-found' };
  }

  const content = fs.readFileSync(claudeMdPath, 'utf-8');

  if (content.includes('### Artifact Frontmatter')) {
    return { file: 'CLAUDE.md', action: 'skipped', reason: 'section already exists' };
  }

  // Insert after "### File Naming" section (find the next ### or ## after it)
  const fileNamingIdx = content.indexOf('### File Naming');
  if (fileNamingIdx === -1) {
    // Fallback: append before "### When to Use" if it exists
    const whenToUseIdx = content.indexOf('### When to Use');
    if (whenToUseIdx === -1) {
      return { file: 'CLAUDE.md', action: 'skipped', reason: 'could not find insertion point (no "### File Naming" section)' };
    }
    const patched = content.slice(0, whenToUseIdx) + CLAUDE_MD_SECTION + '\n' + content.slice(whenToUseIdx);
    fs.writeFileSync(claudeMdPath, patched, 'utf-8');
    return { file: 'CLAUDE.md', action: 'patched' };
  }

  // Find the next heading after "### File Naming"
  const afterFileNaming = content.slice(fileNamingIdx + '### File Naming'.length);
  const nextHeadingMatch = afterFileNaming.match(/\n(#{2,3} )/);
  if (!nextHeadingMatch) {
    // Append at end
    const patched = content + '\n' + CLAUDE_MD_SECTION;
    fs.writeFileSync(claudeMdPath, patched, 'utf-8');
    return { file: 'CLAUDE.md', action: 'patched' };
  }

  const insertIdx = fileNamingIdx + '### File Naming'.length + (nextHeadingMatch.index ?? 0);
  const patched = content.slice(0, insertIdx) + '\n' + CLAUDE_MD_SECTION + content.slice(insertIdx);
  fs.writeFileSync(claudeMdPath, patched, 'utf-8');
  return { file: 'CLAUDE.md', action: 'patched' };
}

export async function runInitFrontmatter(projectDir: string): Promise<void> {
  const projectPath = path.resolve(projectDir);
  const templatesDir = path.join(projectPath, 'ops', 'sdlc', 'templates');

  console.log('Mission Control — Frontmatter Init');
  console.log('─'.repeat(40));
  console.log(`Project: ${projectPath}\n`);

  if (!fs.existsSync(templatesDir)) {
    console.error(
      `\x1b[31m[error]\x1b[0m No SDLC templates found at ${templatesDir}\n` +
      'This command patches existing SDLC templates with frontmatter.\n' +
      'Install the SDLC framework first, then run this command.'
    );
    process.exit(1);
  }

  const results: PatchResult[] = [];

  // Patch templates
  results.push(patchTemplate(
    path.join(templatesDir, 'spec_template.md'),
    SPEC_FRONTMATTER,
  ));
  results.push(patchTemplate(
    path.join(templatesDir, 'planning_template.md'),
    PLAN_FRONTMATTER,
  ));
  results.push(patchTemplate(
    path.join(templatesDir, 'result_template.md'),
    RESULT_FRONTMATTER,
  ));
  results.push(patchTemplate(
    path.join(templatesDir, 'sdlc_lite_plan_template.md'),
    SDLC_LITE_PLAN_FRONTMATTER,
  ));

  // Patch CLAUDE.md
  results.push(patchClaudeMd(projectPath));

  // Report
  for (const r of results) {
    const icon = r.action === 'patched' ? '\x1b[32m✓\x1b[0m'
      : r.action === 'skipped' ? '\x1b[33m⊘\x1b[0m'
      : '\x1b[31m✗\x1b[0m';
    const detail = r.reason ? ` (${r.reason})` : '';
    console.log(`  ${icon} ${r.file}${detail}`);
  }

  const patchedCount = results.filter(r => r.action === 'patched').length;
  console.log(`\n${patchedCount} file(s) patched.`);

  if (patchedCount > 0) {
    console.log('\nFrontmatter schema:');
    console.log('  Spec      → type, complexity (initial), effort (initial), flavor (vision), agents, depends_on');
    console.log('  Plan      → type, complexity (re-evaluated), effort (re-evaluated), flavor (approach), agents');
    console.log('  Result    → type, complexity (final), effort (final), flavor (outcome)');
    console.log('  Lite Plan → type, complexity, effort, flavor (approach), agents');
  }
}
