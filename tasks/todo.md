# Schema Bulk Saved Input Display Mapping

## Goal
- [x] Make bulk-saved runs display edited schema labels/values like manual runs.
- [x] Make predict-again prefill work from bulk-saved runs after label edits.
- [x] Preserve technical CSV columns for upload.
- [x] Verify focused tests and graph update.

## Plan
- [x] Inspect bulk save payload vs manual save payload.
- [x] Add regression for technical bulk input converted to visible `raw.inputData`.
- [x] Save bulk run `inputData` from runtime visible payload instead of raw CSV row.
- [x] Run focused tests/typecheck/line caps/react-doctor/graph update.

## Review
- Root cause: bulk upload persisted CSV technical keys in `PredictionRun.inputData`, while manual schema runs persist runtime visible keys from `raw.inputData`.
- Bulk CSV still accepts signature/dataframe columns; only saved run display input now uses the manual-run shape.
- Predict-again now receives visible schema-label inputs, so edited labels prefill correctly.
- Added focused regression in `schema-bulk-label-mapping.test.ts`; split test file to keep all touched files under 300 lines.
- Verification:
  - `vp fmt src\schemas\schema-run-bulk-inputs.ts src\schemas\useSchemaRunBulkUpload.ts test\schema-run-history.test.ts test\schema-bulk-label-mapping.test.ts --check` passed.
  - `vp test schema-run-history schema-bulk-label-mapping schema-one-hot-select-values bulk-upload` passed: 29 tests.
  - `vp exec tsc -b` passed.
  - `vp test` passed: 31 files, 129 tests.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` completed: score 71, 51 existing warnings.
  - `graphify update .` passed: 8854 nodes, 19168 edges, 405 communities.
  - `vp check` blocked by existing repo-wide formatting issues in `dist/` and 616 files.
