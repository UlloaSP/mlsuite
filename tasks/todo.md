# Config Hardcode Removal Plan

## Admin Users Sort Stability Fix

### Goal
- [ ] Stop enabled/disabled changes from reordering users automatically.
- [ ] Add explicit user-controlled sorting so enabled sorting only happens by choice.
- [ ] Keep admin users page under 300 lines and verify build.

### Plan
- [x] Phase 1. Preserve first-seen user order across refetches.
- [x] Phase 2. Add visible sort control with default order, name, newest, oldest, enabled, disabled.
- [x] Phase 3. Render sorted users from local view model, not raw backend order.
- [x] Phase 4. Update lessons, verify line cap/build/graph.

### Acceptance
- [x] Toggling enabled does not move row position in default mode.
- [x] Enabled/disabled grouping only happens after explicit sort selection.
- [x] Verification recorded.

### Review
- Status: implemented.
- Root cause: user list rendered raw refetch order; after an enabled toggle, backend/DB order could change and the UI treated it as desired ordering.
- Fix: admin users page now keeps first-seen order in `Current order` mode, independent of later enabled changes.
- Added explicit `User order` control: `Current order`, `Name`, `Newest`, `Oldest`, `Enabled first`, `Disabled first`.
- Verification:
  - `frontend/src/admin/pages/admin-users-page.tsx` line count ✅ 205 lines
  - `vp run build` from `frontend/` ✅
  - `graphify update .` ✅
  - `git diff --check` ✅ warnings only for existing LF/CRLF normalization
  - `vp check` ❌ blocked by existing formatting backlog in 341 files, mostly `dist/` plus pre-existing tracked files

## Frontend Schema Copy And Modal/User UI Fix

### Goal
- [ ] Rename visible frontend references from "signature" to "schema" where meaning is UI/schema contract, without changing backend API identifiers.
- [ ] Fix create prediction modal so it sits below app header and does not slide underneath it.
- [ ] Fix admin user enabled checkbox so toggling does not shift table layout.

### Plan
- [x] Phase 1. Locate relevant frontend components and line limits.
- [x] Phase 2. Update schema-facing UI copy in model/signature/prediction screens and search placeholder.
- [x] Phase 3. Adjust prediction modal positioning/height/overflow against sticky header.
- [x] Phase 4. Stabilize admin user table enabled checkbox dimensions.
- [x] Phase 5. Run focused verification, line-limit checks, graphify update, record review.

### Acceptance
- [x] User-facing copy says schema for UI schema/version flows.
- [x] Technical/API variable names remain compatible with current backend.
- [x] Prediction modal no longer renders under header.
- [x] Enabled checkbox toggle does not move row content.

### Review
- Status: implemented.
- Copy: model schema/version UI, prediction schema preview, search placeholder, MLForm labels, and schema errors now use "schema" for UI schema concepts. Backend/API identifiers and `/signatures` routes left intact for compatibility.
- Modal: create prediction modal now starts below app header (`top-[88px]`) and clamps internal height.
- Users: enabled checkbox now uses a fixed-width cell and fixed-size custom control, so checked/unchecked state cannot shift row layout.
- Verification:
  - `vp run build` from `frontend/` ✅
  - touched file line-cap check ✅ all touched files under 300 lines
  - `git diff --check` ✅ warnings only for existing LF/CRLF normalization
  - `graphify update .` ✅
  - `vp check` ❌ blocked by existing formatting backlog in 340 files, mostly `dist/` plus pre-existing tracked files
- Existing repo gap: full frontend source line-cap scan still finds pre-existing files over 300 lines: `frontend/src/app/components/ui.tsx`, `frontend/src/app/utils/mlform/primitive-registry.ts`, `frontend/src/models/components/ExportButton.tsx`, `frontend/src/workspace/types.ts`.

## Goal
- [x] Move config source-of-truth to env.
- [x] Keep `.env` and `.env.example` aligned.
- [x] Remove config hardcodes from compose, API, backend runtime, docs.

