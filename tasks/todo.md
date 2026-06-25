# Admin Users Server Catalog And Catalog Cleanup

# Theme Single Signal And Frame Capture

## Goal

- [x] Capture frame-by-frame DOM/screenshot around the remaining flicker.
- [x] Reduce theme DOM state to one visible signal.

## Plan

- [x] Capture real frames after clicking theme with `<html>` class, attrs, computed colors, active animations, and screenshot samples.
- [x] Remove redundant `data-theme` and `data-theme-mode` writes from `<html>`.
- [x] Keep only `class="dark"` for DOM styling and `localStorage` for persisted mode.
- [x] Keep the theme transition marker after finish and keep the reveal pseudo at its final clip so the old snapshot cannot flash.
- [x] Verify with focused tests/checks, browser probe, diff check, graph update.

## Notes

- T3 preview on `5173` confirmed live `<html>` duplication before toggle: `class=""`, `data-theme="light"`, `data-theme-mode="light"`.
- T3 then lost automation ownership during the frame-by-frame toggle capture, so screenshot/frame evidence is still pending.
- Earlier HTTP probe showed `5173` serving stale HTML with `dataset.theme*`; retry now serves the current source.
- Retry capture on `5173` with headless Chromium CDP succeeded. Artifacts: `output/playwright/theme-capture/frames.json` and `00-before.png` through `14-after.png`.
- Capture now shows `data-theme=null` and `data-theme-mode=null` throughout. `theme-corner-transition` is removed at `frame-14`, with `bodyBg`, `rootBg`, and `asideBg` already dark before and after.
- User still saw flicker. Deeper probe found served CSS still had `::view-transition-new(root)` base `clip-path: circle(0)` and no fill mode.
- Fix: source now uses `animation ... both` and final base `clip-path: circle(150vmax...)`; boot script injects the same raw override because the Tailwind/Lightning transform can stale/strip these pseudo rules.
- Capture with raw override on `5173` kept `theme-corner-transition` through `frame-28` instead of dropping at `frame-15`, with dark colors stable before and after.
- Follow-up correction: the raw override no longer sets `clip-path: ... !important`, because that bypassed the keyframe reveal and made theme switching look instant.

## Review

- Source now has one durable DOM theme signal: `html.dark`.
- `data-theme` and `data-theme-mode` writes/reads were removed from the boot script and React fallback.
- Theme transition cleanup now waits after `transition.finished`, and the new root pseudo keeps the final clip via `animation-fill-mode: both`.
- Verification passed: focused theme test, focused `vp check --fix`, `vp exec tsc -b --pretty false`, `git diff --check`, source line count, and `react-doctor` with existing warnings.
- Browser frame screenshots succeeded via Chromium CDP on `5173`; no post-transition light rollback appears in captured DOM or final screenshot.

# Single Html Theme Writer

## Goal

- [x] Make `<html>` theme class and data attributes come from one writer.
- [x] Prevent class/data mismatch during theme View Transition snapshots.

## Plan

- [x] Define one boot-time `applyTheme(mode)` function that updates `class`, `data-theme`, `data-theme-mode`, and theme-color together.
- [x] Reuse that function from `themeWithHtmlAtom` instead of duplicating DOM writes in React state code.
- [x] Run focused theme tests/checks, browser probe, diff check, graph update.

## Review

- `index.html` now defines `window.__MLSUITE_APPLY_THEME__` and uses it for boot-time theme setup.
- `themeAtom` now wraps the storage atom and delegates all HTML writes through that same applier, with a fallback only for tests/non-browser boot contexts.
- Browser probe confirms `class`, `data-theme`, and `data-theme-mode` move together during synthetic View Transitions.
- Verification passed: `vp test test/theme.test.ts`, `vp check --fix index.html src/app/atoms.ts test/theme.test.ts`, `vp exec tsc -b --pretty false`, `vp dlx react-doctor@latest src/app --verbose` with existing warnings, `git diff --check`, source line count, and `graphify update .`.

# Theme Root Group Flicker Fix

## Goal

- [x] Remove post-toggle flash while preserving radial theme reveal.
- [x] Keep one shared transition for page and sidebar.

## Plan

