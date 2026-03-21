# Handoff: Frontmatter Is the Lifecycle Source of Truth

**Context:** The SDLC parser (`src/server/services/sdlcParser.ts`) derives deliverable status from YAML frontmatter (`status`, `completed`, etc.) — but several skills that transition deliverable state never update frontmatter. This causes the board to show stale/wrong status (e.g., a completed deliverable showing as "plan").

**Principle:** Every skill that changes a deliverable's lifecycle state MUST update the artifact's YAML frontmatter to reflect that transition. Frontmatter is the key to the lifecycle — not file location, not catalog text, not file suffixes.

## What Needs to Change

### 1. `sdlc-lite-execute` (`.claude/skills/sdlc-lite-execute/SKILL.md`)

In Step 4 (Verify, Commit, and Clean Up), before moving the plan file to `completed/`:
- Add a step to update the plan file's frontmatter with `status: complete` and `completed: {YYYY-MM-DD}`
- Renumber subsequent steps accordingly

### 2. `sdlc-execute` (`.claude/skills/sdlc-execute/SKILL.md`)

In Step 4 (Final Verify, Commit, and Mark Complete):
- Add a step to update the result doc's frontmatter with `status: complete` and `completed: {YYYY-MM-DD}`
- This should happen alongside the existing catalog (`_index.md`) update at step 8

### 3. `sdlc-archive` (`.claude/skills/sdlc-archive/SKILL.md`)

In Step 1 (Inventory) or Step 3 (Archive):
- Before archiving, verify that frontmatter has `status: complete` and `completed:` date
- If missing, backfill before moving files

### 4. General Audit

Review any other skills that transition deliverable state (`sdlc-plan`, `sdlc-resume`, etc.) and ensure they update frontmatter fields appropriate to their transition (e.g., `sdlc-plan` setting `status: plan` when producing a plan).

## Already Done

- D5, D6, D7, D8 frontmatter manually updated with `status: complete` and `completed:` dates this session
- Parser code (`sdlcParser.ts`) already handles frontmatter correctly — no code changes needed
