# Restore schema display-key prefill

- [x] Reproduce validation and prefill failure for generated fields without `displayKey`.
- [x] Add one vertical regression covering `label` and `id` fallbacks.
- [x] Restore one shared `displayKey = label || id` runtime adapter.
- [x] Run focused and broad frontend verification plus source-limit checks.
- [x] Update graphify and record exact results.

## Review

- Runtime normalization now resolves each absent `displayKey` as `label || id` without mutating persisted schemas.
- Validation, visible input reconstruction, and run prefill share the same resolver; explicit `displayKey` remains authoritative.
- The regression failed 2/6 before the fix and passes 6/6 after it. Related tests pass 17/17; the full frontend suite passes 49 files and 212 tests.
- Targeted `vp check`, TypeScript, production build, diff whitespace, and changed-file line limits pass. No visual check ran because it was not requested.
- `graphify update .` completed with 10,340 nodes and 28,318 edges.

# Generic report plugin classification fix

- [x] Reproduce backend and frontend misclassification for `defineReportKind<Config, Payload>({...})`.
- [x] Accept TypeScript generic arguments in both lightweight declaration detectors.
- [x] Run focused backend/frontend tests plus diff and line-limit checks.
- [x] Update graphify and record exact verification results.

## Review

- Backend and frontend declaration detectors now accept generic type arguments before the report factory call.
- Backend regression failed 3/3 before the fix and passed 3/3 after it. Frontend regression failed 2/3 before the fix and passed 3/3 after it.
- Full frontend suite passed: 49 files, 210 tests. Targeted `vp check` passed with no formatting, lint, or type errors.
- Full backend suite ran 185 tests: 184 passed; unrelated existing `WebAdapterArchitectureTest` failure remains in `ModelControllerImpl` because it depends directly on `ModelCreationService`.
- React Doctor scored 81/100 with eight unrelated existing findings. Diff whitespace and changed-file line limits passed.

# Strict MLForm consumer migration

Breaking migration: no compatibility path for pre-stable schemas, payload aliases, report contexts, or renderers.

- [x] Require explicit `displayKey`; remove label/id schema repair and prefill fallbacks.
- [x] Consume canonical MLForm submission/report fields and official mapped-target helpers everywhere.
- [x] Remove obsolete custom primitive renderers after proving defined plugin descriptors replace them.
- [x] Replace the broad MLForm bucket with one prediction runtime capability split into MLForm, plugin, data, and feedback modules.
- [x] Keep coordinated local MLForm source links until `0.1.21` is published; refresh lockfiles.
- [x] Update tests, task memory, architecture checks, full tests/build/checks, React Doctor, and graphify.

## Review

- Removed all submission aliases, schema repair, custom renderer components, and duplicated mapped-target traversal.
- `capabilities/mlform` no longer owns product data, feedback, import/export, or plugin hosting; the prediction runtime is one architecture-safe deep capability.
- TypeScript, 48 files/207 tests, architecture tests, and production build pass. React Doctor reports only existing repository warnings after task-scoped findings were fixed.
- Registry publication is intentionally not performed by this source change; consumers use the coordinated local `0.1.21` source until release.

# MLForm report contract migration

Breaking migration: no compatibility path for pre-0.1.20 report envelopes.

- [x] Consume backend-scoped MLForm report envelopes and official per-report context.
- [x] Remove `sourceTargets` and artificial `report:<id>` mappings.
- [x] Remove `reportContextById`, report request/context patching, and skipped payload sentinel.
- [x] Replace handwritten Zod diagnostics/JSON Schema conversion with MLForm registry tooling.
- [x] Replace local mappedTo resolution and Promise fanout with MLForm public APIs.
- [x] Preserve analyzer, binding, persistence, feedback, and plugin-hosting behavior.
- [x] Link local MLForm 0.1.20 for coordinated verification, then run focused/full frontend checks.
- [x] Update graphify and record exact results.

## Review

- MLSuite now emits strict MLForm 0.1.20 report envelopes and embeds model/backend context per result.
- Deleted the report-context wrapper module, artificial report targets, skipped sentinel, and request/presenter patching.
- Analyzer-ready results and client-fetched pending results remain distinct during persistence reconstruction.
- Full frontend tests pass: 49 files/213 tests. TypeScript and production build pass; all changed source files pass `vp check`.
- Deleted the handwritten builtin JSON Schema and schema-definition validators; Monaco now regenerates its schema from the active builtin plus tenant plugin registry.
- Full repository `vp check` remains blocked by 399 pre-existing formatting issues. React Doctor remains 80/100 with nine unrelated existing findings.
- `graphify update .` rebuilt the graph with 10,478 nodes and 28,679 edges.

# Frontend Reproducible Vite+ Build

- [x] Replace SWC React plugin with Oxc-compatible React plugin and remove obsolete suppression.
- [x] Restore clean Vite output behavior and remove unused Space Grotesk download.
- [x] Pin Vite+ packages and make Docker dependency install frozen/reproducible.
- [x] Cache hashed assets immutably in Nginx without weakening security headers.
- [x] Refresh lockfile; verify targeted checks, tests, production build, output cleanup, and graphify.
- [ ] Run Docker image/Nginx runtime verification when Docker Desktop daemon is available.

## Review

- Replaced SWC plugin/config suppression with `@vitejs/plugin-react@6.0.3` and the native Oxc path.
- Pinned Vite+ CLI/core to existing lock version `0.2.2`, pinned test override, and made Docker use the same CLI plus `--frozen-lockfile`.
- Vite now clears `dist`; measured output fell from 422 files/190,292,398 bytes to 326 files/~29.7 MB.
- `/assets/` receives one-year immutable caching and repeats server security headers because nested Nginx `add_header` directives override inheritance.
- Removed only unused Space Grotesk; retained DM Mono because terminal configuration consumes it.
- Passed: frozen install, targeted zero-warning check, 35/35 test files (135/135 tests), `vp run build`, static config contract, and diff whitespace check.
- Existing full `vp check` formatting debt remains (186 files). Docker verification blocked: Docker Desktop Linux daemon pipe unavailable.

# Frontend Source Alias Migration

- [x] Configure `@/*` for TypeScript and `@` for Vite without another dependency.
- [x] Make the architecture contract and fitness test require `@/` for parent source imports.
- [x] Rewrite only real `../` module specifiers under `frontend/src` and `frontend/test` using an AST codemod.
- [x] Verify changed files, focused/full tests, typecheck/build, and graphify.

## Review

- Added one `@/` alias shared by TypeScript, Vite, Vitest, and the architecture resolver; `./` remains valid for same-module imports.
- AST codemod changed 1,259 parent module specifiers across 468 source/test files. Diff audit found 2,518 changed lines, all limited to `../` -> `@/`; no parent imports remain.
- Fitness test rejects future `../` module specifiers and resolves `@/` before applying dependency-direction and barrel rules.
- Focused architecture suite passed: 10/10. Full frontend suite passed: 35 files, 135 tests. `vp run build` passed, including `tsc -b`, with existing chunk warnings.
- Targeted `vp check` passed for Vite config and architecture test. Full-repository formatting debt remains outside this mechanical migration.

### Test TypeScript Configuration Correction

- [x] Reproduce unresolved `@/` warnings with static checking on a representative test.
- [x] Add a dedicated test TypeScript project inheriting the application alias.
- [x] Verify representative/all tests, solution build, and graphify after the correction.

#### Correction Review

- Added `tsconfig.test.json`, referenced by the solution build, so `test/` inherits the `@/*` mapping and Vite/Node ambient types.
- Static test checking exposed and fixed stale fixtures and implicit `any` values instead of suppressing diagnostics.
- Verification passed: test TypeScript compile, targeted zero-warning check, 35/35 test files (135/135 tests), production build, and graphify update.

# Frontend Architecture Contract And Fitness Tests

- [x] Document target frontend structure, module ownership, dependency direction, state/data rules, routing, tests, and migration policy.
- [x] Link the architecture contract from `frontend/AGENTS.md` as mandatory implementation guidance.
- [x] Replace the legacy horizontal API architecture test with one transitional frontend architecture fitness test.
- [x] Enforce allowed roots, target-layer direction, feature isolation, internal-barrel rules, source types, and line limits without hiding legacy debt.
- [x] Prove focused RED/GREEN behavior, then run the full frontend suite and available static checks.
- [x] Review independently, update graphify, and record exact verification results.

## Review

- Added `frontend/ARCHITECTURE.md` as the mandatory target contract: vertical features, shared/capability seams, dependency direction, Query/Router/state ownership, MLForm boundaries, tests, and incremental migration.
- Replaced the contradictory horizontal API fitness suite with one AST-based architecture suite. It checks all source roots, static/re-export/dynamic imports, exact legacy edges, feature isolation, barrels, algorithms extensions, contract linkage, and non-growing line debt.
- Focused architecture suite passed: 10/10. Full frontend suite passed: 35 files, 135 tests. `vp build` passed with existing large-chunk and ineffective-dynamic-import warnings.
- Changed-file `vp check test/frontend-architecture.test.ts` passed. Full `vp check` remains blocked by formatting debt in 168 existing files; no repository-wide fix was applied.
- React Doctor was attempted with `vp dlx react-doctor@latest --verbose` and timed out after 120 seconds without output.
- Independent review tightened exact API destinations, all-extension root scanning, alias policy, DTO/session ownership, Router QueryClient injection, and stale migration baselines. Three pre-existing source files remain over 300 lines at fixed ceilings; the suite forbids growth and requires removing each baseline once refactored.

# Schema Version Control Plan

## Follow-up: Clone Schema From Selected Snapshot

- [x] Extend schema duplication contract with optional source snapshot id.
- [x] Validate selected snapshot ownership and copy it as independent `v1`.
- [x] Add clone action to snapshot catalog rows and snapshot detail.
- [x] Cover latest-snapshot fallback, explicit selection, isolation, and errors.
- [x] Verify backend/frontend, line limits, diff whitespace, and graphify update.

### Clone Schema From Selected Snapshot Review

- Duplication accepts an optional selected snapshot while preserving latest-snapshot fallback.
- Selected snapshot becomes the new schema's sole `v1`; drafts, bookmarks, runs, reviews, and prior versions stay in the source lineage.
- Snapshot list/detail actions are permission-gated with `canEditModels`, reuse the existing naming dialog, and navigate to the created schema.
- Backend focused tests passed: 19/19 across duplication and existing schema flow.
- Frontend tests passed: 35 files, 128 tests; production build passed with existing chunk warnings.
- `vp check` remains blocked by 14 errors and 41 warnings in pre-existing files outside this change.
- React Doctor was attempted with `vp dlx react-doctor@latest --verbose` and timed out after 120 seconds without output.
- Changed-file line limits, diff whitespace, independent review, and `graphify update .` completed.

## Follow-up: Adaptive Merge Editor Viewport

- [x] Replace fixed pixel merge-editor height with flex-based available height.
- [x] Keep page scroll external disabled and diff scroll internal.
- [x] Bind Pierre diff themes to the app's resolved light/dark theme.
- [x] Verify frontend TypeScript/tests/build, line count, and graphify update.

### Adaptive Merge Editor Viewport Results

- Removed fixed `680px` merge viewer height; conflict review now uses `flex-1`, `min-h-0`, and internal diff scrolling.
- Review page now keeps external page scrolling disabled so the editor owns overflow.
- Pierre themes now follow `themeWithHtmlAtom` for live light/dark mode.
- Frontend format, app TypeScript, tests, build, line count, diff whitespace, and graphify update completed.
- `vp check` and React Doctor still fail on existing repo-wide issues outside this change.

## Follow-up: Fixed Selectable Merge Editor

- [x] Make Pierre merge review selections explicit per changed block.
- [x] Count every selectable schema change as unresolved until the user picks current or incoming.
- [x] Give the merge editor a fixed height with internal scrolling.
- [x] Keep Pierre hunk context collapse/expand controls active for long files.
- [x] Verify frontend TypeScript/tests/build, backend focused merge test, line count, diff whitespace, and graphify update.

### Fixed Selectable Merge Editor Results

- Pierre merge review now shows the semantic JSON path in each action row, so individual changed blocks are visible and selectable.
- Merge apply stays disabled until every changed path has an explicit `current` or `incoming` choice.
- Merge viewer is a fixed `680px` viewport with internal scroll.
- Context collapse/expand remains enabled through Pierre metadata hunk separators with tighter context thresholds.
- Frontend TypeScript, tests, build, backend focused merge tests, line counts, diff whitespace, and graphify update passed.
- `vp check` and React Doctor still fail on existing repo-wide issues outside this merge editor change.

## Follow-up: Lean Snapshot Overview

- [x] Remove duplicated latest snapshot overview card from schema detail.
- [x] Remove open/bookmark actions from the overview snapshot preview.
- [x] Remove the outer snapshot preview card frame from schema overview.
- [x] Move form/json/bindings controls into the overview header action slot.
- [x] Restyle form/json/bindings as a single segmented control with red selected state.
- [x] Move indicator cards horizontally between snapshot title/metadata and segmented control.
- [x] Increase preview height so the lower page does not feel like empty margin.
- [x] Make snapshot preview height flex-driven instead of viewport-calc driven.
- [x] Compact horizontal metric cards and show relative publish time with "ago".
- [x] Make change cards open by clicking the tile content and remove redundant draft/edit UI.
- [x] Simplify bookmark cards by removing version pill/id and using snapshot/version metadata plus relative updated time.
- [x] Simplify snapshot cards by removing ids/metric pills/open action and moving actions into a three-dot menu.
- [x] Remove the create-new-change page; create changes directly from overview/latest or snapshot row actions.
- [x] Show schema description under overview title and simplify change base metadata.
- [x] Prompt for change name in a modal before creation and move change rename/review into action menus.
- [x] Make the snapshot panel title the published change name and show relative publish time.
- [x] Keep the form preview mounted while switching form/json/bindings.
- [x] Verify frontend typecheck/tests/build, line count, diff whitespace, and graphify update.

