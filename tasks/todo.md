# Schema Bulk Exact Key Mapping

## Goal
- [x] Remove schema bulk/display slug aliasing from labels.
- [x] Keep bulk CSV columns as exact model/dataframe feature names.
- [x] Keep MLForm submit values keyed by stable field ids.
- [x] Keep labels editable and display-only.
- [x] Verify lowercase/special-character keys without case/symbol transforms.

## Plan
- [x] Simplify bulk schema/serialization around `modelKey -> field.id`.
- [x] Simplify schema transport model input mapping around `serializedValues[field.id]`.
- [x] Remove `toUniqueId(label)` display/payload fallbacks.
- [x] Update tests to reject slug/case magic and assert exact keys.
- [x] Run focused tests, full tests, typecheck, graph update.

## Review
- Removed runtime label slug aliases from schema display and schema transport payload mapping.
- Schema transport now builds model payload from exact field-id values plus binding `inputMapping`; stale label keys only resolve when exact field id/model key still identifies the field.
- Bulk upload still presents exact `modelKey` columns from bindings, so dataframe feature names remain the CSV contract.
- Added exact-case/symbol test for model feature names.
- Verification:
  - `vp test schema-bulk-label-mapping schema-run-transport-mapping schema-run-display schema-plugin-transport` passed: 15 tests.
  - `vp test schema-bulk-label-mapping schema-run-transport-mapping schema-run-display schema-plugin-transport schema-run-history schema-one-hot-select-values bulk-upload` passed: 42 tests.
  - `vp test` passed: 32 files, 136 tests.
  - `vp exec tsc -b` passed.
  - `npx react-doctor@latest --verbose` completed: score 71, 51 existing warnings.
  - `vp fmt src\app\utils\mlform\schema-run-transport.ts src\app\utils\mlform\schema-run-input-mapping.ts src\app\utils\mlform\schema-run-payload.ts src\schemas\schema-run-display.ts src\schemas\schema-run-bulk-inputs.ts test\schema-bulk-label-mapping.test.ts test\schema-run-transport-mapping.test.ts --check` passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 8884 nodes, 19235 edges, 459 communities.
  - `vp check` blocked by existing repo-wide formatting issues in `dist/` and 612 files.