## Audit Findings
- [ ] `docker-compose.dev.yml` hardcodes `SPRING_PROFILES_ACTIVE=prod`, `ANALYZER_BASE_URL=https://py-analyzer:8000`, `VITE_BACKEND_URL=https://localhost:${SPRING_PORT}`.
- [ ] `docker-compose.prod.yml` repeats same hardcodes.
- [ ] `api/src/main/resources/application.properties` hardcodes DB host/port in JDBC URL, `spring.profiles.active=prod`, `server.port=8443`, `server.ssl.enabled=true`, keystore password/alias/path defaults, storage defaults, log path default.
- [ ] `api/src/main/java/dev/ulloasp/mlsuite/security/SecurityConfig.java` hardcodes allowed origins `https://localhost:5173` and `https://localhost:8443`.
- [ ] `backend/src/mlsuite_backend/config.py` hardcodes fallback CORS origin `https://localhost:8443` and port `8000`.
- [ ] `.env.example` missing vars already used or needed: `DB_TEST`, `LOG_PATH`, `SPRING_PROFILES_ACTIVE`, `SERVER_SSL_ENABLED`, `SERVER_SSL_KEY_STORE`, `SERVER_SSL_KEY_STORE_PASSWORD`, `SERVER_SSL_KEY_STORE_TYPE`, `SERVER_SSL_KEY_ALIAS`, `ANALYZER_BASE_URL`, `VITE_BACKEND_URL`, `CORS_ALLOW_ORIGINS`, maybe runtime host/port vars if backend made env-driven.

## Plan
- [x] Phase 1. Define env contract.
Add single config list in root env files. Keep names already used when possible. Add missing vars to `.env` and `.env.example`. Mark safe placeholders in example, real values only in `.env`.
- [x] Phase 2. Compose stop inventing values.
Change `docker-compose.dev.yml` and `docker-compose.prod.yml` to pass-through env vars, not hardcoded literals. Use `${VAR}` or `${VAR:-safe-default}` only where startup truly needs fallback.
- [x] Phase 3. API config stop hardcoding infra.
Refactor `application.properties` so DB URL uses `${DB_HOST}`, `${DB_PORT}`, `${DB_PROD}`. Move Spring profile, port, SSL flags, keystore path/pass/type/alias, storage endpoint, log path behind env vars. Keep defaults only if needed for boot safety and duplicate them in env files.
- [x] Phase 4. API CORS env-driven.
Extract allowed origins to env-backed property, ex `CORS_ALLOW_ORIGINS`. Parse comma-separated list in dedicated config/properties class. Remove localhost literals from `SecurityConfig.java`.
- [x] Phase 5. Backend runtime env-driven.
Move backend `PORT` and CORS origins to env-backed settings with explicit vars, ex `PYTHON_PORT` and `CORS_ALLOW_ORIGINS`. Keep `HOST=0.0.0.0` only if intentional container bind, else make env too.
- [x] Phase 6. Frontend env contract stable.
Keep frontend reading `VITE_BACKEND_URL` only. Ensure compose and env files provide it. No extra frontend hardcodes.
- [x] Phase 7. Docs sync.
Update `README.md` env snippet so docs match `.env.example`. Remove stale examples that imply hidden defaults.
- [x] Phase 8. Verify narrow, then integrated.
Run grep audit again for forbidden literals in config paths. Then run targeted checks: API tests touching config/CORS, backend tests if config parsing touched, compose config render if available.

## Proposed Env Additions / Normalization
- [ ] DB: `DB_HOST`, `DB_PORT`, `DB_PROD`, `DB_TEST`, `DB_USER`, `DB_PASS`.
- [ ] Spring: `SPRING_PORT`, `SPRING_PROFILES_ACTIVE`, `LOG_PATH`.
- [ ] SSL: `SERVER_SSL_ENABLED`, `SERVER_SSL_KEY_STORE`, `SERVER_SSL_KEY_STORE_PASSWORD`, `SERVER_SSL_KEY_STORE_TYPE`, `SERVER_SSL_KEY_ALIAS`.
- [ ] Backend/API link: `ANALYZER_BASE_URL`.
- [ ] Frontend/API link: `VITE_BACKEND_URL`.
- [ ] CORS: `CORS_ALLOW_ORIGINS`.
- [ ] Runtime ports: `PYTHON_PORT`, `WEB_PORT`, `MINIO_API_PORT`, `MINIO_CONSOLE_PORT`.
- [ ] Storage: `STORAGE_ENABLED`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `STORAGE_AUTO_CREATE_BUCKET`, `STORAGE_BACKFILL_ON_STARTUP`.
- [ ] Seed/admin: `MLSUITE_SUPERADMIN_EMAIL`, `MLSUITE_SUPERADMIN_PASSWORD`, `MLSUITE_SUPERADMIN_FULL_NAME`, `MLSUITE_SUPERADMIN_USERNAME`.