### Lean Snapshot Overview Results

- Schema overview now has one snapshot surface: nav plus the latest snapshot preview.
- Snapshot preview title is the change/snapshot name, with version and relative publish time below it.
- Overview snapshot actions and outer preview card frame were removed.
- Form/json/bindings controls now sit in the header action slot that previously held snapshot actions.
- Form/json/bindings now render as one segmented control with red selected state, with indicators horizontally between metadata and actions.
- Snapshot preview now uses flex-driven height and clips the preview area instead of fixed viewport calc sizing.
- Form preview stays mounted while toggling to JSON or bindings, so in-form state persists.
- T3 preview reached the app shell, but `/schemas` redirects to auth because `/api/users/me` returns 401 without a session.
- TypeScript app compile, tests, build, formatting, diff whitespace, line-count check, React Doctor, and graphify update completed.
- `vp check` still fails on existing repo-wide lint/type debt outside this change.

## Follow-up: Focused Schema Overview And Catalog Lists

- [x] Remove duplicated recent changes/bookmarks/snapshots from schema overview.
- [x] Replace fake repo file rows with latest snapshot metadata plus real schema preview.
- [x] Make schema sidebar contextual inside `/schemas/:schemaId`.
- [x] Rebuild changes/bookmarks/snapshots pages with the same catalog search/filter/sort/pagination shell as `/schemas`.
- [x] Keep bookmark actions only on published snapshots.
- [x] Verify frontend TypeScript/tests/build, line count, and graphify update.

### Focused Schema Overview And Catalog Lists Results

- Schema overview now shows latest snapshot state and the real schema preview instead of repeated list summaries.
- Schema sidebar now expands into Overview, Changes, Bookmarks, Snapshots, and All schemas for active schema routes.
- Changes, bookmarks, and snapshots now use the catalog shell with search, filters, sort, and pagination.
- Removed obsolete schema-specific list pager/panel components.
- Frontend TypeScript, tests, build, diff whitespace, line-count check, React Doctor, and graphify update completed.
- `vp check` still fails on existing repo-wide lint/type debt outside this change.

## Follow-up: Repo-Like Schema Navigation

- [x] Make schema detail an overview page centered on latest published snapshot.
- [x] Add schema internal navigation with counts: Overview, Changes, Bookmarks, Snapshots.
- [x] Move full unpublished changes list to `/schemas/:schemaId/changes`.
- [x] Move full bookmark/tag list to `/schemas/:schemaId/bookmarks`.
- [x] Move full published snapshot history to `/schemas/:schemaId/snapshots`.
- [x] Show ids, dates, counts, and direct actions in list rows.
- [x] Keep bookmark creation only on published snapshots/latest snapshot.
- [x] Verify frontend TypeScript/tests/build, line count, and graphify update.

### Repo-Like Schema Navigation Results

- Schema detail now behaves as a repository overview: latest published snapshot first, then compact recent activity.
- Dedicated list pages now own full unpublished changes, bookmark/tag pointers, and snapshot history.
- Schema navigation exposes counts and keeps primary movement one level below the schema.
- Bookmark creation remains tied to published snapshots, including the latest snapshot overview action.
- Frontend TypeScript, tests, build, diff whitespace, line-count check, backend focused tests, and graphify update completed.
- `vp check` still fails on existing repo-wide lint/type debt outside the schema navigation changes.

## Follow-up: Snapshot-Only Bookmarks And Publish Review

- [x] Remove bookmarks from draft/change creation and update contracts.
- [x] Make publish happen from a merge/diff review page, not directly from the editor.
- [x] Remove semantic delta and same-path conflict tables from change UI.
- [x] Add editor line decorations for changed JSON lines where Monaco supports it.
- [x] Replace schema detail document preview with paginated indexes only.
- [x] Add snapshot/bookmark detail screens where schema preview belongs.
- [x] Replace ad hoc prev/next controls with existing shadcn-style pagination primitives.
- [x] Replace browser prompt bookmark creation with a custom modal.
- [x] Verify backend focused tests, frontend typecheck/tests/build where practical, line count, and graphify update.

### Snapshot-Only Bookmarks And Publish Review Results

- Draft/create/update contracts no longer carry bookmark fields.
- Publish is reached through the merge diff review page.
- Direct version run endpoints and frontend direct-version run routes were removed; runs now go through schema bookmarks.
- Schema detail is index-only: bookmarked versions, unpublished changes, published snapshots.
- `vp check` still fails on existing repo-wide lint/type debt unrelated to this change.

## Bookmark-Gated Schema Execution Plan

- [x] Add backend bookmark contract:
  - [x] `SchemaBookmark` entity and repository.
  - [x] bookmark DTO plus create/move request.
  - [x] bookmark use-case/service/controller endpoints.
  - [x] bookmarks are created separately from published snapshots.
- [x] Gate runs through bookmarks:
  - [x] add optional bookmark relation to `PredictionRun`.
  - [x] add bookmark run create/list endpoints that resolve bookmark -> exact version.
  - [x] keep version id stored on every run for audit.
- [x] Update frontend API:
  - [x] bookmark DTOs/services/hooks/query keys.
  - [x] bookmark-based run services/hooks.
- [x] Update schema UI:
  - [x] schema detail first shows bookmarked versions with `Play` and `History`.
  - [x] published snapshots keep only inspect/change/bookmark actions.
  - [x] bookmark copy treats bookmarks as operational pointers, not snapshot history rows.
  - [x] run/history links use `/bookmarks/:bookmarkId/runs`.
- [x] Verify:
  - [x] focused backend tests.
  - [x] frontend TypeScript/tests/build where supported.
  - [x] line-count and rounded scans.
  - [x] `graphify update .`.

### Bookmark-Gated Schema Execution Review

- Backend focused tests passed: `SchemaDraftServiceTest`, `SchemaFlowServiceTest`.
- Backend package passed with `mvn -DskipTests package`.
- Frontend TypeScript, tests, and build passed.
- `vp check --fix` formatted files but still fails on existing repo-wide lint/type debt.
- `react-doctor` completed; warnings left are existing repo-wide issues, not the new bookmark flow.
- Preview opened `/schemas/1` successfully against a temporary frontend dev server; backend data was not available.
- `graphify update .` completed.

## Goal

- [x] Add jj-like schema change workflow: mutable changes, snapshot bookmarks, immutable published versions.
- [x] Keep existing `schema_version` as production source of truth.
- [x] Avoid dense UI: separate pages, paginated lists, one main task per screen.
- [x] Reuse existing MLSuite app components and schema editor/preview components.

## Current State

- [x] Root, `api/`, and `frontend/` agent rules reviewed.
- [x] `graphify-out/GRAPH_REPORT.md` reviewed before source inspection.
- [x] Graph result checked, but current working tree has no persisted schema draft implementation.
- [x] Current backend creates immutable `SchemaVersion` directly through `POST /api/schemas/{schemaId}/versions`.
- [x] Current frontend creates a new version directly from `CreateSchemaVersionPage`.

## Product Model

- [x] `Schema` = lineage/repository.
- [x] `SchemaVersion` = immutable published snapshot, executable by production runs.
- [x] `SchemaChange`/draft = mutable unpublished work based on one base version.
- [x] Bookmark = operational pointer to a published snapshot; no full branch system in MVP.
- [x] Current published version = highest `version_number` for the schema unless a later backend field is explicitly added.
- [x] Production runs stay version-bound only; draft validation must not create production history.

## Backend Plan

- [x] Add `SchemaDraft` entity/table with schema, base version, name, form schema JSON, status, timestamps, updater.
- [x] Add draft bindings as JSON on draft or child table; prefer child table only if existing binding reuse stays small.
- [x] Add DTOs/requests in small files: create draft, update draft, draft dto, draft diff, publish result.
- [x] Add `SchemaDraftRepository`, service, port, controller.
- [x] Endpoints:
  - [x] `GET /api/schemas/{schemaId}/drafts`
  - [x] `POST /api/schemas/{schemaId}/drafts`
  - [x] `GET /api/schema-drafts/{draftId}`
  - [x] `PUT /api/schema-drafts/{draftId}`
  - [x] `GET /api/schema-drafts/{draftId}/diff`
  - [x] `POST /api/schema-drafts/{draftId}/publish`
  - [x] Rebase endpoint deferred until merge semantics are explicit.
- [x] Publish flow:
  - [x] Validate form schema using same backend rules as version creation.
  - [x] If base is latest, create next `SchemaVersion`, copy draft bindings, mark draft published.
  - [x] If base is stale, return conflict result instead of creating a version.
- [x] Diff/conflict MVP:
  - [x] Compare normalized JSON maps by semantic path.
  - [x] Conflict when draft and current both changed same path since base.
  - [x] No raw line diff dependency.
- [x] Keep `SchemaVersionServiceImpl.createVersion` for creation/bootstrap, but route normal edits through drafts.

## Frontend Plan

- [x] Add schema draft API services/hooks/query keys beside existing schema version hooks.
- [x] Convert version creation route into change editor flow, reusing:
  - [x] `EditorWrapper`
  - [x] `SchemaFormPreview`
  - [x] `SchemaCodeViewer`
  - [x] `ToggleButton`
  - [x] `AppPage`, `AppSurface`, `AppPanel`, `AppButton`, `AppSelect`, `AppBadge`, pagination primitives.
- [x] Schema detail page layout:
  - [x] Top: schema title, current version, primary actions.
  - [x] Page 1 block: current published version summary and run actions.
  - [x] Page 2 block: unpublished changes, paginated.
  - [x] Page 3 block: version history, paginated.
  - [x] Secondary audit/runs remain separate pages, not side panels.
- [x] Draft editor page:
  - [x] Header shows change name, base version, and status badge.
  - [x] Main area toggles JSON editor and preview.
  - [x] Side/secondary area shows compact semantic delta and validation state.
  - [x] Actions: save, validate, publish.
- [x] Conflict page:
  - [x] Separate route, paginated conflict rows.
  - [x] Show path, base/current/draft values, resolution action.
  - [x] Keep manual JSON resolution as explicit editor path, not hidden auto-merge.
- [x] Style constraints:
  - [x] Use `rounded`, not `rounded-[18px]` or larger one-off radii.
  - [x] No nested cards.
  - [x] No dense all-in-one dashboard.
  - [x] Icons from `lucide-react` in actions.
  - [x] Copy must match backend contract: "change", "bookmark", "published version", not fake git terms.

## Testing Plan

- [x] Backend service test in one file covers create/update/publish success and stale publish conflict.
- [x] Controller contract tests deferred; endpoint mapping is thin and covered by service semantics.
- [x] Frontend API contracts covered by architecture tests and TypeScript compile.
- [x] Preserve existing schema run/version tests.

## Verification Plan

- [x] `mvn -Dtest=SchemaDraftServiceTest test` from `api/`.
- [x] `mvn -DskipTests package` from `api/`.
- [x] `vp check` from `frontend/` attempted; blocked by existing repo-wide lint/type debt unrelated to this change.
- [x] `vp test` from `frontend/`.
- [x] Visual browser check attempted; app shell loads, API readiness fails without backend and T3 preview automation is unavailable.
- [x] Source file line-count check before final.
- [x] `graphify update .` after code changes.

## Open Decisions

- [x] Bookmark storage: separate bookmark table for snapshot pointers.
- [x] Draft validation runs: backend shape validation first; draft-bound ML runtime execution only if product needs runnable unpublished schemas.
- [x] Rebase behavior: defer auto-rebase; stale publish blocks first to avoid data loss.

## Review

- Implemented backend draft model, endpoints, semantic diff, stale publish conflict handling, and publish-through-existing-version-service.
- Implemented frontend draft API/hooks, change creation, schema detail pagination, draft editor, and conflict page.
- Verification passed: backend package, backend focused test, frontend tests, frontend TypeScript compile, diff whitespace check, line-count check, rounded scan.
- Known blocker: full `vp check` still fails on pre-existing frontend lint/type issues outside this change.

## Follow-up: Inspectable Base Selection

- [x] Keep base version selector, change name, and create action on one page.
- [x] Add live preview for selected base version on the same page.
- [x] Include compact selected-version metrics: fields, reports, bindings.
- [x] Add form/json/bindings preview modes without `rounded-full` controls.
- [x] Verify TypeScript, line count, rounded scan, and graphify update.

### Follow-up Review

- TypeScript app compile passed.
- Frontend tests passed: 33 files, 116 tests.
- `react-doctor` completed with existing repo-wide warnings; no new blocking error from this page.
- Visual browser check reached app shell, but backend readiness returned 502 without backend.
- `vp check --fix` formatted files but still fails on existing repo-wide lint/type debt.

## Follow-up: Pierre Merge Diff Review

