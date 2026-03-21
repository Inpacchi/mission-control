---
name: Process Observations
description: SDLC compliance patterns observed in practice across deliverables and audits
type: project
---

## Ad hoc work is correctly classified

The dashboard design polish pass (e21cbd4) was a substantial 14-file change that was correctly processed through ad-hoc-planning → ad-hoc-execution with a full review loop. This demonstrates the ad hoc path working as intended. The project distinguishes well between deliverable-worthy work (D1, D2, D3) and legitimate ad hoc work.

## Knowledge Context self-lookup inconsistency has escalated to Warning severity

software-architect hardcodes knowledge file paths instead of self-looking up from the context map. As of the 99a189c migration, the context map now has 10 entries for software-architect (2 new: risk-assessment-framework.yaml and domain-boundary-gotchas.yaml) but the agent only reads 8 hardcoded files. The `domain-boundary-gotchas.yaml` file — specifically added to help the orchestrator recognize domain crossings during architectural work — is being silently missed. This has been upgraded from Info to Warning. Recommended fix: replace the hardcoded list with the standard self-lookup boilerplate from AGENT_TEMPLATE.md.

## Agent memory is being written to actively

code-reviewer has the richest memory with patterns that accurately describe the project's technical landscape. sdet, backend-developer, frontend-developer, and ui-ux-designer all have useful memory files. software-architect memory is absent.

## Migration process left documentation inconsistencies

The cc-sdlc migration (bfd3a42 and the 5dcc5c4 migration) correctly updated skills but left documentation files with stale language. Framework documentation files (README.md, plugins/README.md, process/overview.md) require manual review after each migration to ensure they describe the actual installed configuration.

## Data pipeline integrity policies are in place

Both sdlc-execute and sdlc-lite-execute contain Data Source Extraction in PRE-GATE and data audit in POST-GATE. This was introduced in the 5dcc5c4 migration and carried forward correctly through the 8f62ee1 migration. Future audits should check whether these sections are being exercised on deliverables that have external data sources.

## Migrations arrive uncommitted — audit the working tree

The 8f62ee1 migration was audited while the changes were still in the working tree (not committed). This is the correct moment to audit — the framework files are installed and the full change set is visible. Post-migration audits should always check `git status` first to understand whether they are auditing a committed state or an in-progress migration.

## design.md (root) resolved — no longer a migration watch item

The stale skill names in `design.md` (sdlc-new, ad-hoc-planning, sdlc-planning, sdlc-execution) were resolved in an intermediate session between the 8f62ee1 and 99a189c migrations. As of 2026-03-21, design.md contains no stale skill references. The 99a189c migration did not rename any skills, so no new action needed.

## Concurrent deliverable archive + catalog update is a common gap

The pattern seen in D9: the plan file is moved to completed/ (commit b0a9880) but the catalog entry's link and status are not updated in the same commit. The follow-up commit (07a5679) updated the catalog but also missed updating the D9 frontmatter with status/completed fields. When archiving a deliverable, the following must happen atomically: (1) move plan file, (2) update catalog link and status, (3) add status/completed frontmatter. If the archive is split across commits, any of these steps can be missed.
