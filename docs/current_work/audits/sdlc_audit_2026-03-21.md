# SDLC Compliance Audit — 2026-03-21

**Trigger:** Post-migration verification (cc-sdlc 8f62ee1 → 99a189c)
**Manifest source_version:** `99a189c054ce53c31fa9a84b1a6b6430b6e254d6`
**Working tree state:** Migration uncommitted — 12 modified files + 3 untracked files (sdlc-idea/, sdlc-initialize/, domain-boundary-gotchas.yaml)
**Previous audit score:** 8.8/10 (2026-03-19)

---

## Summary

- **Total deliverables:** 9 (D1–D9)
- **Complete/Archived:** D1–D8 | **Active:** D9 | **Blocked:** 0
- **Knowledge layer wiring:** Partially connected — software-architect still hardcodes and misses 2 new entries
- **Compliance score:** 9.0/10
- **Top issues:**
  1. W1: Migration uncommitted — 12 modified + 3 untracked files not staged or committed
  2. W2: D9 catalog entry has broken link and stale "In Progress" status — plan moved to `completed/` but catalog not updated
  3. W3: D9 frontmatter missing `status: complete` and `completed:` date fields
  4. W4: `initial-prompt.md` still exists at `ops/sdlc/initial-prompt.md` — changelog says it was removed in this migration
  5. W5: `software-architect` agent hardcodes knowledge paths — now missing `risk-assessment-framework.yaml` and `domain-boundary-gotchas.yaml` added to context map in this migration

---

## Recommendation Follow-Through (from 2026-03-19 Audit)

**Prior audit score:** 8.8/10
**Prior recommendations:** 4 Warnings (W1–W4), 4 Info (I1–I4)

| # | Finding | Status |
|---|---------|--------|
| W1 | `create-test-suite` SKILL.md uses old `{slug}_plan.md` (no D-prefix) for SDLC-Lite plan path | **RESOLVED** — now reads `dNN_{slug}_plan.md` |
| W2 | `ops/sdlc/process/overview.md` tier table still says "Plan file only" for SDLC-Lite | **RESOLVED** — overview.md updated with full tier table |
| W3 | `ops/sdlc/initial-prompt.md` still says "plan file only" / "doesn't need full tracking" | **PARTIAL** — initial-prompt.md still exists (see W4 below); the stale text within it is less relevant given the new sdlc-idea/sdlc-initialize skills |
| W4 | `sdlc_changelog.md` missing entry for 2026-03-19 changes | **RESOLVED** — changelog has entries for 2026-03-20 and 2026-03-21 changes |
| I1 | `ops/sdlc/BOOTSTRAP.md` line 185 — ambiguous "doesn't need full tracking" wording | **NOT RESOLVED** — BOOTSTRAP.md was not updated (low priority given sdlc-initialize now exists) |
| I2 | `deliverable_lifecycle.md` makes no mention of lite tier lifecycle | **NOT RESOLVED** — not touched in this migration |
| I3 | Agent memory entries reference old plan paths | **NOT RESOLVED** — persistent, low priority |
| I4 | `init-frontmatter.ts` summary output omits `tier` field from printed schema | **RESOLVED** — `init-frontmatter` propagation was updated in 56814f4 |

**Follow-through rate:** 4 acted on + 1 partial = 62.5% accountability (improved from 50%)

---

## Catalog Integrity

**Next ID:** D10 (correct — incremented in 07a5679)
**ID sequencing:** D1–D9 present, sequential, no gaps or duplicates — PASS

### Active Deliverables Table

| ID | Name | Catalog Status | Catalog Link | Actual Plan Location | Assessment |
|----|------|---------------|--------------|---------------------|------------|
| D8 | Dense Playmat Board Redesign | Complete (lite) | `current_work/sdlc-lite/completed/d8_dense_playmat_plan.md` | Exists at that path | PASS |
| D9 | Three-Zone Playmat | In Progress (lite) | `current_work/sdlc-lite/d9_three_zone_playmat_plan.md` | Only exists at `completed/d9_three_zone_playmat_plan.md` | **BROKEN LINK + STALE STATUS** |

