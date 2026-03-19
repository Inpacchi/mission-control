# Frontend Developer Agent Memory Index

## Project
- [Chakra UI v3 patterns](project_chakra_v3_patterns.md) — Chakra v3 has no `sx` prop; use direct style props. Factory `chakra.button` etc. for semantic elements.
- [Theme file patterns](project_theme_patterns.md) — `@keyframes` in `globalCss` requires `as any` on BOTH the key AND the value object, not just the key.
- [TCG card component patterns](project_tcg_card_patterns.md) — CSS custom props (--card-accent) via inline style; HoloOverlay uses ref.current.style.setProperty, never state; GoldBorderWrap is passthrough for non-epic/mythic; no barrel/index files in cards/.
- [TUI unified app Phase 2](project_tui_unified_app_phase2.md) — Presentational component pattern, per-view hook pattern, file rename adhoc.ts→adhoc.tsx, PagerView vs Pager distinction.
- [TUI security and correctness patterns](project_tui_security_patterns.md) — spawnSync/execFile array form for editor/grep, cancellation guards for async loads, stable ref for useInput, reactive terminalHeight threading, no duplicate hook calls in presentational components.
