---
name: TUI security and correctness patterns
description: Shell injection fixes, cancellation guards, stable ref for useInput, and prop threading for reactive dimensions
type: project
---

## Shell execution — always use array form

Never use `exec()` or `execSync()` with string interpolation for paths or queries.

- Editor launch: `spawnSync(editor, [arg1, arg2], { stdio: 'inherit' })` — matches BoardApp.tsx pattern
- grep search: `execFile('grep', args, { encoding, maxBuffer }, callback)` — no shell quoting needed; `--include ext` is two separate args, not `--include='*.ts'` in a string
- Remove `sanitizeGrepQuery` and `2>/dev/null || true` shell redirects — `execFile` error param covers grep exit-code 1 (no matches)

## Cancellation guard for async content loads

When transitioning to a detail view that triggers an async load (e.g., `buildSessionContent`), protect against stale results:

```typescript
const sessionLoadIdRef = useRef(0);
const loadId = ++sessionLoadIdRef.current;
void buildAsyncThing().then((result) => {
  if (loadId === sessionLoadIdRef.current) setState(result);
});
```

## Stable ref pattern for useInput

The `useInput` handler in useKeyboard.ts must be stable to avoid EventEmitter listener churn:

```typescript
const handlerRef = useRef<(input: string, key: Key) => void>(() => {});
handlerRef.current = (input, key) => { /* dispatcher logic */ };
useInput(useCallback((input, key) => handlerRef.current(input, key), []));
```

## Reactive terminal dimensions

Per-view hooks (`useChronicleView`, `useSessionView`, `useAdhocView`, `useFileView`) accept an optional `terminalHeight?: number` parameter. When provided it replaces `process.stdout.rows` for viewport height calculations. `useKeyboard` accepts `terminalHeight` and threads it through. `BoardApp` passes its reactive `height` to `useKeyboard`.

## Presentational components must not call duplicate hooks

`ChronicleList` was calling `useFileContent` + `useMarkdownLines` independently. `useChronicleView` already computed that data — the fix was to add `detailContent`, `detailLoading`, `detailError`, `detailLines` props to `ChronicleList` and pass them from `BoardApp` via `chronicle.*` state.

## setMode helpers must be useCallback

Any helper that calls both `setState` and `setViewMode` used inside a `useCallback` must itself be a `useCallback` and appear in the outer callback's dep array.

## useEffect with synchronous blocking work

Wrap synchronous blocking calls (like `scanAll`) in `Promise.resolve().then()` to let the loading render paint first. Use a cancelled flag for cleanup:

```typescript
useEffect(() => {
  let cancelled = false;
  void Promise.resolve().then(() => {
    if (cancelled) return;
    const result = expensiveSync();
    if (cancelled) return;
    setState(result);
  });
  return () => { cancelled = true; };
}, [dep]);
```
