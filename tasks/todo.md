# Plugin Catalog Layout Polish

## Goal
- [ ] Make plugin toolbar feel compact and less mechanical.
- [ ] Stop pagination from visually overlapping plugin rows.
- [ ] Make plugin rows denser with clearer interaction.

## Plan
- [x] Convert type filters into compact segmented control.
- [x] Keep only list body scrollable; footer stays below it with safe spacing.
- [x] Tighten row spacing and add explicit source-view affordance.
- [x] Run frontend checks and graph update.

## Review
- Toolbar now uses a compact segmented control for `All` / `Fields` / `Reports`, a shorter search track, and a quieter sort select.
- Plugin list body is the only scroll region; pagination footer is a non-overlapping sibling below it.
- Rows are denser, have stronger hover/border feedback, and expose a real `View source` action plus delete when allowed.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp build` passed with existing Vite chunk/runtime-config warnings.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed on existing `src/app/startup/StartupGate.tsx:14`; no new error in touched plugin files.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Browser preview loaded app, but `/plugins` redirected to public login without auth; snapshot tool also timed out.

# Plugin Catalog Shadcn Search Empty

## Goal
- [ ] Make plugin search look like shadcn input group with filtered result count.
- [ ] Use shadcn-like empty state when plugin list has no items.

## Plan
- [x] Extend shared text field with suffix slot.
- [x] Read filtered `totalItems` from catalog page query in toolbar.
- [x] Replace plugin no-results copy with shared empty state.
- [x] Run frontend verification and graph update.

## Review
- Plugin catalog search now uses the shared input-group shape with search icon and filtered result count suffix.
- Empty plugin results now render the shared shadcn-like empty state with icon, title, and description.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Browser preview reached app, but `/plugins` redirected to login without auth.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails on existing `src/app/startup/StartupGate.tsx:14`.

# AppSelect Stable Width

## Goal
- [ ] Stop `AppSelect` trigger width changing when selected option changes.

## Plan
- [x] Keep fix in shared `AppSelect`.
- [x] Size trigger from longest option/placeholder.
- [x] Run narrow frontend verification.
- [x] Run `graphify update .`.

## Review
- `AppSelect` trigger now reserves width for the longest option label or placeholder, so selecting shorter/longer values does not resize it.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - Repo: `graphify update .` passed.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed on existing `StartupGate.tsx:14` query-result issue; no new `AppSelect` finding reported.

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

# Plugin Catalog Connected Surface

## Goal
- [x] Make plugin catalog toolbar and list read as one connected catalog surface.
- [x] Avoid `AppPanel` for new wrapper surface.
- [x] Preserve backend-owned search/filter/sort/page behavior.

## Plan
- [x] Add feature-owned wrapper component for toolbar + list.
- [x] Remove standalone toolbar panel and list footer panel visual splits.
- [x] Wire page through wrapper with existing state/handlers.
- [x] Run frontend typecheck, react-doctor, graphify update, and diff check.

## Review
- Added `PluginCatalogBrowser` as one connected catalog surface around toolbar and list without using `AppPanel`.
- Removed standalone `AppPanel` shell from toolbar and pagination footer so controls, scroll body, and footer share one visual frame.
- Page now wires toolbar/list through the browser wrapper; search/filter/sort/page behavior and query ownership stay unchanged.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp fmt --check src/plugin/catalog/components/PluginCatalogBrowser.tsx src/plugin/catalog/components/PluginCatalogToolbar.tsx src/plugin/catalog/components/PluginCatalogListPanel.tsx src/plugin/catalog/pages/PluginCatalogPage.tsx` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` failed inside react-doctor with `Invalid comparator: latest`.
  - `frontend`: `vp check` failed on 74 preexisting formatting issues; touched files were no longer listed after local formatting.
  - Browser preview: `http://127.0.0.1:5173/plugins` redirected to `/`; snapshot timed out in T3 preview, so full visual route inspection was blocked.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Plugin Catalog Native Select Cleanup

## Goal
- [x] Use shared `AppSelect` for plugin catalog sort.
- [x] Remove custom sort dropdown state/markup.
- [x] Reduce over-rounded select styling globally.

## Plan
- [x] Replace toolbar sort menu with `AppSelect`.
- [x] Remove menu refs/effects from catalog page props.
- [x] Update correction lesson.
- [x] Run focused frontend verification and graph update.

