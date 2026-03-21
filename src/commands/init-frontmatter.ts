/**
 * mc init-frontmatter
 *
 * Patches SDLC templates, skills, and CLAUDE.md with standardized YAML
 * frontmatter for Mission Control. Idempotent — safe to re-run after upgrades.
 * Operates on the project at the given path — does not modify MC's own files.
 */

import fs from 'node:fs';
import path from 'node:path';

const SPEC_FRONTMATTER = `---
tier: full                 # full | lite
status: spec               # spec | plan | in-progress | review | complete | blocked
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
status: plan               # spec | plan | in-progress | review | complete | blocked
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
status: complete           # spec | plan | in-progress | review | complete | blocked
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
status: plan               # plan | in-progress | complete | blocked
type: feature              # feature | bugfix | refactor | research | architecture
complexity: moderate       # simple | moderate | complex | arch | moonshot
effort: 3                  # 1-5 scale
flavor: ""                 # the approach — how this will be built
created: YYYY-MM-DD
completed:                 # YYYY-MM-DD — set by sdlc-lite-execute on completion
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

// --- Types ---

interface PatchResult {
  file: string;
  action: 'patched' | 'upgraded' | 'skipped' | 'not-found';
  reason?: string;
}

// --- Template helpers ---

function hasFrontmatter(content: string): boolean {
  return content.startsWith('---\n') || content.startsWith('---\r\n');
}

/** Extract field names from a frontmatter string (between --- delimiters). */
function extractFrontmatterFields(frontmatter: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of frontmatter.split('\n')) {
    if (line === '---') continue;
    const match = line.match(/^(\w[\w_]*):\s*(.*)/);
    if (match) {
      fields.set(match[1], line);
    }
  }
  return fields;
}

/**
 * If frontmatter exists but is missing fields from the canonical template,
 * inject the missing fields after `tier:` (preserving existing values).
 * Returns the upgraded content or null if no upgrade needed.
 */
function upgradeFrontmatter(content: string, canonicalFrontmatter: string): string | null {
  const endIdx = content.indexOf('\n---', 3);
  if (endIdx === -1) return null;

  const existingBlock = content.slice(0, endIdx + 4);
  const existingFields = extractFrontmatterFields(existingBlock);
  const canonicalFields = extractFrontmatterFields(canonicalFrontmatter);

  // Find fields in canonical that are missing from existing
  const missing: { field: string; line: string }[] = [];
  for (const [field, line] of canonicalFields) {
    if (!existingFields.has(field)) {
      missing.push({ field, line });
    }
  }

  if (missing.length === 0) return null;

  // Insert missing fields after `tier:` line (or after opening --- if no tier)
  const lines = existingBlock.split('\n');
  const tierIdx = lines.findIndex((l) => l.startsWith('tier:'));
  const insertAfter = tierIdx !== -1 ? tierIdx : 0;

  const newLines = [
    ...lines.slice(0, insertAfter + 1),
    ...missing.map((m) => m.line),
    ...lines.slice(insertAfter + 1),
  ];

  return newLines.join('\n') + content.slice(endIdx + 4);
}

function patchTemplate(filePath: string, frontmatter: string): PatchResult {
  const rel = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    return { file: rel, action: 'not-found' };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  if (hasFrontmatter(content)) {
    // Try upgrading existing frontmatter with missing fields
    const upgraded = upgradeFrontmatter(content, frontmatter);
    if (upgraded) {
      fs.writeFileSync(filePath, upgraded, 'utf-8');
      const canonicalFields = extractFrontmatterFields(frontmatter);
      const existingFields = extractFrontmatterFields(
        content.slice(0, content.indexOf('\n---', 3) + 4),
      );
      const added = [...canonicalFields.keys()].filter((f) => !existingFields.has(f));
      return { file: rel, action: 'upgraded', reason: `added ${added.join(', ')}` };
    }
    return { file: rel, action: 'skipped', reason: 'up to date' };
  }

  // Remove obsolete inline metadata that frontmatter replaces
  const cleaned = content.replace(OBSOLETE_METADATA_RE, '');

  const patched = frontmatter + '\n\n' + cleaned;
  fs.writeFileSync(filePath, patched, 'utf-8');

  return { file: rel, action: 'patched' };
}

// --- CLAUDE.md patcher ---

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
      return {
        file: 'CLAUDE.md',
        action: 'skipped',
        reason: 'could not find insertion point (no "### File Naming" section)',
      };
    }
    const patched =
      content.slice(0, whenToUseIdx) + CLAUDE_MD_SECTION + '\n' + content.slice(whenToUseIdx);
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

  const insertIdx =
    fileNamingIdx + '### File Naming'.length + (nextHeadingMatch.index ?? 0);
  const patched =
    content.slice(0, insertIdx) + '\n' + CLAUDE_MD_SECTION + content.slice(insertIdx);
  fs.writeFileSync(claudeMdPath, patched, 'utf-8');
  return { file: 'CLAUDE.md', action: 'patched' };
}

// --- Skill patching ---

interface SkillPatch {
  /** Directory name under .claude/skills/ */
  skill: string;
  /** If this string is present, the patch was already applied */
  guard: string;
  /** Text to find in the skill file */
  search: string;
  /** Text to replace the search string with (superset that includes the original) */
  replace: string;
}

const SKILL_PATCHES: SkillPatch[] = [
  {
    skill: 'sdlc-lite-execute',
    guard: 'Update plan frontmatter',
    search: 'Move the plan file to `docs/current_work/sdlc-lite/completed/`',
    replace:
      "**Update plan frontmatter:** Set `status: complete` and `completed: {YYYY-MM-DD}` (today's date) in the plan file's YAML frontmatter. This is the lifecycle source of truth — the parser derives board status from these fields.\n" +
      'Move the plan file to `docs/current_work/sdlc-lite/completed/`',
  },
  {
    skill: 'sdlc-execute',
    guard: 'Update result doc frontmatter',
    search: 'Update `docs/_index.md`',
    replace:
      "**Update result doc frontmatter:** Set `status: complete` and `completed: {YYYY-MM-DD}` (today's date) in the result doc's YAML frontmatter. This is the lifecycle source of truth — the parser derives board status from these fields.\n" +
      'Update `docs/_index.md`',
  },
  {
    skill: 'sdlc-archive',
    guard: 'Verify frontmatter lifecycle fields',
    search: '**Create concept directory**',
    replace:
      '**Verify frontmatter lifecycle fields:** Check that all artifact files (spec, plan, result) have `status: complete` and `completed: {YYYY-MM-DD}` in their YAML frontmatter. If missing, backfill before archiving — the parser derives board status from these fields, so archives without them will show stale status if ever re-read.\n\n' +
      '**Create concept directory**',
  },
];

function patchSkill(projectPath: string, patch: SkillPatch): PatchResult {
  const skillPath = path.join(projectPath, '.claude', 'skills', patch.skill, 'SKILL.md');
  const rel = `.claude/skills/${patch.skill}/SKILL.md`;

  if (!fs.existsSync(skillPath)) {
    return { file: rel, action: 'not-found' };
  }

  const content = fs.readFileSync(skillPath, 'utf-8');

  if (content.includes(patch.guard)) {
    return { file: rel, action: 'skipped', reason: 'up to date' };
  }

  const searchIdx = content.indexOf(patch.search);
  if (searchIdx === -1) {
    return {
      file: rel,
      action: 'skipped',
      reason: `marker not found: "${patch.search.slice(0, 40)}..."`,
    };
  }

  const patched =
    content.slice(0, searchIdx) +
    patch.replace +
    content.slice(searchIdx + patch.search.length);
  fs.writeFileSync(skillPath, patched, 'utf-8');

  return { file: rel, action: 'upgraded', reason: 'added frontmatter lifecycle step' };
}

// --- Main ---

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
        'Install the SDLC framework first, then run this command.',
    );
    process.exit(1);
  }

  const results: PatchResult[] = [];

  // Patch templates
  results.push(patchTemplate(path.join(templatesDir, 'spec_template.md'), SPEC_FRONTMATTER));
  results.push(patchTemplate(path.join(templatesDir, 'planning_template.md'), PLAN_FRONTMATTER));
  results.push(patchTemplate(path.join(templatesDir, 'result_template.md'), RESULT_FRONTMATTER));
  results.push(
    patchTemplate(path.join(templatesDir, 'sdlc_lite_plan_template.md'), SDLC_LITE_PLAN_FRONTMATTER),
  );

  // Patch CLAUDE.md
  results.push(patchClaudeMd(projectPath));

  // Patch SDLC skills
  for (const patch of SKILL_PATCHES) {
    results.push(patchSkill(projectPath, patch));
  }

  // Report
  for (const r of results) {
    const icon =
      r.action === 'patched'
        ? '\x1b[32m✓\x1b[0m'
        : r.action === 'upgraded'
          ? '\x1b[36m↑\x1b[0m'
          : r.action === 'skipped'
            ? '\x1b[33m⊘\x1b[0m'
            : '\x1b[31m✗\x1b[0m';
    const detail = r.reason ? ` (${r.reason})` : '';
    console.log(`  ${icon} ${r.file}${detail}`);
  }

  const patchedCount = results.filter((r) => r.action === 'patched').length;
  const upgradedCount = results.filter((r) => r.action === 'upgraded').length;
  const totalChanged = patchedCount + upgradedCount;
  console.log(`\n${totalChanged} file(s) changed (${patchedCount} patched, ${upgradedCount} upgraded).`);

  if (totalChanged > 0) {
    console.log('\nFrontmatter schema:');
    console.log(
      '  Spec      → status, type, complexity (initial), effort (initial), flavor (vision), agents, depends_on',
    );
    console.log(
      '  Plan      → status, type, complexity (re-evaluated), effort (re-evaluated), flavor (approach), agents',
    );
    console.log(
      '  Result    → status, type, complexity (final), effort (final), flavor (outcome), completed',
    );
    console.log(
      '  Lite Plan → status, type, complexity, effort, flavor (approach), agents, completed',
    );
  }
}
