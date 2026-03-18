# Open Design Questions Awaiting CD Input

## Q4: Supplementary row panel width distribution
**Question:** The addendum spec proposes Chronicle at 280px fixed, Ad Hoc Commits flex: 1, Session History at 320px fixed. Does this distribution match expected content usage patterns?
**Context:** Chronicle entries tend to be short (ID + name). Ad Hoc commit messages can be long. Session History commands can also be long. The flex: 1 on Ad Hoc gives it the most space at wide viewports. If the CD uses Session History more frequently, flipping the flex: 1 assignment may be warranted.
**Pending since:** 2026-03-16 addendum

## Q5: Empty column CTA dispatch actions
**Question:** When a CD clicks the ghost CTA in an empty column (e.g., "+ Add idea" in the Idea column), what is the exact dispatch action?
**Context:** The design spec specifies that a button exists and emits an event; the store handles the consequence. What skill or command should fire? Options: (A) dispatch `sdlc-planning` skill directly, (B) open the terminal and pre-fill the skill command, (C) open a modal prompt for deliverable name first, then dispatch.
**Pending since:** 2026-03-16 addendum

## Q6: Card height change — compact mode impact
**Question:** The addendum increases card collapsed height from 88px to 108px. The original design direction doc specifies a "compact mode" at 68px with fewer fields. Does the compact mode change to 88px (matching the old default) or stay at 68px?
**Context:** The compact mode spec in d1_design_direction.md Section 7 removes the status badge and timestamp. With the artifact row now added, compact mode needs an updated definition.
**Pending since:** 2026-03-16 addendum

---

## Resolved

### Q1: Empty column CTAs — RESOLVED 2026-03-16
**Resolution:** YES — add inline CTAs. Spec delivered in addendum Section A.

### Q2: Supplementary row design spec — RESOLVED 2026-03-16
**Resolution:** Full spec delivered in addendum Section B. Horizontal accordion, bg.surface strip, 40px collapsed headers, 280px max expansion, accordion (one open at a time).

### Q3: Side preview panel spec completeness — RESOLVED 2026-03-16
**Resolution:** FileViewer was audited. The current implementation has the right bones (borderLeft, header, tab bar, slide animation) but incorrect width (380px fixed vs. hero clamp(480px, 60%, 720px)), insufficient padding (24px vs. 48px horizontal), and under-scaled markdown typography. Full updated spec delivered in addendum Section E.
