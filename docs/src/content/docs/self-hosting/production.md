---
title: Production rollout
description: "Run published images in production: the release override, the cutover wizard, database and artifact migrations, backups, promotion gates and rollback."
---

Production runs the images of an [immutable release](/self-hosting/releases/) rather than local
builds. MLsuite supplies verified release artifacts; deployment, backups, promotion and rollback
remain the operator's job. This page summarizes the procedure; the repository
[README](https://github.com/UlloaSP/mlsuite#production-database-and-artifact-rollout) holds every
command.

## Release images

Each successful publication from `main` creates a GitHub prerelease named `build-<commit>` with
`docker-compose.release.yml`, which pins the frontend, API, runtime and ops-agent images by digest.
There is no `latest` tag. Download and verify a release as described in
[Immutable releases](/self-hosting/releases/#manifest-and-consumption), keep the override inside
the repository at the path named by `RELEASE_COMPOSE`, and run the stack with all three files:

```bash
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml \
  -f docker-compose.release.yml up -d
```

The API starts only after the one-shot `db-migrate` service has applied the database migrations
with the same API image.

## The cutover wizard

For a real cutover, run the gated wizard from the repository root:

```bash
./scripts/production-cutover.sh
```

It checks the configuration (`MODEL_MUTATIONS_REQUIRE_VERSION=true`, the single-disk risk
accepted, the backup timer active), freezes writes, takes a coordinated backup, rehearses a restore
in isolation, runs the database migration and the artifact migration, checks the canary's
readiness and records what a rollback needs. It changes production only after explicit
confirmations. Review it before running it.

## Database

Flyway is the only owner of the database schema; the API validates it and never changes it. An
empty installation needs no preparation. An existing database created before Flyway must first be
compared with `api/src/main/resources/db/migration/V1__baseline.sql` and, only if it matches,
baselined once with `FLYWAY_BASELINE_ON_MIGRATE=true` on a `db-migrate` run. Never leave that
setting enabled.

## Model artifacts

Models stored in the database by earlier versions are moved to RustFS by the resumable
`artifact-migrate` job (profile `operations`), run with `ARTIFACT_MIGRATION_COMMAND` set to
`status`, `migrate`, `verify` and finally `prune-orphans`. Each upload is read back and checked
against its SHA-256 before it counts as migrated. Keep `STORAGE_RETAIN_INLINE_COPY=true` during the
rollback window so the previous version can still read every model.

## Backups

The supported topology is `local-single-disk`: one host, one physical disk. Backups protect
against a bad deployment or a logical deletion, not against losing the disk.

```bash
sudo bash ./scripts/install-backup-timer.sh .env <service-user>   # daily at 03:00 UTC
ENV_FILE=.env ./scripts/create-local-backup.sh                    # take one now
ENV_FILE=.env bash ./scripts/verify-backup-rpo.sh                 # check the newest one
```

A backup briefly stops the frontend and API, dumps PostgreSQL, archives RustFS cold with its object
versions, checksums both and only then prunes the oldest backups to `LOCAL_BACKUP_RETENTION_COUNT`,
so a failed run never removes an existing backup. It refuses to start without
room for roughly 2.5 times the live data plus the `LOCAL_BACKUP_MIN_FREE_PERCENT` reserve. The
documented objective is a 24-hour recovery point (`RECOVERY_RPO_MINUTES`) and an 8-hour restore
(`RECOVERY_RTO_MINUTES`), for logical recovery only.

## Promotion gates

Promote a release only when:

- `db-migrate` finished and Flyway reports no drift;
- the artifact `status` shows no failed, running, inline-only or unverified rows, and `verify`
  finds no missing or mismatched object;
- `/actuator/health/readiness` is healthy on the canary API;
- a PostgreSQL and RustFS restore has been rehearsed in isolation.

## Rollback

On an application failure, roll the images back while the inline model copies remain. When
persistent state is incompatible, prefer rolling forward, or restore PostgreSQL and RustFS together
from the same backup.
