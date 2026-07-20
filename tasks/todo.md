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