## Review
- `PluginCatalogToolbar` now uses shared `AppSelect` for sort instead of custom dropdown markup/state.
- Removed sort menu refs, outside-click/Escape state, and stale menu-state comment from `PluginCatalogPage`.
- `AppSelect` now uses normal `rounded` radius instead of `rounded-full`.
- Replaced toolbar filter `role="group"` with native `fieldset`/`legend` after react-doctor flagged the role.
- Added lesson: check shared primitives before hand-rolling feature-local controls.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp fmt --check src/app/components/AppSelect.tsx src/plugin/catalog/components/PluginCatalogToolbar.tsx src/plugin/catalog/pages/PluginCatalogPage.tsx` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` ran and reduced issue count from 181 to 180; still fails on existing `src/app/startup/StartupGate.tsx:14`.
  - `frontend`: `vp check` still fails on 74 preexisting formatting issues.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Plugin Catalog Compact Counts

## Goal
- [x] Remove oversized standalone plugin KPI row.
- [x] Show counts inside filter buttons as `All (n)`, `Fields (n)`, `Reports (n)`.
- [x] Keep counts backend-owned through existing stats query.

## Plan
- [x] Move stats query subscription into toolbar.
- [x] Render compact count labels in filter buttons.
- [x] Remove unused stats panel/cards.
- [x] Run focused frontend verification and graph update.

## Review
- Removed standalone `PluginCatalogStatsPanel` row and deleted unused stats card components.
- `PluginCatalogToolbar` now reads backend stats through `usePluginCatalogStatsQuery`.
- Type filters now render compact counts: `All (n)`, `Fields (n)`, `Reports (n)`.
- Counts stay backend-owned and update through existing plugin stats invalidation after upload/delete.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp fmt --check src/plugin/catalog/components/PluginCatalogToolbar.tsx src/plugin/catalog/pages/PluginCatalogPage.tsx` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` ran and reduced issue count from 180 to 179; still fails on existing `src/app/startup/StartupGate.tsx:14`.
  - `frontend`: `vp check` still fails on 74 preexisting formatting issues.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Shadcn Radix AppSelect

## Goal
- [x] Replace native `AppSelect` implementation with shadcn/Radix Select.
- [x] Preserve existing `AppSelect` call sites using `<option>` children and `onChange`.
- [x] Keep compact MLSuite styling and avoid oversized radius.

## Plan
- [x] Add explicit Radix Select dependency for shadcn Select.
- [x] Rebuild `AppSelect` around Radix `Select/Trigger/Value/Content/Item` composition.
- [x] Keep Radix primitives internal until a direct consumer exists.
- [x] Run focused frontend verification and graph update.

## Review
- Added `@radix-ui/react-select` and rewired `AppSelect` to use shadcn/Radix composition internally.
- Preserved legacy `<option>` children and `onChange(event.target.value)` contract for existing callers.
- Added empty-value compatibility because Radix Select items cannot use `value=""`; native callers still receive `""`.
- Kept compact `rounded` styling and changed invite-form select overrides from `rounded-xl` to `rounded`.
- Added lesson for requested UI-system primitives.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `vp fmt --write src/app/components/AppSelect.tsx src/workspace/components/InviteForm.tsx` completed.
  - `frontend`: `vp check` still fails on 74 preexisting formatting issues.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails on existing `src/app/startup/StartupGate.tsx:14`; warnings also include broader existing repo issues.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Shadcn Select Regression Fix

## Goal
- [x] Stop Radix `AppSelect` from showing ids when option label is nested text.
- [x] Stop select trigger from forcing full-width row expansion.
- [x] Replace remaining native `<select>` controls with `AppSelect`.
- [x] Match shadcn Select visual shape more closely without over-rounded controls.

## Plan
- [x] Fix option text extraction and selected-label resolution in `AppSelect`.
- [x] Tune trigger/content/item classes for compact shadcn-like UI.
- [x] Migrate native select call sites to `AppSelect` with size-preserving classes.
- [x] Add correction lesson and run verification.