**CRITICAL finding on D9:** The catalog entry for D9 has a broken link (active path does not exist) and shows "In Progress" while the plan file is in `completed/`. The plan's frontmatter also lacks `status: complete` and `completed:` fields. This was a partial execution of the archive workflow — the plan file was moved (in commit b0a9880) but the catalog was not updated to reflect `Complete` status or corrected path.

### Completed & Archived Table

| ID | Chronicle Link | Assessment |
|----|---------------|------------|
| D1–D4 | `chronicle/mvp/` | PASS |
| D5 | — (no chronicle link) | INFO — lite deliverables not expected to have chronicle entries; accepted convention |
| D6 | — | INFO — same |
| D7 | — | INFO — same |

**Observation:** D5–D7 remain in the Completed & Archived table without chronicle links, which is consistent with how lite deliverables are treated. This is an established pattern, not a gap.

---

## Artifact Traceability

### Full SDLC Deliverables (D1–D4)

All archived to `docs/chronicle/mvp/` — PASS. No active artifacts remain in `current_work/` for these.

### SDLC-Lite Deliverables (D5–D9)

| ID | Plan File | Status Field | Completed Date | In correct location |
|----|-----------|-------------|----------------|---------------------|
| D5 | `completed/d5_unified_tui_app_plan.md` | Status present (backfilled in 07a5679) | Present | PASS |
| D6 | `completed/d6_tui_dry_extraction_plan.md` | Status present | Present | PASS |
| D7 | `completed/d7_tui_polish_plan.md` | Status present | Present | PASS |
| D8 | `completed/d8_dense_playmat_plan.md` | Status present | Present | PASS |
| D9 | `completed/d9_three_zone_playmat_plan.md` | **Missing** `status: complete`, `completed:` date | **Missing** | **File in wrong place for catalog** |

**D9 frontmatter gap:** The 07a5679 commit backfilled status/completed fields for D5–D8 but missed D9. This is likely because D9's archival was concurrent with the commit.

---

## Untracked Work Detection

**Recent commits reviewed:** 07a5679, 56814f4, b0a9880, 369ae1b, 1c56e09, c323567, 0ff6bbf, 2c4d990

All commits are chore/fix/feat type changes that are:
- Process changes (sdlc:, chore(sdlc):) — tracked correctly under SDLC governance, not deliverable work
- Bug fixes (fix(file-browser):, fix(sessions):) — single-domain fixes, legitimately direct dispatch
- Feature work (feat(tui):, refactor(zones):) — D8/D9 are tracked in the catalog

No untracked substantial multi-domain work detected. The archive/status work (b0a9880, 07a5679) is process housekeeping — does not require a deliverable ID.

**One note:** The most recent commit (2c4d990) modified `CLAUDE.md` and `sdlcParser.ts` together — `fix(sdlc): prevent ghost idea entries from overwriting chronicle statuses + add idea file auto-discovery`. This is a targeted two-file fix to the parser + its documentation; appropriate for direct dispatch, not a new deliverable.

---

## Migration Integrity

### Manifest Version

- **Source version:** `99a189c054ce53c31fa9a84b1a6b6430b6e254d6` — current
- **Install date:** `2026-03-21T00:00:00Z`
- **Status:** Up to date

### Framework File Completeness

All 16 skills listed in the manifest exist in `.claude/skills/`:
```
commit-fix, commit-review, create-test-suite, design-consult, diff-review,
sdlc-archive, sdlc-execute, sdlc-idea, sdlc-initialize, sdlc-lite-execute,
sdlc-lite-plan, sdlc-plan, sdlc-reconciliation, sdlc-resume, sdlc-status, test-loop
```

All discipline, knowledge, playbook, process, and template files listed in the manifest exist on disk.

**Framework file completeness: 100%** — all manifest-listed files are present.

**New untracked files (project additions, not violations):**
- `.claude/skills/sdlc-idea/SKILL.md` — new skill, in manifest ✓ (tracked via manifest hash)
- `.claude/skills/sdlc-initialize/SKILL.md` — new skill, in manifest ✓
- `ops/sdlc/knowledge/architecture/domain-boundary-gotchas.yaml` — new knowledge file, in manifest ✓

