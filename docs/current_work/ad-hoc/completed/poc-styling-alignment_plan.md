# Ad Hoc Plan: POC Styling Alignment for TCG Card Design System

**Execute this plan using the `sdlc-lite-execute` skill.**

**Scope:** Align the D3 TCG card implementation's visual styling with the POC's look and feel. The implementation has correct structure and layout but is missing several surface-level treatments: card hover glow, rarity-specific ID text gradients, the Rare border shimmer targeting the left border stripe rather than the card body, and the Command Bar scan-line/amber glow atmosphere.

**Files:**
- `src/ui/components/cards/TcgCard.tsx`
- `src/ui/components/cards/MiniCard.tsx`
- `src/ui/components/cards/RarityEffects.tsx`
- `src/ui/components/cards/GoldBorderWrap.tsx`
- `src/ui/components/cards/HoloOverlay.tsx`
- `src/ui/components/warTable/CommandBar.tsx`
- `src/ui/theme/index.ts`

**Agents:** frontend-developer

---

## Phase Dependencies

| Phase | Depends On | Agent | Can Parallel With |
|-------|-----------|-------|-------------------|
| Phase 1: Command Bar atmosphere | none | frontend-developer | Phase 2 |
| Phase 2: Card hover glow | none | frontend-developer | Phase 1 |
| Phase 3: Rarity ID text gradients | Phase 2 | frontend-developer | none |
| Phase 4: Rare border shimmer retarget | Phase 3 | frontend-developer | none |

---

## Phases

### Phase 1: Command Bar Atmosphere
**Agent:** frontend-developer

**What:** Add a scan-line texture pseudo-element and an amber bottom glow pseudo-element to `CommandBar`. The scan-line is a `repeating-linear-gradient` overlay covering the full bar surface at `pointer-events: none`. The amber glow is a 1px gradient line immediately below the border using `linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)`. Because Chakra v3 does not support `_before`/`_after` pseudo-props that accept arbitrary CSS `content`, both effects must be expressed as absolutely-positioned child `Box` elements with `pointerEvents="none"` and `zIndex` that keeps them below the bar's interactive content. The bar's `Flex` root gains `position="relative"` to contain the overlays — but do NOT add `overflow="hidden"` to the root `Flex`, because `ProjectSwitcher` renders a dropdown that would be clipped by it. Apply `overflow="hidden"` only to the scan-line overlay `Box` itself, giving it an explicit height matching the bar. The amber glow `Box` does not need overflow clipping either. Reference for the exact scan-line and glow CSS values is `poc/tcg-war-table.html`.

**Why:** The POC's `cmdbar::before` scan-line and `cmdbar::after` amber glow are the primary contributors to the Command Bar feeling like a CRT-era HUD rather than a plain toolbar. Without them, the bar reads as flat and loses the "mission control terminal" atmosphere that distinguishes the layout from a generic dashboard. Scoping overflow to the overlay child only (rather than the root) prevents the `ProjectSwitcher` dropdown from being clipped, which would break navigation.

---

### Phase 2: Card Hover Glow
**What:** Apply the POC's hover glow value (`0 0 0 1px rgba(47,116,208,0.15)`) as an additional box-shadow layer on hover for `TcgCard`. Use the literal value `0 0 0 1px rgba(47,116,208,0.15)` — do NOT substitute the theme `glow.blue` token, which carries different spread and opacity values and would not match the POC fidelity target. Add a `_hover` prop to the root `Box` of `TcgCard` that combines the existing `card.md` shadow with this blue glow ring. `MiniCard` already has this glow (`0 0 0 1px rgba(47,116,208,0.15)`) in its hover shadow; no change is needed for `MiniCard`. Both components already use `transition` on relevant properties, so no new transition setup is needed. For Epic/Mythic cards the hover glow should be applied to the `GoldBorderWrap` wrapper element rather than the inner card, since `GoldBorderWrap` controls the outer hit area. `GoldBorderWrap` will need a `_hover` prop (or a wrapper `Box` with hover state) to carry this shadow — the inner card does not need an override.

**Why:** The POC's `.card:hover` rule applies the glow universally to all cards. The current `TcgCard` has no hover shadow, which makes cards feel inert and fails to signal interactivity. `MiniCard` already matches the POC here, so touching it would risk a regression for no gain. The glow ring is a single `box-shadow` paint operation — no layout impact.

---

### Phase 3: Rarity ID Text Gradients
**Agent:** frontend-developer

**What:** Apply `background-clip: text` gold/silver gradient styling to the card ID text element in `TcgCard` for Uncommon, Rare, Epic, and Mythic rarities. Common cards keep the plain `text.muted` color. The gradient values per rarity match the POC exactly:

- **Uncommon (silver foil):** `linear-gradient(135deg, #888 0%, #ccc 25%, #999 50%, #ddd 75%, #aaa 100%)` with `background-size: 200% 200%` and a new `foilShiftBg` keyframe animating `background-position`.
- **Rare, Epic, Mythic (gold):** `linear-gradient(135deg, #b8860b 0%, #ffd700 30%, #b8860b 50%, #ffe44d 80%, #b8860b 100%)` with `background-size: 200% 200%` and the same `foilShiftBg` keyframe.

