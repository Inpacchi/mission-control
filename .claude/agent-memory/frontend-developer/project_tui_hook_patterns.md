---
name: TUI hook patterns (post-refactor)
description: Key correctness, naming, and performance patterns for TUI view hooks and components
type: project
---

## Naming conventions (view hooks)

All detail-view search state uses the `detail` prefix consistently:
- `detailSearchMode` (boolean), `detailSearchQuery`, `detailActiveSearch`, `detailCurrentMatchIndex`, `detailMatchingLines` (array)
- Do NOT use `pager*` prefix (was renamed to `detail*` in commit review fix)

## RARITY_INK_COLOR

Lives in `src/tui/theme.ts` — do NOT duplicate in individual components. Import from there.

## MarkdownPanel

Accepts either `lines: string[]` (pre-computed, preferred) OR `content: string` (raw markdown).
Always pass pre-computed `lines` when the caller already has them via `useMarkdownLines` to avoid double-rendering.

## useDetailSearch hook

`src/tui/hooks/useDetailSearch.ts` — shared search state machine for detail panes.
Use for any view where the hook computes matching lines from a `lines: string[]` array.
Handles: `/` to enter search, Enter to commit, Esc to clear, n/p navigation.
Returns: `handleSearchKey`, `resetSearch`, and the standard `detail*` fields.

## Cache guard pattern (per-project data)

For `useChronicleView`, `useSessionView`, `useAdhocView`:
Use `lastProjectPathRef.current === projectPath` check alongside the length-based guard.
`if (data.length > 0 && lastProjectPathRef.current === projectPath) return;` — both conditions together prevent stale cache on project switch.

## selectedIndex vs filteredEntries

In chronicle (and any filtered list): `selectedIndex` is an index into `filteredEntries`, NOT `entries`.
Use `filteredEntries[selectedIndex]` everywhere, including doc-type switching in the detail view.

## Rules-of-hooks in presentational components

`useMemo` and other hooks must be called unconditionally at the top of the component — not inside `if (viewMode === ...)` blocks even if that viewMode is always reached. AdhocBrowser.matchSet is a concrete example.

## Unconditional `return true` after `consumed` check

After `if (consumed) { ... return true; }` in search input mode, use `return false` (not `return true`) so unhandled keys (arrows, etc.) fall through to the navigation handler.
