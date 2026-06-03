# MLSchema 0.2.0 Backend Contract Fix

## Goal
- [x] Keep `mlschema==0.2.0` in backend.
- [x] Use `infer_schema(df)` for field generation.
- [x] Return runtime API shape `{ fields, reports }`.
- [x] Recreate classifier/regressor reports from runtime model metadata.
- [x] Verify backend tests, line cap, graph update.

## Plan
- [x] Restore backend-owned report builder.
- [x] Wrap inferred fields into `{ fields, reports }`.
- [x] Update router annotation and tests.
- [x] Run focused and full backend tests.
- [x] Update graph and review notes.

## Review
- `mlschema==0.2.0` remains locked; old `MLSchema()` facade and strategy registration removed.
- `/build_schema` again returns `{ fields, reports }`.
- `fields` comes from `infer_schema(data_frame)`.
- `reports` is backend-created from runtime model metadata: classifier labels/probabilities or regressor value.
- Generated fallback dataframe no longer forces `dtype=object`, so inferred positional fields stay `number`.
- Verification passed:
  - `uv run pytest tests/test_runtime_api.py` -> 25 passed.
  - `uv run pytest` -> 35 passed, 2 existing sklearn warnings.
  - backend Python line cap -> no files over 300 lines.
  - `git diff --check` -> passed with CRLF warnings only.
  - `graphify update .` -> 7365 nodes, 14362 edges, 362 communities.

# Organization Schema Runs Additive Path

## Goal
- [x] Add org-level schema/run flow beside legacy model/signature/prediction flow.
- [x] Keep existing `/models`, `/api/signatures?modelId=...`, `/api/predictions?signatureId=...`, target, feedback, and review behavior untouched.
- [x] Persist frontend/mlform multi-model run results with backend ownership and binding validation.
- [x] Add minimal `/schemas` frontend route family and result display.
- [x] Verify focused backend/frontend checks, line cap, and graph update.

## Plan
- [x] Add backend `schema` domain entities, repos, DTOs, services, controllers.
- [x] Add backend tests covering success, ownership/binding errors, and partial failure status.
- [x] Add frontend schema API, hooks, routes, pages, and minimal schema-run UI.
- [x] Run focused verification and fix compile/type errors.
- [x] Update graph and review notes.

## Review
- Added additive backend schema domain under `api/src/main/java/dev/ulloasp/mlsuite/schema`.
- Added `Schema`, `SchemaVersion`, `SchemaModelBinding`, `PredictionRun`, `PredictionResult`.
- Added schema controllers and ports without changing legacy model/signature/prediction controllers.
- Backend run persistence validates org scope, bound model/signature pairs, duplicate/missing/unbound results, and aggregates `SUCCESS`/`PARTIAL_SUCCESS`/`FAILED`.
- Added frontend `/schemas` route family, schema service/hooks, JSON-based version creation, mlform multi-binding client fan-out, and nested run result page.
- Verification:
  - `mvn -Dtest=SchemaFlowServiceTest test` passed.
  - `pnpm build` passed.
  - modified/new source line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7576 nodes, 14829 edges, 384 communities.
  - Full `mvn test` still fails on existing suite debt: ArchUnit service dependencies in old controllers and stale prediction package tests.

# Schemas Sidebar Link

## Goal
- [x] Add `/schemas` to main sidebar.
- [x] Keep permission gating aligned with existing route.
- [x] Verify frontend check and graph update.

## Review
- Added `Schemas` sidebar navigation item in `frontend/src/app/components/Sidebar.tsx`.
- Uses `canViewModels`, matching `/schemas` route guard.
- Verification:
  - `vp exec tsc -b` passed.
  - `vp check` blocked by existing generated `dist/` formatting issues.
  - `git diff --check` passed with CRLF warnings only.
  - `Sidebar.tsx` line cap OK at 160 lines.
  - `graphify update .` passed: 7578 nodes, 14832 edges, 397 communities.

# Schema Create Composer

## Goal
- [x] Replace JSON schema create UI with model/signature selection.

# Schema Plugin Multi-Model Fix

## Goal
- [x] Make schema custom reports execute with signature-compatible per-model context.
- [x] Keep schema run form mounted when save modal opens/closes.
- [x] Persist async plugin report payloads into owning `PredictionResult.output`.
- [x] Restore schema external review layout/context behavior to legacy prediction review.
- [x] Verify focused frontend tests, typecheck, line cap, diff, graph update.

## Plan
- [x] Create report context even when payload is absent so MLForm can fetch custom reports.
- [x] Wrap schema custom report `fetch.submit` requests with per-report model context.
- [x] Add schema run raw builder for async report-state persistence.
- [x] Stabilize schema form effect deps and stream report-state updates to save modal.
- [x] Restore schema review workspace side context and step-change events.
- [x] Run verification and document results.

## Review
- Schema transport now creates `reportContextById` for every allowed mapped report before plugin payload exists, so custom reports can fetch per model.
- Schema custom report definitions now wrap `fetch.submit` as well as descriptor render, injecting `modelId`, `backendUrl`, and `backendFieldValues` for the selected report/model.
- Schema run form no longer depends on unstable catalog object identity and streams `lastResult/reportStates` updates into the save modal.
- Async plugin report payloads are copied into the owning result output under both source id and schema report id before persistence.
- Save modal waits while plugin reports are idle/loading and then saves final raw payload.
- Schema external review restores the legacy three-column shell with `ReviewStepContextPanel` and step-change events from the schema questionnaire.
- Verification:
  - `vp test schema-plugin-policy schema-feedback schema-run-history one-hot-schema` passed: 4 files, 22 tests.
  - `vp exec tsc -b` passed.
  - frontend line cap passed.
  - `git diff --check` passed with CRLF warnings only.

# Schema Plugin Browser Debug Logs

## Goal
- [x] Add temporary browser logs for schema plugin path.
- [x] Trace catalog, mount, submit, model calls, report mapping, plugin fetch, render.
- [x] Keep logs isolated and easy to remove.
- [x] Verify focused frontend checks.

## Plan
- [x] Add small debug logger helper with stable prefix.
- [x] Instrument schema plugin catalog/runtime/mount/transport/custom-report fetch/renderer.
- [x] Run focused tests, typecheck, line cap, diff, graph.

## Review
- Added `schema-run-debug.ts` with prefix `[schema-plugin-debug]`.
- Browser logs exposed root cause: schema binding ids arrived as numbers, but custom report fetch required string `modelId`.
- `fetchSchemaCustomReports` now accepts numeric/string context ids and sends plugin `meta.modelId` as string.
- Added regression for numeric backend ids calling explanations with `modelId=1`.
- Instrumented:
  - catalog load/skip/error.
  - schema form render/mount/cleanup/submit/result update.
  - MLForm mount afterSubmit/onSubmitError.
  - runtime normalization and custom kind registration.
  - model prediction requests/responses.
  - report output mapping/context creation.
  - custom report fetch selection/context/call/error/success.
  - saved/live custom report descriptor/render path.
