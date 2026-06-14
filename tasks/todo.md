# Superadmin Invitation Auto-Accept

## Goal
- When a superadmin invites an existing user to an organization, accept the invitation immediately.
- Normal inviters keep current pending invitation flow: invited user logs in and accepts or declines.

## Plan
- [x] Keep source of truth in API invitation service.
- [x] Refactor invitation acceptance side effects into shared helper.
- [x] In create flow, detect `SystemRole.SUPERADMIN`, resolve invited user by email, apply membership/team membership, set invitation `ACCEPTED`.
- [x] Preserve pending flow for non-superadmin inviters.
- [x] Add service tests for superadmin auto-accept and normal pending behavior.
- [x] Run narrow Maven test and line-count check.

## Review
- `InvitationManagementService` now auto-accepts invites sent by `SUPERADMIN` users after resolving the invitee by email.
- Normal inviters still produce `PENDING` invitations.
- Shared helper keeps manual accept and auto-accept membership side effects aligned.
- Verified with `mvn -Dtest=InvitationManagementServiceTest test`.
- Line counts: service 272, test 253.

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

# Startup Readiness Loader

## Goal
- [x] Keep initial UI on `EditorAssemblyLoader` until client runtime chunks are loaded.
- [x] Keep initial UI on `EditorAssemblyLoader` until API, Postgres, py-analyzer, and ops-agent are reachable.
- [x] Put backend-owned service readiness logic in API, not duplicated in frontend.
- [x] Use `appFetch` and TanStack Query for frontend readiness polling.

## Plan
- [x] Add public API readiness endpoint that checks DB, analyzer `/health`, and ops-agent `/health`.
- [x] Add backend tests for success and dependency failure cases.
- [x] Add frontend startup readiness service that preloads TypeScript, Monaco, MLForm, and reads API readiness.
- [x] Wrap router boot with `StartupGate` using TanStack Query polling and `EditorAssemblyLoader`.
- [x] Run focused backend/frontend verification, react-doctor, graphify, and diff check.

## Review
- Added public `GET /api/readiness`; API owns dependency checks for Postgres, py-analyzer, and ops-agent.
- Frontend `StartupGate` uses TanStack Query polling plus `appFetch`; it renders `EditorAssemblyLoader` until server readiness and client runtime preload succeed.
- Client runtime preload covers TypeScript, Monaco, `@monaco-editor/react`, and MLForm runtime/kit/builtins chunks.
- Verification:
  - `api`: `mvn "-Dtest=StartupReadinessServiceTest" test` passed.
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed inside react-doctor with `Invalid comparator: latest`.
  - `frontend`: `vp check` failed on preexisting formatting issues across 73 files.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Shadcn Breadcrumb Component

## Goal
- [x] Replace custom breadcrumb markup with shadcn-style breadcrumb primitives.
- [x] Preserve existing `AppBreadcrumbs` external API for page headers.
- [x] Avoid new runtime deps unless required.

## Plan
- [x] Audit existing breadcrumb usage and shadcn docs.
- [x] Add local breadcrumb primitives matching shadcn composition.
- [x] Refactor `AppBreadcrumbs` to compose those primitives with React Router links.
- [x] Run focused frontend verification and graph update.

## Review
- Added local shadcn-style breadcrumb primitives under `frontend/src/app/components/breadcrumb`.
- `AppBreadcrumbs` now composes `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, and `BreadcrumbEllipsis`.
- Existing page header API stays `breadcrumbs?: AppBreadcrumbItem[]`; React Router `to` links still work.
- No runtime dependencies added.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp build` passed with existing bundle/dynamic-import warnings.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed inside react-doctor with `Invalid comparator: latest`.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Breadcrumb Ellipsis Dropdown

## Goal
- [x] Make collapsed breadcrumb ellipsis interactive.
- [x] Show hidden breadcrumb items inside dropdown.
- [x] Keep no-new-deps shadcn-style composition.

## Plan
- [x] Preserve collapsed hidden items instead of replacing with inert label only.
- [x] Add ellipsis dropdown component with outside-click and Escape close.
- [x] Render hidden items as router links when `to` exists, text otherwise.
- [x] Run focused frontend verification, react-doctor, graph update.

## Review
- `AppBreadcrumbs` now keeps hidden middle breadcrumb items and shows them through ellipsis dropdown.
- `BreadcrumbCollapsedMenu` closes on outside pointer, Escape, and link click.
- Hidden items with `to` render as React Router links; no-`to` crumbs render as menu text.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp build` passed with existing bundle/dynamic-import warnings.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed inside react-doctor with `Invalid comparator: latest`.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Breadcrumb Dropdown Visibility Fix

## Goal
- [x] Make ellipsis dropdown visible above page content.
- [x] Keep breadcrumb truncation working without clipping popover.
- [x] Verify browser interaction.

## Plan
- [x] Remove clipping from breadcrumb shell where dropdown lives.
- [x] Raise dropdown layer above page/header content.
- [x] Run frontend verification and graph update.

## Review
- Root cause: dropdown rendered inside breadcrumb nav with `overflow-hidden`; menu got clipped/hidden. Z-index alone cannot fix ancestor clipping.
- Fix: breadcrumb nav/list now use `overflow-visible`; breadcrumb nav/root and collapsed menu now set explicit relative z layers.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp build` passed with existing bundle/dynamic-import warnings.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed inside react-doctor with `Invalid comparator: latest`.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Breadcrumb Dropdown Portal Fix

## Goal
- [x] Render ellipsis menu outside page stacking contexts.
- [x] Keep menu aligned under ellipsis button while scrolling/resizing.
- [x] Preserve outside-click, Escape, and link-close behavior.

## Plan
- [x] Move dropdown panel to `document.body` with `createPortal`.
- [x] Measure trigger button and use fixed viewport coordinates.
- [x] Treat clicks inside trigger or portal menu as internal.
- [x] Run frontend verification and graph update.

## Review
- Root cause after user DOM proof: menu existed, but page stacking context still painted over it.
- Fix: `BreadcrumbCollapsedMenu` now portals menu to `document.body` and positions it with fixed viewport coordinates from the trigger rect.
- Scroll/resize recompute menu coordinates; outside click checks both trigger and portal menu refs.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp build` passed with existing bundle/dynamic-import warnings.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed inside react-doctor with `Invalid comparator: latest`.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Breadcrumb Dropdown Minimal Styling

## Goal
- [x] Make breadcrumb ellipsis menu feel Radix-like and minimal.
- [x] Reduce border radius and visual weight.
- [x] Keep portal/dropdown behavior unchanged.

## Plan
- [x] Tighten menu radius, padding, shadow, and width.
- [x] Tighten item radius, font size, hover state, and line height.
- [x] Run frontend verification and graph update.

## Review
- Menu panel now uses smaller Radix-like radius (`rounded-lg`), tighter padding, narrower width, and lighter shadow.
- Menu items now use `rounded-md`, compact vertical rhythm, 13px type, and subtle hover/focus background.
- Portal/fixed positioning behavior unchanged.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp build` passed with existing bundle/dynamic-import warnings.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed inside react-doctor with `Invalid comparator: latest`.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.
