# Shadcn Radix Sidebar Migration

## Goal

- [x] Replace current custom right sidebar with shadcn/Radix-style composable sidebar.
- [x] Move organization switcher into sidebar header with shadcn example layout.
- [x] Move user account control into sidebar footer with shadcn example layout.
- [x] Preserve Actions section and make collapse one action inside it.
- [x] Avoid new runtime dependencies unless local Radix package cannot cover a primitive.

## Plan

- [x] Add small sidebar primitives under app design-system layer, split below 300 lines.
- [x] Add sidebar organization header matching shadcn demo shape.
- [x] Add sidebar user footer matching shadcn demo shape.
- [x] Rebuild app sidebar content/actions/navigation on those primitives.
- [x] Update shell/header so org/user move out of header without losing mobile access.
- [x] Run typecheck, frontend checks, line-count check, browser verification, graph update.

## Review

- Added local shadcn/Radix-style sidebar primitives under `src/app/components/app-sidebar`.
- Rebuilt app sidebar as left rail with organization header, navigation/content, preserved Actions group, and user footer.
- Removed old header org/user menus and old tile/section sidebar helpers.
- Shell now uses `SidebarProvider` + `SidebarInset`; mobile header has a sidebar trigger.
- Corrected sidebar regression after review: sidebar stays on the right, uses previous 260px/52px widths, and collapse shows text inside Actions when expanded.
- Corrected sidebar placement/transition feedback: Actions are fixed at the bottom above the user footer, and sidebar links opt into route view transitions.
- Corrected transition feedback: protected routes now share one persistent `AppShellFrame`, route view transitions target only page content, and sidebar labels animate during collapse/expand instead of mounting abruptly.
- Restored the first shadcn-sidebar widths: `17rem` expanded and `4.25rem` collapsed; header/footer use normal padding again.
- Centered collapsed org and user controls with `mx-auto` because those controls are fixed `size-9` instead of full-width menu rows.
- Fixed the actual collapsed offset: hidden org/user labels and chevrons no longer reserve flex width, so the visible icon/avatar stays centered inside its button.
- Fixed local Vite startup config after browser verification: dev now serves `/runtime-config.js`, keeps `VITE_BACKEND_URL` empty, and proxies `/api` to `http://localhost:8080`.
- No runtime dependencies added; used existing `radix-ui`, `lucide-react`, and app `cx`/tokens.
- Verification:
  - `frontend`: `vp check --fix ...` passed for touched sidebar/header/shell files.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 32 files / 111 tests.
  - `frontend`: protected-route shell persistence and smoother sidebar transition changes also passed `vp check --fix ...`, `vp exec tsc -b --pretty false`, `vp test`, and `vp build`.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 247 existing warnings and no errors.
  - `frontend`: `vp build` passed with existing chunk/dynamic-import warnings.
  - Browser preview: Vite dev server on `http://127.0.0.1:5176`; `/runtime-config.js` and `/workspace` returned 200. Browser now calls same-origin `http://127.0.0.1:5176/api/readiness`; remaining `502` is backend unavailable at `http://localhost:8080`, not script 404 or CORS.
  - Repo: changed source line-count check passed, no changed source file over 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed; `graph.html` skipped because graph has 11134 nodes over graphify viz limit.

# Schemas Catalog Pagination And Actions

## Goal

- [ ] Rework Schemas page like Plugins/Models: paginated backend data, compact borders, fixed pagination footer.
- [ ] Add schema rename, archive, delete, duplicate from catalog actions.
- [ ] Keep schema runs/review history safe: archive by default, block unsafe delete.

## Plan

- [x] Add backend schema page DTO, repo page query, archived state, and catalog actions.
- [x] Copy latest schema version and bindings when duplicating a schema.
- [x] Add focused backend tests for page/actions success and error cases.
- [x] Add frontend schema page DTO/services/hooks/mutations.
- [x] Split Schemas page into catalog browser/toolbar/list/actions components.
- [x] Run focused API/frontend verification, line-count check, and graph update.