## Acceptance
- [x] No config literal for env-specific host, port, URL, origin, credential in compose or app config, except explicit safe fallback justified in code/comment.
- [x] `.env` and `.env.example` expose same contract.
- [x] Docs match env contract.
- [x] Verification commands + blockers documented.

## Review
- Status: implemented.
- Extra fix: frontend now reads `VITE_BACKEND_URL` from runtime-generated `/runtime-config.js`, so prod compose env affects prebuilt static image too.
- Risk: env values are now authoritative; broken or missing env now fails faster instead of silently falling back.
- Rule kept: browser-facing URL (`VITE_BACKEND_URL`) stays separate from container-network URL (`ANALYZER_BASE_URL`).
- Verification:
  - `docker compose -f docker-compose.dev.yml config` ✅
  - `mvn -q -Dtest=AnalyzerServiceTest test` ❌ blocked by unrelated existing API test-compile failures in `OrganizationManagementServiceTest` and `WorkspaceAuthorizationServiceTest`
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - `uv run pytest tests/test_runtime_api.py` ❌ blocked because `pytest` is not installed in backend env (`Failed to spawn: pytest`)
  - `uv run python -m compileall src` ✅
  - `uv run python -c "from mlsuite_backend.app import create_app; from mlsuite_backend.__main__ import main; app = create_app(); print(app is not None)"` ✅
  - `vp build` ✅
  - `vp check` ❌ blocked by broad pre-existing formatting issues across repo-generated/tracked files, not by typed build failure

## Infra Dashboard Plan

### Goal
- [x] Add superadmin infrastructure dashboard with live metrics, service control, logs, and xterm terminal.
- [x] Keep source of truth split cleanly: frontend UI, Spring auth/proxy, host-side ops-agent.
- [x] Add real chart and terminal libraries: `recharts`, `react-is`, `@xterm/xterm`, `@xterm/addon-fit`.

### Plan
- [x] Phase 1. Update task lessons and install frontend deps.
- [x] Phase 2. Create `ops-agent/` FastAPI service with metrics, compose control, log streaming, and terminal sessions.
- [x] Phase 3. Add Spring config, REST proxy, and WS bridge under `admin.infrastructure`.
- [x] Phase 4. Add frontend infra feature, route, sidebar entry, charts, logs, and xterm panel.
- [x] Phase 5. Add focused tests for ops-agent, API controller/client, and frontend infra logic.
- [x] Phase 6. Run narrow verification and record blockers/results.

### Acceptance
- [x] `/admin/infrastructure` shows live host metrics with charts.
- [x] Service table shows state and allows start/stop/restart.
- [x] Logs stream for selected service.
- [x] Embedded xterm terminal opens real shell session for selected service.
- [x] Superadmin-only REST and WS paths enforced.

### Review
- Status: implemented.
- Added `ops-agent/` host-side FastAPI service for metrics, compose actions, log follow, and terminal session orchestration.
- Added Spring REST proxy + WebSocket bridge under `admin.infrastructure` with superadmin gate and ops-agent error mapping.
- Added frontend infra feature page with `recharts` telemetry charts, live log panel, and `xterm.js` terminal panel.
- Verification:
  - `uv run --project ops-agent python -m compileall src` ✅
  - `uv run --project ops-agent --extra dev pytest tests/test_ops_api.py` ✅
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - `mvn -q -Dtest=InfrastructureControllerTest test` ❌ blocked by pre-existing unrelated `testCompile` failures in `OrganizationManagementServiceTest` and `WorkspaceAuthorizationServiceTest`
  - `vp check` ❌ blocked by broad pre-existing formatting issues across tracked/generated frontend files, not by infra feature compile failure
  - `docker build -t mlsuite-ops-agent-test ./ops-agent` ✅
  - `docker run --rm mlsuite-ops-agent-test .venv/bin/python -c "import shutil, subprocess; print(shutil.which('docker')); subprocess.run(['docker','compose','version'], check=True)"` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build ops-agent` ✅
  - `Invoke-WebRequest -Headers @{ 'X-MLSuite-Ops-Secret' = '<redacted>' } http://localhost:8091/internal/overview` ✅ `200`