- Verification:
  - `vp test schema-plugin-readiness schema-plugin-transport schema-plugin-lifecycle schema-plugin-defaults schema-plugin-policy schema-feedback schema-report-renderer schema-binding-rebase schema-run-history one-hot-schema` passed: 40 tests.
  - `vp exec tsc -b` passed.
  - frontend line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` completed: score 88, 45 warnings, non-fatal dead-code scan failure.
  - `graphify update .` passed: 8313 nodes, 17117 edges, 452 communities.
  - `npx react-doctor@latest --verbose` completed: score 88, 45 warnings, non-fatal dead-code scan failure.
  - `graphify update .` passed: 8284 nodes, 16976 edges, 404 communities.
  - `npx react-doctor@latest --verbose` completed: score 88, 45 warnings, non-fatal dead-code scan failure.
  - `graphify update .` passed: 8271 nodes, 16954 edges, 456 communities.
  - `npx react-doctor@latest --verbose` passed with score 88/100, 46 warnings, non-fatal dead-code scan failure.
  - `graphify update .` passed: 8130 nodes, 16455 edges, 426 communities.

# Schema Plugin Fetch Regression Fix

## Goal
- [x] Fix Crystal Tree error after schema run plugin wrapper.
- [x] Stop schema run form remount/flush when modal or async reports update.
- [x] Verify focused tests, typecheck, line cap, diff, graph update.

## Plan
- [x] Patch wrapper to resolve report id from MLForm `{ reportId, config }` fetch context.
- [x] Patch both top-level `fetch` and inner `definition.fetch` used by MLForm registration.
- [x] Use refs for schema form submit/result callbacks so mount effect does not depend on changing parent callbacks.
- [x] Replace false-positive plugin wrapper test with MLForm-shaped fetch context.
- [x] Run verification and document results.

## Review
- Crystal Tree fix: schema wrapper now reads MLForm fetch context via `reportId`, `config.id`, or `report.id`.
- Wrapper now patches both `DefinedReportKind.fetch` and inner `definition.fetch`; MLForm registration uses inner definition.
- Schema run form now stores `onSubmit`/`onResultUpdate` in refs, so modal/result state updates no longer remount MLForm host.
- Regression test now calls `wrapped.definition.definition.fetch({ reportId: "..." })`, matching upstream MLForm shape.
- Plugin code does not need change as long as absent payload resolve returns `undefined`.
- Verification:
  - `vp test schema-plugin-policy` passed: 9 tests.
  - `vp test schema-plugin-policy schema-feedback schema-run-history one-hot-schema` passed: 4 files, 22 tests.
  - `vp exec tsc -b` passed.
  - frontend line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 8143 nodes, 16531 edges, 449 communities.

# Schema Predict Again Flush Fix

## Goal
- [x] Stop predict-again schema runs from flushing form after submit/modal updates.
- [x] Keep normal run path unchanged.
- [x] Verify focused tests, typecheck, line cap, graph update.

## Plan
- [x] Freeze predict-again prefill inputs as first-load snapshot.
- [x] Prevent React Query source run refetch from rebuilding `formSchema`.
- [x] Run focused verification.

## Review
- `CreateSchemaRunPage` now stores predict-again `initialInputs` in a ref once `sourceRun` first loads.
- This prevents `SchemaRunForm` from receiving a new `initialInputs` object on rerender/refetch, which was changing `formSchema` and remounting MLForm.
- Verification:
  - `vp exec tsc -b` passed.
  - `vp test schema-plugin-policy schema-feedback schema-run-history one-hot-schema` passed: 4 files, 22 tests.
  - frontend line cap passed.

# Schema Crystal Tree Deep Fix

## Goal
- [x] Diagnose Crystal Tree schema error beyond previous wrapper fix.
- [x] Add highly specific MLForm runtime-path tests.
- [x] Make schema custom report failures best-effort per model.
- [x] Ensure skipped custom reports do not render or block save.
- [x] Verify focused tests, typecheck, line cap, diff, graph update.

## Plan
- [x] Add test for `createSchemaRunRuntime -> transport.submit -> createReportFetchRequest -> registry report fetch`.
- [x] Assert report fetch receives `modelId` query and backend-shaped instance.
- [x] Add test for unsupported custom report fetch becoming skipped payload.
- [x] Add skipped payload sentinel in schema report wrapper.
- [x] Filter skipped payloads from persisted/displayed schema reports.
- [x] Run verification and document results.

## Review
- Schema custom report fetch now catches per-model fetch failure and returns internal skipped payload.
- Wrapped schema custom report presenters return `null` for skipped payloads, so failed model/plugin reports do not render as error cards.
- `buildSchemaRunRawFromSubmitResult` ignores skipped payloads and marks reports not pending, so save modal does not block forever.
- `getSchemaResultReports` filters skipped payloads defensively for history/detail/review.
- Added runtime-path regression test using MLForm `createReportFetchRequest`; it asserts model-specific fetch URL contains `modelId=model-1` and request body uses `{ age: 42 }`.
- Verification:
  - `vp test schema-plugin-policy` passed: 8 tests.
  - `vp test schema-plugin-policy schema-feedback schema-run-history one-hot-schema` passed: 4 files, 21 tests.
  - `vp exec tsc -b` passed.
  - frontend line cap passed.
  - `git diff --check` passed with CRLF warnings only.
- [x] Compose canonical form fields/reports from selected signatures.
- [x] Create hidden per-binding input/output mappings.
- [x] Persist schema + immutable v1 in one create flow.
- [x] Verify frontend typecheck, line cap, graph update.

## Plan
- [x] Add schema composition helper with merge algorithm.
- [x] Add model/signature selector component.
- [x] Rewrite create schema page around selector and composer.
- [x] Run verification and document results.

## Review
- `frontend/src/schemas/pages/create-schema-page.tsx` now creates schema + v1 from selected models.

# Schema Feedback And Review Parity

## Goal
- [ ] Fix schema run plugin catalog loading before mlform play.
- [ ] Add authenticated feedback questionnaire for schema runs.
- [ ] Add schema inference history feedback status/export/share review parity.
- [ ] Add schema review links with dedicated backend tables/endpoints.
- [ ] Keep legacy signature prediction feedback/review untouched.
- [ ] Verify focused backend/frontend tests and graph update.

## Plan
- [x] Wire custom plugin definitions into schema run mount.
- [x] Add schema feedback step builder and run questionnaire UI.
- [x] Add schema review backend domain/service/controller/DTOs.
- [x] Add schema review frontend API/hooks/routes/pages.
- [x] Extend history/export/share controls for schema runs.
- [x] Add focused tests and run verification.

## Review
- Schema run play now loads active mlform plugin catalog before mounting custom fields/reports.
- Schema run detail now shows feedback questionnaire backed by `prediction_result_feedback`.
- Schema history now tracks feedback status, supports review links, and exports feedback while hiding one-hot internals.
- Added dedicated schema review link backend tables/entities/endpoints under `/api/schema-review-links`.
- Added `/schema-review/:token` frontend review workspace with login/protected routes.
- Predict-again mapped-category defaults now expand even when user does not touch select.
- Verification:
  - `vp test schema-feedback schema-run-history schema-plugin-policy` passed: 3 files, 9 tests.
  - `vp exec tsc -b` passed.
  - `mvn "-Dtest=SchemaReviewLinkServiceTest,SchemaFlowServiceTest" test` passed: 9 tests.
  - modified/new source line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7998 nodes, 16032 edges, 425 communities.
  - `npx react-doctor@latest --verbose` timed out after 124s.
- `frontend/src/schemas/components/SchemaModelSelector.tsx` lets user select models using their current first signature.
- `frontend/src/schemas/schema-composer.ts` merges fields by normalized `label + kind`.
- Hidden mappings generated:
  - `inputMapping`: canonical backend key -> model backend key.
  - `outputMapping`: canonical report id -> model report source/id.
- `formSchema` stores canonical fields only; report mappings remain binding metadata, not user-facing UI.
- Verification:
  - `vp exec tsc -b` passed.
  - modified/new source line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7598 nodes, 14892 edges, 406 communities.

# Schema Create Editor Reveal

## Goal
- [x] Show schema editor immediately after model selection.
- [x] Seed editor with composed canonical schema.
- [x] Persist edited schema while keeping mappings hidden.
- [x] Verify frontend typecheck, line cap, diff check, graph update.

## Plan
- [x] Connect selected models to editor atoms.
- [x] Rebase hidden input mappings when edited field backend keys change.
- [x] Keep create flow saving edited `formSchema`.
- [x] Run focused verification and document results.

## Review
- `frontend/src/schemas/pages/create-schema-page.tsx` now mounts `EditorWrapper` as soon as at least one model is selected.
- Editor state is seeded from `composeSchemaVersion(...)`.
- Save uses edited schema JSON and rebases hidden binding `inputMapping` by stable field ids.
- Verification:
  - `vp exec tsc -b` passed.
  - modified/new source line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7601 nodes, 14911 edges, 391 communities.

# Schema Create Version Flow Correction

## Goal
- [x] Remove schema description from create UI.
- [x] Include generated reports in composed schema so MLForm can render them.
- [x] Match create-signature flow: create new schema or create new version from existing schema.
- [x] Verify frontend typecheck, line cap, diff check, graph update.

## Plan
- [x] Inspect signature create/version UX and schema routes/API.
- [x] Update composer to preserve canonical reports in `formSchema`.
- [x] Update create schema page with mode selector and existing schema selection.
- [x] Update lessons, run verification, document results.

## Review
- Create schema UI no longer asks for description.
- `composeSchemaVersion` now stores canonical reports in `formSchema.reports`, so editor/mlform receive them.
- `/schemas/create` supports two paths: create schema + v1, or create new version for an existing schema.
- `SchemaDetailPage` links to `/schemas/create?schemaId=...` for version creation and no longer exposes raw JSON version form.
- Removed unused raw JSON version form components.
- Verification:
  - `vp exec tsc -b` passed.
  - modified/new source line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7602 nodes, 14918 edges, 407 communities.

# Schema Create Step Split And Locked Version Models

## Goal
- [x] Split schema creation into model-selection step and editor step.
- [x] For new versions, keep existing schema bindings/models locked.
- [x] Seed new-version editor from latest existing schema version.
- [x] Verify frontend typecheck, line cap, diff check, graph update.

## Plan
- [x] Inspect schema create page/hooks/types.
- [x] Add step state for create flow.
- [x] Use latest version bindings for version flow, no model selector.
- [x] Update lessons and verification notes.

## Review
- `/schemas/create` now uses two workflow steps for new schemas: choose models, then edit generated schema.
- Create mode hides editor until user continues from model selection.
- Version mode loads latest existing `SchemaVersion`, seeds editor from its `formSchema`, and reuses its bindings.
- Version mode no longer shows `SchemaModelSelector`; model/signature pairs are locked.
- Save still rebases hidden input mappings when edited schema field backend keys change.
- Verification:
  - `vp exec tsc -b` passed.
  - line cap passed: `create-schema-page.tsx` 288 lines.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7604 nodes, 14925 edges, 396 communities.

# Schema One-Hot Mapped Category Merge

## Goal
- [x] Detect safe one-hot field groups during schema composition.
- [x] Replace groups with visible `mapped-category` master fields plus hidden submitted subordinate fields.
- [x] Keep model input mappings targeting subordinate one-hot fields.
- [x] Count visible user fields, not hidden subordinate fields.
- [x] Verify frontend typecheck, line cap, diff check, graph update.

## Plan
- [x] Add one-hot grouping helper with conservative `__`/`_` parsing.
- [x] Run helper on each model signature before canonical merge.
- [x] Export visible-field count helper and use it in create page.
- [x] Run focused verification and update review notes.

## Review
- Added `frontend/src/schemas/one-hot-schema.ts`.
- Schema composer now transforms safe one-hot groups into one visible `mapped-category` field plus hidden subordinate fields.
- Detection is conservative: numeric/boolean groups, 2+ columns, `__` or `_` split, no existing base field.
- `inputMapping` skips the visible mapped-category master and maps hidden subordinate fields to model one-hot keys.
- Create schema page now counts visible fields only.
- Added `frontend/test/schema-composer.test.ts` covering success, singleton non-conversion, and base-field conflict non-conversion.
- Verification:
  - `vp test schema-composer` passed: 1 file, 3 tests.
  - `vp exec tsc -b` passed.
  - line cap passed: helper 105, composer 134, create page 287, test 78.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7622 nodes, 14972 edges, 402 communities.

# Schema Run View Height Clamp

## Goal
- [x] Limit schema prediction-run page to available viewport height.
- [x] Keep MLForm scrolling inside its own available area.
- [x] Preserve loading/empty states.
- [x] Verify frontend typecheck, line cap, diff check, graph update.

## Plan
- [x] Change run page shell to flex/min-h-0/overflow-hidden.
- [x] Change schema run form host to flex-1/min-h-0/overflow-auto.
- [x] Update lessons and verification notes.

## Review
- `CreateSchemaRunPage` now uses a flex `min-h-0` viewport shell with `overflow-hidden`.
- Header and run-name input stay fixed height; MLForm area gets remaining height.
- `SchemaRunForm` host now uses `size-full min-h-0 overflow-auto`, removing fixed `min-h-[620px]`.
- Verification:
  - `vp exec tsc -b` passed.
  - line cap passed: run page 65, run form 53.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7623 nodes, 14976 edges, 394 communities.

# Schema Create Model Step Layout

## Goal
- [x] Make `/schemas/create` create-only unless `schemaId` query explicitly opens version mode.
- [x] Move model/field/report counts and main CTA into the top name panel.
- [x] Give model selection an internal scroll area.
- [x] Make model tiles responsive up to 3 columns.
- [x] Verify frontend typecheck, line cap, diff check, graph update.

## Plan
- [x] Remove visible create/version switch and existing-schema picker from create route.
- [x] Keep version mode only for `/schemas/create?schemaId=...`.
- [x] Restructure create form shell with fixed top command panel and scrollable selector/editor body.
- [x] Update selector grid layout and scroll behavior.
- [x] Update lessons and verification notes.

## Review
- `/schemas/create` now shows only new-schema creation. Version mode is only reachable through `/schemas/create?schemaId=...`.
- Removed visible `Create schema`/`New version` switch and existing-schema select from the create page.
- Top command panel now contains schema name, model/field/report counts, and primary continue/create action.
- Model selector now scrolls internally and uses `md:grid-cols-2 xl:grid-cols-3`.
- Verification:
  - `vp exec tsc -b` passed.
  - line cap passed: create page 243, model selector 107.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7625 nodes, 14979 edges, 385 communities.
  - `vp dlx react-doctor@latest --verbose` failed before analysis: package import error `Cannot find package 'oxc-parser'`.

# Schema One-Hot Mapped Category Payload Fix

## Goal
- [x] Exclude visible `mapped-category` master value from schema-run/analyzer payload.
- [x] Prevent one-hot subordinate id collisions for category values containing `+`, `-`, or other non-slug chars.
- [x] Keep subordinate one-hot values numeric `0/1`, not `null`.
- [x] Add regression test for blood-group-style plus/minus categories.
- [x] Verify focused test, typecheck, line cap, diff check, graph update.

## Plan
- [x] Mark generated mapped-category master with `includeInSubmission: false`.
- [x] Generate subordinate ids from encoded backend key instead of lossy slug.
- [x] Extend composer test with `A+`/`A-` categories and payload-facing mappings.
- [x] Run verification and document result.

## Review
- `createMasterField` now sets `includeInSubmission: false`.
- One-hot generated ids now encode non-alphanumeric chars before slugging, so `A+` and `A-` no longer collapse to same target id.
- Added regression covering `rec_blood_group__A+`, `rec_blood_group__A-`, `rec_blood_group__B+`.
- This fixes root issue behind `null` one-hot subordinate values causing pandas `object` dtypes.
- Verification:
  - `vp test schema-composer` passed: 1 file, 4 tests.
  - `vp exec tsc -b` passed.
  - line cap passed: one-hot helper 111, test 102.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7630 nodes, 14987 edges, 389 communities.

# Schema One-Hot Mapping Id Preservation Fix

## Goal
- [x] Fix schema save incompatibility: mapped-category mapping references unknown hidden field.
- [x] Preserve generated one-hot hidden ids through schema composer canonicalization.
- [x] Keep hidden field labels as exact model feature names.
- [x] Add regression for mapped-category mapping ids existing in final schema fields.
- [x] Verify focused test, typecheck, line cap, diff check, graph update.

## Plan
- [x] Reproduce with composer test against plus/minus one-hot categories.
- [x] Change canonical id generation to prefer existing field/report ids.
- [x] Keep input mappings keyed by exact feature labels for now.
- [x] Update lessons and verification notes.

## Review
- Composer now prefers existing `item.id` when canonicalizing fields/reports.
- Generated one-hot hidden ids survive into final `formSchema.fields`.
- Added regression asserting mapped-category option mapping ids exist in final field ids.
- Hidden labels remain exact feature names, so current label-as-feature contract stays intact.
- Verification:
  - `vp test schema-composer` passed: 1 file, 4 tests.
  - `vp exec tsc -b` passed.
  - line cap passed: composer 134, test 107.

# Schema Feature Key BackendKey Removal

## Goal
- [x] Stop writing `ui.backendKey` in organization-level composed schemas.
- [x] Use exact `label` as feature key for schema input mappings and schema-run payloads.
- [x] Keep `id` as internal MLForm/editor id only.
- [x] Preserve one-hot mapped-category hidden labels as exact model features.
- [x] Verify tests, typecheck, line cap, diff check, graph update.

## Plan
- [x] Add local feature-key helper: `label || id`.
- [x] Update schema composer to avoid `ui.backendKey` and build mappings by labels.
- [x] Update create-page binding rebasing to key by label, not `getBackendKey`.
- [x] Update schema-run transport canonical payload to key by label.
- [x] Extend tests to assert no generated `ui.backendKey`.

## Review
- New schema composer no longer writes `ui.backendKey`.
- Schema input mappings use exact field `label` as canonical/model feature key.
- Schema run transport builds canonical payload from field `label`, not `getBackendKey`.
- Create schema version rebasing tracks edited fields by `label`, keyed by stable `id`.
- One-hot detection/subordinate labels use exact labels.
- Verification:
  - `rg "backendKey|getBackendKey" frontend/src/schemas frontend/src/app/utils/mlform/schema-run-transport.ts frontend/test/schema-composer.test.ts` only finds test assertion.
  - `vp test schema-composer` passed: 1 file, 4 tests.
  - `vp exec tsc -b` passed.
  - line cap passed: composer 126, one-hot 109, create page 239, schema-run transport 116, test 108.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7635 nodes, 15002 edges, 430 communities.

# Schema One-Hot After Merge Fix

## Goal
- [x] Apply one-hot mapped-category automation after canonical merge, not per model before merge.
- [x] Preserve per-model input mappings using exact feature labels.
- [x] Add regression where separate models contribute different one-hot columns for same base.
- [x] Verify focused test, typecheck, line cap, diff check, graph update.

## Plan
- [x] Remove per-signature one-hot transform before merge.
- [x] Apply `applyOneHotMappedCategories` to final merged `formSchema`.
- [x] Keep bindings built from raw canonical field map.
- [x] Update tests and lessons.

## Review
- `composeSchemaVersion` now merges raw model signatures first.
- `applyOneHotMappedCategories` now runs on merged `{ fields, reports }`.
- Bindings still build from raw canonical `fieldsState.byKey`, so per-model mappings remain exact labels.
- Added regression where model 1 has `blood_group__A` and model 2 has `blood_group__B`; merged schema becomes one `mapped-category`.
- Verification:
  - `vp test schema-composer` passed: 1 file, 5 tests.
  - `vp exec tsc -b` passed.
  - line cap passed: composer 127, test 140.

# Schema Detail And Version Studio

## Goal
- [x] Schema detail shows schema JSON code for selected version.
- [x] Schema detail shows user-facing input/report counts for selected version.
- [x] Add dedicated new-version page for selected schema lineage.
- [x] New-version page lets user choose base schema version, name next version, edit JSON, save.
- [x] Keep existing schema creation flow untouched.
- [x] Verify typecheck, line cap, diff check, graph update.

## Plan
- [x] Add selected-version summary/code preview to `SchemaDetailPage`.
- [x] Add `CreateSchemaVersionPage` using editor atoms and latest/base version selection.
- [x] Route `/schemas/:schemaId/versions/create`.
- [x] Point detail button to new route.
- [x] Run verification and update lessons/review.

## Review
- `SchemaDetailPage` now shows selected-version JSON, inputs count, reports count, models count.
- Added version selector on detail page.
- `New version` button now opens `/schemas/:schemaId/versions/create`.
- Added `CreateSchemaVersionPage`: choose base version from lineage, enter version name, edit schema JSON, save copied/rebased bindings.
- Added shared `rebaseSchemaVersionBindings` helper and reused it from schema create flow.
- Verification:
  - `vp exec tsc -b` passed.
  - `vp test schema-composer` passed: 1 file, 5 tests.
  - line cap passed: detail 122, version page 138, create page 207, rebase helper 40, routes 248.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7646 nodes, 15059 edges, 385 communities.
  - `vp dlx react-doctor@latest --verbose` still blocked by package error `Cannot find package 'oxc-parser'`.

# Schema Run Reports And Save Modal

## Goal
- [x] Render all schema-run reports in MLForm report pane.
- [x] Keep multi-model fan-out result persistence staged behind a prediction-style save modal.
- [x] Persist successful/failed model results only after user confirms save.
- [x] Verify frontend typecheck, focused tests, line cap, diff check, graph update.

## Plan
- [x] Inspect legacy prediction MLForm transport/modal and current schema-run flow.
- [x] Normalize schema-run transport reports so MLForm can render them by report id/source.
- [x] Add schema-run save modal and wire create-run page to stage submit result.
- [x] Update lessons and verification notes.

## Review
- Schema composer now keeps fields merged, but reports per model binding. Each generated report has unique schema report id and `outputMapping` back to original model report source.
- Schema-run transport now returns MLForm `reports` keyed by schema report id, using analyzer `reports[source]` and legacy classifier/regressor `outputs[]` fallback.
- Shared legacy report normalization moved to `frontend/src/app/utils/mlform/report-normalization.ts`.
- Create schema run no longer persists on MLForm submit. It stages result and opens `SchemaRunSaveModal`; backend persistence happens only on explicit save.
- Verification:
  - `vp test schema-composer` passed: 7 tests.
  - `vp exec tsc -b` passed.
  - modified source line cap passed: max 219 lines.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7670 nodes, 15116 edges, 386 communities.
  - `vp dlx react-doctor@latest --verbose` blocked by external package error: `Cannot find package 'oxc-parser'`.

# Schema Inference History And Rendered Results

## Goal
- [x] Add schema inference history page.
- [x] Show only user-visible inputs in modal/history/detail, hiding one-hot technical fields.
- [x] Render reports as UI cards, not raw JSON.
- [x] Keep old signature prediction history untouched.
- [x] Verify frontend tests/typecheck/line cap/diff/graph.

## Plan
- [x] Inspect legacy prediction history and current schema run DTO/routes.
- [x] Add shared schema-run display helpers/components.
- [x] Wire schema detail/history route and links.
- [x] Replace raw JSON in save modal and run detail.
- [x] Add focused tests and verification notes.

## Review
- Added `/schemas/:schemaId/versions/:versionId/runs` inference history page.
- Schema detail now links each version to Run and Inference history.
- Save modal and run detail now use `SchemaRunInputsPanel` and `SchemaRunResultsPanel`; no raw result JSON.
- Schema-run transport persists user-visible `inputData`; model payload remains in each `PredictionResult.modelInput`.
- `schema-run-display.ts` reconstructs mapped-category values from technical one-hot fields for old/new saved runs.
- Report display maps saved result output through `SchemaVersion.formSchema.reports` + binding `outputMapping`, with classifier/regressor/text rendering.
- Exact MLForm HTML snapshot is not persisted; current implementation renders equivalent report content from schema+payload.
- Verification:
  - `vp test schema-composer` passed: 9 tests.
  - `vp exec tsc -b` passed.
  - modified source line cap passed: max 288 lines.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7706 nodes, 15235 edges, 391 communities.
  - `vp dlx react-doctor@latest --verbose` blocked by external package error: `Cannot find package 'oxc-parser'`.

# Schema Run Display Correction

## Goal
- [x] Use schema report mappings/labels correctly in modal/detail/history.
- [x] Remove outer Model X/SUCCESS result boxes.
- [x] Show every user-visible input, including mapped-category/one-hot values and missing fallbacks.
- [x] Verify tests/typecheck/line cap/diff/graph.

## Plan
- [x] Inspect current schema-run display helpers/components.
- [x] Normalize report payload labels/prediction from report config labels.
- [x] Flatten result UI to direct report cards.
- [x] Merge visible `inputData` with result `modelInput` fallback for old/new runs.
- [x] Add focused regressions and verify.

## Review
- `SchemaRunResultsPanel` now renders report cards directly; removed outer `Model X`/`SUCCESS` wrapper.
- `schema-run-display.ts` normalizes classifier labels/prediction using schema report `labels`, so bars use semantic labels like `Moricion`/`Vivicion`.
- Inputs now merge saved user-facing `inputData` with child `PredictionResult.modelInput` fallback, so old runs and one-hot technical values can reconstruct all visible schema inputs.
- `getVisibleSchemaInputs` now emits all visible schema fields, with `N/A` for missing values instead of dropping fields.
- Added regressions for schema report labels and model-input fallback.
- Verification:
  - `vp test schema-composer` passed: 10 tests.
  - `vp exec tsc -b` passed.
  - modified source line cap passed: max 291 lines.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7712 nodes, 15252 edges, 388 communities.
  - `vp dlx react-doctor@latest --verbose` blocked by external package error: `Cannot find package 'oxc-parser'`.

# Schema Run History Parity

## Goal
- [x] Add schema-run history search/filter/export/select/share-link actions.
- [x] Add schema-run bulk upload using existing CSV/XLSX parser and schema fan-out transport.
- [x] Add predict-again route prefill from saved schema run inputs.
- [x] Keep legacy signature prediction history untouched.
- [x] Document backend-bound review/feedback gap instead of fake UI.
- [x] Verify frontend tests/typecheck/line cap/diff/graph.

## Plan
- [x] Add schema-run export/download and toolbar modules.
- [x] Add selectable history table and filtered history page.
- [x] Add bulk upload hook/button for schema runs.
- [x] Add create-run prefill support via `fromRunId`.
- [x] Run verification and update review notes.

## Review
- Added schema-run history toolbar with search, status/date filters, CSV export, direct-link share, and bulk upload.
- Added selectable schema-run history table; selected rows drive share/export, otherwise current filtered rows are used.
- Added schema-run bulk upload path using existing CSV/XLSX parser plus schema-run mlform runtime transport, including mapped-category one-hot expansion for hidden fields.
- Added `Predict again` on schema-run detail via `fromRunId` prefill; old signature prediction pages untouched.
- Review/feedback parity is not implemented in MVP because current backend review/target/output-feedback/explanation-feedback tables and services are keyed to legacy `Prediction`, not `PredictionRun`/`PredictionResult`.
- Verification:
  - `vp test schema-composer schema-run-history` passed: 2 files, 12 tests.
  - `vp exec tsc -b` passed.
  - modified schema/test line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7743 nodes, 15359 edges, 398 communities.
  - `vp dlx react-doctor@latest --verbose` blocked by external package error `Cannot find package 'oxc-parser'`.

# Schema Predict Again Mapped Category Prefill

## Goal
- [x] Prefill mapped-category fields on schema-run predict again.
- [x] Reconstruct visible value from hidden one-hot fields when direct visible input is missing.
- [x] Add regression test.
- [x] Verify tests/typecheck/line cap/diff/graph.

## Plan
- [x] Add display helper for schema-run prefill inputs.
- [x] Use helper in `SchemaRunForm` before `applyPredictionInputsToSchema`.
- [x] Extend schema-run history tests.
- [x] Run verification and update review notes.

## Review
- Added `getSchemaRunPrefillInputs` in `schema-run-display.ts`.
- `SchemaRunForm` now applies defaults from schema-visible inputs, reconstructing mapped-category values from hidden one-hot mappings when direct visible value is absent.
- Added regression in `schema-run-history.test.ts`.
- Verification:
  - `vp test schema-composer schema-run-history` passed: 13 tests.
  - `vp exec tsc -b` passed.
  - touched file line cap OK: max 140 lines.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7746 nodes, 15369 edges, 385 communities.
# Schema Inference Full Parity Plan

## Goal
- [x] Make schema inference history use same UX contract as signature prediction history.
- [x] Support schema-run search/filter/export/share/bulk/predict-again with shared behavior.
- [ ] Add feedback and review for schema runs/results without reusing legacy `Prediction` rows.
- [x] Add model/signature binding-scoped plugin policy so plugin X can apply only to model Z.
- [x] Preserve legacy Model -> Signature -> Prediction flow.
- [x] Verify backend/frontend tests, line cap, diff, graph.

## Plan
- [x] Phase 1: Align schema inference history UI/actions with legacy history pattern.
- [x] Phase 1: Keep export/share operating on current filtered/selected inference rows.
- [x] Phase 1: Add plugin policy metadata to `SchemaModelBinding` snapshot and DTOs.
- [x] Phase 1: Filter mlform plugin catalog per schema binding before each model execution.
- [ ] Phase 2: Add schema feedback entities keyed to `PredictionResult`, not `Prediction`.
- [ ] Phase 2: Add feedback endpoints/hooks/components matching legacy questionnaire behavior.
- [ ] Phase 3: Add schema review-link entities keyed to `PredictionRun`/`PredictionResult`.
- [ ] Phase 3: Add public schema-review route and review submission flow.
- [ ] Phase 4: Add export/review integration for schema feedback.

## Review
- Schema inference history now follows legacy prediction-history layout:
  - header actions: Share, Bulk Upload, Run
  - toolbar actions: search, status/date filters, Export
- Share is still direct inference links, not review links. Real review links need Phase 3 schema-review domain.
- Added `plugin_policy_json` to `schema_model_binding`.
- Added `pluginPolicy` to backend DTO/request and frontend schema binding types.
- Composer snapshots source signature `fieldKinds`/`reportKinds` per model/signature binding.
- Schema-run transport now blocks mapped reports when a binding policy rejects the report kind.
- Existing legacy prediction/review/feedback path untouched.
- Feedback/review not implemented yet because current backend tables are keyed to legacy `Prediction`; doing this correctly needs new schema feedback/review entities keyed to `PredictionResult`/`PredictionRun`.
- Verification:
  - `vp test schema-composer schema-run-history schema-plugin-policy` passed: 3 files, 15 tests.
  - `vp exec tsc -b` passed.
  - `mvn -Dtest=SchemaFlowServiceTest test` passed: 5 tests.
  - line cap check passed for touched schema/frontend/test paths.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7760 nodes, 15399 edges, 402 communities.
  - `vp dlx react-doctor@latest --verbose` timed out after 120s.

## Non-Negotiables
- Do not create legacy `Prediction` rows for schema runs just to reuse old review code.
- Do not fake feedback status if schema feedback tables do not exist.
- Keep plugin policy immutable inside `SchemaVersion` binding snapshot.
# Continue Schema Inference Parity

## Goal
- [x] Fix predict-again mapped-category default submission.
- [x] Add schema-result feedback persistence keyed to `PredictionResult`.
- [x] Keep legacy prediction feedback unchanged.
- [x] Verify tests/typecheck/backend/graph.

## Plan
- [x] Expand mapped-category option mappings inside schema-run transport before canonical payload mapping.
- [x] Add frontend regression for default mapped-category value producing hidden one-hot payload.
- [x] Add backend schema feedback entities/repositories/DTO/controller/service for result-level output feedback.
- [x] Run focused verification and document remaining review-link phase.

## Review
- Fixed predict-again mapped-category submission by expanding selected option mappings in `schema-run-transport` before canonical payload creation.
- Added regression: default selected mapped-category now sends hidden one-hot fields without requiring user deselect/reselect.
- Added `prediction_result_feedback` backend domain:
  - `PredictionResultFeedback`
  - `PredictionResultFeedbackType`
  - repository, DTOs, use case, service, controller
  - endpoints: `/api/prediction-result-feedback`
- Added frontend API/types/hooks for prediction-result feedback.
- Legacy prediction feedback untouched.
- Remaining next phase: wire feedback questionnaire UI on schema run detail, then schema review-link token flow.
- Verification:
  - `vp test schema-composer schema-run-history schema-plugin-policy` passed: 16 tests.
  - `vp exec tsc -b` passed.
  - `mvn -Dtest=SchemaFlowServiceTest test` passed: 7 tests.
  - line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7808 nodes, 15477 edges, 403 communities.
  - `vp dlx react-doctor@latest --verbose` timed out after 60s.
# Schema Actions Legacy Parity

## Goal
- [x] Explain and encode why legacy action buttons cannot be reused 1:1.
- [x] Upgrade schema bulk/share/export to legacy-level interaction patterns.
- [x] Preserve schema-specific API contracts.
- [x] Verify frontend tests/typecheck/line cap/diff/graph.

## Review
- Legacy buttons are not directly reusable because:
  - `BulkUploadButton` executes one `modelId/signatureId`.
  - `ExportButton` fetches legacy targets/output/explanation feedback by `predictionId`.
  - `ReviewLinkButton` creates legacy review links through `review_link_prediction.prediction_id`.
- Added schema equivalents with matching interaction style:
  - `SchemaRunExportButton`: modal, select all/deselect all, row selection, CSV export.
  - `SchemaRunShareDialog`: modal, select all/deselect all, row selection, copy selected inference links.
  - `SchemaRunBulkUploadButton`: legacy-style status title, `Stop`, `Again`, saved/failed/skipped tooltip.
- Kept schema APIs separate; no fake legacy `Prediction` rows.
- True review-link parity still needs schema review-link backend keyed to `PredictionRun`.
- Verification:
  - `vp test schema-run-history schema-plugin-policy` passed: 6 tests.
  - `vp exec tsc -b` passed.
  - line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 7815 nodes, 15506 edges, 394 communities.
  - `vp dlx react-doctor@latest --verbose` timed out after 60s.

## Plan
- [x] Keep legacy buttons untouched; add schema equivalents with same modal/selection behavior.
- [x] Add export modal for selecting schema runs before CSV export.
- [x] Add share dialog for selecting schema runs before copying links.
- [x] Match bulk upload status/stop/again behavior.
- [x] Document remaining true review-link backend gap.

# Schema Runs Prediction History Parity

## Goal
- [x] Restrict schema one-hot auto-merge to `feature__value` only.
- [x] Make schema run detail/review match legacy prediction detail order.
- [x] Render plugin reports in schema run form result pane, save modal, detail, and external review.
- [x] Replace schema history local share/review split with legacy-style external reviewer Share.
- [x] Upgrade schema export to reviewer-selection parity.
- [x] Verify focused frontend tests, typecheck, line cap, diff, graph.

## Plan
- [x] Patch one-hot split and add tests.
- [x] Add shared schema plugin catalog hook.
- [x] Add plugin-aware schema report panel and collapsible inputs/reports.
- [x] Rewire schema run detail, save modal, external review.
- [x] Rewire schema history toolbar Share/Export.
- [x] Add schema export reviewer selector and tests.

## Review
- One-hot schema auto-merge now only accepts `feature__value`.
- Schema run detail and external schema review now show feedback first, reports second, inputs last; reports/inputs collapsible.
- Removed per-run local share and separate Review button from schema history. Share now creates external `/schema-review/...` links.
- Schema export now has reviewer/run selection parity with legacy prediction export.
- Plugin reports now use shared schema plugin catalog and structured custom report rendering in save modal/detail/review.
- Verification:
  - `vp test one-hot-schema schema-feedback schema-run-history schema-plugin-policy` passed: 4 files, 13 tests.
  - `vp exec tsc -b` passed.
  - line cap check passed for frontend schema/review/test paths.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` timed out after 124s.
  - `graphify update .` passed: 8043 nodes, 16183 edges, 428 communities.