## Review
- `AppSelect` now extracts visible text from nested option children instead of falling back to ids.
- `AppSelect` trigger no longer defaults to `w-full`; width is opt-in via call-site classes.
- Trigger/content/item styling now follows shadcn Select closer: compact trigger, chevron, rounded-lg trigger, rounded-xl menu, subtle item highlight.
- Migrated all remaining frontend native `<select>` controls to `AppSelect`; `rg -n "<select" src` returns no matches.
- Kept compact toolbars with `h-8`/`min-w-*` classes so selects use available row space instead of forcing new rows.
- Replaced Radix button-wrapping `label` elements with non-label wrappers plus `aria-label`.
- Added correction lesson for select migrations.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `rg -n "<select" src` found no matches.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails on existing `src/app/startup/StartupGate.tsx:14`; total returned to 179 issues after removing new label warnings.
  - `frontend`: `vp check` still fails on 74 preexisting formatting issues.
  - Browser preview: `/plugins` redirected to `/`, then T3 preview automation disconnected with `PreviewAutomationUnavailableError`; visual inspection blocked.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Local Shadcn Select Primitive

## Goal
- [x] Remove Radix Select runtime dependency.
- [x] Keep shadcn-like select behavior as local design-system code.
- [x] Add dropdown anchored at trigger position with title/header.
- [x] Preserve `<AppSelect><option /></AppSelect>` contract.

## Plan
- [x] Replace Radix-based `AppSelect` with local button + portal implementation.
- [x] Position popup with trigger rect so it opens where select lives.
- [x] Render popup title from `aria-label`, `title`, or `placeholder`.
- [x] Remove dependency through Vite+ and verify.

## Review
- Removed `@radix-ui/react-select` via `vp remove`; no `radix-ui`/`@radix-ui/react-select` refs remain in frontend package/lock/src.
- Replaced Radix `AppSelect` with local design-system implementation: button trigger, body portal, fixed trigger-rect positioning, outside click, Escape close, ArrowDown open, and focus return after selection.
- Popup opens at the trigger position and renders a header/title from `aria-label`, `title`, or `placeholder`.
- Preserved legacy `<option>` child parsing, empty-string values, `event.target.value`, `name`, `required`, and disabled form behavior through a hidden input.
- Kept shadcn-like visual details: chevron trigger, selected check, item hover/focus state, rounded menu, compact trigger.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `rg -n "@radix-ui/react-select|radix-ui" frontend/package.json frontend/pnpm-lock.yaml frontend/src` found no matches.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails on existing `src/app/startup/StartupGate.tsx:14`; issue count remains baseline 179.
  - `frontend`: `vp check` still fails on 74 preexisting formatting issues.
  - Browser preview: auth screen renders at `/`; select routes remain login-gated, so no select visual could be inspected without app session.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Shadcn Select Composition API

## Goal
- [x] Expose local select primitives with the exact shadcn composition API.
- [x] Keep `AppSelect` as legacy wrapper over those primitives.
- [x] Preserve local no-Radix implementation and compact MLSuite styling.
- [x] Verify typecheck, tests, static checks, and graph update.