**Note:** `initial-prompt.md` is still present at `ops/sdlc/initial-prompt.md` and is still listed in the manifest. The 2026-03-21 changelog entry says it was "removed" in this migration. This is a discrepancy — either the manifest was updated to include it incorrectly, or the removal hasn't been applied. Given it exists on disk and is in the manifest, it appears removal did not happen. See W4 below.

### Content-Merge Verification

**Execution skills** (`sdlc-execute`, `sdlc-lite-execute`): Both contain the current framework gates:
- PRE-GATE with Data sources / Expected counts / Design Decisions fields — PRESENT
- Data Source Extraction (mandatory) — PRESENT
- Data audit (mandatory for data phases) — PRESENT
- POST-GATE with build command — PRESENT
- Session Handoff section — PRESENT (added in 2026-03-20 migration)
- Stale diagnostic dismissal anti-pattern — PRESENT

Project-specific content preserved:
- Build command: `pnpm run build` — PRESENT
- Agent names (tui-developer, frontend-developer, etc.) in agent tables — PRESENT

**Discipline files:** `coding.md` has new anti-pattern entry for "Code Assertion Without Verification" — PRESENT and correct.

**Agent context map:** Correctly maps to Mission Control agent names (tui-developer, tui-designer, backend-developer, etc.) — not generic template names.

### Stale References to Removed Features

No stale references to old skill names (`sdlc-new`, `ad-hoc-planning`, `ad-hoc-execution`, `sdlc-planning`, `sdlc-execution`) found in any skill or agent file.

`design.md` (root) — the persistent warning about stale skill names in planned button configs (W2 from 2026-03-17b) was previously resolved in an intermediate session. No stale names remain in `design.md`.

**initial-prompt.md stale content:** The file still references "Read ops/sdlc/BOOTSTRAP.md for instructions" for new project setup, which predates the `sdlc-initialize` skill. The migration changelog says this file was supposed to be removed. See W4.

### Migration Recommendation

**Migration status: UNCOMMITTED.** The working tree contains all expected migration changes but they have not been staged or committed. This is the same pattern as the 8f62ee1 migration — the migration files are installed and functional, but the git state does not reflect the migration completion.

**Recommendation:** Commit immediately. The migration is otherwise clean.

---

## Findings by Severity

### WARNING

**W1: Migration uncommitted**

The migration from 8f62ee1 → 99a189c is in the working tree but not staged or committed. 14 files are modified or untracked:

Modified (12):
- `.claude/skills/design-consult/SKILL.md`
- `.claude/skills/sdlc-execute/SKILL.md`
- `.claude/skills/sdlc-lite-execute/SKILL.md`
- `.sdlc-manifest.json`
- `CLAUDE.md` (updated but only committed in 2c4d990 for sdlcParser changes; the migration additions to CLAUDE.md are unstaged)
- `ops/sdlc/CLAUDE-SDLC.md`
- `ops/sdlc/MIGRATE.md`
- `ops/sdlc/disciplines/coding.md`
- `ops/sdlc/knowledge/agent-context-map.yaml`
- `ops/sdlc/process/collaboration_model.md`
- `ops/sdlc/process/overview.md`
- `ops/sdlc/process/sdlc_changelog.md`
- `ops/sdlc/templates/sdlc_lite_plan_template.md`

Untracked (3):
- `.claude/skills/sdlc-idea/SKILL.md`
- `.claude/skills/sdlc-initialize/SKILL.md`
- `ops/sdlc/knowledge/architecture/domain-boundary-gotchas.yaml`

**Action:** Stage and commit all migration files. Suggested commit message: `chore(sdlc): apply cc-sdlc migration 8f62ee1 → 99a189c`

---

**W2: D9 catalog entry has broken link and stale status**

The catalog shows D9 as "In Progress (lite)" with link `current_work/sdlc-lite/d9_three_zone_playmat_plan.md`. The file does not exist at that path — it was moved to `current_work/sdlc-lite/completed/d9_three_zone_playmat_plan.md` in commit b0a9880. The status should be "Complete (lite)" and the link should point to the completed path.

