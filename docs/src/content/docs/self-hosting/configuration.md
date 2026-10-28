---
title: Configuration
description: Every variable of .env, with its default and what it controls.
---

The stack reads its configuration from `.env`, copied from `.env.example`. Defaults below are the
values in `.env.example`. Generate independent random values for every password and secret, and
never commit `.env`.

## Superadmin

| Variable | Default | Meaning |
| --- | --- | --- |
| `MLSUITE_SUPERADMIN_EMAIL` | `admin@example.com` | Account made superadmin at every API start. Blank: none is created. |
| `MLSUITE_SUPERADMIN_PASSWORD` | | Required to create that account. While set, it also resets the account's password at every start. |
| `MLSUITE_SUPERADMIN_FULL_NAME` | `MLsuite Admin` | Display name. |
| `MLSUITE_SUPERADMIN_USERNAME` | `admin` | Username. |

## Ports and services

| Variable | Default | Meaning |
| --- | --- | --- |
| `WEB_PORT` | `5173` | Host port of the web app. |
| `DB_HOST_PORT` | `5430` | Host port of PostgreSQL, bound to `127.0.0.1` only. |
| `SPRING_PORT` | `8080` | API port inside the network. Keep 8080: nginx proxies to it. |
| `PYTHON_HOST`, `PYTHON_PORT` | `0.0.0.0`, `8000` | Runtime bind address inside the network. |
| `ANALYZER_BASE_URL` | `http://py-analyzer:8000` | How the API reaches the runtime. |
| `RUNTIME_BUILDER_HOST`, `RUNTIME_BUILDER_PORT` | `0.0.0.0`, `8001` | Environment builder bind address inside the network. |
| `CORS_ALLOW_ORIGINS` | `http://localhost:5173` | Origins the API and its WebSockets accept. Add your public origin. |
| `SPRING_PROFILES_ACTIVE` | `prod` | Spring profile. |
| `LOG_PATH` | `/tmp/mlsuite` | Directory of the API's log file. |
| `VITE_BACKEND_URL` | | API origin baked into a development build of the frontend. Blank: same origin. |
| `COMPOSE_PROJECT_NAME` | `mlsuite` | Compose project; backups derive volume names from it. |

## Database