# Schema Technical Bulk Export + Plugin Render

## Goal
- [x] Remove public selection checkboxes from inference history.
- [x] Make schema bulk upload accept model-facing technical inputs.
- [x] Make schema CSV export include `PredictionResult.modelInput` technical columns.
- [x] Render schema plugin reports through MLForm presenter descriptors.
- [x] Keep user-facing history/detail/modal/review inputs simplified.
- [x] Verify focused tests, typecheck, line cap, diff, graph.

## Plan
- [x] Remove selected state/props from schema history page/table/toolbar.
- [x] Replace visible bulk schema helper with model-input bulk schema helper.
- [x] Rewrite schema export input columns from modelInput.
- [x] Render presenter descriptors through MLForm primitive report frame.
- [x] Rewire custom report renderer to presenter/descriptor flow.
- [x] Update tests for technical one-hot import/export and plugin feedback/render path.

## Review
- Inference history no longer exposes public row-selection checkboxes. Share/export receive filtered runs; their modals own selection.
- Schema bulk upload now parses technical model-facing columns, including hidden one-hot fields, and excludes UI-only mapped-category master fields.
- Bulk input serialization prefers exact technical columns and keeps visible mapped-category expansion only as compatibility fallback.
- Schema CSV export now uses `PredictionResult.modelInput` columns as `input.<modelId>.<feature>`, so one-hot inputs appear in export.
- User-facing detail/history/modal/review inputs remain simplified through existing visible-input display helpers.
- Custom schema reports now call active MLForm report definition `describe`/presenter and render the returned descriptor through MLForm primitive report frame.
- Verification:
  - `vp test one-hot-schema schema-feedback schema-run-history schema-plugin-policy` passed: 4 files, 15 tests.
  - `vp exec tsc -b` passed.
  - line cap passed for frontend `src` and `test`.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` timed out after 125s.
  - `graphify update .` passed: 8056 nodes, 16214 edges, 426 communities.

# Schema Plugin Signature Contract

## Goal
- [x] Reuse legacy analyzer normalization for schema runs.
- [x] Add per-report model context for schema plugin reports.
- [x] Wrap schema custom report definitions without touching signature flow.
- [x] Render saved schema plugin reports with same patched context.
- [x] Add frontend regression tests and verify.

## Plan
- [x] Extract analyzer normalization from signature transport.
- [x] Apply normalizer in schema transport per model binding.
- [x] Return `reportContextById` in schema run meta/raw.
- [x] Wrap schema report definitions with `patchSchemaReportContext`.
- [x] Update saved schema report renderer to use patched context.
- [x] Add schema plugin policy tests for runtime, transport, context, composer.

## Review
- Extracted legacy analyzer result normalization into `analyzer-result-normalization.ts`.
- Signature transport now uses shared helper with same behavior.
- Schema run transport now normalizes each model result with `meta.modelId`, `meta.backendUrl`, and `meta.backendFieldValues`.
- Schema run transport now emits `reportContextById` keyed by schema report id.
- Schema-only report wrapper patches custom report `describe` context so plugins receive the correct per-model meta.
- Saved schema report renderer builds fallback report context for old persisted runs.
- Added plugin tests for runtime registration, per-result meta, per-report context, context patching, and composer config preservation.
- Verification:
  - `vp test schema-plugin-policy schema-feedback schema-run-history one-hot-schema` passed: 4 files, 20 tests.
  - `vp exec tsc -b` passed.
  - line cap passed for frontend `src` and `test`.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` timed out after 124s.
  - `graphify update .` passed: 8071 nodes, 16269 edges, 418 communities.