- [x] Disable browser default root group animation only during theme transitions.
- [x] Verify with browser frame probe that root group UA animation no longer appears.
- [x] Run focused frontend checks, diff check, line limits, graph update.

## Review

- Tailwind/Lightning CSS strips `::view-transition-group(root)` when authored in the processed CSS block, so the fix injects that one raw View Transition rule from the boot script.
- Browser probe on port 5174 confirms only `theme-corner-reveal` remains during the theme transition; `-ua-view-transition-group-anim-root` no longer appears.
- Port 5173 is served by an existing WSL build and did not pick up current source edits, so visual verification used a source-backed dev server on port 5174.
- Verification passed: `vp check --fix index.html`, `vp exec tsc -b --pretty false`, `vp dlx react-doctor@latest src/app --verbose` with existing warnings, `git diff --check`, source line count, and `graphify update .`.

# Theme Flicker Deep Diagnosis

## Goal

- [x] Reproduce/analyze remaining theme flicker without changing app code.
- [x] List ranked causes before next fix.

## Findings

- Real browser DOM probe on `/workspace` shows no light-mode rollback after clicking theme: `dark`, `data-theme`, body bg, shell bg, and sidebar bg all become dark by frame 1 and stay dark.
- Strongest cause is View Transition CSS, not state persistence: `::view-transition-group(root)` keeps browser default `-ua-view-transition-group-anim-root` for about 250ms while custom `::view-transition-new(root)` radial reveal runs 520ms.
- Current CSS disables animation only on `::view-transition-old(root)` and `::view-transition-new(root)`, not `::view-transition-group(root)` or `::view-transition-image-pair(root)`.
- Secondary possible causes:
  - React/Jotai update inside `startViewTransition` is async enough that frame 0 still shows pre-change DOM, but frame 1 is correct; this can affect snapshot timing if callback resolution is not synchronized.
  - `app-content` has its own `view-transition-name`; CSS disables it while `.theme-corner-transition` is active and probe confirms `contentVt: none` during the theme transition.
  - `StartupGate` / `EditorAssemblyLoader` have hardcoded light backgrounds, but they did not mount during the probe.
  - Sidebar `backdrop-blur` plus translucent `--sidebar-bg` can amplify any root snapshot mismatch, but DOM colors stay dark.
  - Browser `meta theme-color` selector only updates the first matching meta tag, but this affects browser chrome, not page flash.
  - Route view transitions are globally enabled, but no route navigation occurred during the theme probe.

# Theme Storage Boot Flicker

## Goal

- [x] Stop initial light-mode flash when stored theme is dark.
- [x] Keep Jotai theme state aligned with pre-React HTML theme.

## Plan

- [x] Parse the JSON value stored by `atomWithStorage` in the inline boot script.
- [x] Let `atomWithStorage` read localStorage on init instead of overriding its mount behavior.
- [x] Run focused frontend checks, line limit, diff check, graph update.

## Review

