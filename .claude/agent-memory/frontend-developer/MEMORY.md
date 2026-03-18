# Frontend Developer Agent Memory Index

## Project
- [Chakra UI v3 patterns](project_chakra_v3_patterns.md) — Chakra v3 has no `sx` prop; use direct style props. Factory `chakra.button` etc. for semantic elements.
- [Theme file patterns](project_theme_patterns.md) — `@keyframes` in `globalCss` requires `as any` on BOTH the key AND the value object, not just the key.
- [TCG card component patterns](project_tcg_card_patterns.md) — CSS custom props (--card-accent) via inline style; HoloOverlay uses ref.current.style.setProperty, never state; GoldBorderWrap is passthrough for non-epic/mythic; no barrel/index files in cards/.
