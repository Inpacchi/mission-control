---
name: Catalog Patterns
description: Recurring catalog issues and conventions observed across audits
type: project
---

## Archive lag is the dominant recurring pattern

Completed deliverables (D1, D2) have remained in the Active Deliverables table for two audit cycles without being moved to chronicle. This is the most persistent gap in this project's SDLC compliance. It is not a substance gap (all artifacts exist) but a lifecycle gap.

**Pattern:** The Completed Deliverables section in docs/_index.md is only populated for truly archived work. Deliverables marked "Complete" but not yet archived accumulate in the Active table. This creates catalog table-section inconsistency.

**Why:** The `sdlc-archive` skill ("Let's organize the chronicles") requires a deliberate trigger. It does not run automatically at deliverable completion.

## Spec/plan artifacts outpace catalog entries

D3 had both spec and plan files before the catalog entry was updated from "Draft" to reflect those artifacts. The catalog is a lagging indicator, not a real-time index.

## Deliverable status labels used

Observed statuses in use: Draft, Complete. The full set defined in docs/_index.md: Draft | Ready | In Progress | Validated | Deployed | Complete | Archived. "Ready" (planning complete, awaiting execution) has not been used in this project despite being appropriate for D3.