- [x] Add `@pierre/diffs` as explicit runtime dependency for schema merge review.
- [x] Create one-file `SchemaMergeDiffViewer` using Pierre React `MultiFileDiff`.
- [x] Change conflict page copy/layout to `Merge review`.
- [x] Show full JSON diff: current published vs incoming draft.
- [x] Keep paginated same-path conflicts as review context.
- [x] Verify TypeScript, tests, build, line-count, rounded scan, react-doctor, graphify.

### Pierre Merge Diff Review Results

- TypeScript app compile passed.
- Frontend tests passed: 33 files, 116 tests.
- Frontend build passed; Vite reports large chunks after adding the diff/Monaco stack.
- Line-count and rounded scans passed for the changed schema merge files.
- `react-doctor` completed with existing repo-wide warnings.
- Visual browser check reached the app shell, but backend readiness returned 502 without the backend running.
- `vp check --fix` formatted files but still fails on existing repo-wide lint/type debt.

## Follow-up: Selective Merge Review Analysis

- [x] Inspect current review page, Pierre diff capabilities, and backend stale-base guard.
- [x] Remove redundant outer "Current vs incoming" card when implementing.
- [x] Add path-level current/incoming resolution choices for merge review.
- [x] Keep publish protected against latest snapshot drift after review starts.
- [x] Verify backend merge semantics with stale-base and conflict cases.

## Follow-up: Inline Merge Diff Selection

- [x] Move current/incoming choices from separate review panel into the diff viewer surface.
- [x] Keep `@pierre/diffs`; use Monaco only if inline selection cannot be made cleanly.
- [x] Remove review-page ownership of choice row rendering.
- [x] Preserve server-side latest snapshot guard with `expectedCurrentVersionId`.
- [x] Verify TypeScript, focused tests, line counts, diff whitespace, and graphify update.

### Inline Merge Diff Selection Results

- Merge decisions now live inside `SchemaMergeDiffViewer`, directly below the Pierre split diff and inside the same bordered surface.
- The review page only owns merge state and server actions; row rendering moved out of the page.
- Monaco was not needed because `@pierre/diffs` plus semantic path choices covers the merge UX without adding another editor.
- Latest snapshot drift remains guarded server-side through `expectedCurrentVersionId`; a `409` refreshes the review.
- Frontend TypeScript, tests, build, backend focused tests, line counts, and diff whitespace passed.
- `vp check` and React Doctor still fail on existing repo-wide issues outside this change.

## Follow-up: Native Pierre Merge Resolution

- [x] Replace custom changed-path selector UI with Pierre `UnresolvedFile` merge conflict UI.
- [x] Generate a temporary merge-conflict file from semantic backend conflicts.
- [x] Sync Pierre current/incoming clicks back into backend merge resolutions.
- [x] Keep server-side merge and latest-snapshot guard as source of truth.
- [x] Verify TypeScript, frontend tests/build, focused backend test, line counts, diff whitespace, and graphify update.

### Native Pierre Merge Resolution Results

- Merge conflicts now render through Pierre `UnresolvedFile`, not a custom selector panel.
- Backend semantic conflicts are adapted into a temporary JSON merge-conflict file.
- Pierre's current/incoming conflict controls update frontend merge resolutions for the backend request.
- Backend merge remains authoritative and still rejects stale reviews when latest snapshot changes.
- Frontend TypeScript, tests, build, formatting, backend focused tests, line counts, and diff whitespace passed.
- `vp check` and React Doctor still report existing repo-wide issues outside this merge work.

## Follow-up: Cleaner Pierre Merge Header

- [x] Remove custom merge header/copy from the Pierre conflict viewer.
- [x] Remove synthetic path comments and base blocks from generated conflict text.
- [x] Use actual latest snapshot and change names as conflict labels.
- [x] Keep Pierre conflict controls as the only selection UI.
- [x] Verify TypeScript, frontend tests/build, focused backend test, line counts, diff whitespace, and graphify update.

### Cleaner Pierre Merge Header Results

- Removed the custom `Merge conflicts` header, explanatory copy, and `latest changed` pill from the diff surface.
- Generated conflict text now uses two-way markers only: `snapshot/<name>@vN` versus `change/<name>`.
- Removed synthetic `// path` comments and the diff3 `base` block from the merge file.
- Pierre `UnresolvedFile` remains the only conflict selection UI, while backend merge stays authoritative.
- Frontend TypeScript, tests, build, backend focused tests, line count, diff whitespace, and graphify update passed.
- `vp check` still fails on existing repo-wide lint/type debt outside this change.

## Follow-up: Contextual Pierre Schema Merge UI

- [x] Render schema merge as a full JSON file with context, not isolated changed values.
- [x] Preserve multiple conflict blocks so Pierre can select individual changes.
- [x] Use Pierre features: unresolved conflict UI, hunk context, word diff, line selection, compact header.
- [x] Keep backend semantic merge and latest snapshot guard authoritative.
- [x] Verify TypeScript, frontend tests/build, focused backend test, line counts, diff whitespace, and graphify update.

### Contextual Pierre Schema Merge UI Results

- Schema merge review now feeds Pierre a full `schema.merge.json` with conflict markers inserted at semantic JSON paths.
- Multiple changed paths render as individual Pierre conflict blocks with surrounding JSON context.
- Merge review uses Pierre unresolved-file controls, metadata hunk separators, word-alt diffing, line selection, Pierre themes, and built-in header metadata.
- Non-stale publish review stays as normal diff; stale merge review makes every changed path selectable.
- Added focused frontend test for contextual merge-file generation and visual conflict-path ordering.
- Frontend TypeScript, tests, build, backend focused tests, line counts, and diff whitespace passed.

## Audit: Schema Conflict Resolution And Pierre Diffs

- [x] Trace schema diff/conflict/merge flow across API and frontend.
- [x] Validate merge semantics, stale-review protection, and JSON path edge cases.
- [x] Compare installed `@pierre/diffs` API/capabilities with actual usage.
- [x] Run focused backend/frontend verification and inspect test coverage gaps.
- [x] Record severity-ranked findings and final review evidence.

### Audit Review

- Verdict: scalar happy path works, but merge is not safe for approval yet.
- High-risk gaps: delete/null/array semantics, container type changes, overlapping visual conflict ranges, stale Pierre cache keys, omitted binding merges, repeated publish, and DB races.
- Pierre 1.2.12 is correctly chosen for normal and unresolved diffs; optional annotations, patch rendering, SSR, and CodeView are out of scope. Workers/virtualization matter only if schema size becomes large.
- Focused backend tests pass 7/7; full backend suite has one unrelated architecture failure.
- Focused frontend test passes 1/1; frontend production build passes with existing chunk warnings.
- Existing tests cover only leaf-string success and latest-version drift; required error/structural cases remain uncovered.

## Fix: Safe Schema Merge And Pierre Integration

- [x] Add failing regression coverage before implementation:
  - [x] missing vs `null`, object deletion, array deletion/reorder, and container type changes.
  - [x] binding three-way merge and stale draft/latest concurrency.
  - [x] duplicate, unknown, missing, null, and invalid resolutions.
  - [x] overlapping/missing visual paths, exact Pierre remount key, action mapping, and accessible labels.
- [x] Replace flattened mutation with structural three-way merge:
  - [x] RFC 6901 JSON Pointer paths.
  - [x] explicit missing state and real add/replace/remove operations.
  - [x] disjoint changes; arrays merge by stable identity or same length by index, otherwise atomically.
  - [x] include form schema and model bindings in one authoritative merge document.
- [x] Harden persisted workflow:
  - [x] preserve binding baseline across draft creation/rebase.
  - [x] validate exact resolution set with typed side enum.
  - [x] reject repeated publish without changing state.
  - [x] serialize draft/schema writes and detect stale draft/current document drift.
  - [x] keep service files below 300 lines.
- [x] Harden Pierre/frontend flow:
  - [x] group overlapping or missing paths into valid contextual conflict blocks.
  - [x] remount on exact content change.
  - [x] synchronize grouped choices and unresolved count.
  - [x] remove ignored/dead options, fix accessible names and stale copy.
- [x] Verify narrow tests, API suite, frontend suite/build/check, React Doctor, line limits, diff whitespace, and `graphify update .`.

### Safe Merge Review

- Fixed inflated merge diff blocks: same-length arrays without identity now diff by index, so small `fields`/`reports` edits produce leaf paths instead of whole-array `-711/+711` blocks.
- Backend merge now uses structural three-way merge over `{formSchema, bindings}`, missing/null-aware RFC 6901 paths, typed exact conflict resolutions, draft revision checks, pessimistic schema/draft locks, and current document SHA-256 drift detection.
- Binding baselines are snapshotted on draft create and frozen for legacy drafts before `addBinding` mutates an old version.
- Legacy `PUBLISHED` drafts with `published_version_id = null` now backfill only when exactly one published version matches name, form schema, and semantic bindings.
- Pierre usage remains through `UnresolvedFile` for conflicts and `MultiFileDiff` for non-conflict diffs, with exact-content cache keys, custom conflict actions, native current/incoming data attributes, and no extra Monaco layer.
- Verification passed: `mvn -Dtest=SchemaDraftServiceTest test`, `mvn -Dtest=SchemaFlowServiceTest test`, `vp test`, `vp build`, line-count check, `git diff --check HEAD`, and `graphify update .`.
- Known existing blockers remain: full `mvn test` fails only `WebAdapterArchitectureTest` with 13 pre-existing web-adapter/service violations; `vp check --fix` formats but still reports 14 errors/41 warnings outside this change; React Doctor reports 2 existing performance errors and 236 warnings.
# Frontend Ineffective Dynamic Imports

- [x] Reproduce each `INEFFECTIVE_DYNAMIC_IMPORT` warning.
- [x] Replace only lazy imports already forced into eager chunks.
- [x] Verify focused checks and production build emit no matching warnings.
- [x] Update graphify and record review results.

## Review

- Replaced plugin runtime `zod` dynamic imports with the already-eager namespace import and removed redundant promise loaders.
- Removed MLForm runtime/kit/builtins from startup preloading because application imports already load them eagerly; TypeScript and Monaco remain lazy readiness dependencies.
- Passed changed-file `vp check`, focused tests (15/15), full frontend tests (135/135), production build, zero-warning log assertion, line limits, diff whitespace check, and `graphify update .`.
- Full `vp check` remains blocked by 188 pre-existing formatting violations. React Doctor produced no output for 60 seconds and was terminated.
# Local Lazy Monaco Runtime

- [x] Record current bundle/runtime baseline.
- [x] Add regression coverage for local Monaco loader success and failure.
- [x] Configure `@monaco-editor/react` with bundled `monaco-editor` through one lazy loader.
- [x] Remove Monaco from global startup readiness while preserving required runtime readiness.
- [x] Run focused/full checks, compare build output, update graphify, and review diff.

## Review

- `@monaco-editor/react` now receives the bundled local `monaco-editor` instance and local editor/JSON workers through one cached lazy loader; no CDN fetch is needed.
- Removed Monaco from startup readiness, eliminated the last eager runtime enum import, and removed the manual Monaco chunk group that pulled shared code into the entry graph.
- Production startup now requests zero Monaco/worker/CDN resources. Monaco remains available on first editor render.
- Split editor decorations and theme setup into focused utilities, bringing `EditorBody.tsx` below 300 lines and removing its legacy line-limit exception.
- Passed changed-file `vp check`, full tests (137/137), production build, runtime resource probe, architecture limits, and diff whitespace check.
- Full `vp check` remains blocked by 185 pre-existing formatting violations. React Doctor reports 96 existing issues (4 errors, 92 warnings), none in changed files.

# Frontend Organization Isolation And Startup Reliability

- [x] Establish failing regression coverage for tenant-scoped detail keys, organization switching, plugin runtime cache isolation, member loading, permission states, route errors, and mutation error ownership.
- [x] Scope every organization-owned Query key as `["org", organizationId, ...]`; remove the previous organization scope during selection changes.
- [x] Consolidate plugin-derived runtime caches behind one organization-scoped invalidation owner.
- [x] Use one organization-members key and defer member requests until the related catalog action opens.
- [x] Convert application routes to React Router lazy route modules; remove editor/MLForm/TypeScript startup preloads unrelated to the current route.
- [x] Make team permission guards render explicit loading, denied/not-found, and failure states.
- [x] Add a root route error boundary that distinguishes 404, 403, network, and unexpected failures.
- [x] Reserve global mutation toasts for mutations explicitly marked as locally handled; keep unhandled errors global.
- [x] Run focused tests, `vp check`, `vp test`, `vp build`, React Doctor, line-limit/diff checks, and `graphify update .`.

## Review

- Organization-owned Query data now shares one tenant prefix, and organization switching cancels/removes the previous scope plus its plugin runtime cache.
- Plugin catalogs use one organization-scoped cache owner; organization member data uses one key and loads only when the transfer action opens.
- Routes use `route.lazy`; startup no longer downloads TypeScript, Monaco, or MLForm before unrelated pages. The production entry chunk is about 360 KB raw; heavy editor/admin chunks remain separate.
- Team permission and route failures now render explicit loading, 403, 404, network, or unexpected-error states. Contextual mutations opt out of the global toast through metadata.
- Passed changed-file `vp check`, full frontend tests (146/146), production build, architecture/line limits, diff whitespace check, and `graphify update .`.
- Full-repository `vp check` remains blocked by 161 pre-existing formatting violations. React Doctor reports 96 existing issues (4 errors, 92 warnings); the one changed-dialog accessibility finding was fixed.