# Schema Plugin Binding Expansion

## Goal
- [x] Diagnose why Crystal Tree does not call `/api/analyzer/explanations` in schema runs.
- [x] Bind editor-added schema plugin reports to every selected model/signature.
- [x] Preserve existing bound reports without id churn.
- [x] Expand already-saved unbound plugin reports at runtime for run/detail/history/review.
- [x] Add focused regression tests.
- [x] Refresh graphify.

## Plan
- [x] Add save-time schema version preparation that expands unbound reports per binding.
- [x] Add runtime DTO preparation for old schema versions.
- [x] Use prepared schema versions in schema run, detail, history, and external review pages.
- [x] Test report expansion, mapping, plugin policy update, and legacy DTO expansion.

## Review
- Root cause: plugin report added in schema editor was a schema-level report with no `SchemaModelBinding.outputMapping`, so schema transport had no per-report model context and MLForm never had `modelId` for Crystal Tree fetch.
- Not root cause: model input subset. Schema transport already sends per-binding `modelInput`; Crystal Tree receives that via `meta.backendFieldValues` once report context exists.
- New `prepareSchemaVersionForSave()` expands unbound reports like `Crystal Tree` into one report per binding and maps each generated schema report id back to original report source.
- New `prepareSchemaVersionDtoForUse()` applies same expansion to already-persisted schema versions before run/detail/history/review use them.
- Verification:
  - `vp test schema-binding-rebase schema-plugin-policy schema-feedback schema-run-history one-hot-schema` passed: 5 files, 24 tests.
  - `vp exec tsc -b` passed.
  - line cap check passed for frontend `src` and `test`.
  - `git diff --check` passed with CRLF warnings only.
  - `graphify update .` passed: 8197 nodes, 16731 edges, 445 communities.