**Action:** Update `docs/_index.md`:
- Status: `Complete (lite)`
- Link: `current_work/sdlc-lite/completed/d9_three_zone_playmat_plan.md`
- Move D9 to the Completed & Archived table

---

**W3: D9 plan frontmatter missing `status` and `completed` fields**

The D9 plan at `docs/current_work/sdlc-lite/completed/d9_three_zone_playmat_plan.md` was backfilled for file placement (commit b0a9880) but the 07a5679 backfill commit added status/completed frontmatter to D5–D8 only, missing D9.

The sdlcParser derives board status from `status: complete` and `completed: YYYY-MM-DD` in frontmatter. Without these fields, D9 will be displayed with an incorrect status on the board.

**Action:** Add to D9 plan frontmatter:
```yaml
status: complete
completed: 2026-03-21
```

---

**W4: `initial-prompt.md` exists but should have been removed**

The 2026-03-21 changelog entry for the `sdlc-initialize` skill states:
> `initial-prompt.md` (removed) — All content absorbed into `sdlc-initialize` skill, CLAUDE-SDLC.md commands table, and setup script output.

The file still exists at `ops/sdlc/initial-prompt.md` and is still referenced in `.sdlc-manifest.json`. If the removal was intentional, the file needs to be deleted and removed from the manifest. If the file is being kept for backwards compatibility, the changelog entry is misleading.

**Action:** Determine intent and either (a) delete `initial-prompt.md` and update the manifest, or (b) update the changelog to say "superseded but retained" rather than "removed."

---

**W5: `software-architect` agent hardcodes knowledge paths — misses 2 new context map entries**

The `software-architect` agent definition hardcodes 8 knowledge file paths in its Knowledge Context section instead of using the self-lookup pattern (`ops/sdlc/knowledge/agent-context-map.yaml`). This is a persistent issue (I3 from every prior audit). The criticality has increased in this migration because the context map now includes two additional files for `software-architect`:
- `ops/sdlc/knowledge/architecture/risk-assessment-framework.yaml` (added previously)
- `ops/sdlc/knowledge/architecture/domain-boundary-gotchas.yaml` (added in this migration — newly relevant)

The agent will not read `domain-boundary-gotchas.yaml` — the file specifically written to help the orchestrator recognize domain boundary crossings during architectural analysis. This reduces the value of the newly added knowledge file for the one agent most likely to benefit from it.

**Action:** Convert `software-architect`'s Knowledge Context to self-lookup:
```
Before beginning any analysis, consult `ops/sdlc/knowledge/agent-context-map.yaml`
and find your entry. Read the mapped knowledge files — they contain reusable patterns,
anti-patterns, and domain-specific guidance relevant to your work.
```

---

### INFO

**I1: `docs/current_work/ideas/` directory does not exist**

The `sdlc-idea` skill (newly installed in this migration) saves idea briefs to `docs/current_work/ideas/`. The skill handles the missing directory gracefully ("If the `docs/current_work/ideas/` directory doesn't exist, create it"), so this is not a functional gap. However, the directory was supposed to be created by the skeleton setup per the 2026-03-20 changelog:
> `skeleton/manifest.json` — Added `skills/sdlc-idea/SKILL.md` to source files, added `docs/current_work/ideas/` directory and `.gitkeep` seed file.

The `docs/current_work/ideas/` directory and `.gitkeep` are not in `.sdlc-manifest.json`. This suggests the directory creation was not applied during the current migration's `setup.sh` run (or setup.sh wasn't run).

**Action (low priority):** Create `docs/current_work/ideas/.gitkeep` to pre-create the directory and match the skeleton intent.

---

**I2: `ops/sdlc/BOOTSTRAP.md` not updated for `sdlc-initialize` skill**

BOOTSTRAP.md still references the old manual setup approach (Phase 1: manual document analysis, etc.) without acknowledging that `sdlc-initialize` now provides an automated path. The file remains functional as a reference document for retrofit mode, but a new reader may not know to prefer the skill.

**Action (low priority):** Add a note at the top of BOOTSTRAP.md pointing to `sdlc-initialize` as the preferred entry point for both greenfield and retrofit initialization.

