# HTTP-Only Docker Exposure

## Goal
- [x] Remove SSL/TLS runtime config from local/prod Docker path.
- [x] Run all app services over HTTP internally.
- [x] Expose only frontend from compose, plus PostgreSQL on host port 5430.
- [x] Verify compose/config and focused tests.

## Plan
- [x] Update env defaults to HTTP URLs and PostgreSQL host port 5430.
- [x] Remove SSL env wiring and public ports for internal services in compose.
- [x] Remove certificate generation and HTTPS proxy config.
- [x] Remove Spring trust-all SSL bootstrap and SSL properties.
- [x] Update tests/docs references where they encode old HTTPS runtime.
- [x] Run compose config, focused tests, line caps, graph update.

## Review
- Removed Spring SSL properties, trust-all TLS bootstrap, Python SSL launcher flags, generated certs, and nginx HTTPS config.
- Compose dev/prod now publish only frontend `5173:5173` and PostgreSQL `5430:5432`; API, analyzer, MinIO, and ops-agent stay internal.
- Internal service URLs now use HTTP: frontend nginx proxies `/api/` to `http://spring-app:8080`, analyzer base URL is `http://py-analyzer:8000`, and Vite dev proxy targets `http://localhost:8080`.
- Split oversized ops-agent test file by moving terminal/stats tests to `test_ops_terminal.py`.
- Verification:
  - `docker compose -f docker-compose.dev.yml config` passed.
  - `docker compose -f docker-compose.prod.yml config` passed.
  - `mvn "-Dtest=AnalyzerServiceTest" test` passed: 9 tests.
  - `uv run pytest tests/test_runtime_api.py` passed: 25 tests.
  - `uv run pytest tests/test_ops_api.py tests/test_ops_terminal.py` passed: 9 tests.
  - `vp test infrastructure` passed: 6 tests.
  - `vp run build` passed.
  - Runtime SSL/TLS reference scan passed.
  - Touched file line cap passed.
  - `git diff --check` passed.
  - `graphify update .` passed: 8780 nodes, 18961 edges, 409 communities.

# Schema One-Hot Reconstruction Empty Master Fallback

## Goal
- [x] Fix mapped-category display when saved visible master value is empty.
- [x] Fix external review `undefined` values for one-hot mapped categories.
- [x] Fix predict-again select when merged run input has empty master plus valid hidden one-hot values.
- [x] Verify with focused regression.

## Plan
- [x] Add failing test for empty visible master masking hidden one-hot model inputs.
- [x] Change mapped-category direct-value handling to fallback on empty direct values.
- [x] Re-run display/history/review/predict-again tests and typecheck.
- [x] Update lessons and graph.

## Review
- Root cause: a saved empty visible mapped-category master value (`null`/`""`) won over valid hidden one-hot values from `PredictionResult.modelInput`.
- `mappedCategoryValue()` now treats empty direct master values as absent, then reconstructs from hidden one-hot mapping.
- This path is shared by schema detail/history input panel, external review input record, and predict-again prefill.
- Added regression for empty master fallback plus existing string `0`/`1` and predict-again defaults.
- Verification:
  - `vp test schema-one-hot-select-values schema-run-display schema-review-output-context schema-run-history` passed: 19 tests.
  - `vp exec tsc -b` passed.
  - `vp fmt src/schemas/schema-run-display.ts test/schema-one-hot-select-values.test.ts --check` passed.
  - touched file line cap passed; `schema-run-display.ts` is 215 lines, test is 175 lines.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` completed: score 91, 54 warnings.
  - `graphify update .` passed: 8766 nodes, 18919 edges, 453 communities.
  - `vp check` blocked by existing repo-wide formatting issues in `dist/` and 547 files.

# Schema Bulk Names And Mapped Inputs Root Fix

## Goal
- [x] Fix schema bulk upload auto names when CSV row has no name.
- [x] Base auto names on next persisted inference id, same product rule as signature predictions.
- [x] Find real mapped-category N/A/undefined cause using realistic schema/run payload.
- [x] Add regression tests at correct seams.
- [x] Verify focused frontend/backend checks and graph update.

## Plan
- [x] Inspect schema bulk parse/name path vs legacy prediction bulk path.
- [x] Inspect backend/API support for last schema run id or max id.
- [x] Reproduce broken schema bulk name generation.
- [x] Reproduce mapped-category display/prefill failure with real composed one-hot schema shape.
- [x] Implement minimal source-of-truth fix.
- [x] Run focused tests, typecheck, line cap, react-doctor, graph update.

## Review
- Bulk root cause: schema bulk upload hardcoded auto-name base `0`; legacy prediction bulk fetched DB max id first.
- Added schema backend sequence endpoint `GET /api/prediction-runs/last-id`.
- Schema bulk upload now fetches last persisted schema run id before parsing unnamed rows, so names become `bulk-upload-${lastId + rowOffset + 1}`.
- Mapped-category root cause: real saved one-hot inputs can be boolean (`true/false`) or sparse active-only (`field__category: 1`) instead of full numeric vector.
- Shared mapped-category matcher now accepts numeric/string/boolean values and sparse positive one-hot matches.
- Regressions cover boolean, sparse active-only, empty visible master fallback, string `0`/`1`, and predict-again default.
- Verification:
  - `vp test schema-one-hot-select-values schema-run-display schema-review-output-context schema-run-history bulk-upload` passed: 30 tests.
  - `mvn "-Dtest=SchemaFlowServiceTest" test` passed: 8 tests.
  - `vp exec tsc -b` passed.
  - `vp fmt ... --check` passed for touched frontend files.
  - touched file line cap passed; largest touched file is `SchemaFlowServiceTest.java` at 283 lines.
  - `git diff --check` passed with CRLF warnings only.
  - `npx react-doctor@latest --verbose` completed: score 91, 54 warnings.
  - `graphify update .` passed: 8776 nodes, 18944 edges, 414 communities.
  - `vp check` blocked by existing repo-wide formatting issues in `dist/` and 547 files.
