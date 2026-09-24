#!/usr/bin/env bash
set -euo pipefail
umask 077

root=$(cd "$(dirname "$0")/.." && pwd -P)
if command -v cygpath >/dev/null 2>&1; then
  root=$(cygpath -m "$root")
  export MSYS_NO_PATHCONV=1
fi
suffix="$$-$RANDOM"
network="mlsuite-backup-test-$suffix"
postgres="mlsuite-backup-test-postgres-$suffix"
minio="mlsuite-backup-test-minio-$suffix"
minio_volume="mlsuite-backup-test-minio-$suffix"
work=$(mktemp -d)
if command -v cygpath >/dev/null 2>&1; then work=$(cygpath -m "$work"); fi
state="$work/restore.env"

cleanup() {
  [[ ! -f "$state" ]] || "$root/scripts/verify-production-backup.sh" --destroy "$state" >/dev/null 2>&1 || true
  docker rm -f "$postgres" "$minio" >/dev/null 2>&1 || true
  docker volume rm "$minio_volume" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf -- "$work"
}
trap cleanup EXIT INT TERM

docker network create "$network" >/dev/null
docker volume create "$minio_volume" >/dev/null
docker run -d --name "$postgres" --network "$network" \
  -e POSTGRES_DB=source -e POSTGRES_USER=source -e POSTGRES_PASSWORD=source-pass \
  postgres:18.6@sha256:5a5a84b19854a9ffaa54082c166ff4ec27473a361e496e5ea167f298f2da9722 >/dev/null
docker run -d --name "$minio" --network "$network" \
  -e MINIO_ROOT_USER=source -e MINIO_ROOT_PASSWORD=source-secret \
  -v "$minio_volume:/data" ghcr.io/teableio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e server /data >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$postgres" sh -c '[ "$(cat /proc/1/comm)" = postgres ]' >/dev/null 2>&1 \
    && docker exec "$postgres" pg_isready -U source -d source >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$postgres" sh -c '[ "$(cat /proc/1/comm)" = postgres ]' >/dev/null
docker exec "$postgres" psql -U source -d source -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE recovery_probe (value text NOT NULL); INSERT INTO recovery_probe VALUES ('database-ok');" >/dev/null
docker exec "$postgres" pg_dump -U source -d source -Fc > "$work/postgres.dump"

printf 'object-v1' > "$work/probe.txt"
printf 'deleted-version' > "$work/deleted.txt"
docker run --rm --network "$network" -v "$work:/work" \
  --entrypoint /bin/sh ghcr.io/teableio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e -c "
    set -eu
    until mc alias set source http://$minio:9000 source source-secret >/dev/null 2>&1; do sleep 1; done
    mc mb source/mlsuite
    mc version enable source/mlsuite
    mc cp /work/probe.txt source/mlsuite/probe.txt
    mc cp /work/deleted.txt source/mlsuite/deleted.txt
    mc rm source/mlsuite/deleted.txt
  " >/dev/null
printf 'object-v2' > "$work/probe.txt"
docker run --rm --network "$network" -v "$work:/work" \
  --entrypoint /bin/sh ghcr.io/teableio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e -c "
    set -eu
    mc alias set source http://$minio:9000 source source-secret >/dev/null
    mc cp /work/probe.txt source/mlsuite/probe.txt
  " >/dev/null
source_version=$(docker run --rm --network "$network" --entrypoint /bin/sh \
  ghcr.io/teableio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e -c \
  "mc alias set source http://$minio:9000 source source-secret >/dev/null && mc stat --json source/mlsuite/probe.txt" |
  sed -n 's/.*"versionID":"\([^"]*\)".*/\1/p')
[[ -n "$source_version" ]]
docker stop "$minio" >/dev/null
docker run --rm -v "$minio_volume:/data:ro" postgres:18.6@sha256:5a5a84b19854a9ffaa54082c166ff4ec27473a361e496e5ea167f298f2da9722 \
  tar -C /data -czf - . > "$work/minio-data.tar.gz"
printf 'mlsuite\n' > "$work/storage.bucket"
(cd "$work" && sha256sum postgres.dump minio-data.tar.gz storage.bucket > backup.manifest)

"$root/scripts/verify-production-backup.sh" "$work" --keep >/dev/null
restored_postgres=$(sed -n 's/^RESTORE_POSTGRES_CONTAINER=//p' "$state")
restored_minio=$(sed -n 's/^RESTORE_MINIO_CONTAINER=//p' "$state")
restore_network=$(sed -n 's/^RESTORE_NETWORK=//p' "$state")
[[ $(docker exec "$restored_postgres" psql -U restore -d restored -Atc 'SELECT value FROM recovery_probe') == database-ok ]]
restored_stat=$(docker run --rm --network "$restore_network" --entrypoint /bin/sh \
  ghcr.io/teableio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e -c \
  "mc alias set target http://$restored_minio:9000 restore restore-secret >/dev/null && mc stat --json target/mlsuite/probe.txt")
restored_version=$(printf '%s' "$restored_stat" | sed -n 's/.*"versionID":"\([^"]*\)".*/\1/p')
[[ "$restored_version" == "$source_version" ]]
[[ $(docker run --rm --network "$restore_network" --entrypoint /bin/sh \
  ghcr.io/teableio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e -c \
  "mc alias set target http://$restored_minio:9000 restore restore-secret >/dev/null && mc cat target/mlsuite/probe.txt") == object-v2 ]]
docker run --rm --network "$restore_network" --entrypoint /bin/sh \
  ghcr.io/teableio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e -c "
    set -eu
    mc alias set target http://$restored_minio:9000 restore restore-secret >/dev/null
    if mc stat target/mlsuite/deleted.txt >/dev/null 2>&1; then exit 1; fi
    versions=\$(mc ls --versions target/mlsuite/deleted.txt)
    case \"\$versions\" in *deleted.txt*) ;; *) exit 1;; esac
  "

"$root/scripts/verify-production-backup.sh" --destroy "$state" >/dev/null
[[ ! -f "$state" ]]
echo "Non-empty PostgreSQL and MinIO backup restore verified."