# TanStack Query Resource Contracts

- [x] Inventory query ownership, duplicate/manual keys, tenant scope, cancellation, and parallel caches.
- [x] Add reusable `queryOptions()` contracts per queried resource without adding dependencies or moving unrelated UI.
- [x] Move page-level queries behind resource options/hooks and replace manual cache keys with factories.
- [x] Propagate `AbortSignal` through query functions and HTTP transport while preserving abort errors.
- [x] Add focused success, HTTP-error, and cancellation coverage plus architecture regression checks.
- [x] Run focused checks, full frontend verification, line limits, diff checks, React Doctor, and `graphify update .`.

## Review

- Added typed `queryOptions()` contracts for workspace, schemas, models, plugins, reviews, search, users, admin users, infrastructure, and startup; page components now consume resource hooks instead of defining GET queries.
- Organization-owned search and review-link keys now share the tenant prefix. Query functions forward TanStack's `AbortSignal`, and the HTTP transport preserves cancellation instead of converting it to a network error.
- Plugin mutations now invalidate both TanStack server-state queries and the organization-scoped derived runtime cache from one owner.
- Passed focused contracts (25/25), full frontend tests (152/152), production build, architecture/line limits, changed-file formatting/type checks, diff whitespace checks, and `graphify update .`.
- Full `vp check` remains blocked by 22 pre-existing formatting violations. React Doctor remains at 67/100 with 100 pre-existing findings (4 errors, 96 warnings); none targets the new Query contracts.

# Frontend Architecture Exception Removal

- [x] Read `frontend/ARCHITECTURE.md`, frontend/root agent rules, Graphify report, and relevant lessons.
- [x] Run architecture-test baseline and inventory exact migration exceptions.
- [x] Remove every `LEGACY_API_IMPORT_EXCEPTIONS` dependency inversion at its owning seam.
- [x] Replace legacy `app` barrel imports with concrete module imports, then delete barrel files.
- [x] Split the two source modules above 300 non-comment lines and remove `LEGACY_LINE_LIMITS`.
- [x] Delete all three explicit exception collections from the architecture fitness test.
- [x] Run focused architecture/tests, full frontend tests/build/check, React Doctor, line/diff checks, and `graphify update .`.
- [x] Record final review, verification, and any exact external blocker.

## Review

- Removed all 18 explicit fitness-test exceptions: 10 inverted legacy API imports, 6 app barrels, and 2 line-limit ceilings.
- Runtime config now lives in `shared/config`; plugin query types derive from their transport contract; redundant workspace Jotai synchronization was deleted; schema bulk-upload orchestration moved out of the horizontal API layer.
- All app component consumers now import concrete modules. No replacement barrel or forwarding compatibility file remains.
- Extracted the service list model and infrastructure navigation data; `ServicesView.tsx` is 285 physical lines and `SidebarNavigation.tsx` is 299.
- Passed architecture/infrastructure focused tests (17/17), TypeScript, full frontend tests (153/153), production build, and diff whitespace check.
- `graphify update .` completed: 11,044 nodes, 31,359 edges, 351 communities.
- `vp check` remains blocked by 15 pre-existing formatting violations outside this change.
- React Doctor completed at 67/100 with 94 existing findings (4 errors, 90 warnings); no visual check was run because it was not requested.

# Frontend Shared API And Composition Root

- [x] Read architecture contract, Graphify report, agent rules, and relevant lessons.
- [x] Inventory HTTP transport consumers and legacy router/layout composition.
- [x] Consolidate `appFetch`, JSON requests, typed errors, and `ErrorDto` in `shared/api/http.ts`.
- [x] Remove the empty legacy `api/core` tree and update source/test imports without forwarding files.
- [x] Move root `main.tsx`, legacy router, and legacy layouts into `app/{main,router,layouts}`.
- [x] Remove the root-main architecture allowance and update the Vite HTML entry.
- [x] Run focused architecture/HTTP/router tests, TypeScript, full tests/build/check, React Doctor, line/diff checks, and `graphify update .`.
- [x] Record final review and exact blockers.

## Review

- Consolidated the complete HTTP contract in `shared/api/http.ts`; removed `api/core` and rewired all source and test consumers without compatibility forwarding files.
- Established `app` as the composition root: entry point, providers, router, and layouts now live below `app`; the reusable editor loader moved to `shared/ui`.
- Removed `router` and `layout` from the legacy-root list and removed the `main.tsx` root exception from the architecture fitness test.
- Passed focused tests (35/35), TypeScript, full frontend tests (153/153), production build, old-path audit, and diff whitespace check.
- `graphify update .` completed: 11,025 nodes, 31,321 edges, 365 communities.
- `vp check` remains blocked by 13 pre-existing formatting violations outside this slice.
- React Doctor remains at 67/100 with 94 existing findings (4 errors, 90 warnings); no visual check was run because it was not requested.

# Frontend Search Vertical Slice

- [x] Read architecture contract, Graphify report, agent rules, and relevant lessons.
- [x] Audit search transport, query ownership, UI consumers, and target-layer dependencies.
- [x] Move the search transport, contracts, tenant-aware keys, and query options into `features/search/api`.
- [x] Move active search UI/behavior into `features/search`, delete unused search surface, and remove both legacy search trees.
- [x] Keep class-name composition local to migrated search UI; defer the unrelated 86-consumer `cx` move.
- [x] Remove `search` from architecture legacy roots and update source/test imports.
- [x] Run focused architecture/search tests, TypeScript, full tests/build/check, React Doctor, line/diff checks, and `graphify update .`.
- [x] Record final review and exact blockers.

## Review

- Search now owns its transport, contracts, tenant-aware keys, query options, behavior, and result UI under `features/search`; both legacy search trees were deleted without forwarding files.
- `AppGlobalSearch` composes the active legacy workspace id with the feature query interface from `app`, preserving dependency direction and the existing query-key/HTTP contracts.
- Removed the unused `SearchResultsPanel`; kept class composition local instead of expanding the slice into an unrelated 86-consumer utility move.
- Passed focused architecture/query tests (16/16), TypeScript, full frontend tests (153/153), release build, old-path audit, line limits, and diff whitespace check.
- `graphify update .` completed: 11,004 nodes, 31,281 edges, 353 communities.
- `vp check` remains blocked by the same 13 pre-existing formatting violations outside this slice.
- React Doctor improved from 94 to 92 findings at 67/100 (4 errors, 88 warnings); no visual check was run because it was not requested.

# Frontend Admin Users Remote Slice

- [x] Read architecture contract, refreshed Graphify report, agent rules, and relevant lessons.
- [x] Audit the isolated admin-users transport/query seam and its legacy consumers.
- [x] Consolidate admin-user contracts and HTTP operations in `features/admin/api`.
- [x] Consolidate tenant-independent keys, query options, and mutation cache ownership in named modules.
- [x] Update legacy admin/workspace consumers and tests to concrete feature imports.
- [x] Delete `src/api/admin-users` completely without barrels or forwarding files.
- [x] Run focused architecture/admin tests, TypeScript, full tests/build/check, React Doctor, line/diff checks, and `graphify update .`.
- [x] Record final review and exact blockers.

## Review

- Consolidated 20 horizontal admin-user files into five named modules under `features/admin/api`: types, transport, keys, queries, and mutations.
- Preserved URLs, query parameters, query-key identity, `AbortSignal`, local error ownership, and prefix invalidation; legacy admin/workspace consumers now use concrete feature imports.
- Deleted `src/api/admin-users` without barrels or forwarding files and added one contract test covering reads, writes, HTTP/network failures, and cancellation.
- Passed focused architecture/admin tests (13/13), TypeScript, full frontend tests (156/156), release build, old-path audit, line limits, and diff whitespace check.
- `graphify update .` completed: 10,984 nodes, 31,234 edges, 343 communities.
- `vp check` remains blocked by the same 13 pre-existing formatting violations outside this slice.
- React Doctor improved from 92 to 91 findings at 67/100 (4 errors, 87 warnings); no visual check was run because it was not requested.

# Frontend MLForm Capability Foundation

- [x] Read architecture contract, refreshed Graphify report, agent rules, and relevant lessons.
- [x] Audit runtime cache, built-in registry, plugin-requirement detection, and all consumers.
- [x] Prove the runtime cache cannot move alone while legacy plugin/workspace API modules own its invalidation; keep it legacy without an exception.
- [x] Move MLForm built-in registry ownership and schema plugin-requirement detection into the same capability.
- [x] Update source/tests to concrete capability imports and delete both migrated legacy modules without forwarding files.
- [x] Run focused architecture/MLForm tests, TypeScript, full tests/build/check, React Doctor, line/diff checks, and `graphify update .`.
- [x] Record final review and exact blockers.

## Review

- Established `capabilities/mlform` ownership for the MLForm built-in registry and schema plugin-requirement detection; deleted both legacy algorithm modules without forwarding files.
- Updated all source/test consumers to concrete capability imports. Runtime behavior and public function names remain unchanged.
- The attempted runtime-cache move exposed two forbidden `legacy api → capability` imports in the fitness test; the move was reverted and no exception was added. It must move with plugin/workspace invalidation ownership.
- Passed focused architecture/MLForm tests (24/24), TypeScript, full frontend tests (156/156), release build, old-path audit, line limits, and diff whitespace check.
- `graphify update .` completed: 10,979 nodes, 31,192 edges, 345 communities.
- `vp check` now has 10 pre-existing formatting blockers; three touched legacy files were normalized while updating their imports.
- React Doctor remains at 67/100 with 91 existing findings (4 errors, 87 warnings); no visual check was run because it was not requested.

# Frontend Infrastructure Feature API Vertical Slice

- [x] Establish architecture baseline and inventory all 323 remaining `src/api` files by owner.
- [x] Consolidate infrastructure contracts and event guards under `features/infrastructure/api`.
- [x] Consolidate infrastructure HTTP transport, query keys/options, hooks, mutations, and terminal lifecycle without internal barrels.
- [x] Update all admin/algorithm/test consumers to concrete feature modules.
- [x] Delete `src/api/infrastructure`; audit old paths and architecture exceptions.
- [x] Strengthen the single infrastructure contract test for migrated success and error behavior.
- [x] Run focused/full tests, TypeScript, build/check, React Doctor, line/diff audits, and `graphify update .`.
- [x] Record final review, remaining `src/api` inventory, and exact blockers.

## Review

- Established infrastructure as its own feature under `features/infrastructure/api`; admin only gates and composes it.
- Replaced 33 shallow legacy files with five named modules for types/guards, transport, keys, queries, and mutations. No barrels or forwarding files remain.
- Preserved endpoints, payloads, query keys, five-second polling, abort propagation, cache invalidation, event guards, and terminal lifecycle.
- Extended the existing infrastructure test file with remote-interface coverage for all endpoints plus HTTP, network, and cancellation errors.
- Passed focused architecture/infrastructure tests (19/19), TypeScript, full frontend tests (158/158), release build, old-path audit, source line limits, and diff whitespace check.
- `graphify update .` completed: 10,945 nodes, 31,083 edges, 348 communities.
- `src/api` fell from 323 to 290 files. Remaining: schemas 98, workspace 95, models 36, review 25, plugins 20, user 16.
- `vp check` remains blocked by nine pre-existing formatting violations outside this slice.
- React Doctor reports 66/100 with 90 existing findings (4 errors, 86 warnings); no visual check was run because it was not requested.

# Frontend Legacy API Full Removal

- [x] Capture clean baseline and inventory all remaining `src/api` modules/imports.
- [x] Migrate user identity and workspace context/resources to `capabilities/workspace-context`, `features/user/api`, and `features/workspace/api`.
- [x] Migrate schema and review remote interfaces to `features/schemas/api` and `features/reviews/api`.
- [x] Migrate model and plugin remote interfaces to `features/models/api`, `features/plugins/api`, and the existing MLForm capability where runtime ownership requires it.
- [x] Reconcile cross-domain imports through concrete feature/capability modules without barrels or forwarding files.
- [x] Delete `src/api`, remove `api` from architecture legacy roots, and prove no old references/exceptions remain.
- [x] Run focused tests, TypeScript, full tests, build/check, React Doctor, line/diff/staging audits, and `graphify update .`.
- [x] Record final ownership map, verification, and exact blockers.

## Review

- Removed all 290 remaining files under `src/api`; the root itself and every `@/api/` import are gone.
- Replaced DTO/endpoint/hook ceremony with 39 named feature remote-interface modules plus four capability modules for workspace context and MLForm runtime cache.
- Preserved transport URLs/payloads, tenant-aware keys, `AbortSignal`, polling, mutation reconciliation, workspace cache isolation, and plugin runtime invalidation.
- Removed `api` from architecture legacy roots and added a fitness assertion that rejects recreating even an empty `src/api` directory.
- Passed architecture/contract tests (37/37), TypeScript, full frontend tests (158/158), release build, old-path/barrel/dependency/line-limit audits, and diff whitespace check.
- `graphify update .` completed: 10,678 nodes, 30,092 edges, 396 communities.
- `vp check` remains blocked by five pre-existing formatting violations outside this slice.
- React Doctor improved from 66/100 and 90 findings to 68/100 and 86 findings (4 errors, 82 warnings); no visual check was run because it was not requested.
- Separate audit found 19 pre-existing TSX files with multiple JSX-bearing declarations; this slice changed imports only and did not expand into unrelated UI splitting.

