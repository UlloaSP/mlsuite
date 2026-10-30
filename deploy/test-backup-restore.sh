#!/usr/bin/env bash
set -euo pipefail
umask 077

root=$(cd "$(dirname "$0")/.." && pwd -P)
source "$root/scripts/lib.sh"
if command -v cygpath >/dev/null 2>&1; then
  root=$(cygpath -m "$root")
  export MSYS_NO_PATHCONV=1
fi
suffix="$$-$RANDOM"
network="mlsuite-backup-test-$suffix"
postgres="mlsuite-backup-test-postgres-$suffix"
rustfs="mlsuite-backup-test-rustfs-$suffix"
rustfs_volume="mlsuite-backup-test-rustfs-$suffix"
work=$(mktemp -d)
if command -v cygpath >/dev/null 2>&1; then work=$(cygpath -m "$work"); fi
state="$work/restore.env"

cleanup() {
  [[ ! -f "$state" ]] || "$root/scripts/verify-production-backup.sh" --destroy "$state" >/dev/null 2>&1 || true
  docker rm -f "$postgres" "$rustfs" >/dev/null 2>&1 || true
  docker volume rm "$rustfs_volume" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf -- "$work"
}
trap cleanup EXIT INT TERM

docker network create "$network" >/dev/null
docker volume create "$rustfs_volume" >/dev/null
docker run -d --name "$postgres" --network "$network" \
  -e POSTGRES_DB=source -e POSTGRES_USER=source -e POSTGRES_PASSWORD=source-pass \
  "$POSTGRES_IMAGE" >/dev/null
docker run -d --name "$rustfs" --network "$network" \
  -e RUSTFS_ACCESS_KEY=source -e RUSTFS_SECRET_KEY=source-secret \
  -v "$rustfs_volume:/data" "$RUSTFS_IMAGE" >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$postgres" sh -c '[ "$(cat /proc/1/comm)" = postgres ]' >/dev/null 2>&1 \
    && docker exec "$postgres" pg_isready -U source -d source >/dev/null 2>&1 \
    && docker exec "$rustfs" curl -fs http://localhost:9000/health/ready >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$rustfs" curl -fs http://localhost:9000/health/ready >/dev/null
docker exec "$postgres" sh -c '[ "$(cat /proc/1/comm)" = postgres ]' >/dev/null
docker exec "$postgres" psql -U source -d source -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE recovery_probe (value text NOT NULL); INSERT INTO recovery_probe VALUES ('database-ok');" >/dev/null
docker exec "$postgres" pg_dump -U source -d source -Fc > "$work/postgres.dump"

source_alias="rc alias set source http://$rustfs:9000 source source-secret --bucket-lookup path >/dev/null"
docker run --rm --network "$network" \
  --entrypoint /bin/sh "$RC_IMAGE" -c "
    set -eu
    $source_alias
    rc bucket create source/mlsuite
    rc bucket version enable source/mlsuite
    printf object-v1 > /tmp/probe.txt
    printf deleted-version > /tmp/deleted.txt
    rc put /tmp/probe.txt source/mlsuite/probe.txt
    rc put /tmp/deleted.txt source/mlsuite/deleted.txt
    rc object remove source/mlsuite/deleted.txt
    printf object-v2 > /tmp/probe.txt
    rc put /tmp/probe.txt source/mlsuite/probe.txt
  " >/dev/null
source_version=$(docker run --rm --network "$network" --entrypoint /bin/sh \
  "$RC_IMAGE" -c \
  "$source_alias && rc object stat --json source/mlsuite/probe.txt" |
  sed -n 's/.*"version_id": *"\([^"]*\)".*/\1/p')
[[ -n "$source_version" ]]
docker stop "$rustfs" >/dev/null
docker run --rm -v "$rustfs_volume:/data:ro" "$POSTGRES_IMAGE" \
  tar -C /data -czf - . > "$work/rustfs-data.tar.gz"
printf 'mlsuite\n' > "$work/storage.bucket"
(cd "$work" && sha256sum postgres.dump rustfs-data.tar.gz storage.bucket > backup.manifest)

"$root/scripts/verify-production-backup.sh" "$work" --keep >/dev/null
restored_postgres=$(sed -n 's/^RESTORE_POSTGRES_CONTAINER=//p' "$state")
restored_rustfs=$(sed -n 's/^RESTORE_RUSTFS_CONTAINER=//p' "$state")
restore_network=$(sed -n 's/^RESTORE_NETWORK=//p' "$state")
[[ $(docker exec "$restored_postgres" psql -U restore -d restored -Atc 'SELECT value FROM recovery_probe') == database-ok ]]
target_alias="rc alias set target http://$restored_rustfs:9000 restore restore-secret --bucket-lookup path >/dev/null"
restored_stat=$(docker run --rm --network "$restore_network" --entrypoint /bin/sh \
  "$RC_IMAGE" -c \
  "$target_alias && rc object stat --json target/mlsuite/probe.txt")
restored_version=$(printf '%s' "$restored_stat" | sed -n 's/.*"version_id": *"\([^"]*\)".*/\1/p')
[[ "$restored_version" == "$source_version" ]]
[[ $(docker run --rm --network "$restore_network" --entrypoint /bin/sh \
  "$RC_IMAGE" -c \
  "$target_alias && rc object show target/mlsuite/probe.txt") == object-v2 ]]
docker run --rm --network "$restore_network" --entrypoint /bin/sh \
  "$RC_IMAGE" -c "
    set -eu
    $target_alias
    if rc object stat target/mlsuite/deleted.txt >/dev/null 2>&1; then exit 1; fi
    versions=\$(rc bucket version list target/mlsuite/deleted.txt)
    case \"\$versions\" in *deleted.txt*) ;; *) exit 1;; esac
  "

"$root/scripts/verify-production-backup.sh" --destroy "$state" >/dev/null
[[ ! -f "$state" ]]
echo "Non-empty PostgreSQL and RustFS backup restore verified."
