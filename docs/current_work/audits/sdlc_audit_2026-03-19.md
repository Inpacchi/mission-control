# SDLC Compliance Audit — 2026-03-19

**Trigger:** Post-change consistency audit — YAML frontmatter standardization, SDLC-Lite D-number registration, skill + parser + template updates.

---

## Summary

- Total deliverables: 7 (D1–D7)
- Complete/Archived: 7 | Active: 0
- Knowledge layer wiring: connected
- Compliance score: **8.8/10**
- Top issues:
  1. WARNING: `create-test-suite` SKILL.md references old `{slug}_plan.md` pattern (no D-number prefix) for SDLC-Lite plans — inconsistent with the new `dNN_{slug}_plan.md` standard
  2. WARNING: `ops/sdlc/process/overview.md` tier table still says "Plan file only" for SDLC-Lite — contradicts the new model where SDLC-Lite gets a deliverable ID and catalog entry
  3. WARNING: `ops/sdlc/initial-prompt.md` still says SDLC-Lite is "plan file only" / "doesn't need full tracking" — same contradiction
  4. INFO: `ops/sdlc/BOOTSTRAP.md` carries same outdated wording
  5. INFO: Agent memories reference old plan paths (`unified_tui_app_plan.md`, `tui-dry-extraction_plan.md`) — historical records, paths no longer resolve
  6. INFO: `software-architect/decisions.md` hardcodes old plan path in handoff note
  7. INFO: `deliverable_lifecycle.md` makes no mention of the lite tier or its simplified lifecycle

---

## Change Scope Verified

The following were audited for consistency with the described changes:

| Area | Files Checked | Verdict |
|------|--------------|---------|
| Catalog (`docs/_index.md`) | 1 file | PASS |
| Templates (4 files) | spec, plan, result, sdlc-lite plan | PASS |
| Skills (sdlc-lite-plan, sdlc-lite-execute, sdlc-plan) | 3 files | PASS (with one issue in create-test-suite) |
| Parser (`sdlcParser.ts`) | 1 file | PASS |
| Types (`shared/types.ts`) | 1 file | PASS |
| CLI (`cli.ts`, `init-frontmatter.ts`) | 2 files | PASS |
| Process docs | overview.md, sdlc_changelog.md, deliverable_lifecycle.md | PARTIAL |
| CLAUDE.md | 1 file | PASS |
| Existing lite plans (D5, D6, D7) | 3 files in `sdlc-lite/completed/` | PASS |
| Bootstrap/initial-prompt | 2 files | PARTIAL |

---

## Catalog Integrity

`docs/_index.md` is accurate:
- Next ID: **D8** — correct
- D1–D4: Archived (chronicle/mvp/) — correct
- D5–D7: "Complete (lite)" in the Completed table — correct labeling
- No Active deliverables listed — matches filesystem (no files in `docs/current_work/planning/` or `docs/current_work/specs/`)
- D5–D7 show `—` in the Chronicle column — appropriate since lite deliverables don't archive to chronicle

**PASS.**

---

## Artifact Traceability

### D5, D6, D7 (SDLC-Lite)

| ID | Plan File | Location | Frontmatter |
|----|-----------|----------|-------------|
| D5 | `d5_unified_tui_app_plan.md` | `sdlc-lite/completed/` | `tier: lite`, all required fields present |
| D6 | `d6_tui_dry_extraction_plan.md` | `sdlc-lite/completed/` | `tier: lite`, all required fields present |
| D7 | `d7_tui_polish_plan.md` | `sdlc-lite/completed/` | `tier: lite`, all required fields present |

All three plan files have the correct `dNN_{slug}_plan.md` naming. All frontmatter fields are populated (`tier`, `type`, `complexity`, `effort`, `flavor`, `created`, `author`, `agents`). No `depends_on` field on lite plans — correct, that field is spec-only.

**PASS.**

### D1–D4 (Full SDLC, Archived)

Archived to `docs/chronicle/mvp/`. Not re-checked for frontmatter (pre-date this change; frontmatter retrofit not in scope of this update). No action required.

---

## Frontmatter Schema Consistency

### Template schema comparison

| Field | spec_template | planning_template | result_template | sdlc_lite_plan_template |
|-------|--------------|-------------------|-----------------|------------------------|
| `tier` | full | full | full | lite |
| `type` | feature | feature | feature | feature |
| `complexity` | moderate | moderate (RE-EVAL) | moderate (FINAL) | moderate |
| `effort` | 3 (initial est.) | 3 (RE-EVAL) | 3 (FINAL) | 3 |
| `flavor` | vision | approach | outcome | approach |
| `created` | YYYY-MM-DD | YYYY-MM-DD | YYYY-MM-DD | YYYY-MM-DD |
| `author` | CC | CC | CC | CC |
| `depends_on` | [] | — | — | — |
| `agents` | [] | [] | — | [] |
| `completed` | — | — | YYYY-MM-DD | — |