# Frontend Direct Feature Roots Removal

- [x] Capture the dependency/verification baseline and compute the complete move map.
- [x] Move admin UI to `features/admin`, infrastructure UI/domain logic to `features/infrastructure`, and editor code to `capabilities/editor`.
- [x] Move model and plugin UI/domain logic to `features/models` and `features/plugins`.
- [x] Move review and schema UI/domain logic to `features/reviews` and `features/schemas`.
- [x] Move user and workspace UI/domain logic to `features/user` and `features/workspace`.
- [x] Relocate remaining cross-cutting MLForm/editor/search/catalog mechanisms to their target capability/shared owners.
- [x] Reconcile app, source, and test imports; delete all migrated direct roots without forwarding files.
- [x] Remove architecture migration exceptions for eliminated roots and assert they cannot return.
- [x] Run focused architecture tests, TypeScript, full tests, build/check, line/diff audits, React Doctor, and `graphify update .`.
- [x] Record final ownership map, verification, and exact blockers.

## Review

- `src` now contains only `app`, `capabilities`, `features`, and `shared`; all former direct domain roots plus `api` and `algorithms` are absent, with zero legacy alias imports and no forwarding files/barrels.
- Admin, infrastructure, models, plugins, reviews, schemas, user, and workspace now own vertical UI/API/lib modules. Monaco and MLForm mechanisms live in named capabilities; generic UI, session seams, HTTP/plugin transport, relative-time, and keyboard mechanisms live at their permitted lower layer.
- Cross-feature workflows are composed in `app` or adapted through structural capability inputs. Review-link management moved to the schema boundary while the external review portal remains isolated.
- Removed the architecture legacy-root allowlist and its algorithms exception. The fitness test now explicitly rejects recreating every removed root; `ARCHITECTURE.md` documents the completed target state and disallows exceptions.
- Split migrated helper components so touched feature files honor one React component per file; all source modules remain below 300 non-comment lines.
- Passed architecture tests (9/9), TypeScript, full frontend tests (157/157), and release build. Old-path, root, target-barrel, line-limit, staging, and whitespace audits pass.
- `vp check` is blocked only by the pre-existing formatting issue in `frontend/AGENTS.md`; all refactor code passes formatting. React Doctor reports 67/100 with 85 existing findings (4 errors, 81 warnings).
- No visual check was run because it was not requested.
# Frontend React Doctor Cleanup

- [x] Reproduce React Doctor baseline and capture every diagnostic by rule/file.
- [x] Read frontend architecture contract; map findings to owning modules and rank root causes.
- [x] Fix all error diagnostics with focused regression coverage where a real behavior seam exists.
- [x] Fix all warning diagnostics using minimal native React/HTML patterns; split files before limits.
- [x] Re-run React Doctor until no actionable diagnostics remain; inspect any tool false positives explicitly.
- [x] Run focused tests, architecture tests, TypeScript, full tests, build/check, line/diff audits.
- [x] Run `graphify update .` and record final score, counts, changes, and exact blockers here.

## Review

- React Doctor improved from 63/100 (4 errors, 81 warnings) to 100/100 with zero findings across 463 files.
- Removed 15 dead frontend source files and obsolete exports; replaced impure render/state patterns, unstable keys, repeated scans, layout animations, and invalid interactive markup with native focused alternatives.
- Hardened custom report HTML rendering with a DOM-based sanitizer and regression coverage for scripts, event handlers, unsafe URLs, and external-link isolation.
- Focused verification: 7 files and 45 tests passed. Full verification: 39 files and 158 tests passed.
- `vp exec tsc -b --pretty false`, `vp build`, frontend architecture checks, and `git diff --check` passed.
- `vp check` reached repository formatting and stopped only on the pre-existing, out-of-scope `frontend/AGENTS.md` formatting issue.
- Visual verification was intentionally skipped because the task did not request it and repository policy forbids unsolicited visual checks.
- `graphify update .` completed: 10,472 nodes, 28,645 edges, and 451 communities. Tool-only warnings noted a stale installed skill, three zero-node JSON configuration files, and a missing optional SQL parser.

# Bundle Drop Zone Click Regression

- [x] Reproduce full-zone click regression with a component test.
- [x] Restore one native interactive surface without nested controls.
- [x] Run focused test, TypeScript, React Doctor, and Graphify update.

## Review

- Regression reproduced before the fix: clicking `.group` triggered zero file-input clicks.
- The whole drop zone is again one native button; the nested action is a visual `span`, preserving full-surface mouse and keyboard activation without nested interactive controls.
- Focused component test and TypeScript passed.
- React Doctor reports no component diagnostic. Its current project result is 77/100 with only two unrelated pnpm-hardening warnings because `minimumReleaseAge` and `trustPolicy` are commented out in the working copy; those concurrent settings were preserved.
- No visual check was run because it was not requested.
- Final `graphify update .` completed: 10,470 nodes, 28,639 edges, and 450 communities.

# TanStack Query And Ownership Cleanup

- [x] Centralize page writes, cache updates, and invalidations in feature mutation modules.
- [x] Replace prediction-feedback N+1 with one tenant-scoped batch query and backend contract.
- [x] Make schema+initial-version and run+initial-feedback persistence transactional backend commands.
- [x] Make Query own remote plugin sources; keep manual cache only for compiled source hashes; remove Jotai version state.
- [x] Persist catalog search/filter/sort/page in URL without dependencies.
- [x] Scope schema editor atoms per draft and move business pages from `app` to owning features.
- [x] Add success/error contract coverage; run focused and broad API/frontend verification.
- [x] Audit line limits, stale references, diff, then run `graphify update .`.

## Review

- Added atomic `POST /api/schemas/with-initial-version`; schema and v1 now share one transaction.
- Initial result feedback now travels inside run creation and persists in the run transaction; duplicate type/order is rejected before persistence.
- Added organization-scoped feedback batch endpoint/query. History now performs one HTTP request for normalized run ids instead of one per result.
- Moved remote plugin source loading into tenant-scoped Query options with cancellation. Manual cache now contains compiled source hashes only, evicts rejected promises, and no Jotai version atom remains.
- Catalog controls now use canonical URL params (`q`, `filter`, `sort`, `page`), validate values, preserve unrelated params, and reset page correctly.
- Workspace/model page writes now call mutation modules. Schema editor uses a fresh Jotai store per `draftId`.
- Moved schema creation, organization creation, and workspace home business UI into owning features; app retains cross-feature route composition. Review login behavior moved to reviews with app-only view composition.
- Passed API focused tests (8/8), API compile, frontend TypeScript, architecture tests, full frontend tests (165/165), and production build. Full API suite ran 148 tests; only pre-existing `WebAdapterArchitectureTest` violations in model/review controllers failed.
- `vp check` remains blocked only by pre-existing `frontend/AGENTS.md` formatting. React Doctor has no code findings; only two pre-existing pnpm-hardening warnings remain.
- No visual check run: repository policy forbids it unless explicitly requested.
- Final `graphify update .` completed: 10,572 nodes, 28,977 edges, 459 communities.

# Monaco Worker Rolldown Build Fix

- [x] Reproduce `vp run build` failure and inspect installed Monaco worker paths.
- [x] Add focused regression coverage for worker module resolution.
- [x] Apply smallest root-cause fix without externalizing Monaco.
- [x] Run focused tests, TypeScript, full tests/check/build, and source audits.
- [x] Run `graphify update .` and record exact verification below.

## Review

- Monaco 0.56 changed its package exports to map public subpaths into `esm/vs`; the old imports therefore resolved through a duplicated `esm/vs/esm/vs` path.
- Replaced both worker imports with Monaco 0.56 public specifiers and updated the existing loader test mocks so invalid production imports can no longer be hidden.
- Regression test failed before the source fix with the reported `ERR_MODULE_NOT_FOUND`, then passed 2/2 after it.
- TypeScript, architecture/loader tests (11/11), full frontend tests (165/165), exact `vp run build`, line-limit audit, stale-import audit, and `git diff --check` passed.
- `vp check` remains blocked only by existing formatting issues in `frontend/AGENTS.md` and `frontend/pnpm-workspace.yaml`.
- React Doctor found no code issue; its two existing warnings are pnpm hardening settings in `frontend/pnpm-workspace.yaml`.
- `graphify update .` completed: 10,570 nodes, 28,976 edges, 457 communities.

# MLForm Language Registry Render Crash

- [x] Reproduce both React Router render errors with one deterministic frontend check.
- [x] Trace language registry creation and every affected consumer.
- [x] Add regression coverage for missing JSON defaults and non-string sort values.
- [x] Fix the shared normalization boundary with the smallest coherent change.
- [x] Run focused tests, TypeScript, build/check, React Doctor, line/diff audits, and `graphify update .`.
- [x] Record root cause, verification, and exact blockers below.

## Review

- Monaco 0.56 exposes JSON defaults at `monaco.json.jsonDefaults`; removed the false `languages.json` contract and configured the supported root export.
- Normalized numeric backend run ids to strings before deduplication and sorting, eliminating the `localeCompare` crash and stabilizing query keys/transport.
- Unified Monaco callback, marker, theme, editor, and option types on `@monaco-editor/react`; this removes the IDE-only `onMount`/`options` incompatibilities reported after the first fix.
- Regression reproduced before the fix with the exact `localeCompare` TypeError and a clean TypeScript contract failure for `languages.json`.
- Passed focused tests (11/11), forced TypeScript, full frontend tests with limited workers (166/166), production build, formatting for all touched files, line-limit audit, stale-type audit, and `git diff --check`.
- Initial unconstrained full test run passed 149 assertions but timed out starting 6 workers; those files passed 17/17 alone and the complete limited-worker rerun passed 166/166.
- `vp check` is blocked only by pre-existing formatting issues in `frontend/AGENTS.md` and `frontend/pnpm-workspace.yaml`.
- React Doctor found no code issue; only two pre-existing pnpm-hardening warnings remain. No visual check ran because repository policy forbids unsolicited visual verification.
- `graphify update .` completed: 10,567 nodes, 28,970 edges, and 460 communities; existing tool/version, optional SQL parser, and zero-node JSON warnings remain.

# Internal Review Pool And Unified Authentication

- [x] Capture the current review/auth/permission contract and a clean verification baseline.
- [x] Replace review-link/token persistence with organization-owned reviews, review runs, and per-user submissions; no compatibility or migration layer.
- [x] Replace external-review permissions and role seeding with `REVIEW`, `MANAGE_REVIEWS`, and one `Reviewer` organization role.
- [x] Expose authenticated manager and reviewer APIs for creating, listing, opening, submitting, closing, and revoking reviews.
- [x] Consolidate login/register into the normal auth page with a validated local `returnTo` destination.
- [x] Move Review into the standard application shell/sidebar and remove the token portal, separate shell, and special login route.
- [x] Adapt review creation and workspace UI to the organization review pool without generated or copied links.
- [x] Replace legacy tests with one focused backend review contract suite and focused frontend auth/review behavior coverage.
- [x] Remove every stale token, external-reviewer, link, assignment, and legacy route reference; audit source line limits.
- [x] Run narrow then broad API/frontend verification, React Doctor, diff checks, and `graphify update .` without visual inspection.
- [x] Record implementation results and exact blockers in the Review section below.

## Review

- Replaced the encrypted review-link model with `SchemaReview`, public review/run UUIDs, organization ownership, derived lifecycle state, and per-user submissions. No Review token or compatibility path remains.
- Added `REVIEW` and `MANAGE_REVIEWS`; seeded one editable `Reviewer` organization role with only `REVIEW`. Generic organization invitation tokens remain intentionally separate.
- Added authenticated `/api/schema-reviews` manager/reviewer operations through an application port. Reviewers see every open review in their active organization and keep independent feedback/completion state.
- Moved Review to `/review` inside `AppShell`, added permission-aware sidebar/route guards, removed `ReviewShell` and the special Review login, and reused the normal login/register page with validated local `returnTo` plus permission-aware post-login landing.
- Replaced link creation/copy UI with organization review creation, close, and revoke controls. No visual check was run because repository policy forbids it unless requested.
- Passed focused API tests (29/29), all functional API tests (149/149), API package, TypeScript, focused frontend tests (16/16), full frontend tests with limited workers (171/171), production build, stale-contract audit, source line limits, and `git diff --check`.
- Full API run is blocked only by the pre-existing three `ModelControllerImpl` violations in `WebAdapterArchitectureTest`; the new Review controller adds zero violations after introducing `SchemaReviewUseCase`.
- `vp check` is blocked only by the two pre-existing formatting issues in `frontend/AGENTS.md` and `frontend/pnpm-workspace.yaml`.
- React Doctor reports 79/100 with 21 pre-existing findings, none in files changed by this feature. Initial parallel run timed out; the isolated rerun completed successfully.
- `graphify update .` completed: 10,556 nodes, 28,924 edges, and 468 communities; existing skill-version, optional SQL parser, and zero-node JSON warnings remain.

# Assigned Organization Reviews

- [x] Persist explicit reviewer assignments and validate selected users are active organization members with `REVIEW` permission.
- [x] Restrict reviewer visibility and access to assigned reviews while managers retain the full organization catalog.
- [x] Expose eligible reviewers and assignment metadata through the review API.
- [x] Rework the create-review modal around inference and reviewer selection, with a centered bounded layout.
- [x] Make `/review` the direct all-review catalog and keep lifecycle management there.
- [x] Update focused success/error coverage and remove stale open-pool copy and behavior.
- [x] Run narrow and broad API/frontend verification, audits, and `graphify update .` without visual inspection.
- [x] Record final implementation results and exact blockers below.