# Schema Modal Plugin Rendering + Feedback

## Goal
- [x] Render Crystal Tree explanation in save modal, same as saved history.
- [x] Show plugin feedback questionnaire in schema save modal and saved history/review.
- [x] Remove generic OUTPUT feedback step for plugin reports; plugin reports use questionnaire feedback only.
- [x] Add narrow regression tests.
- [x] Verify and refresh graphify.

## Plan
- [x] Compare modal live result shape with saved history renderer shape.
- [x] Patch custom report renderer so live modal payload/context match plugin presenter.
- [x] Patch schema feedback step builder: custom/plugin reports create EXPLANATION from `feedbackQuestionnaire`, not OUTPUT.
- [x] Add tests for custom report descriptor text and plugin-only feedback steps.

## Review
- Save modal now renders plugin feedback questionnaire before save when report config has `feedbackQuestionnaire`.
- Save flow now creates `PredictionRun`, matches returned `PredictionResult` rows by model/signature, then persists pending plugin feedback to `/api/prediction-result-feedback`.
- Schema custom report renderer now calls plugin `presenter.describe()` before generic `describe()`, so `render.content` payload like Crystal Tree `explanation` is used.
- `SchemaPrimitiveReport` now passes full report config into the primitive controller.
- Custom/plugin reports now only create `EXPLANATION` feedback steps from `feedbackQuestionnaire`; no generic OUTPUT feedback.
- Verification:
  - `vp test schema-feedback schema-report-renderer schema-plugin-policy schema-binding-rebase schema-run-history one-hot-schema` passed: 6 files, 26 tests.
  - `vp exec tsc -b` passed.
  - line cap check passed for frontend `src` and `test`.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` completed: score 87, 47 warnings, non-fatal dead-code scan failure.
  - `graphify update .` passed: 8206 nodes, 16764 edges, 410 communities.

# Schema Custom Report Transport Fetch

## Goal
- [x] Make schema multi-model custom reports run without depending on report pane lazy fetch.
- [x] Keep plugin code unchanged.
- [x] Try custom reports for all bound models and keep successful payloads only.
- [x] Add regression test with one successful model and one unsupported model.
- [x] Verify and refresh graphify.

## Plan
- [x] Pass wrapped schema custom report definitions into schema transport.
- [x] After model predictions, fetch missing custom report payloads using per-report model context.
- [x] Persist fetched payload into top-level `reports` and owning `result.output.reports[source]`.
- [x] Skip failed custom report fetches instead of blocking run.
- [x] Split custom report fetch helper to keep source files under 300 lines.

## Review
- Schema transport now executes custom report fetches best-effort after model predictions, instead of waiting for MLForm report pane visibility.
- This mirrors desired schema behavior: try Crystal Tree for each model; show/persist only models where explanation succeeds.
- No plugin change required.
- Added `schema-plugin-transport` regression: two models, both explanation calls attempted, one failed model skipped, one successful payload stored.
- Verification:
  - `vp test schema-plugin-transport schema-plugin-policy schema-feedback schema-report-renderer schema-binding-rebase schema-run-history one-hot-schema` passed: 7 files, 27 tests.
  - `vp exec tsc -b` passed.
  - line cap check passed for frontend `src` and `test`.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` completed: score 88, 46 warnings, non-fatal dead-code scan failure.
  - `graphify update .` passed: 8220 nodes, 16795 edges, 406 communities.