Schema is internally consistent. Field presence matches semantics:
- `depends_on` is spec-only (correct — dependencies are established at spec time)
- `agents` absent from result (correct — result records what was done, not who planned it)
- `completed` result-only (correct)
- `tier` present on all four templates (correct)

**PASS.**

### `init-frontmatter.ts` vs. templates

The hardcoded frontmatter strings in `init-frontmatter.ts` match the templates exactly:
- SPEC_FRONTMATTER: matches spec_template.md
- PLAN_FRONTMATTER: matches planning_template.md (correct `tier: full`)
- RESULT_FRONTMATTER: matches result_template.md (correct `completed` field present)
- SDLC_LITE_PLAN_FRONTMATTER: matches sdlc_lite_plan_template.md (correct `tier: lite`)

The summary output at line 203-206 of `init-frontmatter.ts` is accurate but does not mention `tier` as a field. This is an INFO-level omission — the schema in templates is correct, but the console summary could be more complete.

**PASS (minor omission noted below).**

---

## Parser vs. Schema Consistency

`sdlcParser.ts` parses:
- `type` → `cardType` (maps to `DeliverableType`)
- `complexity` → `complexity` (maps to `DeliverableComplexity`)
- `effort` → `effort` (number, clamped 1–5)
- `flavor` → `flavor`
- `agents` → `agents`
- `created` → `created`
- `completed` → `completed`
- `depends_on` → `dependsOn` (camelCase mapping)
- `tier` → `tier` (maps to `DeliverableTier`)

All frontmatter fields defined in templates are parsed. `VALID_TIERS` is `['full', 'lite']`, matching `DeliverableTier`. Frontmatter parsing uses gray-matter, which handles YAML correctly.

`buildDeliverable` uses `specFile || planFile || resultFile` as the primary source for frontmatter — meaning lite plans (plan-only) will correctly use the plan file's frontmatter. The `tier` field will flow into the `Deliverable` interface.

`DELIVERABLE_FILE_RE` pattern: `/^d(\d+[a-z]?)_(.+?)_(spec|plan|result|COMPLETE|BLOCKED)\.md$/i`

This regex matches `d5_unified_tui_app_plan.md`, `d6_tui_dry_extraction_plan.md`, and `d7_tui_polish_plan.md`. The scanner also recurses into subdirectories, so files in `sdlc-lite/completed/` will be found.

**PASS.**

---

## Skills Consistency

### sdlc-lite-plan SKILL.md

- Step 0 correctly registers a deliverable ID and adds to catalog with `In Progress (lite)` status
- Plan path is `docs/current_work/sdlc-lite/dNN_{slug}_plan.md` — correct
- Template reference points to `ops/sdlc/templates/sdlc_lite_plan_template.md` — file exists
- Description says "Registers a deliverable ID (tier: lite)" — correct

**PASS.**

### sdlc-lite-execute SKILL.md

- Description says plan lives at `docs/current_work/sdlc-lite/dNN_{slug}_plan.md` — correct
- Step 0 loads plan from `docs/current_work/sdlc-lite/` — correct
- Step 4 moves plan to `docs/current_work/sdlc-lite/completed/` — matches where D5/D6/D7 now live
- "Lite artifacts only. No spec or result doc. The deliverable is tracked in the catalog (tier: lite)" — consistent

**PASS.**

### create-test-suite SKILL.md — WARNING

The scope resolution table at line 46 reads:

```
| SDLC-Lite plan | Read `docs/current_work/sdlc-lite/{slug}_plan.md` — extract phases, files, acceptance criteria |
```

This uses `{slug}_plan.md` without the `dNN_` prefix. The current pattern is `dNN_{slug}_plan.md`. This is inconsistent with the new model and would cause the skill to look for a file at the wrong path when loading an SDLC-Lite plan for test suite creation.

**FAIL — action required.** Correct to `dNN_{slug}_plan.md`.

---

## Process Documentation Consistency

### CLAUDE.md

Line 120: "SDLC-Lite: Complex enough to benefit from a reviewed plan, but doesn't need spec or result docs. Gets a D-number (tier: lite)."

Correct and consistent with the new model.

**PASS.**

### sdlc_changelog.md

The 2026-03-17 entry documents the three-tier model and "SDLC-Lite registers a deliverable ID." However, the current update (frontmatter standardization, D-numbers for lite plans, file renames) is **not recorded in the changelog**. This is the intended location for recording process evolution.

