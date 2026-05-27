# Model Upload Pending Dataframe UX

## Goal
- [x] Empty state accepts drag/drop and browse.
- [x] Accepted dataframe type shown as `.joblib` only.
- [x] Dropping/selecting dataframe first creates a pending bundle.
- [x] Later model upload fills pending bundle when possible.
- [x] Save remains disabled until model exists.
- [x] Verify focused frontend tests, line cap, graph update.

## Plan
- [x] Update bundle type/card to support pending model.
- [x] Make empty state a drop/browse surface.
- [x] Update create-model pairing logic for df-first flow.
- [x] Update tests and lessons.
- [x] Run focused verification.

## Review
- Status: fixed.
- Empty state now accepts drag/drop and browse.
- Accepted model/dataframe labels and file picker accept list are `.joblib` only.
- Dataframe-first upload creates a pending bundle with a “Select model” action.
- Later model upload fills matching pending dataframe bundle by filename stem.
- Save / Save All ignore pending bundles until model exists.
- Pairing logic moved to `bundle-planner.ts` and tests cover dataframe-first + later model fill.
- Tests:
  - `vp test model-bundle-files.test.ts artifact-inspection-service.test.ts` passed: 6 tests.
  - `git diff --check` passed; CRLF warnings only.
  - touched file line cap passed.
  - `graphify update .` passed; graph.html skipped because graph exceeds viz limit.
- Blocked broader checks:
  - `vp exec tsc -p tsconfig.app.json --noEmit` still fails on existing MLForm type/export errors.
  - `npx react-doctor@latest --verbose` timed out after 120s.