# Schema Plugin Runtime Diagnosis

## Goal
- [x] Reproduce why schema multi-model plugin reports do not instantiate/fetch like signature reports.
- [x] Remove confusing bypasses if they hide MLForm contract failures.
- [x] Keep target architecture: one report instance per model binding, plugin stays single-model.
- [x] Verify with tests that N schema reports trigger N plugin contexts/fetches.

## Plan
- [x] Add/adjust focused test for schema runtime with 3 Crystal Tree report instances.
- [x] Compare signature mount/transport plugin path against schema mount/transport path.
- [x] Inspect generated schema version: `formSchema.reports` and `bindings.outputMapping` must contain one plugin report per model.
- [x] Instrument only test seam, not UI, to locate missing report registration/fetch/context.
- [x] Fix source contract, then remove redundant custom-report transport fetch if obsolete.
- [x] Run focused frontend tests, typecheck, line cap, diff, graphify.

## Review
- Root cause: MLForm normalizes report ids (`crystal_1` -> `crystal-1`) when creating report controllers.
- Schema binding/output mapping and `reportContextById` matched raw ids, so plugin fetch request used normalized `reportId` and could not find model context.
- Added `schema-run-report-mapping.ts` to normalize report-id matching in transport, custom report fetch, wrapper request/context patching, and save-modal raw builder.
- Removed catch-all swallowing from schema custom report wrapper. Missing model context now fails visibly instead of disappearing as a skipped report.
- Transport prefetch still skips unsupported model/report endpoint failures, so multi-model Crystal Tree can show successful models only.
- Follow-up fix: mapped custom reports whose owning model prediction failed now become skipped payloads instead of throwing misleading "not bound" errors.
- Added real MLForm lifecycle regression: `createForm` with 3 Crystal Tree report controllers, then `createReportFetchRequest` verifies model ids `model-1`, `model-2`, `model-3`.
- Plugin remains single-model. Schema still creates one report instance per model binding.
- Verification:
  - `vp test schema-plugin-lifecycle schema-plugin-transport schema-plugin-policy schema-feedback schema-report-renderer schema-binding-rebase schema-run-history one-hot-schema` passed: 8 files, 30 tests.
  - `vp exec tsc -b` passed.
  - frontend line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` completed: score 88, 45 warnings, non-fatal dead-code scan failure.
  - `graphify update .` passed: 8240 nodes, 16849 edges, 410 communities.
  - `graphify update .` passed: 8234 nodes, 16838 edges, 455 communities.
# Schema Plugin Defaults Diagnosis

## Goal
- [x] Reproduce why Crystal Tree report instances exist but do not render/fetch useful payload.
- [x] Apply custom report schema defaults in schema runtime path.
- [x] Keep signature plugin flow unchanged.
- [x] Verify focused plugin tests, typecheck, line cap, diff, graph.

## Plan
- [x] Use failing test showing `endpoint` default missing from schema custom report config.
- [x] Inspect MLForm/custom catalog shape and choose one normalization seam.
- [x] Normalize schema custom reports with active plugin schema before runtime/transport.
- [x] Run focused regression suite and document result.

## Review
- Root cause: MLSuite schema validation called plugin `schema.safeParse(...)` only as validation and discarded parsed data.
- Crystal Tree relied on Zod default `endpoint: "/api/analyzer/explanations"`, so schema runtime kept a report config without endpoint.
- Signature path could still work because MLForm/plugin registration owns parsed config there; schema path used normalized app `formSchema` in transport/render.
- `validateFieldConfig` and `validateReportConfig` now return parsed config while preserving MLSuite `id`, `label`, and `source`.
- Added `schema-plugin-defaults` regression proving custom report defaults survive `createSchemaRunRuntime`.
- Verification:
  - `vp test schema-plugin-defaults schema-plugin-lifecycle schema-plugin-transport schema-plugin-policy schema-feedback schema-report-renderer schema-binding-rebase schema-run-history one-hot-schema` passed: 9 files, 31 tests.
  - `vp exec tsc -b` passed.
  - frontend line cap passed.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` completed: score 88, 45 warnings, non-fatal dead-code scan failure.