## Review

- Backend `GET /api/schemas` now returns a paged `SchemaPageDto`; active unpaged list moved to `GET /api/schemas/all`.
- Added schema `archivedAt`, active/archive/all filters, backend search/sort, rename, archive, duplicate, and delete endpoints.
- Delete blocks schemas referenced by prediction runs or review links; archive remains the safe removal path.
- Duplicate copies the latest schema version as v1 plus its model bindings; run/review history is not copied.
- Schemas frontend now uses paginated TanStack Query hooks, plugin/model-style toolbar/list/footer pagination, compact borders, and real action mutations.
- Verification:
  - `api`: `mvn "-Dtest=SchemaFlowServiceTest" test` passed, 15 tests.
  - `api`: full `mvn test` blocked by existing stale test `dev.ulloasp.mlsuite.prediction.ExplanationFeedbackControllerTest` referencing missing `dev/ulloasp/mlsuite/prediction/domain/model/ExplanationFeedback`.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 32 files / 111 tests.
  - `frontend`: `vp check --fix ...` passed with existing warnings in schema-run files.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 243 warnings; new accepted warning mirrors Models boolean-heavy catalog list props.
  - Browser preview: Vite dev server is on `http://127.0.0.1:5175`; navigation to `/schemas` loaded, but T3 snapshot was blocked by `PreviewAutomationNoFocusedOwnerError`.
  - Repo: changed source/test line-count check passed, no changed source file over 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed.

# Models Catalog Pagination And Actions

## Goal

- [ ] Rework Models catalog UI to match Plugins: backend pagination, compact borders, fixed pagination footer.
- [ ] Rename sidebar `Catalog` to `Models`.
- [ ] Add model rename, archive, delete, duplicate from catalog actions.
- [ ] Keep schema/model flows using active models only.

## Plan

- [x] Add backend model page DTO, request params, repo queries, and service actions.
- [x] Add API tests for paginated list plus rename/archive/delete/duplicate success and error cases.
- [x] Add frontend model page DTO/services/hooks/mutations using TanStack Query.
- [x] Split Models catalog UI into small components patterned after Plugins.
- [x] Wire sidebar label and keep create/detail/schema selectors using active model list.
- [x] Run narrow API/frontend checks, line-count check, graph update.

## Review

- Backend `GET /api/models` now returns a paged `ModelPageDto`; active model selector data moved to `GET /api/models/all`.
- Added model `archivedAt`, active/archive/all filters, backend search/sort, rename, archive, duplicate, and delete endpoints.
- Delete blocks models referenced by schema bindings or prediction results; archive is the safe removal path.
- Duplicate copies stored model bytes into a new storage object.
- Models frontend now uses paginated TanStack Query hooks, plugin-style toolbar/list/footer pagination, compact borders, and real action mutations.
- Sidebar label changed from `Catalog` to `Models`.
- Verification:
  - `api`: `mvn "-Dtest=SchemaFlowServiceTest,ModelServiceTest,ModelControllerTest" test` passed, 26 tests.
  - `api`: full `mvn test` blocked by pre-existing stale test `dev.ulloasp.mlsuite.prediction.ExplanationFeedbackControllerTest` referencing missing `dev/ulloasp/mlsuite/prediction/domain/model/ExplanationFeedback`.
  - `frontend`: `vp check --fix ...` passed on touched files.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 32 files / 111 tests.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 228 warnings; remaining new notable warning is boolean-heavy `ModelsCatalogListPanel`, accepted for now to keep component split minimal.
  - Browser preview: Vite dev server is on `http://127.0.0.1:5174`; `/models` bundle loaded, but page data/render verification was blocked by missing backend/auth (`/api/users/me` 401, readiness `https://localhost:8443` connection refused).
  - Repo: touched source line-count check passed, no touched source file over 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed.


# Schema Create Direct Flow And Split Preview