## Review

- Reviews now persist explicit assignees. Creation accepts only unique, enabled, active organization members whose effective role contains `REVIEW`; invalid selections roll back the transaction.
- Reviewers can list and open only assigned reviews. Managers see the full organization catalog across schemas and lifecycle states, with close/revoke controls on `/review`.
- The creation dialog selects inferences and reviewers in one centered native modal; review history and lifecycle actions no longer live inside that dialog.
- Focused backend review coverage passes 7/7. All 152 non-architecture API tests pass; the architecture test remains blocked only by the three pre-existing `ModelControllerImpl` service dependencies.
- No visual check was run because repository policy forbids it unless explicitly requested.
- Final `graphify update .` completed with 10,597 nodes, 29,054 edges, and 457 communities.

# Review Feedback Persistence Regression

- [x] Reproduce the empty saved-answer payload at the shared MLForm transport seam.
- [x] Fix the shared questionnaire transport so history and assigned-review pages persist field answers.
- [x] Ensure both surfaces refresh into a completed summary instead of remounting an empty questionnaire.
- [x] Run focused regression tests, broad API/frontend verification, audits, and `graphify update .`.
- [x] Record the root cause and final verification below.

## Review

- Reproduced the regression with MLForm model serialization empty and serialized field answers populated: the old transport submitted `{}`.
- The shared questionnaire transport now persists `serializedFieldValues`, so both inference history and assigned-review pages save the actual field-keyed answers.
- Both surfaces now share completion logic; assigned reviews require all questionnaire fields and no longer treat an empty feedback record as complete.
- Questionnaire state is reset by inference identity, preventing saved answers from leaking when navigating between review runs.
- The focused regression failed before the fix and passes after it. Full frontend verification passes 43 files/172 tests, TypeScript, production build, formatting of touched files, line limits, stale-reference audit, and `git diff --check`.
- `vp check` remains blocked only by the existing formatting issues in `frontend/AGENTS.md` and `frontend/pnpm-workspace.yaml`. React Doctor reports 21 pre-existing findings and none in changed files.
- The final graph refresh completed successfully; existing skill-version, optional SQL parser, and zero-node JSON warnings remain.

# Reviewer Inbox And Organization Inferences

- [x] Reproduce and remove the intermediate Review catalog/schema-selection behavior.
- [x] Add one reviewer-scoped Review inbox API returning all assigned open review groups and runs.
- [x] Make `/review` and its deep links render one direct rail/detail workspace across assigned reviews.
- [x] Remove global manager review visibility from reviewer work surfaces.
- [x] Add an organization-scoped inference catalog API with schema, snapshot, bookmark, and status metadata.
- [x] Add first-level `/inferences` route/sidebar page with URL-backed search, schema, bookmark, and status filters.
- [x] Add focused success/error/isolation coverage in the existing review and prediction feature test files.
- [x] Run focused and broad API/frontend verification, source audits, and `graphify update .` without visual inspection.
- [x] Record final results and exact blockers below.

## Review

- `/review` is now the current user's direct inbox: it opens the first pending assigned inference and keeps all assigned open review runs in one schema-labelled rail. The catalog/card step and separate workspace page were removed.
- Review work is assignment-scoped for every user, including review managers; manager permission no longer exposes an organization-global work pool. Feedback and completion remain independent per reviewer.
- Added `/inferences` as a first-level organization page. Its compact catalog includes schema/snapshot/bookmark metadata and URL-backed text, schema, bookmark, and status filters.
- Added an organization-scoped prediction-run catalog endpoint and focused isolation/filter/route coverage. No migration or compatibility layer was added.
- Passed focused tests (10 frontend, 10 backend), all 155 functional API tests, all 177 frontend tests, TypeScript, production build, formatting of touched files, line limits, stale-reference and diff audits.
- The API architecture test remains blocked only by the three pre-existing `ModelControllerImpl` service dependencies. `vp check` remains blocked only by pre-existing formatting in `frontend/AGENTS.md` and `frontend/pnpm-workspace.yaml`.
- React Doctor reports 21 pre-existing findings and none in changed code. No visual check ran because repository policy forbids it unless explicitly requested.
- `graphify update .` completed with 10,632 nodes, 29,151 edges, and 461 communities; existing skill-version, optional SQL parser, and zero-node JSON warnings remain.

# Auth And Review Legacy Cleanup

- [x] Add a failing contract check for the orphaned configurable auth surface and duplicate selector.
- [x] Make the public auth route open Login directly and switch to Register in the same fixed form.
- [x] Delete auth props and components that only supported the removed external-review login.
- [x] Remove unused global review catalog/context/lifecycle API and its DTO/entity state.
- [x] Preserve and verify secure `returnTo`, assigned inbox, review creation, feedback, and submission.
- [x] Run focused and broad frontend/API verification, source audits, and `graphify update .`.
- [x] Record final result and exact pre-existing blockers below.

## Review

- Auth now opens the Login form directly and switches to Register inside the same fixed form. Removed eight orphaned injection/config props plus `AuthOptions`, `AuthButton`, and `BackButton`.
- Preserved validated `returnTo`; it remains required by `ProtectedRoute` for authenticated deep links and rejects external or backslash destinations.
- Review API now exposes only consumed operations: create, eligible reviewers, assigned inbox, run detail, feedback, and submit. Removed unused global list/context/close/revoke operations, summary/organization DTOs, reviewer-list query, creator/update/lifecycle entity fields, and matching frontend contracts.
- Broader legacy scan found active role, draft, and storage compatibility code with real consumers; left it untouched because it is unrelated and not orphaned.
- Regression failed before cleanup and passes after it. Focused verification passes 16 frontend assertions and 8 Review API tests; broad verification passes all 155 functional API tests and 178 frontend tests, TypeScript, production build, touched-file formatting, line limits, stale-reference audit, and `git diff --check`.
- `vp check` remains blocked only by pre-existing formatting in `frontend/AGENTS.md` and `frontend/pnpm-workspace.yaml`. API architecture remains blocked only by the three pre-existing `ModelControllerImpl` service dependencies documented earlier.
- React Doctor reports 21 pre-existing findings, none in changed files. No visual check ran because repository policy forbids it unless explicitly requested.
- `graphify update .` completed with 10,597 nodes, 29,034 edges, and 461 communities; existing skill-version, optional SQL parser, and zero-node JSON warnings remain.

# Inference Catalog Actions

- [x] Extract review creation into one reusable capability and expose it from Inferences.
- [x] Reuse the full schema-run export flow for the currently filtered inference snapshot.
- [x] Make each inference row the detail target and replace the View action with a three-dot Delete menu.
- [x] Add organization-scoped inference deletion, rejecting runs already attached to a review.
- [x] Cover export reuse, review action, navigation, deletion success, and deletion error paths.
- [x] Run focused and broad verification, audits, and `graphify update .` without visual inspection.

## Review

- Inferences now exposes Create review and the existing full Export to CSV workflow. Export loads full runs and snapshot data, then reuses the same inference/reviewer selection modal and schema-derived CSV builder as bookmark history; no compact catalog CSV remains.
- When filtered results span snapshots, Export first lists those snapshots because the established CSV contract is snapshot/schema-specific. Only currently filtered inference ids are passed into the selected export.
- Entire inference rows open detail. The former View action is gone; authorized users get a far-right three-dot menu with Delete.
- `DELETE /api/prediction-runs/{id}` is organization-scoped, requires `canRunPredictions`, deletes result feedback/results transactionally, and returns conflict when the inference belongs to a review.
- Focused frontend checks pass 20/20 and API deletion checks 4/4. Full frontend passes 44 files/180 tests, TypeScript, architecture fitness, and production build. Full functional API passes 157/157.
- Full API remains blocked only by the three pre-existing `ModelControllerImpl` architecture violations. `vp check` remains blocked only by pre-existing formatting in `frontend/AGENTS.md` and `frontend/pnpm-workspace.yaml`.
- React Doctor reports the same 21 pre-existing findings and none in changed files. Source limits, stale-reference audit, and `git diff --check` pass. No visual check ran because it was not requested.
- `graphify update .` completed with 10,622 nodes, 29,075 edges, and 466 communities; existing skill-version, optional SQL parser, and zero-node JSON warnings remain.

# Reviewer Submission Reopening

- [x] Expose manager-scoped reviewer status for each organization inference.
- [x] Reopen one completed review run for one assigned reviewer while retaining feedback.
- [x] Add Review status and Reopen to the inference overflow workflow.
- [x] Cover success, authorization/scope, invalid state, and visible frontend contracts.
- [x] Run focused and broad verification, audits, and `graphify update .` without visual inspection.

## Review

- Inferences now exposes Review status in each authorized overflow menu. Managers see every real review assignment for that inference, including reviewer, pending/in-progress/completed state, submission time, and expiry.
- Reopen targets one review run and one assigned reviewer. It requires `MANAGE_REVIEWS`, current-organization ownership, a live review, and an existing completed submission; only the submission marker is deleted, so saved feedback remains available for correction and resubmission.
- Added a tenant-scoped Query contract and organization-wide invalidation after reopening, keeping both the manager surface and reviewer inbox consistent without a second client state store.
- Focused checks pass: 6/6 backend management tests and 7/7 inference frontend tests. Broad checks pass: 163/163 functional API tests, 181/181 frontend tests, TypeScript, frontend architecture, and production build.
- API architecture remains blocked only by the same three pre-existing `ModelControllerImpl` service dependencies. `vp check` remains blocked only by pre-existing formatting in `frontend/AGENTS.md` and `frontend/pnpm-workspace.yaml`.
- React Doctor reports the same 21 pre-existing findings and none in changed files. Touched source limits and `git diff --check` pass. No visual check ran because it was not requested.
- Final `graphify update .` completed with 10,679 nodes, 29,281 edges, and 473 communities; existing skill-version, optional SQL parser, and zero-node JSON warnings remain.

# Inference Review Detail Navigation

- [x] Add canonical `/inferences/:inferenceId` detail route with one inline Reviews section.
- [x] Move reviewer status and reopening from the modal into that section.
- [x] Make inference rows open canonical detail and `Review status` open `?section=reviews`.
- [x] Delete modal state/component and stale contract assertions.
- [x] Cover route, navigation, permissions, loading/error/empty, and reopen behavior.
- [x] Run focused and broad verification, audits, and `graphify update .` without visual inspection.

## Review

- Inference rows now open `/inferences/:inferenceId`; the overflow `Review status` action opens `/inferences/:inferenceId?section=reviews`.
- The detail page has no tabs. It renders inference metadata followed by one inline Reviews section; the query parameter only scrolls directly to that section.
- Review status, empty/loading/error states, reviewer completion metadata, and the existing reopen workflow moved into a reusable section. The former modal component and table modal state were removed.
- Focused checks pass 8/8, and broad frontend verification passes 44 files/182 tests, TypeScript, architecture fitness, and production build.
- Touched-file formatting, source limits, stale implementation-reference checks, and `git diff --check` pass. `vp check` remains blocked only by pre-existing formatting in `frontend/AGENTS.md` and `frontend/pnpm-workspace.yaml`.
- React Doctor reports the same 21 pre-existing findings and none in changed files. No visual check ran because it was not requested.
- `graphify update .` completed with 10,682 nodes, 29,283 edges, and 469 communities; existing skill-version, optional SQL parser, and zero-node JSON warnings remain.
# Impeccable Product Context Init

- [x] Load Impeccable init workflow, repository graph, existing docs, routes, and current task lessons.
- [x] Confirm primary user/job, product distinction, and durable constraints with product owner.
- [x] Create root `PRODUCT.md` using Impeccable product schema without changing `DESIGN.md`.
- [x] Configure live mode if useful and safe; otherwise record why skipped.
- [x] Verify product record, update graph, and document result below.

## Review

- Captured MLSuite as a schema-first, self-hostable web platform for ML engineers, data scientists, domain reviewers, and organization administrators.
- Recorded versioned model/schema contracts, generated forms, traceable inference, assigned review, feedback, RBAC, evidence boundaries, and durable product principles.
- Left existing `DESIGN.md` untouched. Added minimal live-mode config for `frontend/index.html`; CSP detection found no policy requiring a source patch.
- Verified Impeccable schema/path discovery, live boot, JSON config, injection target, and whitespace checks. No visual check ran because it was not requested.
- `graphify update .` completed with 10,691 nodes, 29,292 edges, and 469 communities; existing skill-version, optional SQL parser, visualization-size, and zero-node JSON warnings remain.

# Inference Catalog Refresh After Creation

- [x] Reproduce missing catalog invalidation for manual inference creation.
- [x] Centralize prediction-run catalog cache identity without cross-feature imports.
- [x] Refresh bookmark history and organization Inferences after manual and bulk creation.
- [x] Add regression coverage for cache invalidation and both creation paths.
- [x] Run focused and broad frontend verification, audits, and `graphify update .` without visual inspection.

## Review