- Root cause: Jotai stores `ui/theme` as JSON, e.g. `"dark"`, but the inline boot script compared the raw string to `dark`, so it started light before React/Jotai corrected to dark.
- `themeAtom` now uses `atomWithStorage(..., { getOnInit: true })` and no longer overwrites `atomWithStorage`'s own mount behavior.
- Verification:
  - `frontend`: focused `vp check --fix ...` passed.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp dlx react-doctor@latest src/app --verbose` completed with existing warnings only.
  - Node parsing probe confirmed raw `"dark"` previously resolved non-dark and now resolves dark.
  - Repo: changed source files are under 300 non-comment lines.

# Theme Transition Post-Commit Flicker

## Goal

- [x] Remove post-transition full-screen flash after theme toggle.
- [x] Keep one root radial reveal for page and sidebar.

## Plan

- [x] Force React/Jotai theme commit inside `startViewTransition` callback before new snapshot capture.
- [x] Run focused frontend checks, line limit, diff check, graph update.

## Review

- Superseded by `Theme Storage Boot Flicker`: the flash was storage boot mismatch, not a late React commit.
- Removed the `flushSync` experiment after React Doctor flagged it as bad for View Transitions.
- Verification:
  - `frontend`: focused `vp check --fix ...` passed.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - Repo: changed source files are under 300 non-comment lines.
  - Repo: `git diff --check` and `git diff --cached --check` passed, with CRLF warnings only.
  - Preview smoke blocked by `PreviewAutomationNoFocusedOwnerError`; port 5173 is listening.

# Unified Theme View Transition

## Goal

- [x] Make theme reveal use one radial transition for page and sidebar.
- [x] Preserve route-only `app-content` transitions.
- [x] Remove sidebar-specific view-transition layer.

## Plan

- [x] Add stable class to the app content transition element.
- [x] Disable `app-content` view-transition-name only while `theme-corner-transition` is active.
- [x] Remove `app-sidebar` view-transition-name and CSS rules.
- [x] Run focused frontend checks, line limit, diff check, preview smoke, graph update.

## Review

- Theme transition now uses one root radial reveal for page and sidebar together.
- Route navigation still uses `app-content` because only `theme-corner-transition` disables that named layer.
- Removed sidebar-specific view-transition names and CSS.
- Verification:
  - `frontend`: focused `vp check --fix ...` passed.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp dlx react-doctor@latest src/app/components --verbose` completed with existing warnings only.
  - Repo: changed source files are under 300 non-comment lines.
  - Repo: `git diff --check` and `git diff --cached --check` passed, with CRLF warnings only.
  - Preview smoke was blocked by `PreviewAutomationNoFocusedOwnerError` / open timeout.

## Goal

- [x] Move Admin Users search/filter/sort/pagination to backend.
- [x] Change `CatalogPage` to accept `emptyState` config instead of JSX.
- [x] Remove shallow catalog internals from public API and delete pass-through browser wrapper.
- [x] Add shared catalog controls to reduce page state repetition.

## Plan

- [x] Add Admin Users page DTO/query params/service filtering and sorting.
- [x] Update frontend admin users API hook/service/dtos and page wiring.
- [x] Add `useCatalogControls` and small catalog helpers.
- [x] Inline `CatalogBrowser`, stop exporting internal catalog pieces, switch to `emptyState`.
- [x] Run focused API/frontend checks, line limits, diff check, react-doctor, graph update.

## Review

- Admin Users now uses backend query params for page, size, search, sort, and role, returning `items`, `totalItems`, and `hasNext`.
- Frontend Admin Users consumes the paged contract; create-organization reads the first users page from the same hook.
- `CatalogPage` now accepts `emptyState: { icon, title, description, action }`, owns `AppEmptyState`, and no longer uses/export `CatalogBrowser`.
- Added `useCatalogControls`, `getCatalogTotalPages`, and `getCatalogErrorMessage`; Models, Schemas, Plugins, Organizations, and Admin Users share the same query/filter/sort/page state pattern.
- Verification:
  - `api`: `mvn -q -DskipTests compile` passed.
  - `frontend`: focused `vp check --fix ...` passed for touched files.
  - `frontend`: full `vp check` formatting passed but still fails on existing repo-wide type/lint debt: 25 errors, 43 warnings.
  - `frontend`: `vp dlx react-doctor@latest --verbose` completed with existing warnings only; score 65 / 100, 287 warnings.
  - Repo: line limit check passed for changed Java/TS/TSX files.
  - Repo: `git diff --check` and `git diff --cached --check` passed, with CRLF warnings only.
  - Repo: `graphify update .` passed; `graph.html` skipped because graph exceeds viz node limit.

# Catalog Simplification Analysis And Sidebar Theme Flicker

## Goal

- [x] Analyze remaining catalog page duplication without changing catalog code.
- [x] Fix sidebar flicker when switching light/dark mode.

## Plan

- [x] Read catalog page callsites and identify duplicated page/query/prop-shaping logic.
- [x] Trace sidebar theme toggle path and fix flicker at shared root.
- [x] Run focused frontend checks and graph update.

## Review

