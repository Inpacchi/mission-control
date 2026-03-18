---
name: TCG card component patterns
description: Conventions established when building src/ui/components/cards/ — --card-accent, HoloOverlay ref approach, GoldBorderWrap passthrough, no barrel files
type: project
---

Patterns from building the D3 TCG card component system (`src/ui/components/cards/`):

**--card-accent CSS custom property**
Set as `style={{ '--card-accent': accentHex } as React.CSSProperties}` on the card root `<Box>`. Theme tokens `rarity.shimmer.gradient` reference `var(--card-accent)` so the sweep color tracks the card's status.

**HoloOverlay mouse tracking**
Mouse coordinate updates use `ref.current.style.setProperty('--pointer-x', ...)` directly — never `useState`. This avoids per-frame re-renders. The overlay element also receives `opacity` via `el.style.opacity` (not state). The `data-holo-root` attribute on the parent Box is used as the event target anchor.

**GoldBorderWrap passthrough**
For rarities other than `epic` / `mythic`, `GoldBorderWrap` returns `<>{children}</>` with no wrapper DOM. Always check before wrapping to avoid unnecessary DOM nesting.

**No barrel/index files**
`src/ui/components/cards/` has no `index.ts`. Import each component directly:
```ts
import { TcgCard } from './cards/TcgCard';
import { MiniCard } from './cards/MiniCard';
```

**Epic/Mythic card border**
Epic and Mythic cards set `borderLeft: 'none'` on the inner card element — the gold border comes from the GoldBorderWrap padding. They also use a status-color tinted type bar background as an inset status indicator.

**Artifact pill contrast**
Pills use opaque colored backgrounds (e.g., `#2563EB` for spec) with light foreground text (`#EFF6FF`) rather than the POC's `color: var(--bg-canvas)` approach — this ensures WCAG AA contrast at small rendered sizes.

**Animation names available**
From `theme/index.ts` globalCss: `foilShift`, `shimmerSweep`, `goldPulse`, `holoPulse`.
These are CSS-only — no JS needed to activate them.

**Why:** Established during D3 implementation. Apply when adding new card variants or rarity treatments.
