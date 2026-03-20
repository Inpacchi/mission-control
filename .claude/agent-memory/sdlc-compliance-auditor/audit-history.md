---
name: Audit History
description: Per-audit findings and recommendation follow-through tracking
type: project
---

## 2026-03-16 Audits (two independent audits)

**Score:** 8.2/10 (primary) and 9.0/10 (independent)
**Key findings:**
- D1 marked Complete but not archived (Warning — persisted to 2026-03-17)
- sdlc-compliance-auditor lacked Write tool (Warning — RESOLVED in migration)
- Anti-Rationalization tables missing in 3 agents (Warning — RESOLVED in migration)
- Knowledge Context inconsistency: software-architect hardcodes file list (Info — persists)
- No .claude/settings.json (Info — persists)

**Recommendations issued:** 12 total (4 Warning, 8 Info)

---

## 2026-03-17 Audit

**Score:** 8.6/10
**Trigger:** Post-migration verification (cc-sdlc 645d2b8 → 5dcc5c4)
**Follow-through rate from prior audits:** 33% overall; 50% for Warnings

**Key findings:**
- ops/sdlc/plugins/README.md still says oberskills "must be installed" (Warning — migration oversight)
- ops/sdlc/README.md says oberskills "is required" (Warning — same)
- D1 and D2 complete but not archived; D2 in wrong catalog table section (Warning — persists)
- D3 has spec+plan but catalog shows "Draft" with no links (Warning)
- software-architect has no agent memory (Info)
- testing.md discipline content may have been overwritten during migration (Info — verify)
- .DS_Store tracked in sdlc-manifest.json (Info)

**Recommendations issued this audit:** 3 Warning, 7 Info

**What was resolved by migration:**
- W1 (2026-03-16 independent): Write tool added to sdlc-compliance-auditor — DONE
- W4 (2026-03-16 independent): Anti-Rationalization tables added to frontend-developer, ui-ux-designer, debug-specialist — DONE
- oberagent removed from all skills — DONE
- Data pipeline integrity policies added (PRE-GATE, POST-GATE) — DONE

---

## 2026-03-17b Audit (Post-migration: 52568ed → 8f62ee1)

**Score:** 8.4/10
**Trigger:** Post-migration verification (cc-sdlc 52568ed → 8f62ee1) — skill renames, three-tier model, testing-paradigm.yaml
**Follow-through rate from prior audit:** 40% acted on, 30% deferred = 70% accountability

**Key findings:**
- Migration uncommitted — 41 files in working tree, not committed (Warning W1 — commit immediately)
- design.md (root) contains old skill names: sdlc-new, ad-hoc-planning, sdlc-planning, sdlc-execution (Warning W2 — functional risk for button feature)
- Two SDLC-Lite plan files reference `ad-hoc-execution` old name (Warning W3 — inert but confusing); also duplicate plan file in wrong location
- D1/D2/D3 still unarchived — 3rd+ cycle (Info I1 — persistent, low priority)
- ops/sdlc/improvement-ideas/ directory does not exist (Info I2)
- software-architect Knowledge Context hardcodes paths instead of self-looking up (Info I3 — persistent)
- .DS_Store in manifest (Info I4 — persistent)
- software-architect still no agent memory (Info I5 — persistent)

**What was resolved by this migration:**
- plugins/README.md "must be installed" for oberskills — RESOLVED (now Optional)
- ops/sdlc/README.md "is required" language — RESOLVED
- D3 catalog entry stuck at Draft — RESOLVED (now Complete)
- testing.md discipline overwrite concern — VERIFIED OK (content intact and enhanced)
- All old skill files deleted: ad-hoc-planning, ad-hoc-execution, ad-hoc-review, sdlc-planning, sdlc-execution, sdlc-new
- All new skill files present: sdlc-plan, sdlc-execute, sdlc-lite-plan, sdlc-lite-execute, diff-review
- testing-paradigm.yaml added and correctly mapped in agent-context-map.yaml
- CLAUDE.md and CLAUDE-SDLC.md fully updated with three-tier model

**Critical migration-specific note:**
The migration had no git commit at time of audit. This is an unusual state — framework files were updated but not staged. The migration audit was conducted on the working tree state.

---

## 2026-03-19 Audit (Post-change: frontmatter standardization + SDLC-Lite D-numbers)

**Score:** 8.8/10
**Trigger:** Post-change consistency audit — YAML frontmatter schema, D-number registration for lite plans, file renames, parser/type updates, `mc init-frontmatter` command
**Follow-through rate from 2026-03-17b:** ~50% (W1 resolved, W3 resolved, I1 resolved, I5 resolved; W2/I2/I3/I4 persist)

**Key findings:**
- W1: `create-test-suite` SKILL.md uses old `{slug}_plan.md` (no D-prefix) for SDLC-Lite plan path — functional risk if skill invoked
- W2: `ops/sdlc/process/overview.md` tier table still says "Plan file only" for SDLC-Lite
- W3: `ops/sdlc/initial-prompt.md` still says "plan file only" / "doesn't need full tracking"
- W4: `sdlc_changelog.md` missing entry for 2026-03-19 changes (frontmatter, D-numbers, init-frontmatter command, etc.)
- I1: `ops/sdlc/BOOTSTRAP.md` line 185 — ambiguous "doesn't need full tracking" wording
- I2: `deliverable_lifecycle.md` makes no mention of lite tier lifecycle
- I3: Agent memory entries reference old plan paths (unified_tui_app_plan.md, tui-dry-extraction_plan.md)
- I4: `init-frontmatter.ts` summary output omits `tier` field from printed schema

**All templates, parser, types, CLI, existing plan files (D5/D6/D7), catalog — PASS.**

**Recurring pattern to watch:** When a process change touches skills, the supporting skills (like create-test-suite) that reference patterns from updated skills are commonly missed. The primary skills (sdlc-lite-plan, sdlc-lite-execute) were updated correctly; create-test-suite was not swept.
