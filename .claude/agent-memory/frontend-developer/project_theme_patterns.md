---
name: Theme file patterns
description: Non-obvious patterns for adding tokens and global CSS to src/ui/theme/index.ts
type: project
---

Chakra v3 `defineConfig` `globalCss` section requires `as any` casts in TWO places for `@keyframes`:

1. The computed key: `['@keyframes foilShift' as any]`
2. The value object itself: `{ '0%': {...}, '100%': {...} } as any`

Casting only the key is insufficient — TypeScript also rejects the `{ '0%': ... }` value shape as not matching `SystemStyleObject`. Both casts are required together.

The same single-cast pattern (`['*, ::before, ::after' as any]`) is sufficient for non-keyframe selectors because their value shapes are valid `SystemStyleObject`.

**Why:** Discovered during D3 TCG card design system Phase 1. The existing `prefers-reduced-motion` block at line 184 only cast the key, which works because media query values are valid style objects. Keyframe percentage keys (`'0%'`) are not known `SystemStyleObject` properties.

**How to apply:** Any time `@keyframes` is added to `globalCss`, cast both the computed property key AND the value with `as any`.
