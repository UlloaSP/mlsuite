# Schema Version Selectors And Global Search Shortcut

## Goal
- [x] Fix schema version selectors on schema pages.
- [x] Fix create-version schema selector.
- [x] Move global search shortcut from `Shift + 7`/`/` to `Ctrl + K`.
- [x] Verify focused frontend behavior.

## Plan
- [x] Locate schema/version selector state and global search shortcut.
- [x] Reproduce root cause with focused tests or static behavior checks.
- [x] Apply smallest frontend fix.
- [x] Run focused tests/typecheck/line-cap/graph update.

## Review
- Root cause: backend DTO ids can cross frontend boundary as numbers while DOM `<select>` values are strings; strict id equality made selected schema versions fall back to latest.
- Added shared schema version id normalization/selection helpers and used them in schema detail plus create-version base selector.
- Global search now opens on `Ctrl+K`/`Cmd+K`; `/` and `Shift+7` no longer focus search.
- Added focused regression for numeric backend ids, empty/unknown fallback, no-version case, and shortcut semantics.
- Verification:
  - `vp test schema-version-selectors-and-search-shortcut` passed: 4 tests.
  - `vp exec tsc -b` passed.
  - `vp fmt ... --check` passed for touched frontend files.
  - `vp test` passed: 30 files, 127 tests.
  - `git diff --check` passed with CRLF warnings only.
  - touched file line cap passed; largest touched file is `create-schema-version-page.tsx` at 151 lines.
  - `npx react-doctor@latest --verbose` completed: score 71, 52 existing warnings.
  - `graphify update .` passed: 8841 nodes, 19135 edges, 413 communities.
  - `vp check` blocked by existing repo-wide formatting issues in `dist/` and 613 files.