- Root cause: manual and bulk creation refreshed bookmark history only, leaving the organization inference catalog cache valid with stale data.
- Added one prediction-run catalog key capability consumed by both Inferences and Schemas. Both creation paths now invalidate bookmark history and organization Inferences without broad organization refetching or cross-feature imports.
- Regression failed before the fix and passes after it. Focused inference checks pass 9/9; broad frontend passes 44 files/183 tests, TypeScript, architecture fitness, and production build.
- Touched-file formatting, source limits, and `git diff --check` pass. `vp check` remains blocked by pre-existing formatting in `frontend/AGENTS.md`, `frontend/index.html`, and `frontend/pnpm-workspace.yaml`.
- React Doctor reports 10 existing findings and none in current refresh files. No visual check ran because this was a cache-only fix and none was requested.
- `graphify update .` completed with 10,682 nodes, 29,283 edges, and 472 communities; existing skill-version, visualization-size, optional SQL parser, and zero-node JSON warnings remain.

# Review Catalogs And Assignment Repair

- [x] Reproduce and fix PostgreSQL review creation failure at its persisted source.
- [x] Replace create-review lists with two searchable, independently paginated selection catalogs.
- [x] Preserve selection across pages and both Inferences/bookmark-history entry points.
- [x] Replace inference review status rows with paginated reviewer-specific tiles.
- [x] Add safe Reopen and Delete response actions with tenant and permission enforcement.
- [x] Reconcile review/inference caches after create, reopen, and delete.
- [x] Cover creation, pagination, permissions, state transitions, errors, and empty states.
- [x] Run focused and broad API/frontend verification, audits, and `graphify update .` without visual inspection.

## Review

- Root cause of Assign failure was PostgreSQL rejecting inserts because active `SchemaReview` no longer mapped the
  required `updated_at` and `created_by_user_id` columns. Both fields are active again; creator metadata now reaches
  inference review tiles.
- Shared Create review dialog now provides separate searchable, six-item paginated Inferences and Reviewers
  catalogs. Selection survives page/search changes, IDs are validated and sent as numbers, and the same capability
  serves organization Inferences and bookmark history.
- Inference detail now ends with a searchable/status-filtered, paginated tile catalog: one tile per reviewer
  assignment. Reopen removes only completion and keeps answers; Delete response removes that reviewer's submission
  plus feedback while retaining the assignment as Pending.
- Management operations require `MANAGE_REVIEWS`, current-organization ownership, matching review run, and an
  assigned reviewer. Create/reopen/delete invalidate reviewer inbox and the exact inference assignment cache.
- Passed focused API tests 19/19, focused frontend/architecture tests 20/20, all functional API tests, all frontend
  tests 185/185, TypeScript, frontend architecture 9/9, and production build.
- Full API remains blocked only by the three pre-existing `ModelControllerImpl` architecture violations. `vp check`
  remains blocked only by existing formatting in `frontend/AGENTS.md`, `frontend/index.html`, and
  `frontend/pnpm-workspace.yaml`. React Doctor improved to 80/100 with nine unrelated existing warnings.
- Source limits and diff whitespace pass. No visual check ran because repository policy forbids it unless requested.

# Global Search And Plugin Report Persistence Repair

- [x] Reproduce separate Snapshot/Bookmark search gaps and define their independent result contracts.
- [x] Reproduce `Duplicate report payload for mappedTo "classifier9"` at the MLForm result boundary.
- [x] Reproduce CrystalTree divergence between mounted form, result modal, and saved prediction payload.
- [x] Add organization-scoped Snapshot and Bookmark groups to global search with canonical navigation.
- [x] Fix report payload identity/expansion at the shared MLForm transport boundary.
- [x] Preserve CrystalTree results through modal rendering and prediction persistence.
- [x] Cover grouped search, duplicate targets, per-model payloads, and fetched plugin-result persistence.
- [x] Run focused and broad API/frontend verification, audits, and `graphify update .` without visual inspection.

## Review

- Global search now returns separate organization-scoped `Snapshots` and `Bookmarks` groups. Each result uses its
  canonical snapshot/bookmark detail route; frontend result types, icons, and search prompt match the API contract.
- Root cause of `Duplicate report payload`: analyzer targets such as `classifier9` were also used as MLForm's
  cross-model payload identity. Labels were irrelevant. Runtime report keys are now unique while per-model output and
  persistence retain the original analyzer target.
- Root cause of missing CrystalTree output: `mlf-submit-success` exposed fetched plugin payloads in
  `pipelineResult.reportFetchResults`, but the mount adapter only consumed `submitResult.raw`. Fetched results now
  become ready report states and are copied into the owning result before the modal/save callback.
- Regression tests failed before the fixes and now pass. Focused API search tests pass; all frontend tests pass
  187/187, frontend architecture passes 9/9, TypeScript and production build pass.
- Full API executed 170 tests and is blocked only by the three pre-existing `ModelControllerImpl` architecture
  violations. React Doctor remains 80/100 with nine unrelated existing warnings. No visual check ran because it was
  not requested.
- `graphify update .` completed with 10,730 nodes, 29,407 edges, and 473 communities; existing skill-version,
  visualization-size, optional SQL parser, and zero-node JSON warnings remain.

# Inference Creation Theme And Summary Layout

- [x] Reproduce report loss when switching light/dark mode after a schema run.
- [x] Reproduce CrystalTree light-only rendering in the inference creation summary.
- [x] Preserve mounted MLForm report state across theme updates without rerunning models.
- [x] Make custom report rendering consume the active app theme.
- [x] Recompose inference creation summary as one column: name, feedback, collapsible outputs, collapsible inputs.
- [x] Reuse inference-detail output/input organization where its contract matches.
- [x] Add regression coverage for theme updates, dark CrystalTree, section order, and collapse behavior.
- [x] Run focused/full frontend verification, audits, source limits, and `graphify update .`.

## Review

- Root cause: `SchemaRunForm`, `SchemaFormPreview`, and `ReportQuestionnaireMount` included `theme` in
  their mount-effect dependencies, so every theme switch destroyed MLForm state. They now update the mounted design
  system in place, preserving resolved reports and questionnaire values.
- Read-only custom/plugin reports now receive MLForm's active design-system tokens. CrystalTree therefore follows
  light/dark mode in the creation summary without recreating its report frame or payload.
- The creation modal is a centered single-column summary ordered Name, Feedback questionnaire, Outputs, and Inputs.
  Outputs and Inputs reuse the same independently collapsible panels as inference detail; save actions remain in a
  stable footer.
- New regression coverage failed before the fix and now passes. Focused tests pass 23/23; the full frontend suite
  passes 190/190; TypeScript, focused lint, architecture tests, and the production build pass.
- React Doctor improved from 77/100 with three errors introduced by the first implementation to 80/100 with only
  nine unrelated existing warnings. Full `vp check` remains blocked by existing formatting drift in `AGENTS.md`,
  `index.html`, `pnpm-workspace.yaml`, and an unrelated prior test; all files changed for this task are formatted.
- No source exceeds 300 non-comment lines. No visual check ran because it was not requested. `graphify update .`
  completed with 10,733 nodes, 29,409 edges, and 491 communities.

# Schema Preview Identity, Logical Feedback, And Bulk Save

- [x] Reproduce same-key multi-model failure through schema preview and lock it with a regression.
- [x] Reuse one runtime report identity preparation path in inference and preview.
- [x] Keep MLForm preview mount failures inside the preview instead of the route boundary.
- [x] Build one logical feedback assessment per source report and fan its answer out to every mapped result.
- [x] Preserve separate assessments for separate source reports, including equal analyzer keys.
- [x] Serialize model/dataframe bundle saves and retain failed bundles for retry.
- [x] Cover success, partial/divergent feedback, preview failure, bulk partial failure, and retry.
- [x] Run focused and broad verification, source audits, and `graphify update .`.

## Review

- Schema draft/version preview now uses the same runtime report preparation as real inference. Multi-model reports
  sharing `classifier9` receive unique MLForm identities, while analyzer targets remain unchanged. Synchronous mount
  failures render inside the preview instead of reaching the route boundary.
- Feedback steps now follow source reports. One report mapped to several successful models renders one assessment;
  separate reports remain separate even when their analyzer keys match. Internal feedback, reviewer feedback, and
  pending inference feedback fan one answer out to every mapped result.
- Existing identical target feedback pre-fills and completes the shared assessment. Missing or divergent target
  feedback remains incomplete until one save converges every target.
- Model/dataframe Save all now runs one analyzer upload at a time, attempts later bundles after a failure, retains
  failed bundles, and navigates only after every selected bundle succeeds.
- Regression tests failed before the fixes and pass after them. Focused checks pass 36/36; full frontend passes
  201/201, architecture 9/9, TypeScript has zero errors, production build passes, and touched files remain below 300
  non-comment lines.
- Full `vp check` is blocked only by pre-existing formatting in `AGENTS.md`, `index.html`,
  `pnpm-workspace.yaml`, and `test/schema-run-report-regressions.test.ts`. React Doctor reports nine existing
  findings and none in this change. No visual check ran because it was not requested.
- `graphify update .` completed with 10,739 nodes, 29,412 edges, and 480 communities; existing skill-version,
  visualization-size, optional SQL parser, and zero-node JSON warnings remain.

# Preview Transport Alias Deduplication

- [x] Reproduce screenshot error with a runtime target exposed through model and `default` aliases.
- [x] Deduplicate preview payloads by resolved runtime target.
- [x] Assert transport payload cardinality instead of only mounted frame count.
- [x] Run focused/full frontend tests, typecheck, build, and `graphify update .`.

## Review

- Root cause: runtime schema adaptation correctly added `default` as an alias, but preview transport treated both
  alias entries as independent reports and returned the same `mappedTo` payload twice.
- Preview transport now emits one payload per unique runtime target. Analyzer keys and report identities remain
  unchanged.
- Exact regression failed with two identical payloads before the fix and passes with one after it. Full frontend
  passes 202/202; TypeScript has zero errors and production build passes.

# Workspace Context Invitation Removal

- [x] Confirm every consumer of `WorkspaceContextDto.invitations` and the dedicated invitation query contracts.
- [x] Add regression coverage proving workspace bootstrap omits organization invitations.
- [x] Remove invitations and their repository dependency from the backend workspace context.
- [x] Remove the frontend workspace-context field and use authorized dashboard metrics on the workspace home.
- [x] Run focused backend/frontend tests, broad relevant checks, source-limit audit, and `graphify update .`.

## Review

- Workspace bootstrap no longer injects or queries `InvitationRepository`; its public JSON omits `invitations` in
  both GET and organization-selection responses. Dedicated incoming and organization invitation APIs remain intact.
- Workspace home now reads member, model, and pending-invitation counts from the organization dashboard instead of
  treating the current user's organization memberships as members or loading invitation records into session context.
- Dashboard counts and recent collections are permission-shaped: invitation summaries require invitation management,
  member summaries require member visibility, and the home omits metric cards the current role cannot view.
- The backend contract regression failed before the fix and passes after it. Focused API tests pass 12/12; focused
  frontend passes 3/3; full frontend passes 205/205; TypeScript and production build pass.
- Full API ran 173 tests and remains blocked only by the three pre-existing `ModelControllerImpl` architecture
  violations. Full `vp check` remains blocked by existing repository-wide formatting drift; all touched frontend
  files pass formatting. React Doctor remains 80/100 with nine unrelated existing findings.
- All touched source files remain below 300 non-comment lines. No visual check ran because it was not requested.
  Final independent review found no critical or important issues. `graphify update .` completed with 10,749 nodes,
  29,438 edges, and 489 communities.

# Organization Fake Metrics And Visibility Removal

- [x] Lock the real organization catalog/dashboard contract with focused regressions.
- [x] Remove organization quota fields and their non-functional dashboard card.
- [x] Remove fake Public/Private catalog data, filtering, query parameters, cache dimensions, and UI copy.
- [x] Confirm Members uses the permission-shaped `totalMembers` source and retain its regression coverage.
- [x] Run focused and broad API/frontend verification, source-limit audit, review, and `graphify update .`.

## Review

- Organization dashboards no longer expose the always-zero quota fields or render a quota card. Real team, member,
  model, and invitation counts remain permission-shaped.
- Organization catalog items no longer claim every organization is public. The fake visibility filter was removed from
  the controller, service, repository query, frontend request, cache key, DTO, and UI; stale visibility URL filters are
  normalized away.
- Workspace Members continues to use `dashboard.stats.totalMembers`, with regression coverage for the real value,
  fallback, and denied permissions. Persisted Team quota remains intentionally untouched.
- Focused backend tests pass 15/15; full frontend passes 207/207; focused frontend passes 7/7; TypeScript, production
  build, touched-file formatting, source limits, and diff checks pass.
- Full API executes 173 tests and remains blocked only by the three pre-existing `ModelControllerImpl` architecture
  violations. Full `vp check` remains blocked by repository-wide formatting drift (469 files); touched files pass.
  React Doctor remains 80/100 with nine unrelated existing findings. No visual check ran because it was not requested.
- Independent review found no critical or important issues.
- `graphify update .` completed with 10,749 nodes, 29,433 edges, and 505 communities; existing skill-version,
  visualization-size, optional SQL parser, and zero-node JSON warnings remain.

# Complete Team Removal

- [x] Map every Team dependency and lock organization-only replacement contracts.
- [x] Remove Team backend entities, persistence, services, endpoints, DTOs, role scope, permissions, and references.
- [x] Remove Team frontend routes, navigation, pages, API/cache/types, permission gates, and copy.
- [x] Remove obsolete tests and add focused regressions for surviving organization flows.
- [x] Run focused/full API and frontend verification, source-limit audit, independent review, and `graphify update .`.

