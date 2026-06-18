# Review Domain Merge

## Goal

- [x] Merge `frontend/src/schema-review` into `frontend/src/review`.
- [x] Move `frontend/src/api/schema-review` into `frontend/src/api/review`.
- [x] Move `frontend/src/algorithms/schema-review` into `frontend/src/algorithms/review`.
- [x] Leave no stale `schema-review` source folder or import path.

## Plan

- [x] Move files/directories with same names first, no behavior rewrite.
- [x] Rewrite imports from `schema-review` paths to `review` paths.
- [x] Keep URLs/tokens/backend endpoint strings unchanged unless they are frontend ownership names.
- [x] Run TypeScript, tests, line-count, react-doctor, graph update.

## Review

- Moved feature UI from `frontend/src/schema-review` to `frontend/src/review`.
- Moved API domain from `frontend/src/api/schema-review` to `frontend/src/api/review`.
- Moved algorithms from `frontend/src/algorithms/schema-review` to `frontend/src/algorithms/review`.
- Updated frontend route ownership and generated links from `/schema-review/...` to `/review/...`.
- Kept backend endpoint strings as `/api/schema-review-links` because that is the server contract.
- Removed old `schema-review` source directories; stale-path grep has no matches.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 29 files / 100 tests.
  - Repo: frontend source/test line-count passed, no file >300 lines.
  - Repo: old `frontend/src/schema-review`, `frontend/src/api/schema-review`, and `frontend/src/algorithms/schema-review` paths are absent.
  - Repo: stale path grep passed for old imports/routes and accidental `/api/review-links`.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 214 warnings.
  - Repo: `graphify update .` passed.

# Frontend API Architecture Move

## Goal

- [x] Move frontend API contracts into `frontend/src/api`.
- [x] Organize by domain first: `dtos/`, `services/`, `hooks/`.
- [x] Enforce max one DTO/service/hook export per file with arch tests.
- [x] Leave feature folders using API only, not owning API contracts.

## Plan

- [x] Audit current `*/api/*Service.ts`, `*/hooks.ts`, `*/types.ts`, and API-like hook files.
- [x] Create `src/api/<domain>/{dtos,services,hooks}` and move files with semantic names.
- [x] Split DTO/service/hook files so each file owns one DTO, service fn, or TanStack hook.
- [x] Rewrite imports in app and tests.
- [x] Add one architecture test that fails on misplaced API files or multi-symbol API files.
- [x] Run TypeScript, tests, line-count, react-doctor, graph update.

## Review

- Created `frontend/src/api/{admin-users,core,infrastructure,models,plugins,schema-review,schemas,search,user,workspace}`.
- Split API into 100 DTO files, 79 service files, and 62 hook files; barrels only re-export.
- Removed legacy feature-owned API files such as `schemas/types.ts`, `models/api/*`, `workspace/api/*`, `user/hooks.ts`, and similar.
- Added `frontend/test/api-architecture.test.ts` to enforce API location and max one DTO/service/hook owner per file.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 29 files / 100 tests.
  - Repo: no frontend source/test file over 300 lines.
  - Repo: no legacy `*/api/` files outside `src/api`.
  - Repo: no stale imports to removed API/type paths.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 214 warnings.
  - Repo: `graphify update .` passed.

# Frontend Algorithms TSDoc Audit

## Goal

- [x] Ensure every frontend algorithm lives under `frontend/src/algorithms` or is explicitly non-algorithm wiring/UI/API/hook/type/config.
- [x] Rename vague algorithm folders to semantic names.
- [x] Add detailed TSDoc to algorithm exports and named internal helpers: purpose, args, return, throws, side cases/side effects.

## Plan

- [x] Audit exported algorithm symbols and missing TSDoc.
- [x] Rename vague runtime folder to semantic domain name.
- [x] Add/upgrade TSDoc on exported algorithm functions/constants/types and named internal helpers.
- [x] Run TypeScript, tests, line-count, react-doctor, graph update.

## Review

