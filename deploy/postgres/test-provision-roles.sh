#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd -P)
if command -v cygpath >/dev/null 2>&1; then
  root=$(cygpath -m "$root")
  export MSYS_NO_PATHCONV=1
fi
suffix="$$-$RANDOM"
network="mlsuite-role-test-$suffix"
postgres="mlsuite-role-test-postgres-$suffix"

cleanup() {
  docker rm -fv "$postgres" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker network create "$network" >/dev/null
docker run -d --name "$postgres" --network "$network" \
  -e POSTGRES_DB=mlsuite -e POSTGRES_USER=mlsuite -e POSTGRES_PASSWORD=legacy-pass \
  postgres:17.11-alpine3.24 >/dev/null
for _ in $(seq 1 30); do
  docker exec "$postgres" pg_isready -U mlsuite -d mlsuite >/dev/null 2>&1 && break
  sleep 1
done
sleep 2
docker exec "$postgres" pg_isready -U mlsuite -d mlsuite >/dev/null
MSYS_NO_PATHCONV=1 docker cp "$root/api/src/main/resources/db/migration/V1__baseline.sql" "$postgres:/tmp/V1.sql"
MSYS_NO_PATHCONV=1 docker exec "$postgres" psql -U mlsuite -d mlsuite -v ON_ERROR_STOP=1 -f /tmp/V1.sql >/dev/null

provision() {
  local user=$1 password=$2
  docker run --rm --network "$network" \
    -v "$root/deploy/postgres/provision-roles.sh:/provision-roles.sh:ro" \
    -e PGHOST="$postgres" -e PGDATABASE=mlsuite -e PGUSER="$user" -e PGPASSWORD="$password" \
    -e DB_ADMIN_USER=mlsuite_admin -e DB_ADMIN_PASS=admin-pass \
    -e DB_LEGACY_OWNER=mlsuite -e DB_LEGACY_PASS=legacy-pass \
    -e DB_USER=mlsuite_app -e DB_PASS=app-pass \
    -e DB_MIGRATION_USER=mlsuite_migrator -e DB_MIGRATION_PASS=migrator-pass \
    postgres:17.11-alpine3.24 /bin/sh /provision-roles.sh >/dev/null
}

provision mlsuite_admin admin-pass
for migration in "$root"/api/src/main/resources/db/migration/V{2,3,4,5}__*.sql; do
  MSYS_NO_PATHCONV=1 docker cp "$migration" "$postgres:/tmp/$(basename "$migration")"
  MSYS_NO_PATHCONV=1 docker exec -e PGPASSWORD=migrator-pass "$postgres" \
    psql -h localhost -U mlsuite_migrator -d mlsuite -v ON_ERROR_STOP=1 \
    -f "/tmp/$(basename "$migration")" >/dev/null
done
provision mlsuite_admin admin-pass

result=$(docker exec "$postgres" psql -U mlsuite_admin -d mlsuite -Atc "
  SELECT
    (SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='model'),
    (SELECT rolsuper FROM pg_roles WHERE rolname='mlsuite_app'),
    (SELECT rolsuper FROM pg_roles WHERE rolname='mlsuite_admin'),
    (SELECT rolsuper FROM pg_roles WHERE rolname='mlsuite'),
    (SELECT rolcanlogin FROM pg_roles WHERE rolname='mlsuite'),
    has_table_privilege('mlsuite_app','model','SELECT,INSERT,UPDATE,DELETE'),
    has_schema_privilege('mlsuite_app','public','CREATE');")
[[ "$result" == "mlsuite_migrator|f|t|t|f|t|f" ]] || { echo "unexpected role state: $result" >&2; exit 1; }