## Review

- Removed the complete Team backend package and every cross-domain association from invitations, models, roles,
  authorization, workspace context, organization reporting, and search. The surviving contract is organization-only.
- Removed Team routes, navigation, pages, mutations, queries, cache keys, types, permission gates, metrics, selectors,
  and copy from the frontend. Legacy Team URLs now resolve through the normal not-found path.
- Focused verification passes 65 API tests and 11 frontend tests. Full frontend passes 206/206, lint and production
  build pass, touched formatting and source limits pass, and global source/test search finds no Team references.
- Full API runs 171 tests; its only failure is the pre-existing three-violation `ModelControllerImpl` architecture rule.
  Full `vp check` remains blocked by pre-existing repository-wide formatting drift in 461 files. React Doctor remains
  80/100 with nine unrelated findings. No visual check ran because it was not requested.
- Independent review found no code defect. Because schema migration was intentionally omitted, an existing development
  database must be reset before startup; Hibernate `ddl-auto=update` neither drops Team schema nor cleans persisted
  Team permission enum values.

# Legacy role migration

- [x] Map every legacy role read/write path after Team removal and define the safe phase boundary.
- [x] Backfill missing organization membership and invitation role definitions for every status.
- [x] Make bootstrap writes assign the owner role definition immediately.
- [x] Add focused regression coverage for mappings, custom-role preservation, idempotency, and bootstrap.
- [x] Run focused/full API verification, source-limit audit, independent review, and `graphify update .`.

## Review

- `RoleSeedService` now seeds system definitions once per organization and backfills null role definitions on all
  organization memberships and invitations, independent of lifecycle status. Existing custom assignments remain intact,
  changed rows are saved explicitly, and repeated runs perform no writes.
- Personal workspace bootstrap now persists its OWNER membership with the matching role definition from the start.
- The focused migration/invitation/organization/authorization suite passes: 27 tests, 0 failures. The full API suite ran
  173 tests; its only failure is the pre-existing `WebAdapterArchitectureTest` dependency from `ModelControllerImpl` to
  `ModelCreationService`, unrelated to this change.
- All touched Java files remain below 300 non-comment lines. Legacy enums, nullable columns, DTO fallbacks, and frontend
  contracts intentionally remain for a later Phase B after the backfill has been deployed and validated.
- Independent review found no high-severity defect. Its persistence-test concern was resolved by asserting explicit
  repository writes; the startup runner intentionally keeps one transaction because this development dataset is small.

# Active membership rule

- [x] Inventory every active-membership predicate and repository query.
- [x] Define one canonical active-membership rule and record the domain term.
- [x] Route access, context, catalog, and review consumers through that rule.
- [x] Add one focused regression file covering active, pending, and removed memberships.
- [x] Run focused/full API verification, source-limit audit, independent review, and `graphify update .`.

## Review

- Active membership is now a repository-level semantic contract: only `ACTIVE` grants organization access or appears
  in context, catalog counts, search, review assignment, role counts, and member mutations. Raw all-status queries remain
  only for migration, explicit invitation reactivation, organization cleanup, and role-deletion integrity.
- `WorkspaceAccessService` is the single active-membership gate used by authorization and organization selection.
  Bootstrap repairs a stale current-organization pointer by selecting another active membership or creating a personal
  organization when none exists.
- Accepting an invitation explicitly reactivates a `PENDING` or `REMOVED` membership and applies the invited role;
  an already-active membership is left unchanged. Deleting a role reassigns inactive memberships and invitations too,
  preventing historical foreign keys from blocking deletion.
- The focused compile and seven-suite verification pass. The full API run executes 177 tests; its sole failure remains
  the pre-existing `WebAdapterArchitectureTest` dependency from `ModelControllerImpl` to `ModelCreationService`.
- All touched Java files remain below 300 non-comment lines and `git diff --check` is clean apart from line-ending
  notices. A JPA-backed query regression could not run because this environment has no Docker for the repository's
  Testcontainers setup; domain/service regressions cover ACTIVE access plus PENDING/REMOVED denial and reactivation.

# Schema editor change decoration cleanup

- [x] Reproduce the red/green changed-line backgrounds and gutter bars from the shared Monaco decoration path.
- [x] Remove those visual decorations without changing schema editing or change detection.
- [x] Run focused frontend tests, typecheck, source-limit checks, and `graphify update .`.
- [x] Record verification and result below.

## Review

- Removed the custom Monaco changed-line backgrounds, glyph/gutter bars, marker calculation, and unused base-version
  query. Schema validation, editing, preview, and saving remain unchanged.
- Frontend architecture passes 9/9, full frontend tests pass 206/206, clean TypeScript build and production build pass.
  React Doctor remains 80/100 with nine unrelated existing findings.
- Touched TS/TSX files pass formatting and stay below 300 non-comment lines. `index.html` retains its known existing
  formatting drift; only the obsolete decoration rules were removed. No visual check ran because it was not requested.

# Reviewer organization switch redirect

- [x] Reproduce Reviewer returning to an organization and landing on inaccessible workspace.
- [x] Route organization changes through the same first-authorized destination used at login.
- [x] Cover Reviewer and normal workspace access in one regression file.
- [x] Run focused/full frontend verification, source limits, and `graphify update .`.

## Review

- Root cause was the organization selector hardcoding `/workspace` after a successful context mutation. It now routes
  through `/home`, where the updated permission set chooses `/workspace`, `/review`, or `/profile` exactly as login does.
- Regression failed before the fix and passes after it. Mutation rejection still cannot navigate because routing remains
  inside the fulfilled promise handler.
- Focused review routing passes 8/8; full frontend passes 207/207; architecture passes 9/9; TypeScript and production
  build pass. React Doctor reports 89/100 with two unrelated existing findings.
- Touched files pass formatting, diff checks, and the 300-line limit. No visual check ran because it was not requested.

# Owner organization settings parity

- [x] Lock owner/superadmin organization edit and safe-delete contracts with focused backend regressions.
- [x] Unify organization update/delete authorization so owner permissions are real and superadmins do not need membership.
- [x] Keep sidebar as the sole organization navigation and use target-organization permissions in each page.
- [x] Rebuild settings with a standard full-width header and a centered flat settings block below it.
- [x] Gate member, role, and invitation actions by their exact permissions.
- [x] Restyle Roles & Templates as a flat catalog with underline tabs and native modal dialogs.
- [x] Cover settings, invitation, role, permission, error, and destructive-action behavior in one frontend test file.
- [x] Run focused and broad API/frontend verification, React Doctor, source-limit audit, independent review, and `graphify update .`.

## Review

- Organization Settings now edits name, slug, and nullable description; transfers ownership; and safely deletes empty
  organizations. The page uses the normal full-width header as one block and centers only the settings content below.
- The sidebar remains the only organization-level navigation. Target-organization permissions drive every route and
  action, including independent view/invite/manage gates. Invitation tokens are redacted from read-only responses.
- Roles & Templates keeps its meaningful local tabs as a flat underline rail, removes gray panel fills, and replaces
  the sidebar-overlapping drawer with native, keyboard-operable detail and edit dialogs.
- Focused API regressions pass 32/32. Full frontend passes 214/214, focused frontend/architecture passes 16/16,
  TypeScript, lint, and production build pass. React Doctor's remaining findings are unrelated existing debt.
- Full API runs 185 tests; its sole failure is the pre-existing `WebAdapterArchitectureTest` violation in
  `ModelControllerImpl`/`ModelCreationService`. Full `vp check` remains blocked by 436 pre-existing formatting issues.
- All changed sources remain at or below 300 non-comment lines. Independent review found no remaining task-scoped
  Critical or Important findings. No visual browser check ran because it was not requested.

# Unresolved `$defs/__schema0` on schema change

- [x] Build a deterministic reproduction from the schema-change editor validation path.
- [x] Trace schema generation, normalization, Monaco model updates, and error rendering end to end.
- [x] Test ranked causes against current code, dependency versions, tests, and relevant git history.
- [x] Document root cause, trigger conditions, impact, and the smallest correct repair boundary.

## Review

- `mlform@0.1.22` converts every registered Zod field definition independently, then nests those complete JSON Schema
  documents under a new root `oneOf`. Recursive field conditions produce local `$defs.__schema0`, while their
  `#/$defs/__schema0` references still target document root. Generated root has no `$defs`: all 72 refs are unresolved.
- Monaco correctly resolves local JSON Pointers from `internal://root.schema.json`, emits first resolution warning at
  root line 1 column 1, and skips semantic JSON Schema validation. MLSuite counts that warning as an error and blocks
  Preview/Review. Runtime Zod validation remains separate, which is why current focused tests pass.
- Regression reached MLSuite in `03a83198`, which upgraded MLForm 0.1.19 to 0.1.22 and replaced the prior manual editor
  schema with dynamic `toSchemaJsonSchema`. Monaco 0.56 predates this change and is not the cause.
- Correct repair boundary is MLForm's `toSchemaJsonSchema`: export one combined Zod schema, or safely hoist/rebase every
  nested definition and reference with collision-free names. Filtering the marker in MLSuite would hide an invalid
  generated schema and leave custom definitions exposed to the same defect.
- Deterministic inspection found 72/72 unresolved refs. A single combined Zod export produced 39/39 resolvable refs.
  Existing `builtin-registry.test.ts` passes 5/5 and demonstrates the missing resolver-level regression coverage.

# Literal dotted model feature mapping

- [x] Add one frontend regression covering dotted one-hot targets in prediction and explanation payloads.
- [x] Resolve MLForm path values while preserving literal model feature names.
- [x] Reject incomplete prediction records in the Python runtime and cover success/error cases.
- [x] Run focused and broad verification, source-limit audit, review, and `graphify update .`.

## Review

- MLForm path-shaped values are flattened back to exact model feature names; existing literal keys remain authoritative.
- Prediction and explanation now share strict feature validation. Named models validate exact columns; positional models
  validate feature count while retaining incoming column order.
- Regression coverage failed before the fix and now passes for dotted one-hot prediction/explanation bodies, literal
  precedence, named missing features, positional count mismatch, and complete predictions.
- Full frontend passes 50 files and 214 tests; production build and touched-file checks pass. Full Python runtime passes
  40 tests; compileall passes. React Doctor remains 81/100 with eight unrelated existing warnings.
- Repository-wide `vp check` remains blocked by 353 pre-existing formatting issues. `ruff` is unavailable in the Python
  environment; no dependency was added solely for linting. All touched files remain below 300 non-comment lines.
- Independent review found no remaining Critical, Important, or Minor issues. No visual check ran because no UI changed
  and none was requested. `graphify update .` completed with 10,315 nodes, 28,245 edges, and 467 communities.

# Inline schema inference save flow

- [x] Replace create-inference modal with editable run name and one save action in page header.
- [x] Reset generated run name and saved state whenever a new prediction starts.
- [x] Synchronize save availability and copy with running, report-loading, ready, saving, and saved states.
- [x] Persist inference without creation-time feedback; keep feedback in existing inference detail workflow.
- [x] Remove obsolete modal, pending-feedback bridge, and duplicated-summary tests.
- [x] Cover success and error states in one focused frontend test file.
- [x] Run focused and broad frontend verification, source-limit audit, review, and `graphify update .`.

## Review

- Inference creation now has one form: the editable generated name and state-aware save action live in the header;
  creation-time feedback and the duplicated review modal were removed.
- Loading begins only after MLForm validation succeeds. Invalid submissions remain idle, reports must finish before
  saving, and saved results cannot be saved twice.
- A synchronous save latch and run-generation guard prevent duplicate requests and prevent an older save from
  overwriting a newer inference state.
- Focused coverage passes 4 tests; the full frontend passes 49 files and 212 tests. Production build and touched-file
  checks pass. React Doctor is 80/100 with nine unrelated pre-existing warnings.
- Repository-wide `vp check` remains blocked by 348 pre-existing formatting issues. All touched files remain below
  300 non-comment lines. Independent review found no remaining Critical, Important, or Minor issues.
- No visual check ran because repository policy forbids it unless explicitly requested.
- `graphify update .` completed with 10,312 nodes, 28,239 edges, and 475 communities.

# Inference history action grid

- [x] Add an opt-in 2x2 header action grid with four equal slots.
- [x] Apply top-right red, top-left white, bottom-right white, bottom-left red ordering.
- [x] Use the grid on inference history without changing other page headers.
- [x] Add focused UI coverage and run frontend verification.
- [x] Run source-limit audit, design detector, React Doctor, review, and `graphify update .`.

## Review

- Inference history opts into a responsive 2x2 action grid. Every occupied slot is 48px high and both columns share
  the same width; other page headers retain their existing layout.
- Slot order is top-right, top-left, bottom-right, bottom-left. Tones are primary, secondary, secondary, primary.
- Focused layout and architecture coverage passes 14 tests. Full frontend passes 50 files and 213 tests; production
  build and touched-file checks pass.
- React Doctor remains 80/100 with nine unrelated existing warnings. The layout detector reports no findings.
- Repository-wide `vp check` remains blocked by 345 pre-existing formatting issues. All touched files remain below
  300 non-comment lines. No visual check ran because repository policy forbids it unless explicitly requested.
- `graphify update .` completed with 10,315 nodes, 28,238 edges, and 490 communities.