## Goal

- [x] Keep schema editor previews in MLForm split layout.
- [x] Make first-time schema creation save the generated schema automatically.
- [x] Remove form preview from first-time schema creation.
- [x] Keep mutable schema editing available for new schema versions.

## Plan

- [x] Restore preview mount to MLForm split layout.
- [x] Remove JSON editor/toggle/preview dependence from the first schema creation flow.
- [x] Save initial `composedVersion.formSchema` directly instead of parsing editor text.
- [x] Keep `CreateSchemaVersionPage` using the editor plus split preview.
- [x] Update focused preview/create tests and run frontend verification.

## Review

- Schema preview now mounts MLForm with split layout and always-visible report pane.
- Initial schema creation no longer exposes the JSON editor, floating Code/Preview toggle, or generated form preview; it saves generated `composedVersion.formSchema` directly.
- New schema versions keep the editable editor/toggle flow and inherit the split preview through `SchemaFormPreview`.
- Preview report expansion still generates MLForm-normalized ids for expanded multi-target reports.
- Verification:
  - `frontend`: `vp test test/schema-form-preview.test.tsx` passed, 3 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp check --fix src/algorithms/schema/preview-transport/index.ts src/schemas/components/SchemaFormPreview.tsx src/schemas/pages/create-schema-page.tsx src/schemas/pages/create-schema-version-page.tsx test/schema-form-preview.test.tsx` passed.
  - `frontend`: `vp test` passed, 32 files / 111 tests.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 216 existing warnings, 0 errors.
  - Repo: touched file line-count passed; largest touched source file 171 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed.

# Schema Preview Report Expansion And Floating Toggle

## Goal

- [x] Render one preview report per `mappedTo` entry in schema reports.
- [x] Use the existing `models/components/ToggleButton.tsx` as a floating Code/Preview switch.
- [x] Keep preview local: no real model calls, no persistence, no new runtime deps.

## Plan

- [x] Expand compact schema reports before MLForm mount so MLForm creates one report frame per target.
- [x] Make preview transport return fake built-in payloads for every mapped report target.
- [x] Replace top tabs with an absolutely positioned `ToggleButton`.
- [x] Add regression for a report with two `mappedTo` entries.
- [x] Run focused and full frontend verification, line-count, graph update.

## Review

- Preview now expands compact schema reports with multi-entry `mappedTo` before MLForm mount, so MLForm creates one report frame per mapped target.
- Preview transport now returns fake built-in classifier/regressor payloads for every preview report target.
- Create schema and create schema version pages now use the existing animated `models/components/ToggleButton.tsx` as an absolute floating switch.
- Added mounted regression for one classifier report mapped to two targets rendering two report frames.
- Verification:
  - `frontend`: `vp check --fix src/algorithms/schema/preview-transport/index.ts src/schemas/components/SchemaFormPreview.tsx src/schemas/pages/create-schema-page.tsx src/schemas/pages/create-schema-version-page.tsx test/schema-form-preview.test.tsx src/models/components/ToggleButton.tsx` passed.
  - `frontend`: `vp test test/schema-form-preview.test.tsx` passed, 3 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 32 files / 111 tests.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 216 existing warnings, 0 errors.
  - Repo: touched file line-count passed; largest touched source file 237 non-comment lines.
  - Repo: `git diff --check` passed for touched files with CRLF warnings only.
  - Repo: `graphify update .` passed.

# Schema Editor Form Preview

## Goal

- [x] Add a Code/Preview switch while creating or editing schema versions.
- [x] Render the current valid schema as an MLForm form preview without calling real models.
- [x] Keep report preview local and visibly non-persistent; no floating controls or new runtime deps.

## Plan

- [x] Add a local schema preview transport that returns fake built-in report payloads.
- [x] Add a schema-owned preview component that mounts MLForm with existing design system and plugin catalog.
- [x] Wire Code/Preview tabs into create schema and create schema version pages using the validated editor schema.
- [x] Add focused mounted preview test, then run TypeScript/tests/line-count/graph update.

## Review

- Added Code/Preview tabs to schema creation and schema-version creation pages.
- Preview mounts the current validated editor schema through MLForm with the existing prediction design system.
- Preview uses local fake report transport for built-in classifier/regressor reports; it does not call real models or persist runs.
- Plugin-backed field/report definitions still load through the existing schema plugin catalog.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test test/schema-form-preview.test.tsx` passed, 2 tests.
  - `frontend`: `vp test` passed, 32 files / 110 tests.
  - `frontend`: `vp check --fix src/algorithms/schema/preview-transport/index.ts src/schemas/components/SchemaFormPreview.tsx src/schemas/pages/create-schema-page.tsx src/schemas/pages/create-schema-version-page.tsx test/schema-form-preview.test.tsx` passed.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with 217 existing warnings, 0 errors.
  - Repo: touched file line-count passed; largest touched source file 238 non-comment lines.
  - Repo: `git diff --check` passed for touched files with CRLF warnings only.
  - Repo: `graphify update .` passed.

