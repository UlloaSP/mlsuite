---
title: Run with Docker Compose
description: "Run your own MLsuite instance with Docker Compose: configure .env, start the development stack, sign in and the services it runs."
---

MLsuite runs as one Docker Compose stack. `docker-compose.yml` is the single topology; an override
chooses the images:

| Override | Images | Use |
| --- | --- | --- |
| `docker-compose.dev.yml` | Built from the repository | Development and evaluation. |
| `docker-compose.prod.yml` + `docker-compose.release.yml` | Published images pinned by digest | Production; see [Production rollout](/self-hosting/production/). |

You need Git and Docker with Docker Compose.

:::caution
MLsuite is early software. Expect rough edges and breaking changes between builds.
:::

## Configure

```bash
git clone https://github.com/UlloaSP/mlsuite.git
cd mlsuite
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env`.

Open `.env` and give every blank secret its own random value, at least `DB_ADMIN_PASS`, `DB_PASS`,
`DB_MIGRATION_PASS`, `MINIO_ROOT_PASSWORD`, `STORAGE_SECRET_KEY`, `OPS_AGENT_SHARED_SECRET`,
`PREDICTION_ATTESTATION_SECRET` and `MLSUITE_SUPERADMIN_PASSWORD`, and set `MLSUITE_SUPERADMIN_EMAIL` to your address. Keep `.env`
private. Every variable is described in [Configuration](/self-hosting/configuration/).

## Start

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

Then open [http://localhost:5173](http://localhost:5173). Without a session it shows Explore; sign
in at `/login` with the superadmin email and password from `.env`, or register a new account at
`/login?mode=register`. While the services start, the page shows their progress.

Inspect, follow and stop the stack with:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

`down -v` also deletes the database and object storage volumes.

## Services

| Service | Role | Published port |
| --- | --- | --- |
| `frontend` | nginx serving the React app and proxying `/api` to the API | `WEB_PORT` (5173) |
| `spring-app` | The Spring Boot API: accounts, organizations, permissions, persistence | none |
| `py-analyzer` | The Python runtime: loads bundles and runs predictions | none |
| `postgres` | PostgreSQL 18, application state | `DB_HOST_PORT` (5430), on all interfaces |
| `minio` | Object storage for model and plugin files, versioned | none |
| `ops-agent` | Reads Docker Compose for the [Infrastructure](/admin/infrastructure/) page | none |
| `db-provision`, `minio-init` | One-shot: create database roles, the bucket and its policy | none |
| `db-migrate` | One-shot: apply the Flyway database migrations before the API starts | none |
| `artifact-migrate` | One-shot, profile `operations`: move stored models into object storage | none |

The browser talks only to `frontend`. Keep the API reachable only through it: nginx passes the
client's address to the API in a header that the API trusts for the public run limits. If PostgreSQL
should not be reachable from other hosts, bind or firewall `DB_HOST_PORT`.

## Behind a reverse proxy

When a TLS terminator or another proxy sits in front of `frontend`, every visitor seems to come from
the proxy and shares one public run quota. Tell nginx which proxy to trust by mounting a file into
the `frontend` container as `/etc/nginx/conf.d/real-ip.conf`:

```nginx
set_real_ip_from 10.0.0.5;
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```

Name the address or network your proxy connects from, never one visitors can connect from. The
proxy must set or append `X-Forwarded-For`. Add the public origin of the app to
`CORS_ALLOW_ORIGINS`.

## Models on your instance

The runtime pins the MLbundle and scikit-learn versions it loads (see `backend/pyproject.toml`).
Export bundles with those versions; see [Upload models](/models/upload/#what-mlsuite-accepts).
