---
tier: full                 # full | lite
type: feature              # feature | bugfix | refactor | research | architecture
complexity: moderate       # simple | moderate | complex | arch | moonshot — initial estimate
effort: 3                  # 1-5 scale — initial estimate
flavor: ""                 # the vision — what this deliverable aspires to be
created: YYYY-MM-DD
author: CC                 # CD | CC
depends_on: []             # [D1, D5] or empty
agents: []                 # [software-architect, frontend-developer, etc.]
---

# DNN: Feature Name — Specification

---

## 1. Problem Statement

[What problem does this solve? Why is it needed?]

---

## 2. Requirements

### Functional
- [ ] Requirement 1
- [ ] Requirement 2

### Non-Functional
- [ ] Performance: [constraint]
- [ ] Security: [constraint]

---

## 3. Scope

### Components Affected
- [ ] [List the packages, modules, or components this touches]

### Domain Scope
- [ ] [Which areas of the domain this touches — e.g., all users, specific feature area, infrastructure-only]

### Data Model Changes
- [What data structures change, or "None"]

### Interface / Adapter Changes
- [New methods, new fields, or "None"]

---

## 4. Design

### Approach

[High-level approach to solving the problem]

### Key Components

| Component | Purpose |
|-----------|---------|
| [Name] | [What it does] |

### Data Model (if applicable)

```
[Schema, types, or structure]
```

### API (if applicable)

```
[Endpoints, function signatures]
```

---

## 5. Testing Strategy

- [ ] Build-only (no runtime tests)
- [ ] Manual QA: [describe steps]
- [ ] Unit tests: [describe coverage]
- [ ] Integration / E2E tests: [describe scenarios]

---

## 6. Success Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests pass

---

## 7. Constraints

- [Performance, security, compatibility constraints]

---

## 8. Out of Scope

- [What this deliverable explicitly does NOT include]

---

## 9. Open Questions / Unknowns

Each unknown is a risk the plan must address or accept.

- [ ] **Unknown**: [What you don't know]
  - **Risk**: [What could go wrong]
  - **Mitigation**: [How the plan should handle this — prototype, spike, or accept]
