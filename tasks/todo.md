# Plugin Catalog Simplification

## Goal
- [x] Remove plugin activation/deactivation behavior from backend.
- [x] Make uploaded plugins implicitly active at all times.
- [x] Expose plugin lists through pagination contract.
- [x] Move plugin catalog search/filter/sort/count logic to backend.
- [x] Replace frontend infinite scroll with classic pagination.
- [x] Use separated type filter buttons and keep pagination footer fixed below plugin scroll area.
- [x] Remove stale tests, copy, and branches tied to activation state.

## Plan
- [x] Audit plugin API, persistence, frontend catalog, and nearest tests.
- [x] Refactor backend plugin contract/services/controllers to drop activation state and support paged listing.
- [x] Refactor frontend plugin queries/components to consume paged results with classic pagination UX.
- [x] Remove frontend plugin filter/sort business logic and consume backend catalog metadata.
- [x] Adjust plugin catalog layout so only plugin list scrolls and pagination footer stays visible.
- [x] Update tests and run narrow verification, then broader checks if environment supports them.
- [x] Run `graphify update .` and record review notes.

## Review
- Backend plugin contract now removes `active` state, activation endpoints, activation use-cases, and persisted activation state files.
- `GET /api/plugins` now returns paged payload `{ items, page, size, totalItems, hasNext }`; internal callers use `PluginService.listAll(...)`.
- Signature/runtime/plugin validation now treats uploaded plugins as immediately available; inactive warnings/messages were removed.
- Frontend plugin API now fetches paged data with `appFetch`, catalog runtime loads all pages transparently, and plugin catalog page uses TanStack Query plus classic pagination controls.
- Plugin catalog UI no longer exposes active/inactive controls or status filters; uploaded plugins are labeled as live on upload.
- Backend owns plugin type/kind detection for catalog rows, search/filter/sort, and total/field/report counts.
- Correction applied: removed custom infinite-scroll feed state and moved plugin page fetch/upload/delete to TanStack Query with query invalidation.
- Correction applied: replaced type `<select>` with separated `All` / `Fields` / `Reports` buttons, removed duplicated summary copy, and moved pagination footer outside the scroll region.
- Correction applied: removed frontend row filtering/sorting and file-size display; added backend-sourced stat cards.
- Verification:
  - `api`: `mvn "-Dtest=PluginServiceImplTest,PluginControllerTest,SignatureSchemaCompatibilityServiceTest,SearchWorkspaceServiceTest" test` passed.
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp test test/schema-plugin-readiness.test.ts test/schema-plugin-transport.test.ts test/schema-plugin-policy.test.ts test/schema-plugin-defaults.test.ts test/schema-plugin-lifecycle.test.ts test/schema-report-renderer.test.ts test/builtin-registry.test.ts` passed.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed inside react-doctor with `Invalid comparator: latest`.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Plugin Catalog Refetch Flicker Fix

## Goal
- [x] Remove stats/list flicker when search, type filter, or sort changes.
- [x] Keep backend-owned plugin logic unchanged.
- [x] Keep UI layout/copy unchanged except loading stability.

## Plan
- [x] Confirm flicker source in TanStack Query/page state.
- [x] Keep previous plugin page data visible while next page/filter/sort query fetches.
- [x] Reset page to first page inside search/filter/sort handlers to avoid stale intermediate keys.
- [x] Run narrow frontend verification and graph update.

## Review
- Flicker source: query key changes made `pageQuery.data` undefined during refetch, so stats/list rendered zero/empty before new backend data arrived.
- Fix: `usePluginCatalogPageData` uses TanStack Query `placeholderData: keepPreviousData`.
- Fix: search/type/sort handlers reset page to 0 in the same event instead of a delayed effect creating intermediate query keys.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: plugin/schema Vitest subset passed.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails inside react-doctor with `Invalid comparator: latest`.

# Plugin Catalog Query Subscription Split

## Goal
- [x] Verify TanStack Query usage for plugin endpoints/mutations.
- [x] Stop plugin page shell from subscribing to page/stats query state.
- [x] Keep page, stats, upload, delete invalidation correct.
- [x] Preserve UI behavior.

## Plan
- [x] Split plugin query hooks into page query, stats query, upload mutation, delete mutation.
- [x] Move stats query subscription into stats panel.
- [x] Move paged list query/delete mutation subscription into list panel.
- [x] Keep parent page responsible only for route/workspace/local filter/upload shell state.
- [x] Run frontend typecheck/tests, react-doctor, graphify, diff check.

## Review
- Previous issue: `PluginCatalogPage` subscribed to `pageQuery` and `statsQuery`; every refetch updated route shell state and rerendered header/toolbar/layout.
- Fix: `PluginCatalogStatsPanel` owns stats query; `PluginCatalogListPanel` owns page query and delete mutation.
- Fix: upload/delete mutations live in dedicated hooks and invalidate page + stats query families.
- Result: page shell rerenders for local UI/upload state; stats/list rerender for their own query data.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: plugin/schema Vitest subset passed.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails inside react-doctor with `Invalid comparator: latest`.

# Plugin Frontend Screaming Architecture Move

## Goal
- [x] Move all frontend plugin feature files under `frontend/src/plugin/...`.
- [x] Keep app/shared code imports explicit and domain-shaped.
- [x] Preserve runtime behavior and TanStack Query wiring.

## Plan
- [x] Inventory frontend plugin files/imports.
- [x] Create `src/plugin/api`, `src/plugin/catalog`, and `src/plugin/mlform`.
- [x] Move plugin catalog page, panels, components, shared helpers, hooks, and plugin API service.
- [x] Move plugin MLForm runtime/cache helpers under `src/plugin/mlform`.
- [x] Update app router and MLForm consumers to import from new plugin module.
- [x] Run frontend verification, react-doctor, graphify, diff check.

## Review
- Plugin API now lives at `frontend/src/plugin/api/pluginService.ts`.
- Plugin catalog UI now lives under `frontend/src/plugin/catalog/...`.
- Plugin MLForm runtime/cache helpers now live under `frontend/src/plugin/mlform/...`.
- Generic `app/pages`, `app/api`, and `app/utils/mlform` no longer own plugin feature files.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: plugin/schema Vitest subset passed.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails inside react-doctor with `Invalid comparator: latest`.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Plugin Catalog Stats Contract Split

## Goal
- [x] Move field/report plugin counts to a separate backend request.
- [x] Remove redundant total count from backend stats/page contract; frontend derives total as field + report.
- [x] Keep React Query cache correct after upload/delete by invalidating plugin pages and stats.
- [x] Clean plugin backend architecture around hexagonal ports/use cases instead of mixed service contracts.

## Plan
- [x] Add backend `PluginStatsDto` and `GetPluginStatsUseCase`, expose `GET /api/plugins/stats`.
- [x] Remove `totalPlugins`, `fieldPlugins`, and `reportPlugins` from `PluginPageDto`.
- [x] Replace `PluginService` mixed interface with use-case ports plus internal catalog port for `listAll`.
- [x] Update backend tests for page contract + stats endpoint.
- [x] Update frontend API/query hooks: page query and stats query separate; derive total in UI; invalidate both after mutations.
- [x] Run narrow backend/frontend verification, react-doctor, graphify, diff check.

## Review
- Backend page endpoint now returns only paged list state: `items`, `page`, `size`, `totalItems`, `hasNext`.
- Backend stats endpoint now returns only `fieldPlugins` and `reportPlugins`; no redundant total.
- Frontend derives total as `fieldPlugins + reportPlugins`.
- React Query now has separate page and stats query families; upload/delete invalidates both.
- Hexagonal cleanup: removed broad `PluginService` interface; controllers/app consumers depend on explicit use-case ports.
- Verification:
  - `api`: `mvn "-Dtest=PluginServiceImplTest,PluginControllerTest,SignatureSchemaCompatibilityServiceTest,SearchWorkspaceServiceTest" test` passed.
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: plugin/schema Vitest subset passed.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails inside react-doctor with `Invalid comparator: latest`.