- Renamed `frontend/src/algorithms/schema/run-runtime` to `frontend/src/algorithms/schema/runtime-assembly`.
- Added TSDoc to all 463 named algorithm symbols under `frontend/src/algorithms`; audit reports 0 missing blocks.
- Export audit covers all 223 exported algorithm symbols; reports 0 missing and 0 malformed blocks.
- TSDoc covers purpose, params when present, return behavior, throws, and side cases/effects via `@param`, `@returns`, `@throws`, and `@remarks`.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 28 files / 98 tests.
  - Repo: frontend source/test line-count passed, no file >300 lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 158 warnings.
  - Repo: `graphify update .` passed.

# Frontend Algorithms Full Move

## Goal

- [x] Move remaining non-schema frontend algorithms under `frontend/src/algorithms`.
- [x] Leave feature folders for UI, hooks, API, DTO/types, runtime wiring only.
- [x] Keep behavior unchanged.

## Plan

- [x] Audit pure helpers outside `src/algorithms`.
- [x] Move pure model, MLForm, admin infra, plugin, review, editor, search helpers by domain.
- [x] Update imports/tests.
- [x] Run TypeScript, focused tests, line-count, react-doctor, graph update.

## Review

- Moved non-schema pure algorithms into `frontend/src/algorithms/{admin,editor,mlform,models,plugin,review,schema-review,search,workspace}`.
- Moved remaining schema runtime/report algorithms into `frontend/src/algorithms/schema/{run-transport,custom-report-fetch,report-plugin-context,run-debug}`.
- Left hooks, API clients, DTO/types, atoms, runtime mount/registry wiring, plugin loaders/renderers, and route/UI files in feature folders.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 28 files / 98 tests.
  - Repo: frontend source/test line-count check passed, no file >300 lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 158 warnings.
  - Repo: `graphify update .` passed.

# Frontend Algorithms Final Audit

## Goal

- [x] Audit remaining exported logic outside `frontend/src/algorithms`.
- [x] Move remaining algorithm-like plugin/catalog/runtime helpers with semantic names.
- [x] Leave only wiring, API, hooks, UI, atoms, DTO/types, config.

## Plan

- [x] Classify non-algorithm files outside `src/algorithms`.
- [x] Move plugin source runtime/detection/catalog helpers.
- [x] Move MLForm runtime mapping helpers if separable without churn.
- [x] Update imports, tests, TypeScript, full tests, line-count, react-doctor, graph update.

## Review

- Moved final algorithm-like leftovers:
  - `plugin/custom-field-source-runtime`
  - `plugin/custom-report-source-runtime`
  - `plugin/catalog-loader`
  - `plugin/catalog-page-model`
  - `plugin/custom-field-catalog`
  - `plugin/custom-report-catalog`
  - `mlform/builtin-registry`
  - `models/prediction-catalog-definitions`
  - `schema/runtime-assembly`
- Remaining non-`algorithms` exported logic is wiring/UI/API/hooks/types/config only: startup gate/readiness, error sink, MLForm mount/headless/primitive registry, renderers, atoms, editor config, local questionnaire transport, hooks.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 28 files / 98 tests.
  - Repo: frontend source/test line-count check passed, no file >300 lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 158 warnings.
  - Repo: `graphify update .` passed.

# Frontend Schema Algorithms Move

## Goal

- [x] Move schema-touching frontend algorithms under `frontend/src/algorithms/schema`.
- [x] Keep old feature folders as usage/wiring only, not algorithm homes.
- [x] Preserve schema merge, one-hot category, visible input reconstruction, bulk upload, export, and transport payload behavior.

## Plan

- [x] Identify pure schema algorithms and current callers.
- [x] Create screaming architecture folders:
  - `schema/merge` for multi-model schema composition.
  - `schema/one-hot-category` for one-hot field collapse/counting.
  - `schema/input-display` for visible input reconstruction, prefill, mapped input reconstruction, and input merging.
  - `schema/report-display` for result report normalization/renderability.
  - `schema/bulk-upload` for model-facing bulk schema and serialized value reconstruction.
  - `schema/export` for CSV export build/download.
  - `schema/runtime-payload` for MLForm serialized values -> canonical/field/visible payload.
  - `schema/model-input-mapping` for per-binding model input mapping.