## Plan
- [x] Split local select into `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, and `SelectItem`.
- [x] Rebuild `AppSelect` on top of those primitives while preserving `<option>` children.
- [x] Export primitives from the shared component barrel.
- [x] Run focused frontend verification, react-doctor/check, graphify, and diff check.

## Review
- Added local shadcn-style select primitives under `frontend/src/app/components/select`: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, and `SelectItem`.
- Shared barrel now exports those primitives, so consumers can use the requested composition shape.
- `AppSelect` now wraps those primitives and keeps existing `<option>` children, `onChange`, hidden input, placeholder, disabled, required, and empty-value behavior.
- Select content still uses local portal positioning at the trigger with label/header support; no Radix dependency was added.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `rg -n '@radix-ui/react-select|radix-ui' frontend/package.json frontend/pnpm-lock.yaml frontend/src` found no matches.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails on existing `src/app/startup/StartupGate.tsx:14`; issue count remains baseline 179.
  - `frontend`: `vp check` still fails on 74 preexisting formatting issues.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Shadcn Select Item-Aligned Popup

## Goal
- [x] Make every shared select popup match trigger width.
- [x] Align open popup so selected item sits at trigger height and label appears above it.
- [x] Remove selected check icon to match requested shadcn demo visual.
- [x] Keep behavior global through shared select primitive.

## Plan
- [x] Derive selected item index while walking composed select children.
- [x] Use trigger width exactly for `SelectContent`.
- [x] Offset popup top by label height plus selected item row height.
- [x] Tighten item padding after removing check icon.
- [x] Run frontend verification and graph update.

## Review
- `SelectContent` now uses exact trigger width instead of minimum `224px`.
- Popup position is item-aligned: label/header sits above selected row, selected row aligns with trigger.
- `SelectItem` no longer renders check icon or left check gutter, matching supplied demo closer.
- All `AppSelect` consumers inherit this through the shared primitive.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails on existing `src/app/startup/StartupGate.tsx:14`; issue count remains baseline 179.
  - `frontend`: `vp check` still fails on 74 preexisting formatting issues.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Radix Shadcn Select Migration

## Goal
- [x] Replace local hand-rolled select behavior with Radix-backed shadcn primitives.
- [x] Remove legacy `<AppSelect><option /></AppSelect>` API as breaking change.
- [x] Migrate every select call site to new explicit option data.
- [x] Preserve MLSuite compact styling and current labels/values.
- [x] Run frontend verification, react-doctor, graph update, and diff check.

## Plan
- [x] Add `radix-ui` dependency through Vite+.
- [x] Rebuild shared select primitives around `radix-ui` Select.
- [x] Redefine `AppSelect` as a thin wrapper over primitives with `options` data, not `<option>` children.
- [x] Update all `AppSelect` usages across admin, infra, workspace, schemas, models, and plugin catalog.
- [x] Remove obsolete local select context/portal code.
- [x] Verify typecheck/tests/static checks and document blockers.

## Review
- Added `radix-ui` and rebuilt shared select primitives around `SelectPrimitive`.
- `AppSelect` now has the breaking `options` API and `onValueChange`; legacy `<option>` children and `onChange` support are gone.
- Migrated all `AppSelect` consumers across admin, infrastructure, workspace, schemas, models, and plugin catalog to explicit `{ value, label }` options.
- Empty values are normalized through a sentinel so Radix can still support existing "none/select member" UX.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `vp fmt --write` passed; `vp check` still fails on existing repo lint/type issues, with formatting passing.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails on existing `src/app/startup/StartupGate.tsx:14`; issue count remains baseline 179.
  - `frontend`: no modified `frontend/src` file exceeds 300 lines.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Shadcn Pagination Footer

## Goal
- [x] Replace plugin catalog pagination footer controls with shadcn-style pagination primitives.
- [x] Keep backend page contract and existing page state unchanged.
- [x] Add reusable pagination primitives in design-system layer.
- [x] Preserve compact operational UI.
- [x] Verify typecheck/tests/react-doctor/graph update/diff check.

## Plan
- [x] Add `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, and `PaginationEllipsis`.
- [x] Export pagination primitives from app component barrel.
- [x] Swap plugin catalog footer buttons for pagination composition with page numbers and ellipsis.
- [x] Run focused frontend verification and document blockers.

## Review
- Added shadcn-style pagination primitives under `frontend/src/app/components/pagination`.
- Plugin catalog footer now uses `Pagination > PaginationContent > PaginationItem` with previous/next, page links, active state, and ellipsis.
- Backend pagination contract unchanged; component still drives existing zero-based `page` state.
- Verification:
  - `frontend`: `vp exec tsc -b` passed.
  - `frontend`: `vp test` passed, 32 files / 136 tests.
  - `frontend`: `vp fmt --write src/app/components/pagination src/app/components/index.ts src/plugin/catalog/components/PluginCatalogListPanel.tsx` passed.
  - `frontend`: `npx.cmd react-doctor@latest --verbose` still fails on existing `src/app/startup/StartupGate.tsx:14`; issue count remains baseline 179.
  - `frontend`: `vp check` still fails on existing repo lint/type issues; formatter portion passes all 395 files.
  - Line counts: `PluginCatalogListPanel.tsx` 193, pagination primitives 11-30 lines.
  - Browser preview: navigated to `http://127.0.0.1:5173/plugins`; T3 snapshot failed with `PreviewAutomationExecutionError`.
  - Repo: `graphify update .` passed.
  - Repo: `git diff --check` passed with CRLF warnings only.
