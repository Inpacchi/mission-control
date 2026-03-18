---
name: Process Observations
description: SDLC compliance patterns observed in practice across deliverables and audits
type: project
---

## Ad hoc work is correctly classified

The dashboard design polish pass (e21cbd4) was a substantial 14-file change that was correctly processed through ad-hoc-planning → ad-hoc-execution with a full review loop. This demonstrates the ad hoc path working as intended. The project distinguishes well between deliverable-worthy work (D1, D2, D3) and legitimate ad hoc work.

## Knowledge Context self-lookup inconsistency is stable but benign

software-architect hardcodes 8 knowledge file paths instead of self-looking up from the context map. This has persisted through two migration cycles without causing functional problems. The risk is maintenance: if the context map is updated, the agent won't pick up the addition. Low-urgency cleanup.

## Agent memory is being written to actively

code-reviewer has the richest memory with patterns that accurately describe the project's technical landscape. sdet, backend-developer, frontend-developer, and ui-ux-designer all have useful memory files. software-architect memory is absent.

## Migration process left documentation inconsistencies

The cc-sdlc migration (bfd3a42 and the 5dcc5c4 migration) correctly updated skills but left documentation files with stale language. Framework documentation files (README.md, plugins/README.md, process/overview.md) require manual review after each migration to ensure they describe the actual installed configuration.

## Data pipeline integrity policies are in place

Both sdlc-execute and sdlc-lite-execute contain Data Source Extraction in PRE-GATE and data audit in POST-GATE. This was introduced in the 5dcc5c4 migration and carried forward correctly through the 8f62ee1 migration. Future audits should check whether these sections are being exercised on deliverables that have external data sources.

## Migrations arrive uncommitted — audit the working tree

The 8f62ee1 migration was audited while the changes were still in the working tree (not committed). This is the correct moment to audit — the framework files are installed and the full change set is visible. Post-migration audits should always check `git status` first to understand whether they are auditing a committed state or an in-progress migration.

## design.md (root) will need maintenance at each migration

The project root `design.md` contains planned `.mc.json` action button command strings (skill names) that reference SDLC skill names. Because these strings will be used in a future feature implementation, they must be updated at each migration that renames skills. The stale skill names (sdlc-new, ad-hoc-planning, sdlc-planning, sdlc-execution) were not updated in the 8f62ee1 migration. Add `design.md` to the migration checklist for future migrations.
