---
name: Recurring Patterns
description: Code patterns that have appeared as findings in more than one review cycle
type: project
---

## Broadcast shape vs. REST shape divergence
**Pattern:** Server broadcasts `data: <array>` directly in WebSocket messages, but client-side hooks expect `data.<fieldName>: <array>` (the REST response envelope shape). This mismatch causes silent empty state.
**First seen:** D2 review — `watcher:sdlc` update message broadcasts `data: Deliverable[]` but `useSdlcState` reads `data.deliverables`.
**Mitigation:** When adding new WebSocket broadcasts, verify the payload shape against every consumer. Consider narrowing the WsMessage union to typed variants for each channel.

## Parallel slug functions for the same concept
**Pattern:** Multiple services define their own slug derivation for the same input (project path), producing different output due to independent implementation.
**First seen:** D2 review — `generateSlug` (projectRegistry.ts) and `projectSlug` (sessionStore.ts) both hash a project path but normalize differently.
**Mitigation:** Single exported slug function in one service, imported by others.

## Inline formatters not fully migrated to shared utility
**Pattern:** After extracting a shared utility (formatters.ts), one or more call sites still use locally-defined versions.
**First seen:** D2 review — `formatCommitDate` in AdHocTracker.tsx post-migration.
