#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd -P)
source "$root/scripts/lib.sh"
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
  -e POSTGRES_DB=mlsuite -e POSTGRES_USER=mlsuite_admin -e POSTGRES_PASSWORD=admin-pass \
  "$POSTGRES_IMAGE" >/dev/null
for _ in $(seq 1 30); do
  docker exec "$postgres" pg_isready -U mlsuite_admin -d mlsuite >/dev/null 2>&1 && break
  sleep 1
done
sleep 2
docker exec "$postgres" pg_isready -U mlsuite_admin -d mlsuite >/dev/null

provision() {
  docker run --rm --network "$network" \
    -v "$root/deploy/postgres/provision-roles.sh:/provision-roles.sh:ro" \
    -e PGHOST="$postgres" -e PGDATABASE=mlsuite -e PGUSER=mlsuite_admin -e PGPASSWORD=admin-pass \
    -e DB_USER=mlsuite_app -e DB_PASS=app-pass \
    -e DB_MIGRATION_USER=mlsuite_migrator -e DB_MIGRATION_PASS=migrator-pass \
    "$POSTGRES_IMAGE" /bin/sh /provision-roles.sh >/dev/null
}

provision
# The baseline runs as the migration role, as db-migrate does, and installs pg_trgm itself.
MSYS_NO_PATHCONV=1 docker cp "$root/api/src/main/resources/db/migration/V1__baseline.sql" "$postgres:/tmp/V1.sql"
MSYS_NO_PATHCONV=1 docker exec -e PGPASSWORD=migrator-pass "$postgres" \
  psql -h localhost -U mlsuite_migrator -d mlsuite -v ON_ERROR_STOP=1 -f /tmp/V1.sql >/dev/null
# Provisioning again changes nothing it should keep.
provision

result=$(docker exec "$postgres" psql -U mlsuite_admin -d mlsuite -Atc "
  SELECT
    (SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='model'),
    (SELECT rolsuper FROM pg_roles WHERE rolname='mlsuite_app'),
    (SELECT rolsuper FROM pg_roles WHERE rolname='mlsuite_migrator'),
    (SELECT rolsuper FROM pg_roles WHERE rolname='mlsuite_admin'),
    has_table_privilege('mlsuite_app','model','SELECT,INSERT,UPDATE,DELETE'),
    has_schema_privilege('mlsuite_app','public','CREATE');")
[[ "$result" == "mlsuite_migrator|f|f|t|t|f" ]] || { echo "unexpected role state: $result" >&2; exit 1; }