- Catalog analysis: remaining duplication is page-model plumbing, not visual primitives. Every catalog page repeats controls, page query binding, `items/totalItems/totalPages/error`, busy state, toolbar config, list config, empty-state branching, retry wiring, and item mapping.
- `CatalogPage` is too nested because it mirrors child internals: `header`, `toolbar`, `list`, `emptyState`. That made pages shorter than old wrappers but still forced each page to know exact shell wiring.
- Better next step is not another visual wrapper. Use a generic catalog page-model/helper/component boundary that accepts `query`, `controls`, static copy/options, permissions/actions, and `renderItem`; let it build toolbar/list/empty props internally.
- Sidebar flicker fix: removed custom radial View Transition from theme toggle and deleted its dead CSS from `index.html`. Theme now switches directly; route view transitions remain unchanged.
- Verification:
  - `frontend`: `vp check src/app/components/SidebarActions.tsx index.html` passed.
  - `frontend`: `vp dlx react-doctor@latest src/app/components --verbose` completed; existing warnings only.
  - Repo: changed file line limit check passed.
  - Repo: `git diff --check` and `git diff --cached --check` passed, with CRLF warnings only.
  - Repo: `graphify update .` passed; `graph.html` skipped because graph exceeds viz node limit.

# Catalog Resource Page And Top-left Theme Reveal

## Goal

- [x] Restore gradual theme reveal from top-left without sidebar flicker.
- [x] Replace nested catalog prop plumbing with higher-level resource page API.
- [x] Keep catalog item rendering/domain actions in owning pages.

## Plan

- [x] Re-add theme View Transition with fixed top-left origin and isolate sidebar from root snapshot animation.
- [x] Add `CatalogResourcePage` to build toolbar/list/empty props internally from controls/query/copy.
- [x] Export `CatalogControls` type and migrate Models, Schemas, Plugins, Organizations, Admin Users.
- [x] Run focused frontend checks, react-doctor, line limit, diff check, graph update.

## Review

- Theme toggle now uses a fixed top-left radial View Transition and respects reduced motion.
- Sidebar surfaces have their own `app-sidebar` view-transition name, so the root radial reveal no longer snapshots and animates the sidebar layer.
- Added `CatalogResourcePage` as the page-model boundary: pages pass controls, query, options/copy, and `renderItem`; it builds toolbar, list, pagination, retry, busy state, and empty-state branching internally.
- Models, Schemas, Plugins, Organizations, and Admin Users now use the flat catalog API directly, without nested `toolbar`/`empty` prop bags.
- `CatalogListPanel` owns empty-state rendering, so `CatalogPage` no longer passes JSX as a prop.
- Verification:
  - `frontend`: focused `vp check --fix ...` passed for touched catalog/page/sidebar/theme files.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp dlx react-doctor@latest src/app/components --verbose` completed; the touched `CatalogPage` warning is gone, remaining warnings are existing breadcrumbs/barrel/static-value warnings.
  - Repo: changed source files are under 300 non-comment lines.
  - Repo: `git diff --check` and `git diff --cached --check` passed, with CRLF warnings only.
  - Preview: `preview_snapshot` loaded `http://localhost:5173/`; `preview_evaluate` confirmed `document.startViewTransition` runs and clears `theme-corner-transition`.
  - Preview navigation was blocked by `PreviewAutomationNoFocusedOwnerError`, so route-level visual navigation was not used.

# Organization Catalog Layout Tightening

## Goal

- [x] Show organization tiles one per row.
- [x] Let catalog search bar expand horizontally as much as possible.

## Plan

- [x] Switch Organizations catalog list from grid layout to list layout.
- [x] Make `CatalogToolbar` search field fill its flex slot.
- [x] Run focused frontend checks.

## Review

- Organizations catalog now uses list layout, so each organization tile renders one per row.
- `CatalogToolbar` search wrapper now takes a larger flex basis and `AppTextField` gets `w-full`, so search fills available horizontal space.
- Verification:
  - `frontend`: `vp check --fix ...` passed for touched files.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - Repo: touched source files are under 300 non-comment lines.
  - Repo: `graphify update .` passed; `graph.html` skipped because graph exceeds viz node limit.
  - Browser preview smoke was blocked by `PreviewAutomationNoFocusedOwnerError`.

# Generic Catalog Page

## Goal

- [x] Remove remaining catalog toolbar/list adapter wrappers where they only pass config/data.
- [x] Add one generic catalog page shell that receives permissions, header, toolbar, list state, and rendered items.
- [x] Fix catalog empty state sizing so it fills available space instead of keeping fixed height.
- [x] Preserve Organization item rendering and toolbar search behavior.

