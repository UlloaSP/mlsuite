# Live Catalog Updated Metadata

## Goal

- [x] Show compact live updated time (`1s`, `1m`, `1h`, `1d`, `1mo`, `1y`) in model, plugin, schema, and organization catalog items.
- [x] Show last modifier in model, plugin, schema, and organization catalog items.
- [x] Remove created date and file name from model catalog items.
- [x] Show model field/report counts in model catalog items.

## Plan

- [x] Add backend updated-by/count fields to model, plugin, and organization catalog DTOs.
- [x] Persist last modifier on model, plugin, schema, and organization mutations without exceeding file limits.
- [x] Move relative-time formatting to a shared frontend catalog utility/component and make it tick live.
- [x] Update model, plugin, schema, and organization items to consume the common metadata UI.
- [x] Update tests and run focused backend/frontend verification plus graph update.

## Review

- Models now persist/return `updatedBy`, expose field/report counts from `inputSchema`, and the model item no longer shows created date or file name.
- Plugins now store modifier metadata in persisted plugin storage for new uploads, return it in DTOs, and show live compact updated time plus modifier.
- Organizations now persist/return `updatedBy` and show live compact updated time plus modifier in catalog tiles.
- Schemas now use the shared live compact relative time component instead of the schema-local formatter.
- Verification passed: focused Maven tests, `mvn -DskipTests package`, focused `vp check --fix`, `vp exec tsc -b --pretty false`, `vp test`, React Doctor repo scan with existing warnings, line-count check, `git diff --check`, and `graphify update .`.
- Full `vp check` remains blocked by existing repo-wide lint/test typing debt outside this change.
- T3 preview opened `http://127.0.0.1:5174/`, but snapshot/evaluate automation lost the tab or timed out; the dev server itself returned HTTP 200.