# Schema Plugin Policy Gate Diagnosis

## Goal
- [x] Reproduce mapped Crystal Tree report skipped by stale `pluginPolicy.reportKinds`.
- [x] Make `SchemaModelBinding.outputMapping` source of truth for report execution.
- [x] Keep unbound reports blocked.
- [x] Verify focused schema plugin tests and graph.

## Plan
- [x] Add regression where `outputMapping` binds Crystal Tree but policy lacks kind.
- [x] Remove duplicate report-kind gate from schema transport.
- [x] Keep policy as metadata, not second runtime blocker.
- [x] Run focused verification.

## Review
- Root cause: `outputMapping` correctly bound Crystal Tree to model, but stale `pluginPolicy.reportKinds` lacked `"Crystal Tree"`.
- Schema transport treated policy as second blocker, so it never created per-model report context and custom report fetch became skipped/invisible.
- `SchemaModelBinding.outputMapping` is now execution source of truth; if report is mapped, it runs for that model.
- To restrict plugin to model Z, bind report only in model Z output mapping.
- Added regression in `schema-plugin-transport`; updated stale policy test.
- Verification:
  - `vp test schema-plugin-transport schema-plugin-lifecycle schema-plugin-defaults schema-plugin-policy schema-feedback schema-report-renderer schema-binding-rebase schema-run-history one-hot-schema` passed: 9 files, 32 tests.
  - `vp exec tsc -b` passed.
  - frontend line cap passed.
  - `git diff --check` passed with CRLF warnings only.