| Variable | Default | Meaning |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_PROD` | `postgres`, `5432`, `mlsuite` | Server and database name. |
| `DB_ADMIN_USER`, `DB_ADMIN_PASS` | `mlsuite_admin` | PostgreSQL superuser and database owner. |
| `DB_MIGRATION_USER`, `DB_MIGRATION_PASS` | `mlsuite_migrator` | Owns the schema; runs Flyway migrations. |
| `DB_USER`, `DB_PASS` | `mlsuite_app` | The application's role: data access only. |
| `DB_LEGACY_OWNER`, `DB_LEGACY_PASS` | `mlsuite` | Original owner of a volume created by an older Compose file; its tables are handed over, then its login is revoked. |
| `DB_POOL_MAX_SIZE`, `DB_POOL_MIN_IDLE`, `DB_POOL_CONNECTION_TIMEOUT_MS` | `10`, `2`, `30000` | API connection pool. Size it from PostgreSQL's connection budget. |
| `FLYWAY_BASELINE_ON_MIGRATE`, `FLYWAY_BASELINE_VERSION` | `false`, `1` | Baseline an audited pre-Flyway database. Enable for exactly one migration, then set back to `false`. |

Compose creates the three roles on every start. On an externally managed database, create
equivalent roles yourself; the migration role must be able to install `pg_trgm`.

## Object storage

| Variable | Default | Meaning |
| --- | --- | --- |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | `mlsuite-root` | MinIO administrator, used only by MinIO and its initializer. |
| `MINIO_CONSOLE_ADDRESS` | `:9001` | MinIO console address inside the network; not published. |
| `STORAGE_ENABLED` | `true` | Store models and plugins in MinIO. |
| `STORAGE_ENDPOINT` | `http://minio:9000` | S3 endpoint. |
| `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | `mlsuite-app` | The application's MinIO user, limited to the bucket. Must differ from the root user. |
| `STORAGE_BUCKET` | `mlsuite` | Bucket name. Versioning is enabled on it. |
| `STORAGE_AUTO_CREATE_BUCKET` | `true` | Let the API create the bucket. |
| `STORAGE_RETAIN_INLINE_COPY` | `true` | Keep the database copy of each model during the rollback window. |
| `STORAGE_DELETION_ENABLED`, `STORAGE_DELETION_BATCH_SIZE`, `STORAGE_DELETION_STALE_AFTER_SECONDS` | `true`, `20`, `300` | Background removal of deleted files. |
| `ARTIFACT_MIGRATION_COMMAND` | `status` | What `artifact-migrate` does: `status`, `migrate`, `verify`, `retry-failed`, `prune-orphans`. |
| `ARTIFACT_MIGRATION_MAX_ATTEMPTS`, `ARTIFACT_MIGRATION_STALE_AFTER_SECONDS`, `ARTIFACT_MIGRATION_ORPHAN_GRACE_SECONDS` | `5`, `900`, `86400` | Retries, lease length, and the minimum age before `prune-orphans` removes an unreferenced object. |

## Models

| Variable | Default | Meaning |
| --- | --- | --- |
| `MODEL_MUTATIONS_REQUIRE_VERSION` | `true` | Refuse model changes that do not send the model's version (`428`), so stale pages cannot overwrite each other. Keep `true`. |
| `PREDICTION_ATTESTATION_SECRET` | | Signs the predictions the API runs for workspace inferences; an inference can only be saved with results signed by it, within 24 hours. Required: at least 32 random characters, the same on every API instance. Changing it invalidates unsaved results. |

## Runtime capacity

| Variable | Default | Meaning |
| --- | --- | --- |
| `WORKSPACE_PREDICTION_MAX_CONCURRENT` | `4` | Workspace predictions, explanations and artifact inspections at once, apart from public and client runs; more wait their turn. |
| `RUNTIME_QUEUE_MAX_WAITING` | `1000` | Runs that may wait in each share (workspace, public, client) for their turn, in arrival order. A run that finds every place taken receives `503` with `Retry-After`. |
| `RUNTIME_QUEUE_MAX_PER_CALLER` | `16` | Places, running or waiting, one caller may hold in a share: a member, a public page's network or account, an API client. More receive `503` with `Retry-After`. At least 1. |
| `RUNTIME_QUEUE_MAX_WAIT_MS` | `5000` | How long a run may wait for its turn before it receives `503` with `Retry-After`. |
| `RUNTIME_WORKERS` | `2` | Worker processes the runtime runs models in, in all, about one per core it may use; each runs one request at a time inside one model's environment and holds the bundles it loaded, so size them by memory too. |
| `RUNTIME_BUNDLE_CACHE_MB` | `512` | Total artifact size of the bundles each worker keeps loaded, and of the artifacts the runtime keeps on disk; the newest is kept even when larger. A run sends its artifact only when the runtime lacks it. |
| `RUNTIME_MEMORY_LIMIT` | `6g` | Memory the runtime, its workers included, may use. |
| `RUNTIME_BUILDER_BASE_URL` | `http://runtime-builder:8001` | How the API reaches the environment builder. |
| `RUNTIME_PACKAGE_INDEX_URL` | `https://pypi.org/simple` | The only index the builder installs from; a mirror works, since every file is checked against the lock's SHA-256 and the lock's URLs are never used. |
| `RUNTIME_BUILDER_MEMORY_LIMIT` | `2g` | Memory the builder may use. |

## Public runs and the client API

| Variable | Default | Meaning |
| --- | --- | --- |
| `PUBLIC_PREDICTION_MAX_MODEL_SIZE_MB` | `50` | Largest model a public bookmark or an API client may run. |
| `PUBLIC_PREDICTION_MAX_CONCURRENT` | `2` | Public runs at once; more wait their turn (see `RUNTIME_QUEUE_*`). |
| `PUBLIC_PREDICTION_ANONYMOUS_RUNS_PER_DAY` | `50` | Runs of one bookmark per network address without a session in 24 hours (an IPv6 address counts as its /64). |
| `PUBLIC_PREDICTION_SIGNED_IN_RUNS_PER_DAY` | `500` | The same, per signed-in account. |
| `API_ACCESS_MAX_CONCURRENT` | `2` | API client runs at once, apart from public runs; more wait their turn (see `RUNTIME_QUEUE_*`). |
| `API_ACCESS_REQUESTS_PER_MINUTE` | `60` | Calls one client may make per clock minute. At least 1. |
| `API_ACCESS_MONTHLY_CALLS` | `10000` | Succeeded calls an organization's clients may make per UTC month, unless a superadmin sets another limit. |
| `API_ACCESS_REQUEST_RETENTION_DAYS` | `90` | How long the request log is kept. At least 31. |

