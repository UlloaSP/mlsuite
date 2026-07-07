# Schema Version Control Plan

## Goal

- [x] Add jj-like schema change workflow: mutable changes, optional bookmarks, immutable published versions.
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
- [x] Bookmark = optional human label on an unpublished change; no full branch system in MVP.
- [x] Current published version = highest `version_number` for the schema unless a later backend field is explicitly added.
- [x] Production runs stay version-bound only; draft validation must not create production history.

## Backend Plan

- [x] Add `SchemaDraft` entity/table with schema, base version, name, optional bookmark, form schema JSON, status, timestamps, updater.
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
  - [x] Header shows change name, base version, bookmark/status badge.
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

- [x] Bookmark storage: draft column for MVP, separate bookmark table only if version bookmarks must move independently.
- [x] Draft validation runs: backend shape validation first; draft-bound ML runtime execution only if product needs runnable unpublished schemas.
- [x] Rebase behavior: defer auto-rebase; stale publish blocks first to avoid data loss.

## Review

- Implemented backend draft model, endpoints, semantic diff, stale publish conflict handling, and publish-through-existing-version-service.
- Implemented frontend draft API/hooks, change creation, schema detail pagination, draft editor, and conflict page.
- Verification passed: backend package, backend focused test, frontend tests, frontend TypeScript compile, diff whitespace check, line-count check, rounded scan.
- Known blocker: full `vp check` still fails on pre-existing frontend lint/type issues outside this change.

## Follow-up: Inspectable Base Selection

- [x] Keep base version selector, change name, bookmark, and create action on one page.
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