**WARNING — action required.** Add a changelog entry for the 2026-03-19 changes:
- Standardized YAML frontmatter schema across all artifact types
- SDLC-Lite plans now share the ID sequence (`dNN_{slug}_plan.md`)
- Renamed D5/D6/D7 lite plan files
- Extracted sdlc_lite_plan_template.md
- Added `mc init-frontmatter` command
- Parser and types updated for frontmatter

### ops/sdlc/process/overview.md — WARNING

The tier table at line 241 reads:

```
| **SDLC-Lite** | Complex enough to benefit from a reviewed plan, not full tracking | Plan file only |
```

"Plan file only" is no longer accurate — SDLC-Lite now also gets a catalog entry and deliverable ID. The correct description is "Deliverable ID, plan file, catalog entry." The "Artifact" column should be updated.

**FAIL — action required.**

### ops/sdlc/initial-prompt.md — WARNING

Line 65 reads:

```
- **SDLC-Lite** — Complex enough for a reviewed plan, doesn't need full tracking → plan file only
```

Same problem: "plan file only" and "doesn't need full tracking" contradict the new model where lite plans register an ID and appear in the catalog.

**FAIL — action required.**

### ops/sdlc/BOOTSTRAP.md — INFO

Line 185: "SDLC-Lite: Complex enough to benefit from a reviewed plan, but doesn't need full tracking"

The "doesn't need full tracking" wording is ambiguous but not directly false — it means "doesn't need spec + result" which is still true. However, for clarity and alignment with the updated model it should say "Gets a D-number (tier: lite) but no spec or result docs."

**INFO — minor update recommended.**

### ops/sdlc/process/deliverable_lifecycle.md — INFO

This document describes the full SDLC lifecycle (Draft → Ready → In Progress → Validated → Deployed → Complete → Archived) and file naming conventions. It makes no mention of the lite tier or its simplified lifecycle (In Progress (lite) → Complete (lite) — no spec state, no result state). An agent reading this doc for lifecycle guidance would have no information about how lite deliverables work.

**INFO — addition recommended.** A brief "Lite Tier" section noting the streamlined states would prevent confusion.

---

## Old Path References

### Orphaned path references (agent memory) — INFO

Three agent memory entries reference old paths that no longer resolve:

| File | Old Path | Current Path |
|------|----------|-------------|
| `.claude/agent-memory/code-reviewer/review-log.md` (line 186, 206) | `docs/current_work/sdlc-lite/unified_tui_app_plan.md` | `docs/current_work/sdlc-lite/completed/d5_unified_tui_app_plan.md` |
| `.claude/agent-memory/code-reviewer/review-log.md` (line 299, 340) | `docs/current_work/sdlc-lite/tui-dry-extraction_plan.md` | `docs/current_work/sdlc-lite/completed/d6_tui_dry_extraction_plan.md` |
| `.claude/agent-memory/software-architect/decisions.md` (line 37) | `docs/current_work/sdlc-lite/unified_tui_app_plan.md` | `docs/current_work/sdlc-lite/completed/d5_unified_tui_app_plan.md` |

These are historical records of past reviews and architectural decisions. The paths are used for human navigation/reference, not by any skill or agent dispatch at runtime. The memory content (findings, patterns) remains valid and useful. Updating the paths would keep them accurate for anyone following up on a finding.

**INFO — update paths when convenient, not urgent.**

### No old-style plan files in working directory

Checked `docs/current_work/sdlc-lite/` — only `completed/` subdirectory exists with properly named D5/D6/D7 files. No orphaned `unified_tui_app_plan.md`, `tui-dry-extraction_plan.md`, or `tui-polish_plan.md` in the root of `sdlc-lite/`.

**PASS.**

---

## `mc init-frontmatter` Command

The command patches four templates and CLAUDE.md. The schema embedded in the command strings matches the templates. One minor gap:

The summary printed after patching (lines 203-206) lists fields per artifact type but omits `tier`:
```
Spec      → type, complexity (initial), effort (initial), flavor (vision), agents, depends_on
Plan      → type, complexity (re-evaluated), effort (re-evaluated), flavor (approach), agents
Result    → type, complexity (final), effort (final), flavor (outcome)
Lite Plan → type, complexity, effort, flavor (approach), agents
```

None of these mention `tier`, which is present on all four artifact types and is a key distinguisher in the new model. The actual frontmatter that gets written is correct (tier is present) — the omission is only in the human-readable summary output.

**INFO — update summary lines to include `tier`.**

---

## Recommendation Follow-Through (from 2026-03-17b audit)

Previous audit score: 8.4/10. Key warnings from that audit:

| Recommendation | Status |
|---------------|--------|
| W1: Commit the uncommitted migration (41 files) | RESOLVED — commits visible in git log |
| W2: design.md references old skill names (sdlc-new, ad-hoc-planning, etc.) | Not checked in this audit (out of scope) |
| W3: Two lite plan files reference `ad-hoc-execution` | RESOLVED — plans renamed and content updated |
| I1: D1/D2/D3 not archived | RESOLVED — archived to chronicle/mvp/ |
| I2: improvement-ideas/ does not exist | Not in scope of current change |
| I3: software-architect hardcodes paths instead of self-lookup | Persists (not addressed) |
| I4: .DS_Store in manifest | Persists (not addressed) |
| I5: software-architect has no agent memory | Appears resolved — `decisions.md` exists |

Follow-through rate: 4 resolved of 8 tracked = 50% (higher if scoping to items in-scope for this session's changes).

---

## Recommendations

### Warning — Action Required

**W1: `create-test-suite` SKILL.md — old SDLC-Lite path pattern**

File: `.claude/skills/create-test-suite/SKILL.md`, line 46

Current:
```
| SDLC-Lite plan | Read `docs/current_work/sdlc-lite/{slug}_plan.md` — extract phases, files, acceptance criteria |
```

Change to:
```
| SDLC-Lite plan | Read `docs/current_work/sdlc-lite/dNN_{slug}_plan.md` — extract phases, files, acceptance criteria |
```

Severity: Functional — if this skill is invoked after an SDLC-Lite execution, it will attempt to read from a path that no longer exists.

---

**W2: `ops/sdlc/process/overview.md` — tier table artifact column**

File: `ops/sdlc/process/overview.md`, line 241

Current:
```
| **SDLC-Lite** | Complex enough to benefit from a reviewed plan, not full tracking | Plan file only |
```

Change to:
```
| **SDLC-Lite** | Complex enough to benefit from a reviewed plan, not full tracking | Deliverable ID (tier: lite), catalog entry, plan file |
```

---

**W3: `ops/sdlc/initial-prompt.md` — SDLC-Lite description**

File: `ops/sdlc/initial-prompt.md`, line 65

Current:
```
- **SDLC-Lite** — Complex enough for a reviewed plan, doesn't need full tracking → plan file only
```

Change to:
```
- **SDLC-Lite** — Complex enough for a reviewed plan, doesn't need spec or result docs → deliverable ID (tier: lite), plan file
```

---

**W4: `sdlc_changelog.md` — missing entry for 2026-03-19 changes**

The frontmatter standardization, D-number assignment for lite plans, file renames, template extraction, parser/type updates, and `mc init-frontmatter` command are all process-significant changes with no changelog entry. Add an entry covering:
- Standardized YAML frontmatter schema (all artifact types)
- SDLC-Lite plans now register D-numbers (`dNN_{slug}_plan.md`)
- D5/D6/D7 renamed to include D-prefix
- `sdlc_lite_plan_template.md` extracted from inline skill content
- `mc init-frontmatter` command added to MC CLI
- `sdlcParser.ts` + `types.ts` updated for `tier`, `agents`, `dependsOn`

---

### Info — Recommended Updates

**I1: `ops/sdlc/BOOTSTRAP.md` — wording ambiguity**

Line 185: "doesn't need full tracking" — update to "Gets a D-number (tier: lite), no spec or result docs" for clarity.

**I2: `ops/sdlc/process/deliverable_lifecycle.md` — lite tier not described**

Add a "Lite Tier" section describing the streamlined states: `In Progress (lite)` → `Complete (lite)`. No Spec, Validated, Deployed, or Result states. Plan file is the only artifact, stored in `docs/current_work/sdlc-lite/`, moved to `completed/` when done.

**I3: Agent memory path updates**

Update old paths in agent memory files when convenient (not blocking):
- `code-reviewer/review-log.md` lines 186, 206, 299, 340
- `software-architect/decisions.md` line 37

**I4: `init-frontmatter.ts` summary output**

Add `tier` to the printed schema summary at lines 203-206.

---

## Compliance Score: 8.8/10

| Dimension | Score | Notes |
|-----------|-------|-------|
| Catalog integrity | 10/10 | D1–D7 accurate, Next ID D8 |
| Artifact traceability | 10/10 | All lite plans correctly named and frontmattered |
| Template consistency | 10/10 | All four templates have complete, consistent schemas |
| Parser alignment | 10/10 | Parses all frontmatter fields including `tier` |
| Types alignment | 10/10 | `DeliverableTier`, `agents`, `dependsOn` all present |
| Skills consistency | 7/10 | create-test-suite carries old path pattern |
| Process doc consistency | 7/10 | overview.md, initial-prompt.md, changelog need updates |
| Agent memory health | 8/10 | Old paths in memories, no functional risk |