# Schema Detail Readonly Editor

## Goal

- [x] Replace schema detail gray `<pre>` JSON block with a read-only Monaco editor.
- [x] Keep `Ctrl+F`, selection, `Ctrl+A`, and `Ctrl+C` available through Monaco.
- [x] Avoid extra copy button or new runtime dependencies.

## Plan

- [x] Add a small schema-owned readonly JSON viewer component using existing Monaco config.
- [x] Replace the schema detail `<pre>` renderer with that component.
- [x] Run focused frontend verification, line-count check, and graph update.

## Review

- Added `SchemaCodeViewer` using existing Monaco dependency, editor config, and light/dark themes.
- Schema detail now renders the selected schema JSON in Monaco readonly mode instead of a gray `<pre>`.
- No copy button was added; native editor selection, `Ctrl+F`, `Ctrl+A`, and `Ctrl+C` cover that workflow.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 31 files / 108 tests.
  - `frontend`: `vp check --fix src/schemas/pages/schema-detail-page.tsx src/schemas/components/SchemaCodeViewer.tsx` passed for touched frontend files.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with existing warnings, 217 issues.
  - Repo: touched file line-count passed; largest touched source file 128 non-comment lines.
  - Repo: `git diff --check` passed for touched files.
  - Repo: `graphify update .` passed.
  - Browser preview blocked: T3 preview returned `PreviewAutomationNoFocusedOwnerError`.

# Analyzer Reports Contract Cleanup

# Multi-Model Plugin Report Expansion

## Goal

- [x] Render one plugin report per bound model when schema report uses multi-model `mappedTo`.
- [x] Ensure modal/persist receives fetched plugin payloads for every successful model.
- [x] Verify focused plugin lifecycle, mounted run, TypeScript, full frontend tests, graph update.

## Plan

- [x] Add regression for one Crystal Tree schema report mapped to multiple models.
- [x] Expand multi-model report configs into per-model runtime report instances before MLForm mount.
- [x] Keep persisted schema contract unchanged; expansion is runtime-only.

## Review

- Root cause: MLForm saw one report controller for one schema report id, while `reportContextById` is per report instance. Multi-model contexts collapsed to one runtime report.
- Runtime now expands report `mappedTo` records into per-binding report instances with stable ids like `crystal-model-1`, each retaining one backend-specific `mappedTo` record.
- Verification:
  - `frontend`: `vp test test/schema-run-mounted-render.test.ts test/schema-plugin-lifecycle.test.ts test/schema-run-multi-plugin-report.test.ts` passed, 10 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 31 files / 108 tests.
  - `frontend`: touched source/test line-count passed; max touched test 293 non-comment lines.
  - Repo: `git diff --check` passed for touched MLSuite files.
  - Repo: `graphify update .` passed.

## Goal