## Infra Dashboard Redesign

### Goal
- [ ] Turn `/admin/infrastructure` from loose landing layout into dense operational dashboard.
- [ ] Make global health visible in first viewport.
- [ ] Reduce error-badge noise and give services center stage.
- [ ] Keep redesign honest to existing backend contract and under file-size limits.

### Plan
- [x] Phase 1. Add dashboard summary helpers and compact top bar.
- [x] Phase 2. Add KPI cards + alert rail derived from real host/service state.
- [x] Phase 3. Redesign telemetry chart panel into primary chart deck.
- [x] Phase 4. Rebuild service control panel into stronger command table/grid.
- [x] Phase 5. Rework logs/terminal into lower workspace with tabs on small screens.
- [x] Phase 6. Run focused frontend tests/build and record results.

### Review
- Status: implemented.
- Replaced hero-style infra page with compact command header, KPI summary row, chart + signal rail, stronger service control block, and dedicated workspace section.
- Added derived dashboard helpers so alert rail and KPI cards use real host/service/socket state without inventing backend data.
- Kept all infra frontend files under 300 lines.
- Verification:
  - `Get-ChildItem frontend\src\admin\infrastructure -Recurse -File | ...` ✅ all files under 300 lines
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
- Gap:
  - no browser screenshot/interactive visual QA was run in this turn

## Frontend/API Same-Origin Auth Fix

### Goal
- [x] Remove browser cross-origin dependency for auth/API calls.
- [x] Keep frontend as single browser origin in docker and local Vite dev.
- [x] Fix `/api/users/me` load without requiring separate backend cert trust in browser.

### Plan
- [x] Phase 1. Confirm current failure path and direct backend reachability.
- [x] Phase 2. Make frontend runtime config tolerate same-origin fallback.
- [x] Phase 3. Add frontend reverse proxy for `/api` and websocket upgrade in nginx image.
- [x] Phase 4. Add matching Vite dev proxy so local non-docker dev keeps same contract.
- [x] Phase 5. Rebuild frontend, hit app through frontend origin, record results.

### Review
- Status: implemented.
- Root cause: browser called `https://localhost:8443` directly from frontend origin. Backend itself answered `401`, but browser-side TLS/cross-origin path was brittle and surfaced as fake CORS failure.
- Fix: frontend now defaults to same-origin API access, docker nginx proxies `/api` to `spring-app:8443`, and local Vite dev proxies `/api` to `https://localhost:8443` with cert verification disabled for dev.
- Env contract: `VITE_BACKEND_URL=` now means "use frontend origin/proxy".
- Verification:
  - `vp build` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build frontend` ✅
  - `Invoke-WebRequest https://localhost:8443/api/users/me -SkipCertificateCheck` ✅ backend reachable, returns `401`
  - `Invoke-WebRequest https://localhost:5173/runtime-config.js -SkipCertificateCheck` ✅ runtime config now serves `VITE_BACKEND_URL: ""`
  - `Invoke-WebRequest https://localhost:5173/api/users/me -SkipCertificateCheck` ✅ proxy path now reaches backend and returns `401`
  - Note: first proxy hit returned `502` during container startup race; retry after startup returned `401`

## Infra Workspace UX Fix

### Goal
- [x] Stop terminal workspace from stretching page with runaway scroll.
- [x] Restore visible infra data refresh when socket path stalls or query updates.
- [x] Make service selection obvious and clickable across full row, not only first cell.

### Plan
- [x] Phase 1. Inspect infra page state sync, terminal sizing, and row selection handlers.
- [x] Phase 2. Fix overview/log refresh flow with stable selection resolution.
- [x] Phase 3. Fix terminal panel min-height/overflow behavior.
- [x] Phase 4. Make full service row selectable without breaking action buttons.
- [x] Phase 5. Run focused frontend tests/build and record results.