- [x] Move code, update imports, delete obsolete algorithm files.
- [x] Run focused schema tests, TypeScript, line-count, `graphify update .`.

## Review

- Created `frontend/src/algorithms/schema/{merge,one-hot-category,input-display,report-display,bulk-upload,export,runtime-payload,model-input-mapping}`.
- Follow-up audit moved remaining pure schema helpers to `binding-rebase`, `feedback-steps`, `feedback-state`, `pending-feedback`, `report-descriptor`, `version-selection`, and `run-cache`.
- Removed old algorithm homes from `src/schemas` and `src/app/utils/mlform`; callers now import algorithms directly where used.
- Split former `schema-run-display.ts` into input reconstruction and report display modules.
- Made schema export helper `getSchemaRunModelInputColumns` internal after `react-doctor` flagged it unused.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test test/schema-composer.test.ts test/one-hot-schema.test.ts test/schema-bulk-mapped-to.test.ts test/schema-one-hot-select-values.test.ts test/schema-run-display.test.ts test/schema-run-export-parity.test.ts test/schema-run-history.test.ts test/schema-bulk-label-mapping.test.ts` passed, 6 files / 21 tests.
  - `frontend`: `vp test test/schema-binding-rebase.test.ts test/schema-feedback-state.test.ts test/schema-version-selectors-and-search-shortcut.test.ts test/schema-run-save-modal.test.ts test/schema-run-bulk-refresh.test.ts test/schema-review-output-context.test.ts test/schema-report-renderer.test.ts test/schema-feedback-steps.test.ts` passed, 8 files / 28 tests.
  - Repo: frontend source/test line-count check passed, no file >300 lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with existing 161 warnings.
  - Repo: `graphify update .` passed.

# Schema Plugin Explanation Input Mapping Fix

## Goal

- [x] Explanation report fetch sends only target model features.
- [x] Multi-model schema fields do not leak other-model mapped keys into `/api/analyzer/explanations`.
- [x] Keep save-modal pending/error behavior from previous fix.

## Plan

- [x] Make custom report fetch request values model-scoped, using per-binding `modelInput`.
- [x] Add regression that inspects explanation request bodies for each model.
- [x] Run focused schema plugin tests, TS, line counts, react-doctor, graph update.

## Review

- Custom report fetch now sends per-model `modelInput` as `values`, `fieldValues`, `serializedValues`, `serializedFieldValues`, and `meta.backendFieldValues`.
- Schema report wrapper now prefers per-report `modelInput` for `backendFieldValues`, avoiding stale/global meta payloads.
- Transport regression checks `/api/analyzer/explanations` bodies: model-1 gets `{ age, rec }`, model-2 gets `{ years, don }`.
- Verification:
  - `frontend`: `vp test test/schema-plugin-transport.test.ts test/schema-plugin-lifecycle.test.ts test/schema-plugin-policy.test.ts` passed, 14 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - Repo: touched source/test line-count check passed; largest touched test 294 lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with existing 161 warnings.
  - Repo: `graphify update .` passed.

# Schema Plugin Error Regression Guard

## Goal

- [x] Add regression coverage for strict custom-report payload schema.
- [x] Prove mounted-style schema submit does not turn unsupported custom reports into MLForm `ERROR`.
- [x] Keep test change inside existing schema plugin lifecycle coverage.

## Plan

- [x] Make fake Crystal Tree report validate payload shape with `payloadSchema`.
- [x] Assert unsupported mapped report remains non-error after mounted-style `form.submit()`.
- [x] Assert unsupported mapped report no longer keeps schema run pending forever.
- [x] Run focused tests, TS, line-count check, graph update.

## Review

- Added strict `payloadSchema` to lifecycle fake Crystal Tree report so sentinel/placeholder payloads fail like real plugin payload validation.
- Mounted-style submit regression now asserts unsupported mapped custom report remains `idle` with `error === null`.
- Unsupported custom reports now write only an internal `skippedReportIds` raw marker; MLForm `reports` stays clean, and `reportsPending` ignores those ids.
- Verification:
  - `frontend`: `vp test test/schema-plugin-lifecycle.test.ts test/schema-plugin-transport.test.ts test/schema-plugin-policy.test.ts` passed, 14 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - Repo: touched source/test line-count check passed: largest touched test 294 lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with existing 161 warnings.
  - Repo: `graphify update .` passed.

# Schema MLForm Mounted Fetch Fix

## Goal

- [x] Mounted schema form fetches custom reports after submit.
- [x] Report cards no longer show error solely because fetch was not executed.
- [x] Keep transport report fetch scoped to schema custom reports only.

## Plan

- [x] Reproduce mounted/UI fetch path with narrow test or runtime inspection.
- [x] Patch smallest path that makes MLForm report fetch execute for mounted form.
- [x] Verify focused tests, TS, line count, graph update.

## Review

- Restored schema custom report prefetch in transport, scoped to reports with custom fetch definitions and successful model context.
- Kept MLForm runtime fetch support for headless pipeline, but mounted schema UI no longer depends on report-pane/lifecycle lazy fetch.
- Removed second mounted `executeReportFetches()` pass; transport prefetch is single fetch path for mounted schema UI.
- Failed/unsupported per-model custom report fetch is omitted from MLForm `reports`, avoiding invalid plugin payload/schema error cards.
- Verification:
  - `frontend`: `vp test test/schema-plugin-transport.test.ts test/schema-plugin-lifecycle.test.ts test/schema-plugin-policy.test.ts` passed, 14 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: touched file line-count check passed; all touched source/test files <300 lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx react-doctor@latest --verbose` completed with existing 161 warnings.
  - Repo: `graphify update .` passed.