- [x] Remove MLSuite frontend legacy analyzer `outputs` compatibility for model reports.
- [x] Normalize current backend `reports: []` payloads into MLForm keyed reports by schema `mappedTo`.
- [x] Cover current classifier/regressor report array contract.

## Plan

- [x] Replace legacy `outputs/type` report extraction with current `reports/kind` extraction.
- [x] Rename frontend normalization helper away from legacy wording.
- [x] Update regressions to use backend-current payload shape.
- [x] Run focused tests, TypeScript, full frontend tests, line-count, graph update.

## Review

- Removed analyzer `outputs[]/type` report normalization. MLSuite now reads backend `reports[]/kind` directly and hydrates MLForm keyed reports from current analyzer payloads.
- Updated classifier/regressor consumers, schema export, output feedback, target derivation, and runtime tests to use report-array payloads.
- Kept unrelated legacy contracts alone: old prediction-form naming, architecture tests, and historical explanation formatter fallbacks are outside analyzer model-report normalization.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test test/schema-report-renderer.test.ts test/schema-run-transport-mapping.test.ts test/schema-one-hot-select-values.test.ts test/schema-run-mounted-render.test.ts test/output-feedback-questionnaire.test.ts` passed, 14 tests.
  - `frontend`: `vp test` passed, 30 files / 107 tests.
  - `backend`: `uv run pytest tests/test_runtime_api.py` passed, 25 tests.
  - Repo: touched source/test line-count passed, no file >300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with existing 214 warnings.
  - Repo: `graphify update .` passed.

# Schema Run Submit Instrumentation

## Goal

- [x] Log every frontend schema-run submit normalization step from MLForm submit to save modal.
- [x] Keep behavior unchanged; only add diagnostic `console.log` traces.
- [x] Verify TypeScript/tests, line-count, graph update.

## Plan

- [x] Add `[schema-plugin-debug]` traces at submit event, transport, analyzer normalization, report target mapping, result-state merge, report display, renderer, and save modal.
- [x] Run focused frontend tests and TypeScript.
- [x] Document verification and usage.

## Review

- Added exhaustive frontend diagnostics under `[schema-plugin-debug]` for MLForm submit event detail, raw merge, model request/response normalization, report target resolution, result-state merge, display filtering, renderer descriptor creation, and save payload.
- No runtime contract changed; logs only.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test test/schema-run-mounted-render.test.ts test/schema-report-renderer.test.ts` passed, 9 tests.
  - `frontend`: `vp test` passed, 30 files / 107 tests.
  - Repo: touched file line-count passed; largest touched file 265 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with existing 214 warnings.
  - Repo: `graphify update .` passed.

# OneHot Parent mappedTo Composer Fix

## Goal

- [x] Fix schema selection when analyzer returns `onehot-category` fields without parent `mappedTo`.
- [x] Keep MLSchema 0.2.1 contract: one-hot option mappings own model targets.
- [x] Verify focused frontend tests, TypeScript, line-count, diff check, graph update.

## Plan

- [x] Add composer regression for analyzer `onehot-category` output with no parent `mappedTo`.
- [x] Update schema merge to merge/wrap `options[].mappedTo` per model binding.
- [x] Run narrow frontend verification and repo checks.

## Review

- Fixed schema composition for analyzer-produced `onehot-category` fields that intentionally lack parent `mappedTo`.
- Composer now wraps/merges `options[].mappedTo` per selected model binding and leaves the parent as UI-only.
- Added regression for MLSchema 0.2.1 analyzer output: parent no `mappedTo`, options mapped to concrete model features.
- Verification:
  - `frontend`: `vp test test/schema-composer.test.ts test/builtin-registry.test.ts` passed, 12 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - Repo: touched source/test line-count passed: merge 205, composer test 165 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed.

# MLSchema 0.2.1 Backend Update

## Goal

- [x] Bump Python analyzer to `mlschema==0.2.1`.
- [x] Let MLSchema own `mappedTo` and `onehot-category` generation.
- [x] Preserve model/dataframe feature-name behavior for named and positional models.
- [x] Pass one-hot separator from UI/API to analyzer.

