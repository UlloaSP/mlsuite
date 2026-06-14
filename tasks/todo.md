# Page Header Consumer Migration

## Goal
- [x] Move page breadcrumbs into `AppPageHeader`.
- [x] Replace legacy `backHref`/`backLabel` with semantic breadcrumb items.
- [x] Replace `aside` usage with `actions`.
- [x] Remove wrapped action button divs from header props.
- [x] Remove legacy header props so regressions fail typecheck.

## Plan
- [x] Audit every `AppPageHeader`, `AppBreadcrumbs`, `backHref`, and `aside` consumer.
- [x] Patch model, schema, workspace, admin, and plugin pages.
- [x] Patch header helper components.
- [x] Run typecheck/tests/format checks and graphify update.

## Review
- Moved standalone model detail/signature/prediction breadcrumbs into `AppPageHeader`.
- Replaced every `backHref` header call with semantic `breadcrumbs`.
- Replaced every `aside` header call with `actions`; removed action wrapper `div` usage.
- Removed `backHref`, `backLabel`, and `aside` from `AppPageHeader` props.
- `AppPageHeader` now flattens fragments before assigning the 2x2 action slots.
- Verification:
  - `vp exec tsc -b` passed.
  - `vp test` passed: 32 files, 136 tests.
  - Targeted `vp fmt ... --check` passed.
  - `rg "<AppBreadcrumbs|backHref=|backLabel=|aside=" frontend/src -g "*.tsx"` only finds the internal `PageHeader` breadcrumb render.
  - `rg "actions=\{\s*<div|label: \"Back|>Back<" frontend/src -g "*.tsx"` found no matches.
  - Source line-count check found no file over 300 lines.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` blocked by react-doctor internal `Invalid comparator: latest`.
  - `graphify update .` passed.

---

# Component Barrel Cleanup

## Goal
- [x] Split `ui-controls.tsx` into one component per file.
- [x] Split `ui-utils.ts` into dedicated utility files.
- [x] Remove `ui.tsx`, `ui-controls.tsx`, and `ui-utils.ts` barrel-style entrypoints.
- [x] Make `index.ts` the only app component barrel.
- [x] Set `AppPageHeader` action visual order: first top-right, second top-left, third bottom-right, fourth bottom-left.

## Plan
- [x] Create separate files for controls and utilities.
- [x] Update app component internals to import direct utility files.
- [x] Update feature imports to use `app/components` index.
- [x] Delete old barrel files.
- [x] Run format, typecheck, tests, react-doctor, graphify.

## Review
- Split controls into `AppBadge`, `AppButton`, `AppIconButton`, `AppSelect`, `AppTextArea`, and `AppTextField`.
- Split utils into `cx` and `focus-ring`.
- Removed `ui.tsx`, `ui-controls.tsx`, and `ui-utils.ts`; `src/app/components/index.ts` is now the only component barrel.
- Updated frontend imports from old `app/components/ui*` entrypoints to `app/components`.
- `AppPageHeader` action nodes now use explicit grid positions: 1 top-right, 2 top-left, 3 bottom-right, 4 bottom-left.
- Verification:
  - `vp exec tsc -b` passed.
  - `vp test` passed: 32 files, 136 tests.
  - `vp fmt src\app\components src\models\pages\create-model-page.tsx src\models\pages\models-page.tsx src\schemas\pages\schema-detail-page.tsx --check` passed.
  - `vp fmt src --check` blocked by 27 existing non-touched format issues.
  - `npx react-doctor@latest --verbose` blocked by react-doctor internal `Invalid comparator: latest`.
  - `graphify update .` passed.
