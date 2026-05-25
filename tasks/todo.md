# Crystal Tree Visibility Regression

## Goal
- [x] Explanation appears in prediction modal after submit.
- [x] Explanation persists and appears in prediction detail/history.
- [x] Explanation appears in external review detail.

## Plan
- [x] Trace MLForm report payload shape after `defineReportKind` fetch.
- [x] Trace persisted prediction `reports` and explanation extraction.
- [x] Patch source of truth, not display-only fallback.
- [ ] Verify targeted tests, typecheck/build, line cap, React Doctor, graphify.

## Review
- Root cause: plugin `resolve` returned `null` when no submitted report payload existed.
- MLForm 0.1.11 treats `null` as ready payload, so report never stays idle and `fetch.submit` does not run.
- Plugin fix: return `undefined` when no persisted payload exists; MLForm keeps report idle, then fetches after submit.
- Repo code not patched; active plugin source lives outside checked-in frontend source in this case.

# MLForm 0.1.11 Upgrade Plan

## Goal
- [x] Upgrade frontend `mlform` dependency to `0.1.11`.
- [x] Use shipped MLForm declarations; no local `.d.ts` shim.
- [x] Keep prediction, questionnaire, custom field/report/explanation flows working.
- [x] Verify tests/build/react-doctor/graph.

## Plan
- [x] Install `mlform@0.1.11` through Vite+ workflow.
- [x] Inspect 0.1.11 public exports and declaration layout.
- [x] Remove any remaining manual type workaround if 0.1.11 exposes needed types.
- [x] Run TypeScript, tests, build, react-doctor.
- [x] Update graphify and review notes.

## Review
- Status: fixed.
- `mlform` upgraded to `0.1.11`.
- No manual `.d.ts` shim; 0.1.11 exposes needed kit/primitives types through package exports.
- Removed MLForm `tsconfig` path overrides; bundler resolution uses package exports.
- Verification:
  - `vp exec tsc -b --pretty false` passed.
  - `vp test run --run` passed: 9 files, 38 tests.
  - `vp run build` passed; existing `runtime-config.js` and chunk-size warnings remain.
  - `vp install --frozen-lockfile` passed.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` ran, exits nonzero on existing unrelated issues, score 84.
  - touched source line cap passed; only existing unrelated files exceed 300 lines.
  - `graphify update .` passed; graph.html skipped due graph size limit.