## Plan

- [x] Remove backend schema mappedTo shim and use `infer_schema(..., onehot_separator=...)`.
- [x] Use named DataFrame columns only when model exposes feature names.
- [x] Use positional DataFrame columns for models without feature names, restoring display labels from original dataframe columns by `mappedTo` position.
- [x] Add optional `oneHotSeparator` through frontend create-model request and Java API/analyzer service.
- [x] Cover success/error cases in existing backend/API/frontend tests.
- [x] Run narrow verification, then graph update.

## Review

- Updated backend analyzer dependency and lockfile from `mlschema==0.2.0` to `0.2.1`.
- Removed app-side mappedTo injection; MLSchema now emits `mappedTo` and `onehot-category`.
- Positional models now infer against positional DataFrame columns; when user supplies a dataframe, labels are restored from original column names via integer `mappedTo`.
- Added `oneHotSeparator` frontend create-model field and propagated it through Spring API as analyzer `onehot_separator`.
- Verification:
  - `backend`: `uv run pytest tests/test_runtime_api.py -k build_schema tests/test_schema_api.py` passed, 10 tests.
  - `api`: `mvn "-Dtest=AnalyzerServiceTest,AnalyzerControllerTest,ModelCreationServiceTest,ModelControllerTest" test` passed, 21 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test test/artifact-inspection-service.test.ts` passed, 4 tests.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with existing warnings.
  - Repo: touched file line-count passed; all checked files under 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Blocked broader backend runtime check: `uv run pytest tests/test_runtime_api.py` fails 4 prediction tests that still expect `outputs`, while current service returns `reports`.

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

# MLForm Linked API Adaptation

## Goal

- [x] Adapt MLSuite frontend to current linked MLForm API.
- [x] Remove old compatibility paths instead of preserving legacy API shims.

## Plan

- [x] Inspect linked MLForm public API and current frontend failures.
- [x] Patch MLSuite integration to current API, allowing breaking cleanup where needed.
- [x] Run focused frontend verification and line-count checks.
- [x] Update review with exact commands and blockers.

## Review

- MLSuite schema-run now consumes MLForm submission records directly: `displayValues` for UI/display input data, `modelValues`/`fieldValues` for model mapping.
- Removed old MLSuite custom-report prefetch and runtime-payload modules; report fetching now goes through MLForm pipeline/report fetch orchestration.
- Mounted schema forms use `reportFetchMode: "all"` and listen to MLForm submit success instead of `afterSubmit`.
- Preserved schema-run config (`mappedTo`, `displayKey`, one-hot option mappings) through MLForm/Zod normalization, and added a unique single-target report default only where MLForm needs one to resolve built-in reports.
- Rebuilt linked `../mlform` dist and refreshed frontend local package link so tests use the changed API.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 29 files / 99 tests.
  - Repo: frontend source/test line-count check passed, no file >300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.

# MLForm Display Fields Regression

## Goal

- [x] Restore schema form field rendering in MLSuite with linked MLForm.
- [x] Restore displayed user inputs outside the form.
- [x] Keep plugin reports rendered through MLForm pipeline, no old prefetch compat.

## Plan

- [x] Compare MLSuite field/report rendering against `../prueba-mlform`.
- [x] Reproduce missing display fields/inputs with focused tests.
- [x] Patch smallest MLSuite integration seam.
- [x] Run focused tests, full frontend tests, line-count, graph update.

## Review

- Added `jsdom` to frontend dev dependencies for mounted MLForm regression coverage.
- Added mounted schema-run test that verifies fields render in MLForm shadow DOM, reports render after submit, and display inputs are emitted.
- Restored visible-input fallback: display key, field id, label, mapped model targets, and one-hot target reconstruction.
- Restored prefill/default fallback for schemas that do not persist explicit `displayKey`.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 30 files / 100 tests.
  - Repo: frontend source/test line-count check passed, no file >300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.

# MLForm Plugin Report Mounted Regression

## Goal

- [x] Restore mounted schema plugin report fetch with `mlform@0.1.16`.
- [x] Stop schema runs from waiting forever when plugin report fetch is skipped.

## Plan

- [x] Add mounted regression that model request is followed by plugin fetch.
- [x] Locate why report context/pipeline skip happens only in mounted UI.
- [x] Patch smallest integration seam.
- [x] Run focused tests, full frontend tests, line-count, graph update.

## Review

- Mounted submit now reads MLForm `pipelineResult.reportFetchResults`, not only model submit raw.
- Schema report contexts now store resolved report target, so reports still alias to mapped targets when MLForm report controllers omit MLSuite `mappedTo`.
- Result-state merge treats raw fetched reports as completed and hydrates normalized id, raw id, and mapped target aliases.
- Regression verifies mounted UI dispatch makes analyzer prediction request, plugin explanation request, and emits `raw.reports.crystal` plus `raw.reports.crystal-tree` with `reportsPending=false`.
- Verification:
  - `frontend`: `vp test test/schema-run-mounted-render.test.ts test/schema-plugin-lifecycle.test.ts test/schema-plugin-transport.test.ts test/schema-plugin-policy.test.ts` passed, 16 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 30 files / 101 tests.
  - Repo: touched file line-count passed; max touched source/test file 236 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed.

# Crystal Tree Real Plugin Regression

## Goal

- [x] Reproduce real Crystal Tree plugin id/context mismatch.
- [x] Restore plugin explanation fetch in mounted multi-model schema runs.
- [x] Stop save modal from waiting when plugin report is skipped or completed.

## Plan

- [x] Add regression using real plugin shape: catalog id `crystal-tree`, runtime schema report id like `report-2`.
- [x] Inspect report context keys from transport and MLForm fetch request ids.
- [x] Patch smallest id/context resolution seam.
- [x] Verify focused tests, TypeScript, full frontend suite, line-count, graph update.

## Review

- Real blocker was numeric backend model ids: strict Crystal Tree plugin checks `typeof request.meta.modelId === "string"` and threw before analyzer explanation fetch.
- Schema report plugin context now passes string `meta.modelId` to fetch/render contexts while preserving raw model ids elsewhere.
- Mounted regression covers numeric `modelId: 1` with strict plugin and verifies `/api/analyzer/explanations?modelId=1` is called and `reportsPending=false`.
- Also covered schema report id differing from plugin catalog id (`report-2` vs `crystal-tree`).
- Verification:
  - `frontend`: `vp test test/schema-run-mounted-render.test.ts test/schema-plugin-lifecycle.test.ts test/schema-plugin-transport.test.ts test/schema-plugin-policy.test.ts` passed, 18 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 30 files / 103 tests.
  - Repo: frontend source/test line-count passed, no file >300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` completed with existing 214 warnings.
  - Repo: `graphify update .` passed.