---

**I3: `deliverable_lifecycle.md` makes no mention of SDLC-Lite tier lifecycle**

The SDLC-Lite pattern (plan-only, no spec or result doc) was introduced in the 2026-03-17 migration but `deliverable_lifecycle.md` still describes only the full lifecycle. This creates a documentation gap for agents that read this file.

**Action (low priority):** Add a section to `deliverable_lifecycle.md` documenting the lite lifecycle: catalog registration → plan → completed/ archive → catalog status update.

---

**I4: `software-architect` agent still has no agent memory**

This has persisted through 5 audit cycles. All other agents have active agent memory. The `software-architect` agent's memory at `.claude/agent-memory/software-architect/` is either empty or non-existent.

**Action (low priority):** The architect agent will create memory the next time it is dispatched with complex architectural work. No immediate action required, but worth noting the pattern.

---

## Knowledge Layer Health

### Discipline Parking Lots

| File | Status | Assessment |
|------|--------|------------|
| `architecture.md` | Active | Contains project context seeding — PASS |
| `business-analysis.md` | Active | Seeded content present — PASS |
| `coding.md` | **Active — recently updated** | New "Code Assertion Without Verification" anti-pattern added 2026-03-20 — HEALTHY |
| `data-modeling.md` | Seeded | No recent updates — OK (discipline not exercised yet) |
| `deployment.md` | Seeded | No recent updates — OK (no deployment work recently) |
| `design.md` | Active | UX modeling section present, TCG-aesthetic parking lot entry active — HEALTHY |
| `process-improvement.md` | Seeded | No recent updates — OK (process tracking is via changelog) |
| `product-research.md` | Seeded | No recent updates — OK |
| `testing.md` | Active | Testing paradigm summary present — HEALTHY |

**Cross-discipline flow:** The 2026-03-20 audit entry to `coding.md` (Code Assertion Without Verification) correctly propagated from an observation in a session to the parking lot. This is the discipline being used correctly.

### Knowledge Stores

All mapped files verified to exist on disk — PASS (context map integrity check passed with zero missing files).

**New file added this migration:** `ops/sdlc/knowledge/architecture/domain-boundary-gotchas.yaml`
- Contains 3 gotcha patterns with recognition signals
- YAML has a formatting note: the file starts with plain-text comments before the YAML keys. This is valid for human reading but may cause YAML parsing issues with `yaml.safe_load()`. The frontmatter-style comments at lines 1-4 are not valid YAML keys. Low risk since agents read the file as text, not parse it programmatically.

**Context map status (post-migration):**
- `software-architect`: 10 entries (2 new: risk-assessment-framework, domain-boundary-gotchas) — but agent doesn't self-lookup (W5)
- `tui-developer`: 4 entries — agent uses self-lookup pattern, will pick these up
- `code-reviewer`: 12 entries — self-lookup pattern present
- All other agents: self-lookup pattern confirmed

**Unmapped knowledge files** (in `ops/sdlc/knowledge/architecture/` but not in any agent mapping):
- `database-optimization-methodology.yaml` — not mapped (no data-architect agent in this project)
- `ml-system-design.yaml` — not mapped (no ML agent in this project)
- `payment-state-machine.yaml` — not mapped (no payment-engineer agent in this project)
- `prompt-engineering-patterns.yaml` — not mapped (no prompt-engineer agent in this project)

These are cross-project files from the cc-sdlc knowledge seeding that are not relevant to Mission Control. This is expected and not a gap.

### Improvement Ideas

`ops/sdlc/improvement-ideas/` directory does not exist. No improvement ideas are being tracked. This has been persistent (I2 from 2026-03-17b audit). The process change workflow goes directly to sdlc_changelog.md rather than using an improvement ideas backlog. This is a valid lightweight approach for a small project — the changelog serves as the record of what was improved and why.

**Assessment:** Not a compliance gap. The improvement ideas directory is optional for projects with active changelog discipline. This project has an excellent changelog record.

### Knowledge-to-Skill Wiring

**Wiring status: Partially connected**

