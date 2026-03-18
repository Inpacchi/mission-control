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

## Hardcoded hex values duplicated between component constants and theme tokens
**Pattern:** Components define module-level color constants (e.g., `statusBadgeColors` in DeliverableCard.tsx) that duplicate values already defined in `theme/index.ts` tokens. New card components risk adding a third copy.
**First seen:** D3 plan review — `statusBadgeColors` at DeliverableCard.tsx lines 16–24 vs. `badge.*` tokens in theme/index.ts lines 86–107.
**Confirmed D3 execution:** `statusToAccent` appears in TcgCard.tsx, MiniCard.tsx, AND TacticalField.tsx — three identical 7-entry maps. `artifactPillStyles` duplicated in TcgCard.tsx and MiniCard.tsx. Card shadows hardcoded as raw rgba in TcgCard/MiniCard instead of using card.sm/card.md tokens.
**Mitigation:** New card components should read from Chakra tokens, not define parallel constants. Per-status accent colors should be a shared export.

## Shared keyframe mutation breaks undiscovered consumers in stress/test files
**Pattern:** Plans that modify or remove shared CSS keyframes in `theme/index.ts` check production components but miss test/stress files, which also reference keyframe names directly by string.
**First seen:** D3 ad hoc styling alignment plan review — `foilShift` (RarityEffects.tsx + CardStressTest.tsx) and `shimmerSweep` (RarityEffects.tsx + CardStressTest.tsx) both have consumers in `src/ui/__tests__/stress/CardStressTest.tsx`.
**Mitigation:** Always grep `src/ui/__tests__/` separately when a plan proposes mutating or removing a keyframe. The stress test file references keyframe names as animation property strings — not as imports — so a module-level grep for the keyframe name is required.

## Background color hardcoded in shared wrappers serving components with different surface levels
**Pattern:** A shared wrapper component (e.g., GoldBorderWrap) hardcodes a background color for an inner clip/padding layer. When consumed by components that use a different surface-level background (e.g., TcgCard at #1C2333 vs. MiniCard at #232D3F), the hardcoded clip color creates a visible seam.
**First seen:** D3 ad hoc round 3 — GoldBorderWrap inner clip at #1C2333, MiniCard body at #232D3F. Epic/Mythic MiniCards show a darker ring inside the gold border.
**Mitigation:** Wrapper clip background should accept a prop or CSS variable so consumers can match their own surface color.

## Keyframe name referenced by string — property mismatch not caught at type level
**Pattern:** A component sets a CSS property (e.g., `backgroundSize: '300% 300%'`) that implies a specific keyframe property will animate (e.g., `background-position`), but the referenced keyframe string name actually animates a different property (e.g., `opacity`). TypeScript cannot verify keyframe property lists against component CSS context.
**First seen:** D3 ad hoc round 3 — GoldBorderWrap references `goldPulse` (animates opacity) while setting backgroundSize indicating a gradient sweep was intended.
**Mitigation:** When adding `animation: 'keyframeName ...'`, always read the keyframe definition in theme/index.ts globalCss to confirm the animated property matches the component's CSS context.

## Plan I/O assumptions not verified against actual service implementation
**Pattern:** Plans describe a feature as "piggybacking" on existing I/O but the actual service code does not perform that I/O. Implementing agents then silently add a new I/O pass or stall.
**First seen:** D3 plan review — plan claimed frontmatter parsing would piggyback on existing file reads in `scanDirectory()`, but `scanDirectory()` only stats files, never reads content.
