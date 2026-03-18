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

Both sdlc-execution and ad-hoc-execution now contain Data Source Extraction in PRE-GATE and data audit in POST-GATE. This is the most significant process improvement from the 5dcc5c4 migration. Future audits should check whether these sections are being exercised on deliverables that have external data sources.
