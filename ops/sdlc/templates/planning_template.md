---
tier: full                 # full | lite
type: feature              # feature | bugfix | refactor | research | architecture
complexity: moderate       # RE-EVALUATE from spec — adjust if planning revealed more/less complexity
effort: 3                  # RE-EVALUATE from spec — adjust if scope grew or shrank during planning
flavor: ""                 # evocative one-liner (like TCG flavor text) — not a description of the work
created: YYYY-MM-DD
author: CC                 # CD | CC
agents: []                 # [frontend-developer, backend-developer, etc.]
---

# DNN: Feature Name — Implementation Instructions

**Spec:** `dNN_feature_name_spec.md`

---

## Overview

[Brief summary of what will be implemented]

---

## Component Impact

| Component / Package | Changes |
|--------------------|---------|
| [name] | [What changes] |
| [name] | [What changes] |

## Interface / Adapter Changes

- [New methods, new fields, or "None — no interface changes"]

## Migration Required

- [ ] No migration needed
- [ ] Database migration: [describe]
- [ ] Storage migration: [describe]

---

## Prerequisites

- [ ] Prerequisite 1 is in place
- [ ] Prerequisite 2 is available

---

## Implementation Steps

### Step 1: [Name]

**Files:** `path/to/file.ext`

[Detailed instructions]

```language
// Code example or pattern to follow
```

### Step 2: [Name]

**Files:** `path/to/file.ext`

[Detailed instructions]

### Step 3: [Name]

[Continue as needed]

---

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| 1 | — | [agent] | — |
| 2 | Phase 1 | [agent] | Phase 3 |

## Approach Comparison (Medium/Complex only)

| Approach | Description | Key Tradeoff | Selected? |
|----------|-------------|-------------|-----------|
| A: [name] | [2 sentences] | [tradeoff] | ✅ / ❌ + why |
| B: [name] | [2 sentences] | [tradeoff] | ✅ / ❌ + why |

## Agent Skill Loading

| Agent | Load These Skills |
|-------|------------------|
| [agent-name] | [skills to load, e.g., oberweb if researching] |

---

## Testing

### Manual Testing
1. [Test step 1]
2. [Test step 2]

### Automated Tests
- [ ] Unit tests in `path/to/tests`
- [ ] Integration tests in `path/to/tests`

---

## Verification Checklist

- [ ] All implementation steps complete
- [ ] Manual testing passes
- [ ] Automated tests pass
- [ ] No regressions introduced

---

## Notes

[Any additional context, gotchas, or references]