## Plan

- [x] Add `CatalogPage` shared component and export toolbar/list prop types.
- [x] Move catalog page queries into Models, Schemas, Plugins, Organizations pages.
- [x] Inline toolbar/list config in pages and delete adapter wrappers.
- [x] Update Admin Users to use `CatalogPage`.
- [x] Run frontend checks, line limits, diff check, preview if available, and graph update.

## Review

- Added `CatalogPage` shared shell. Pages pass access state, header config, toolbar config, list state, empty state, and rendered items.
- Moved catalog data queries into Models, Schemas, Plugins, Organizations pages, removing toolbar/list query duplication.
- Deleted remaining catalog adapter wrappers for Models, Schemas, Plugins, Organizations, and Users.
- Restored toolbar search count inside the search input suffix.
- Restored organization item/member behavior as `OrganizationCatalogTileWithMembers`.
- Changed `AppEmptyState` from fixed `min-h-[260px]` to flexible `min-h-0`; catalog fill now comes from `CatalogListPanel`.
- Verification:
  - `frontend`: `vp check --fix ...` passed for touched files.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 33 files / 115 tests.
  - `frontend`: `vp dlx react-doctor@latest --verbose` completed with existing warning classes; score 65 / 100, 292 warnings.
  - Repo: changed source files are under 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed; `graph.html` skipped because graph exceeds viz node limit.
  - Browser preview smoke was blocked by `PreviewAutomationNoFocusedOwnerError`.

# Generic Catalog Primitives

## Goal

- [x] Extract shared catalog browser, toolbar, list panel, and pagination primitives.
- [x] Keep domain-specific list items/actions separate.
- [x] Fix empty-state fill so only empty lists stretch; a one-item list must keep natural item height.

## Plan

- [x] Add shared app catalog primitives with conservative props.
- [x] Convert Models, Schemas, Plugins, Organizations, and Admin Users to those primitives.
- [x] Remove duplicated browser wrappers and pagination helpers.
- [x] Run frontend checks, line limits, diff check, and graph update.

## Review

- Added shared catalog primitives under `frontend/src/app/components/catalog`.
- Converted Models, Schemas, Plugins, Organizations, and Admin Users to the shared browser, toolbar, list panel, and pagination.
- Removed old per-domain browser wrappers and `UserCatalogPagination`.
- Fixed the failed empty-state height approach by moving `min-h-full` into `CatalogListPanel` only when `itemCount === 0`; lists with one item now keep natural item height.
- Verification:
  - `frontend`: `vp check --fix ...` passed for touched files.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 33 files / 115 tests.
  - `frontend`: `vp dlx react-doctor@latest --verbose` completed with existing warning classes; score 65 / 100, 298 warnings.
  - Repo: changed source files are under 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed; `graph.html` skipped because graph exceeds viz node limit.
  - Browser preview smoke was blocked by `PreviewAutomationNoFocusedOwnerError`.

# Catalog Empty State Layout And Radius

## Goal

- [x] Make catalog empty states fill the available list area.
- [x] Keep scrolling scoped to list panes, not the whole page.
- [x] Reduce relevant shared panel/empty-state rounding to `rounded` max.

## Plan

- [x] Update `AppEmptyState`/`AppPanel` shared styling for radius and fill support.
- [x] Apply fill classes to paginated catalog empty states.
- [x] Verify frontend checks, line limits, browser preview, and graph update.

## Review