# Schema Model Reports Render Regression

## Goal

- [x] Render model reports after prediction requests complete.
- [x] Keep plugin reports rendered.
- [x] Avoid waiting/empty save modal when model reports exist.
- [x] Render classifier reports when analyzer returns `mapping` as an object.
- [x] Prove whether remaining non-render is MLForm report pane or MLSuite save-modal/result extraction.

## Plan

- [x] Reproduce display path with model report payloads plus plugin report.
- [x] Locate report-display filtering/alias mismatch.
- [x] Patch smallest normalization seam.
- [x] Run focused tests, TypeScript, full frontend suite, line-count, graph update.
- [x] Add regression for analyzer classifier payload shape: `mapping: { "0": "1" }`.
- [x] Normalize mapping object labels and scalar report payloads.
- [x] Re-run focused/full frontend verification.
- [x] Add mounted/save-modal-style regression that model reports appear in emitted raw results.
- [x] Patch the actual missing boundary, not another payload-shape guess.

## Review

- Model reports were present in result payloads, but display dropped them in multi-model schemas when binding ids were strings and result ids were numbers.
- `getSchemaResultReports` now matches binding/result model ids by normalized scalar string value.
- Regression covers multi-model `mappedTo` records with binding ids `"1"`/`"2"` and result id `1`, proving target report payload renders.
- Analyzer classifier outputs with `mapping` as an object now normalize into labels, keep numeric-string labels as labels instead of indices, and still render probabilities.
- Report display now wraps scalar report payloads as `{ value }` instead of dropping them.
- Remaining bug was not MLForm: MLSuite could not resolve built-in report `mappedTo` keyed by model name when `binding.modelName` was absent and the runtime adapter had added a duplicate `default` target.
- Built-in model report paths now allow a single-target fallback; custom/plugin reports keep strict per-binding routing so Crystal Tree context does not collapse across models.
- Verification:
  - `frontend`: `vp test test/schema-report-renderer.test.ts test/schema-run-mounted-render.test.ts test/schema-plugin-lifecycle.test.ts test/schema-plugin-transport.test.ts test/schema-plugin-policy.test.ts` passed, 23 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 30 files / 107 tests.
  - Repo: frontend source/test line-count passed, no file >300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed.

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
# Remove Legacy Report Contracts

