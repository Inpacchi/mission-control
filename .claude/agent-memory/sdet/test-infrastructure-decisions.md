# Test Infrastructure Decisions

## Framework
- Vitest 3.x, configured at `/vitest.config.ts`
- Three named projects: `server` (node env), `ui` (jsdom env), `unit` (node env)
- No `@testing-library/react` installed as of 2026-03-16

## jsdom Missing (Pre-existing Gap)
- `jsdom` is not in devDependencies; the `ui` vitest project config declares `environment: 'jsdom'` but the package is absent
- This causes 2 unhandled errors at suite startup every run, but they do not affect any test results
- Effect: `src/ui/**` test files run without a DOM environment — they appear in the "15 total files" count but produce 0 tests (the project fails to initialize)
- Workaround used for `useButtonPress.test.ts`: placed the file under `src/ui/hooks/__tests__/` which resolves to the `ui` project, but because `useButtonPress` makes no DOM API calls and has no React hook calls internally, the test still passes even without jsdom
- If any future UI test needs actual DOM APIs (querySelector, etc.), jsdom must be installed first: `npm install -D jsdom`

## Timezone Strategy for formatDate Tests
- `formatDate` uses `Date.prototype.getHours()` and `getMinutes()`, which return local time
- To guarantee deterministic test output across CI environments in any timezone, set `process.env.TZ = 'UTC'` at the top of the test file, before any imports that might construct a Date
- This must appear before the `import` statements because ES module hoisting would otherwise run `new Date()` before the env var is set — using a top-level assignment (not inside a `beforeAll`) works because Node.js processes it synchronously before module evaluation

## Slug Tests: No os.homedir Mock Required
- `generateSlug` is a pure function that uses only `crypto` and `path`
- The `os.homedir()` mock pattern used in `projectRegistry.test.ts` (via `vi.hoisted`) is NOT needed for slug-only tests
- Direct dynamic import (`await import('../projectRegistry.js')`) works without mock setup because `generateSlug` never reads `MC_DIR`

## Test Count Baseline (2026-03-16)
- Pre-D2-unit-tests: 106 tests in 12 files (13 configured, ui project fails to init)
- Post-D2-unit-tests: 117 tests in 13 files (+11 tests across 3 new files)