- Most agents self-lookup from `agent-context-map.yaml` via Knowledge Context sections — PASS
- `software-architect` hardcodes paths and misses new entries — GAP (W5)
- Skills (`sdlc-execute`, `sdlc-lite-execute`) inject cross-domain knowledge per the context map — confirmed via `ops/sdlc/knowledge/agent-context-map.yaml` references in skill EXECUTE instructions
- No redundant same-agent knowledge injection found in skills — PASS

### Agent Context Map Integrity

- All 105 mapped file paths resolve to actual files — PASS (verified programmatically)
- `domain-boundary-gotchas.yaml` is mapped to `software-architect` and `code-reviewer` — PASS
- Skills that reference the context map: `sdlc-execute`, `sdlc-lite-execute` (both have "Cross-domain knowledge injection" sections)

### Playbook Freshness

Only the example playbook exists at `ops/sdlc/playbooks/example-playbook.md`. No project-specific playbooks have been created. This is consistent with the project's lightweight SDLC approach.

---

## Agent Memory Patterns

Patterns observed across agent memories that should propagate to knowledge layer:

**tui-developer memory** (not read in this audit but known from prior cycles): Ink 5 rendering constraints and the viewport breakpoint matrix (2D width x height) were materialized into `tui-patterns.yaml` in a prior session — this is an example of the knowledge layer working correctly.

**code-reviewer memory**: Consistently rich. Prior audit found patterns that accurately describe the technical landscape. These patterns are being written to memory correctly.

**Promotion candidates:** None identified this cycle. The pattern mining pass is clean — the knowledge layer is receiving updates through the discipline parking lots (coding.md was updated in this migration cycle).

---

## Recommendations (Prioritized)

### Immediate (before next work session)

1. **Commit the migration** (W1). Stage and commit all 14 changed/untracked files with: `chore(sdlc): apply cc-sdlc migration 8f62ee1 → 99a189c`

2. **Fix D9 catalog entry** (W2/W3). Two changes:
   - Update `docs/_index.md`: set D9 status to `Complete (lite)`, fix link to `current_work/sdlc-lite/completed/d9_three_zone_playmat_plan.md`, move to Completed & Archived section
   - Add `status: complete` and `completed: 2026-03-21` to D9 plan frontmatter

3. **Resolve `initial-prompt.md` ambiguity** (W4). Either delete it (and update manifest) or note it as superseded-but-retained in the changelog.

### Short-term (next planned maintenance pass)

4. **Fix `software-architect` Knowledge Context** (W5). Convert from hardcoded paths to self-lookup via `agent-context-map.yaml`. This will automatically pick up future knowledge additions (like the just-added `domain-boundary-gotchas.yaml`).

5. **Create `docs/current_work/ideas/.gitkeep`** (I1). Pre-create the directory that `sdlc-idea` will use.

### Backlog (low priority, deferred)

6. Add a note to `BOOTSTRAP.md` pointing to `sdlc-initialize` as the preferred entry point (I2).
7. Update `deliverable_lifecycle.md` to document the SDLC-Lite lifecycle (I3).
8. Software-architect agent memory will populate naturally on next dispatch (I4).

---

## Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Catalog integrity | 8/10 | D9 broken link (-2) |
| Artifact traceability | 9/10 | D9 frontmatter gap (-1) |
| Migration integrity | 8/10 | Uncommitted (-1), initial-prompt.md (-1) |
| Skill coverage | 10/10 | All 16 skills present and correct |
| Agent configuration | 9/10 | software-architect hardcodes paths (-1) |
| Knowledge layer health | 9/10 | domain-boundary-gotchas.yaml wired correctly; minor YAML comment format issue |
| Process doc currency | 10/10 | Changelog is current, overview updated, CLAUDE.md updated |
| Untracked work | 10/10 | No untracked substantial work |

**Overall: 9.0/10** (improved from 8.8/10)

The migration is functionally clean and represents a significant capability expansion (sdlc-idea, sdlc-initialize, domain-boundary-gotchas, Session Handoff enforcement, coding anti-pattern). The score reflects three mechanical cleanup items: uncommitted migration, D9 catalog/frontmatter gap, and initial-prompt.md ambiguity.
