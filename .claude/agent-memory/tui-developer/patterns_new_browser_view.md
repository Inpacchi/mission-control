---
name: Adding a new browser view
description: Step-by-step checklist for adding a new browser view (e.g. IdeaBrowser) following the Chronicle/Session/Adhoc pattern
type: project
---

When adding a new browser view to the TUI, follow this exact checklist in order:

## Files to create
1. `src/tui/hooks/useXxxView.ts` — state hook. If data comes from external async source, follow useChronicleView. If data is passed in (already computed), accept it as a parameter and skip loading state.
2. `src/tui/XxxBrowser.tsx` — pure presentational component. No useInput. All state as props.

## Files to modify (in order)
3. `src/tui/hooks/useKeyboard.ts`:
   - Add ViewMode variants to the union type
   - Add `xxxCards: Deliverable[]` to UseKeyboardOptions if the hook needs data passed in
   - Add `xxx: XxxViewState` to UseKeyboardResult
   - Instantiate the hook unconditionally (React rules of hooks)
   - Add keybinding in handleBoardKeys (e.g. `if (input === 'i') { setCurrentViewMode('ideas'); return; }`)
   - Add dispatcher in handlerRef.current (e.g. `if (currentViewMode.startsWith('idea')) { ... }`)
   - Add to return value
4. `src/tui/BoardApp.tsx`:
   - Import the component
   - Pass new data to useKeyboard options
   - Destructure the view state
   - Add view router block (before file views block)
   - Add keybinding to HelpOverlay lines array
5. `src/tui/components/HelpBar.tsx`:
   - Add shortcut to board case in getShortcuts
   - Add cases for the new view modes (prevents never exhaustive check compile error)

## Key invariants
- The `default: { const _exhaustive: never = viewMode; }` in HelpBar.tsx means ALL ViewMode variants MUST be handled in getShortcuts or it won't compile.
- Hooks must be called unconditionally regardless of current viewMode.
- The presentational component does NO keyboard handling.
- `currentViewMode.startsWith('xxx')` works for routing as long as the prefix is unique.

## ViewMode naming convention
- List: `'ideas'` (short, no suffix)
- Detail: `'idea-detail'`
- Prefix for routing: `'idea'` (covers both via startsWith)