# Schema Plugin Submit Prefetch Diagnosis

## Goal
- [x] Prove whether browser path `createForm.submit()` calls Crystal Tree explanations.
- [x] Fix if form submit skips custom report prefetch.
- [x] Keep manual MLForm report fetch path working.
- [x] Verify focused tests/typecheck/graph.

## Plan
- [x] Add regression where `form.submit()` alone must call `/api/analyzer/explanations`.
- [x] Compare `request.reports` from MLForm submit with runtime reports.
- [x] Patch transport/mount seam, not plugin.
- [x] Run focused verification.

## Review
- Plugin source is OK. `resolve` returns `undefined` for missing payload and `fetch.submit` expects `meta.modelId`.
- Added regression proving `createForm.submit()` prefetches Crystal Tree reports without manual report-pane fetch.
- Hardened prefetch:
  - uses inner MLForm `definition.fetch` when top-level fetch is absent.
  - derives report context from `outputMapping + successful result` if built context is missing.
  - sends `modelId`, `backendUrl`, and `backendFieldValues` directly in fetch request meta, so it does not depend on wrapper injection.
- Verification:
  - `vp test schema-plugin-transport schema-plugin-lifecycle schema-plugin-defaults schema-plugin-policy schema-feedback schema-report-renderer schema-binding-rebase schema-run-history one-hot-schema` passed: 9 files, 35 tests.
  - `vp exec tsc -b` passed.
  - frontend line cap passed.
  - `git diff --check` passed with CRLF warnings only.
# Schema Plugin Exceptional Tests

## Goal
- [x] Add tests for remaining no-call causes.
- [x] Cover missing plugin catalog, missing schema report, missing binding, normalized id mapping.
- [x] Verify focused frontend suite.

## Plan
- [x] Create dedicated readiness/exception test file.
- [x] Keep tests under 300 lines and avoid app code until test proves gap.
- [x] Run plugin-focused tests, typecheck, line cap, diff, graph.

## Review
- Added `frontend/test/schema-plugin-readiness.test.ts` for the remaining no-call causes.
- Covered:
  - missing active plugin catalog rejects before submit with unsupported custom report error.
  - schema without `Crystal Tree` report never calls `/api/analyzer/explanations`.
  - custom report without `SchemaModelBinding.outputMapping` fails as unbound.
  - MLForm-normalized ids still map to original binding ids and call explanations.
- Focused verification passed:
  - `vp test schema-plugin-readiness` -> 4 tests.
  - `vp test schema-plugin-readiness schema-plugin-transport schema-plugin-lifecycle schema-plugin-defaults schema-plugin-policy schema-feedback schema-report-renderer schema-binding-rebase schema-run-history one-hot-schema` -> 39 tests.
  - `vp exec tsc -b` passed.
  - frontend line cap passed.
  - `git diff --check` passed with CRLF warnings only.