- Catalog empty states now stretch through the available list area while keeping scroll on the list pane.
- `AppPanel` and `AppEmptyState` icon rounding now use `rounded` instead of larger custom radii.
- Applied catalog empty-state fill to Models, Schemas, Plugins, Organizations, and Admin Users.
- Verification:
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp check --fix ...` passed for touched files.
  - `frontend`: first `vp test` had one MLForm/jsdom failure in `schema-form-preview.test.tsx`; `vp test test/schema-form-preview.test.tsx` then passed, and a second full `vp test` passed, 33 files / 115 tests.
  - `frontend`: `vp dlx react-doctor@latest --verbose` completed with existing unrelated warnings.
  - Repo: touched source files are under 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed; `graph.html` skipped because graph exceeds viz node limit.
  - Browser preview visual smoke was blocked by `PreviewAutomationNoFocusedOwnerError` / snapshot timeout.

# Users Admin Catalog Redesign

## Goal

- [x] Rename sidebar Admin entry to Users.
- [x] Rework admin users page as search/filter catalog with paginated full-width tiles.
- [x] Move create user to a separate centered form page without gray AppPanel wrapper.
- [x] Put reset password, role change, enable/disable, and delete under each tile's three-dot menu.
- [x] Filter users by role and show avatar with name/email.

## Plan

- [x] Add backend delete endpoint/service guard for admin users.
- [x] Add frontend delete service/hook and create user route.
- [x] Split admin users UI into catalog page, create page, tile, toolbar, and dialogs.
- [x] Rename sidebar/footer labels from Admin to Users.
- [x] Run focused backend/frontend checks, line-count, diff check, graph update.

## Review

- Sidebar and account menu now show `Users` for `/admin/users`.
- Admin users page is now a search + role filter catalog with full-width paginated user cards.
- Cards show avatar, name, email, username, role, enabled state, and created date.
- Card actions live under the three-dot menu: change password, change role, enable/disable, delete.
- Create user moved to `/admin/users/create` with a centered form and no gray AppPanel wrapper.
- Backend now exposes `DELETE /api/admin/users/{id}` and blocks deleting the last enabled superadmin.
- Verification:
  - `api`: `mvn "-Dtest=ManualAuthServiceTest" test` passed, 6 tests.
  - `api`: `mvn -DskipTests package` passed.
  - `frontend`: `vp check --fix ...` passed for touched user/admin/sidebar/route files.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 33 files / 115 tests.
  - Repo: changed/new source and test files are under 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Organization Catalog Tile Metrics And Actions

## Goal

- [x] Add inference and team counts to organization catalog cards.
- [x] Replace grid tiles with full-width organization cards.
- [x] Move edit/delete/transfer owner actions under a three-dot menu.
- [x] Allow inline editing of name, slug, and description.
- [x] Replace asset/empty filters with public/private filters, defaulting all orgs to public for now.

## Plan

- [x] Extend backend catalog DTO/service with team count, inference count, and public visibility.
- [x] Allow organization slug updates through existing update endpoint.
- [x] Add frontend DTO/service/hook support for slug and owner transfer.
- [x] Rebuild organization catalog item as full-width card with inline editable fields and actions menu.
- [x] Add transfer-owner modal using existing organization members endpoint.
- [x] Update filters and run focused backend/frontend checks.

## Review

- Organization catalog now returns team count, inference run count, and public visibility. Inference count is based on persisted `PredictionRun` rows for the organization.
- Catalog filters are now `all/public/private`; organizations are public by default for now, so `private` returns no rows until a real visibility field exists.
- Organization rows are full-width cards with inline editable name, slug, and description.
- Edit name, edit slug, edit description, transfer owner, and delete now live under the three-dot menu. Delete keeps a confirmation modal.
- Ownership transfer uses active organization members from the existing members endpoint and invalidates organization catalog/member queries after transfer.
- Backend update preserves the existing slug when older callers omit `slug`.
- Verification:
  - `api`: `mvn "-Dtest=OrganizationCatalogServiceTest,OrganizationManagementServiceTest" test` passed, 13 tests.
  - `api`: `mvn -DskipTests package` passed.
  - `frontend`: `vp check --fix ...` passed for touched organization files.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp test` passed, 33 files / 115 tests.
  - Repo: changed/new source and test files are under 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.

# Sidebar Keyboard Shortcut Fix

## Goal

- [x] Make `Alt+Shift+number` deterministic for sidebar submenu navigation.
- [x] Allow only one sidebar submenu open at a time.
- [x] Replace numeric hint spans with a shadcn-style `Kbd` component.
- [x] Make collapsed collapsible parents navigate to their overview child.
- [x] Prevent `Alt` shortcut hints from resizing sidebar rows.
- [x] Use `Kbd` consistently for sidebar Actions shortcuts.

## Plan