## Goal

- [x] Use `mappedTo` as the only schema field/report binding contract.
- [x] Remove keyed report payloads from active MLForm/MLSuite schema-run flow.
- [x] Replace legacy `explanations` payloads with report items.
- [x] Remove `inputMapping`/`outputMapping` active usage where schema `mappedTo` now owns mapping.

## Plan

- [x] Change MLForm result/transport/report-fetch types to `reports: unknown[]`.
- [x] Make MLForm built-in report resolution read report items by `mappedTo`, no keyed/outputs fallback.
- [x] Change MLSuite analyzer/schema-run normalization to keep report arrays and enrich items with `id/kind/mappedTo`.
- [x] Store plugin fetch payloads back into the same schema `reports: []` array.
- [x] Update schema display/review/save paths to resolve from report arrays.
- [x] Change Crystal Tree/backend explanation response to report-item payload, no `explanations`.
- [x] Update focused tests and run narrow verification first, then broader checks.

## Review

- MLForm now treats `reports` as an array contract in submit results, transport responses, report contexts, report fetch requests, primitives, fanout, stream updates, and built-in report payload lookup.
- MLForm report resolution uses `mappedTo` only; keyed report maps, exact report-id fallback, `outputs` fallback, and alias migration support were removed.
- MLSuite schema-run keeps backend/model/plugin report payloads in `reports[]`, enriches report items with `id/kind/mappedTo`, and resolves display/review/save/export payloads from arrays.
- Removed single-target fallback for per-model `mappedTo` records in MLSuite report routing; direct `mappedTo` must be used when no binding key applies.
- Crystal Tree/backend explanation payloads now return report items under `reports[]`; the old `explanations` payload field is gone.
- Temporary `[schema-plugin-debug]` console output was disabled after diagnosis.
- Verification:
  - `mlform`: `vp test` passed, 27 files / 270 tests.
  - `mlform`: `vp exec tsc -b --pretty false` passed.
  - `mlform`: `vp build` passed.
  - `frontend`: `vp test` passed, 30 files / 107 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `backend`: `uv run pytest tests/test_runtime_api.py` passed, 25 tests.
  - `api`: `mvn -Dtest=SchemaFlowServiceTest test` passed, 10 tests.
  - `models/plugins`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp fmt` passed.
  - `mlform`: `vp fmt` passed.
  - `mlform`: `graphify update .` passed.
  - Repo: `graphify update .` passed.
  - Line count: changed production files are under 300 non-comment lines except pre-existing unrelated `frontend/src/admin/infrastructure/components/ServicesView.tsx` at 302 non-comment lines.