The technique uses `-webkit-background-clip: text`, `-webkit-text-fill-color: transparent`, and `background-clip: text` applied via inline `style` on the `TcgCard` ID `Text` element, conditioned on the computed `rarity` value.

The existing `foilShift` keyframe in `theme/index.ts` animates `translateX` (a transform) and is actively consumed by RarityEffects' Uncommon overlay and CardStressTest — do NOT modify it. Instead, add a new `foilShiftBg` keyframe to `theme/index.ts` that animates `background-position` from `0% 50%` to `100% 50%` and back. Use `foilShiftBg` exclusively for the ID text gradient animations. This is an accepted exception to the GPU-only animation rule since it applies only to a small text element, not the card surface.

The same gradient and `foilShiftBg` treatment applies to `MiniCard`'s ID text (`Text` in Row 1) using the same rarity-conditional logic.

The existing Uncommon full-card foil overlay in `RarityEffects` (the full-card `mixBlendMode` overlay that uses `foilShift`) is not present in the POC. Keep it in place as an additive enhancement — it adds visual depth to Uncommon cards without conflicting with the ID text gradient, and removing it would be a visual regression.

**Why:** ID text gradients are the most immediately visible POC detail missing from the implementation. A silver-shimmer ID on an Uncommon, a gold-glowing ID on a Rare, directly communicates the card's power level at a glance. Adding `foilShiftBg` as a separate keyframe preserves the existing `foilShift` behavior for its current consumers and avoids a hard-to-trace regression in CardStressTest.

---

### Phase 4: Rare Border Shimmer Retarget
**Agent:** frontend-developer

**What:** In `RarityEffects`, replace the current Rare treatment (a full-card-body sweep overlay using `shimmerSweep`) with a left-border-stripe shimmer that matches the POC. The POC targets only the 3px left border stripe: it sets `border-left-color: transparent` on the card, then absolutely positions a pseudo-element (3px wide, full card height) over the left edge that animates `background-position` on a vertical gradient (`linear-gradient(180deg, var(--accent) 0%, #fff 50%, var(--accent) 100%)` at `background-size: 100% 200%`). In React, this translates to: the `RarityEffects` rare case renders a wrapper with `position: relative` and `overflow: hidden`, suppresses the card's own left border, and adds an absolutely-positioned `Box` child (`left: 0, top: 0, bottom: 0, width: "3px"`) that applies the border gradient and `borderShimmer` keyframe animation. Add a `borderShimmer` keyframe to `theme/index.ts` that animates `background-position` from `0% 0%` to `0% 100%` and back — this is the second accepted exception to the GPU-only rule since it targets only the 3px border stripe. For suppressing the card's left border, prefer a simple approach such as `TcgCard` accepting an optional prop (e.g., `suppressLeftBorder`) that the `RarityEffects` Rare wrapper passes in — this is simpler and more explicit than a data-attribute or CSS class approach.

Remove only the body-overlay usage of `shimmerSweep` from `RarityEffects.tsx`. Do NOT remove the `shimmerSweep` keyframe from `theme/index.ts` — `CardStressTest` uses it. Grep for all usages before touching anything in `theme/index.ts`.

**Why:** The current body-overlay sweep touches the entire card face, which makes the animation compete visually with card text and obscures content. The POC intentionally animates only the left border stripe so the shimmer reads as "this border is alive" rather than "the whole card is flashing." The retargeted treatment is also less visually noisy on the War Table where many Rare cards may appear simultaneously. Preserving the `shimmerSweep` keyframe avoids breaking `CardStressTest` which depends on it independently of `RarityEffects`.

---

## Worker Agent Reviews

Key feedback incorporated:

- [frontend-developer] `overflow="hidden"` on CommandBar root would clip ProjectSwitcher dropdown — scoped overflow to scan-line overlay child only
- [frontend-developer] `foilShift` keyframe consumed by RarityEffects overlay and CardStressTest — added new `foilShiftBg` keyframe instead of modifying existing
- [frontend-developer] `shimmerSweep` keyframe consumed by CardStressTest — keep in theme, only remove usage from RarityEffects
- [frontend-developer] MiniCard already has hover glow — narrowed Phase 2 scope to TcgCard only
- [frontend-developer] GoldBorderWrap hover shadow must go on outer Box (gold gradient), not inner dark wrapper
- [ui-ux-designer] GoldBorderWrap.tsx missing from files list — added
- [ui-ux-designer] `suppressLeftBorder` prop threading via cloneElement is unnecessary — TcgCard can self-detect Rare rarity like it already does for Epic/Mythic

## Post-Execution Review
All completed work must be reviewed by all relevant worker domain agents.
All findings must be fixed by the most relevant domain agent.
Build must pass before work is considered done.
