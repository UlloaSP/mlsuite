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