# Schema MLForm Report Fetch Cleanup

## Goal

- [x] Remove MLSuite manual custom-report prefetch from schema transport.
- [x] Use MLForm report fetch orchestration for custom report payloads.
- [x] Keep schema report context/model binding behavior intact.

## Plan

- [x] Move post-submit custom report fetching to MLForm runtime APIs.
- [x] Delete the app-owned custom-report fetch helper and unused transport dependency.
- [x] Update schema plugin regressions to use upstream pipeline/fetch behavior.
- [x] Run focused frontend tests, typecheck, line-count check, graph update.

## Review

- Removed `schema-run-custom-report-fetch.ts`; schema transport now only submits predictions.
- Schema custom reports now fetch through MLForm runtime orchestration: tests use `executeFormPipeline()`, mounted UI uses upstream `executeReportFetches()` after submit because MLForm kit submit does not expose pipeline mode.
- Kept MLSuite-only context patching for mapped model report fetches; no model context still returns skipped payload and does not call analyzer fetch.
- Verification:
  - `frontend`: `vp test test/schema-plugin-transport.test.ts test/schema-plugin-lifecycle.test.ts test/schema-plugin-policy.test.ts` passed, 13 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: touched file line-count check passed; all touched source/test files <300 lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx react-doctor@latest --verbose` completed with existing 161 warnings.
  - Repo: `graphify update .` passed; graph rebuilt.

# Schema Classifier Feedback And Input Display Fix

## Goal

- [x] Classifier assessment renders as category when report labels/mapping come from mapped classifier payload.
- [x] Saved schema-run inputs render from mapped records, no `N/A` for valid values.

## Plan

- [x] Add focused regression for classifier feedback kind with mapped classifier report payload.
- [x] Add focused regression for visible inputs using per-model `mappedTo` records.
- [x] Patch the smallest source helper(s) shared by modal/history/review.
- [x] Run focused tests, typecheck, graph update.

## Review

- `buildSchemaFeedbackSteps` now uses the resolved display report config when the original schema report has no runtime `id`, so classifier assessment stays `category`.
- Schema input display reads label as UI alias again, but `getMappedSchemaInputRecord` still persists mapped target keys, not label keys.
- Regression covers no-id classifier mapped report feedback and label-backed visible input display/save.
- Verification:
  - `frontend`: `vp test test/schema-feedback-steps.test.ts test/schema-run-display.test.ts test/schema-run-save-modal.test.ts` passed, 16 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 28 files / 98 tests.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with existing 162 warnings.
  - Repo: line-count check passed, no frontend source/test file >300 lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed.