The public run counts are kept in the API's memory: they restart with the API and hold only with a
single API instance. The client API limits are counted from the request log, so they hold across
restarts and instances.

## Sign-in and sessions

| Variable | Default | Meaning |
| --- | --- | --- |
| `SESSION_COOKIE_SECURE` | `true` | Send the session cookie only over HTTPS. Browsers treat `http://localhost` as secure; set `false` only for plain HTTP on another address. |
| `AUTH_MAX_LOGIN_FAILURES` | `10` | Failed sign-ins one network may make in 15 minutes; past it every sign-in from it receives `429` until the window ends. At least 1. |
| `AUTH_MAX_REGISTRATIONS` | `5` | Registration attempts one network may make in 15 minutes; more receive `429`. At least 1. |

Like the public run counts, these are kept in the API's memory and hold only with a single API
instance. A session ends on its next request once its account is disabled or deleted, or its
password or system role changes.

## Operations agent

| Variable | Default | Meaning |
| --- | --- | --- |
| `OPS_AGENT_BASE_URL` | `http://ops-agent:8091` | How the API reaches the agent. |
| `OPS_AGENT_SHARED_SECRET` | | Shared by the API and the agent. Required: the agent refuses to start without it. |
| `OPS_AGENT_HOST`, `OPS_AGENT_PORT` | `0.0.0.0`, `8091` | Agent bind address. |
| `OPS_AGENT_DOCKER_BIN` | `docker` | Docker CLI. |
| `OPS_AGENT_COMPOSE_PROJECT` | `mlsuite` | Must match the project the stack runs under. |
| `OPS_AGENT_MANAGED_SERVICES` | `postgres,py-analyzer,runtime-builder,minio,spring-app,frontend` | Services the Infrastructure page shows and controls. |
| `OPS_AGENT_SAMPLE_INTERVAL_SECONDS`, `OPS_AGENT_RETENTION_MINUTES` | `5`, `60` | Metric sampling and history. |
| `OPS_AGENT_TERMINAL_SERVICES` | | Services that allow a shell. Blank: none. |
| `OPS_AGENT_TERMINAL_IDLE_MINUTES`, `OPS_AGENT_TERMINAL_MAX_SESSIONS` | `15`, `5` | Idle timeout and concurrent shells. |
| `OPS_AGENT_LOG_TAIL_LINES` | `200` | Lines of history when a log opens. |

The agent mounts the Docker socket and the repository read-only. Anyone who controls it controls
the host's Docker; keep the secret private.

## Backups and recovery

Read by the scripts in `scripts/`, not by the application. See
[Production rollout](/self-hosting/production/#backups).

| Variable | Default | Meaning |
| --- | --- | --- |
| `RECOVERY_MODE` | `local-single-disk` | The only supported topology. |
| `SINGLE_DISK_RISK_ACCEPTED` | `false` | Must be `true` to run the cutover: losing the disk loses the data. |
| `LOCAL_BACKUP_ROOT` | `backups` | Where backups are written. |
| `LOCAL_BACKUP_RETENTION_COUNT` | `7` | Backups kept. |
| `LOCAL_BACKUP_MIN_FREE_PERCENT` | `15` | Free disk space a backup must leave. |
| `RECOVERY_RPO_MINUTES`, `RECOVERY_RTO_MINUTES` | `1440`, `480` | Maximum age of the newest backup, and maximum duration of a restore rehearsal. |
| `RECOVERY_LAST_RESTORE_UTC`, `RECOVERY_LAST_RTO_SECONDS`, `RECOVERY_LAST_RESTORE_RESULT` | | Written by the restore rehearsal. |
| `RESTORE_SMOKE_PORT` | `18080` | Local port of the API restored during a rehearsal. |
| `RELEASE_COMPOSE` | `docker-compose.release.yml` | Path of the digest-pinned release override, inside the repository. |