- [x] Add local `Kbd`/`KbdGroup` component matching shadcn docs.
- [x] Change sidebar submenu state from map to single open item.
- [x] Resolve child shortcuts from the single open submenu, falling back to active submenu.
- [x] Add focused helper coverage for `event.code` shifted digit handling.
- [x] Navigate collapsed parent rows to `children[0].to`.
- [x] Keep invisible Kbd placeholders in expanded nav rows so `Alt` does not change row width.
- [x] Replace Actions shortcut text with `KbdGroup`.
- [x] Run focused frontend checks, line-count, diff check, graph update.

## Review

- Root causes: child shortcuts picked between active and first-open submenus from a map, and shifted digit detection relied on `event.key` characters that vary by keyboard layout.
- Sidebar now keeps one open submenu at a time. `Alt+Shift+number` targets that submenu; if none was manually opened, it targets the active submenu.
- Shortcut digit parsing now reads physical `DigitN`/`NumpadN` first, then falls back to legacy `event.key` symbols.
- Hint badges now render through local shadcn-style `Kbd`/`KbdGroup`.
- Collapsed collapsible rows now navigate to first child overview instead of toggling hidden state.
- Expanded nav rows reserve Kbd width with invisible placeholders, avoiding row/tile expansion when `Alt` is held.
- Sidebar Actions shortcuts now use `KbdGroup`.
- Verification:
  - `frontend`: `vp test test/keyboard-shortcuts.test.ts` passed, 3 tests.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp check --fix ...` passed for touched files.
  - `frontend`: `vp test` passed, 33 files / 115 tests.
  - Repo: changed/new source and test files are under 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed; `graph.html` skipped because graph exceeds viz node limit.

# Organizations Catalog Redesign

## Goal

- [x] Rework Organizations into a superadmin catalog with search, filters, tiles, and pagination.
- [x] Show organization mini-dashboard stats: models, schemas, plugins, members, and owner.
- [x] Support organization rename and delete from the catalog without adding an org detail page.
- [x] Redesign Create Organization.
- [x] Move Organizations above Workspace in the superadmin sidebar.

## Plan

- [x] Add backend catalog DTOs/service/endpoint with page, search, filter, sort, stats, and owner.
- [x] Add guarded organization delete behavior with clear conflict for non-empty orgs.
- [x] Add frontend services/hooks/query keys/mutations for organization catalog actions.
- [x] Split Organizations catalog UI into browser, toolbar, list panel, tile, and actions menu.
- [x] Redesign Create Organization and remove quick create from catalog.
- [x] Restrict organization routes to superadmin and reorder sidebar.
- [x] Run focused backend/frontend verification, line-count, diff check, graph update.

## Review

- Added `GET /api/organizations/catalog` for superadmin paged search/filter/sort with owner and model/schema/plugin/member counts.
- Organization delete now goes through guarded superadmin catalog logic; non-empty organizations return conflict instead of attempting unsafe FK deletes.
- Organizations catalog now uses search, filters, flat paginated tiles, inline rename, owner avatar/name affordance, delete confirmation modal, and no quick-create/detail navigation.
- Create Organization now returns to the catalog, invalidates organization/workspace queries, and lets superadmins select the initial owner from existing users.
- Sidebar superadmin order is now Organizations before Workspace.
- Verification:
  - `api`: `mvn "-Dtest=OrganizationManagementServiceTest,OrganizationCatalogServiceTest" test` passed, 11 tests.
  - `api`: `mvn -DskipTests package` passed.
  - `api`: full `mvn test` remains blocked by existing stale `dev.ulloasp.mlsuite.prediction.ExplanationFeedbackControllerTest` requiring missing `dev/ulloasp/mlsuite/prediction/domain/model/ExplanationFeedback`.
  - `frontend`: `vp exec tsc -b --pretty false` passed.
  - `frontend`: `vp check --fix ...` passed for touched organization, route, sidebar, API files.
  - `frontend`: `vp test` passed, 33 files / 115 tests.
  - Repo: changed/new source and test files are under 300 non-comment lines.
  - Repo: `git diff --check` passed with CRLF warnings only.
  - Repo: `graphify update .` passed; `graph.html` skipped because graph exceeds viz node limit.
  - Browser preview smoke was blocked because T3 preview automation had no focused owner.