### Review
- Status: implemented.
- Root causes:
  - Infra page only copied initial query snapshot with `current ?? data`, so later query refreshes never reached screen.
  - Service selection click target lived only in first cell, not whole row.
  - Terminal panel missed `min-h-0` / overflow clamps, so xterm container could push page height downward.
- Fix:
  - Added polling fallback for overview + logs queries and synced page state to latest overview while preserving valid selected service.
  - Added `resolveSelectedService` helper so selection stays stable when service still exists and falls back cleanly when missing.
  - Made full service row keyboard/click selectable; action buttons now stop propagation.
  - Clamped terminal panel layout with `min-h-0` and `overflow-hidden` on terminal wrappers.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
  - Build warning remains: existing `runtime-config.js` script warning + large chunk warnings, unrelated to this fix.

### Follow-up Review
- Status: tightened after browser feedback.
- Added explicit `ServiceFocusBar` above logs/shell with native service selector plus actionable facts: state, health, uptime, CPU, memory, container, ports.
- Logs and shell panels now use fixed 520px grid height with internal scroll only; page no longer grows from log/shell content.
- Rebuilt running frontend container so browser receives current bundle.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build frontend` ✅
  - `Invoke-WebRequest https://localhost:5173 -SkipCertificateCheck` ✅ `200`

### Terminal Session Loop Fix
- Status: fixed.
- Root cause: `ServiceTerminalPanel` opened terminal sessions automatically when mounted and depended on the full React Query mutation object, so status/render changes could recreate sessions repeatedly.
- Fix: terminal now waits for explicit `Open shell` click, uses stable `mutateAsync`, and does not retry automatically after a session error.
- Cleanup: restarted ops-agent to clear leaked in-memory sessions and rebuilt frontend container.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅
  - `docker compose -f docker-compose.dev.yml restart ops-agent` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build frontend` ✅
  - `Invoke-WebRequest http://localhost:8091/health` ✅
  - `Invoke-WebRequest http://localhost:8091/internal/overview` ✅ services running

### Realtime/Health/Shell Fix
- Status: fixed.
- WS sample interval changed to 1 second in env and ops-agent default.
- Metrics broadcast split from Docker service refresh, so host telemetry emits every second while heavier Docker service snapshots refresh in background.
- Health bug fixed: Docker Compose reports services without healthcheck as empty string; ops-agent now normalizes empty health to `null`, so `running + unknown health` counts stable instead of alerting.
- Shell access bug analyzed/fixed: ops-agent hardcoded `terminalEnabled=true` for every running service. Shell is now gated by explicit `OPS_AGENT_TERMINAL_SERVICES`; default dev/prod env is empty, so no service shell opens unless allowlisted.
- Live verification:
  - `/internal/overview` ✅ `sample=1`, `healthy=5/5`, `shell=0/5`
  - direct ops-agent WS ✅ `overview.delta` intervals about `1.0s`
  - frontend proxy WS after login ✅ snapshot received through `wss://localhost:5173/api/admin/infrastructure/stream`
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 7 tests
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅

## Infra Implementation Audit

### Goal
- [x] Verify described `/admin/infrastructure` implementation against repo code.
- [x] Identify gaps in frontend, Spring proxy/WS, ops-agent, tests, and runtime wiring.
- [x] Run focused verification where useful.

### Plan
- [x] Phase 1. Inspect frontend module files and route/auth behavior.
- [x] Phase 2. Inspect Spring REST proxy, superadmin guard, and WS bridge.
- [x] Phase 3. Inspect ops-agent config/API/logs/terminal behavior.
- [x] Phase 4. Compare tests and line-limit constraints.
- [x] Phase 5. Run narrow verification and document findings.

### Review
- Status: partially implemented, with gaps.
- Major gap: `/admin/infrastructure` route uses `RequireSuperadmin`, which returns `NotFoundError`; non-superadmin users do not reach page-level `/workspace` redirect.
- Major gap: terminal backend uses `docker compose exec -T` with pipe stdio, not a PTY; resize only stores cols/rows and cannot resize shell process.
- Risk: terminal React effect depends on full `useMutation()` result object, so renders may restart/close shell sessions unexpectedly.
- Test gap: frontend tests cover helper functions only, not route redirect, logs/terminal panels, xterm session lifecycle, or WS behavior.
- Test gap: Spring controller test instantiates controller directly; no security/filter/WS authorization coverage.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅ warning only: runtime-config non-module script + large chunks
  - `uv run --extra dev pytest tests/test_ops_api.py` from `ops-agent/` ✅
  - `uv run python -m compileall src` from `ops-agent/` ✅
  - `docker compose -f docker-compose.dev.yml config` ✅
  - `mvn -q "-Dmaven.test.skip=true" package` ✅
  - `mvn -q -Dtest=InfrastructureControllerTest test` ❌ blocked by unrelated existing `testCompile` failures in `OrganizationManagementServiceTest` and `WorkspaceAuthorizationServiceTest`

### Follow-up Fix
- Root cause: ops-agent ran compose from `/app` with no compose project override, so `docker compose -f /workspace/docker-compose.dev.yml ps` saw no MLSuite containers and returned every managed service as `missing`.
- Added `OPS_AGENT_COMPOSE_PROJECT=mlsuite` to env contract and passed it into dev/prod compose.
- Secondary root cause: current Docker Compose accepts only one service for `docker compose stats`; ops-agent passed all services at once and `/internal/overview` failed after project fix.
- Changed stats collection to query one service at a time and merge JSON rows.
- Added ops-agent WS snapshot test that verifies `overview.snapshot.payload.services[]` includes status, health, container name, CPU, memory, and ports.
- Added WS disconnect handling so stream/terminal sockets close cleanly in tests and runtime.
- Live verification:
  - `http://localhost:8091/internal/overview` ✅ services now `running`; postgres `healthy`; cpu/memory/container/ports populated
  - `ws://127.0.0.1:8091/internal/stream` from inside ops-agent ✅ `overview.snapshot` includes same service status fields
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 5 tests
  - `uv run python -m compileall src` ✅
  - `docker compose -f docker-compose.dev.yml up -d --build ops-agent` ✅

## Infra Sidebar Subtabs And PTY Terminal

### Goal
- [x] Remove in-page Infra chrome/top tabs.
- [x] Move Infra views to sidebar subtabs under `Infra`.
- [x] Make embedded shell use real PTY-backed docker compose exec.
- [x] Verify frontend and ops-agent paths.

### Plan
- [x] Phase 1. Wire Infra view from URL state so sidebar subtabs own navigation.
- [x] Phase 2. Add sidebar child nav under `Infra` with counts where local data supports it later if needed.
- [x] Phase 3. Remove Infra top bar/tab bar and keep page content stable.
- [x] Phase 4. Replace piped `exec -T` terminal with PTY-backed compose exec, including resize.
- [x] Phase 5. Run focused tests/builds and document review.

### Review
- Status: fixed.
- Infra page now uses `?tab=` as source of truth, so sidebar child links own Overview, Services, Logs, Terminal, and Alerts.
- In-page MLSuite top bar and horizontal tab strip removed.
- Ops-agent terminal now starts `docker compose exec` through a POSIX PTY, removes `-T`, reads/writes via PTY fd, and applies resize to terminal winsize.
- Runtime note: shell UI still honors `OPS_AGENT_TERMINAL_SERVICES`; empty allowlist means no service exposes shell.
- Verification:
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅
  - `vp build` ✅ warnings only: runtime-config non-module script and large chunks
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 8 tests
  - `uv run python -m compileall src` ✅
  - one-off ops-agent PTY smoke against `spring-app` ✅ printed `PTY_OK`
  - `docker compose -f docker-compose.dev.yml up -d --build ops-agent frontend` ✅
  - `Invoke-WebRequest https://localhost:5173 -SkipCertificateCheck` ✅ `200`
  - `Invoke-WebRequest http://localhost:8091/health` ✅ `{"status":"ok"}`

## Ops-Agent CI Registration Fix

### Plan
- [x] Compare prod compose images against GHCR publish matrix.
- [x] Register missing `ops-agent` image in CI.
- [x] Record correction lesson and verify workflow syntax shape.

### Review
- Status: fixed.
- Root cause: `docker-compose.prod.yml` referenced `mlsuite-ops-agent`, but `.github/workflows/publish-ghcr.yml` only built frontend, api, and backend images.
- Fix: added `ops-agent` matrix entry using `./ops-agent/Dockerfile`, context `./ops-agent`, image `mlsuite-ops-agent`.
- Verification:
  - `git diff --check` ✅ only existing CRLF warning for workflow file
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:ci-check ./ops-agent` ✅
  - YAML parser check blocked: local Python missing `PyYAML`

## Ops-Agent Service Aggregate Metrics

### Plan
- [x] Replace host probes with managed-service metric aggregation.
- [x] Preserve existing overview shape while changing values to service totals.
- [x] Drop unused host metric dependency.
- [x] Verify tests, compile, and Docker build.

### Review
- Status: fixed.
- Root cause: ops-agent sampled host CPU/RAM/disk/VRAM via `psutil`/`nvidia-smi`, but dashboard scope is managed compose services.
- Fix: `collect_metrics` now sums `cpuPercent` across services, computes RAM percent from summed service memory used/limit, disables disk/VRAM host probes, and emits service aggregate points.
- Fix: Docker stats parsing now stores `memoryLimitBytes` from `MemUsage`.
- Fix: removed `psutil` from ops-agent project dependencies and lockfile.
- Verification:
  - `uv lock` ✅ removed `psutil`
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 9 tests
  - `uv run python -m compileall src` ✅
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:service-aggregate-check ./ops-agent` ✅

## Ops-Agent Legacy Contract Removal

### Plan
- [x] Remove legacy `host` overview payload and replace it with `aggregate`.
- [x] Drop disk/VRAM metric fields and unused panels from infra UI.
- [x] Keep files under 300 lines by splitting overview/services helpers.
- [x] Verify backend, frontend, Docker build, and stale references.

### Review
- Status: fixed.
- Contract now emits `aggregate.cpu` and `aggregate.ram`; no `host`, `diskPercent`, `vramPercent`, or `vramSupported` telemetry remains in active infra payload/types/tests/UI.
- Deleted unused legacy panels: `InfrastructureSummaryGrid`, `InfrastructureTopBar`, `SystemHealthChartPanel`.
- Split `OverviewView` and `ServicesView` support helpers to satisfy line cap in touched infra files.
- Verification:
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 9 tests
  - `uv run python -m compileall src` ✅
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅ 6 tests
  - `vp build` ✅ warnings only: runtime-config non-module script and large chunks
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:no-legacy-check ./ops-agent` ✅
  - `git diff --check` ✅ only CRLF warnings

### Visual Preservation Follow-up
- Status: fixed.
- Restored overview shape to match previous dashboard density: KPI row, main chart + signals, services glance, memory panel.
- Main chart now has service filter backed by backend history points: `history.points[].services[]`.
- Verification:
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 9 tests
  - `uv run python -m compileall src` ✅
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅ 6 tests
  - `vp build` ✅ warnings only: runtime-config non-module script and large chunks
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:service-chart-filter-check ./ops-agent` ✅
  - `git diff --check` ✅ only CRLF warnings

### Docker IO Metrics Follow-up

### Plan
- [x] Parse Docker `BlockIO` and `NetIO` in ops-agent service snapshots.
- [x] Carry disk read/write and network rx/tx through aggregate/history/service contracts.
- [x] Keep overview visuals, replacing stale KPI labels with Docker IO metrics.
- [x] Update focused backend/frontend tests and verify.

### Review
- Status: fixed.
- Ops-agent now parses Docker `BlockIO` as disk read/write and `NetIO` as network rx/tx.
- Aggregate, history points, and per-service chart points now carry CPU, RAM, disk IO, and network IO.
- Overview KPI row keeps same dashboard shape, with Disk R/W and Network I/O replacing stale non-Docker cards.
- Main chart keeps service filter and adds Docker IO layers.
- Verification:
  - `uv run --extra dev pytest tests/test_ops_api.py` ✅ 9 tests
  - `uv run python -m compileall src` ✅
  - `vp test src/admin/infrastructure/infrastructure.test.tsx` ✅ 6 tests
  - `vp build` ✅ warnings only: runtime-config non-module script and large chunks
  - `docker build --file ./ops-agent/Dockerfile --tag mlsuite-ops-agent:docker-io-check ./ops-agent` ✅
  - `git diff --check` ✅ only CRLF warnings
  - line cap check ✅ no touched source/test file over 300 lines
