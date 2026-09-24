#!/usr/bin/env bash
set -euo pipefail
umask 077

read_state() {
  local key=$1 file=$2
  sed -n "s/^${key}=//p" "$file" | tail -n 1
}

require_restore_name() {
  [[ "$1" =~ ^mlsuite-restore-[a-z]+-[0-9]+-[0-9]+$ ]] || {
    echo "unsafe restore resource name: $1" >&2
    exit 1
  }
}

destroy_from_state() {
  local state_file=$1
  [[ -f "$state_file" ]] || { echo "restore state not found: $state_file" >&2; exit 1; }
  local api postgres minio postgres_volume minio_volume network
  api=$(read_state RESTORE_API_CONTAINER "$state_file")
  postgres=$(read_state RESTORE_POSTGRES_CONTAINER "$state_file")
  minio=$(read_state RESTORE_MINIO_CONTAINER "$state_file")
  postgres_volume=$(read_state RESTORE_POSTGRES_VOLUME "$state_file")
  minio_volume=$(read_state RESTORE_MINIO_VOLUME "$state_file")
  network=$(read_state RESTORE_NETWORK "$state_file")
  for resource in "$api" "$postgres" "$minio" "$postgres_volume" "$minio_volume" "$network"; do
    require_restore_name "$resource"
  done
  docker rm -f "$api" "$postgres" "$minio" >/dev/null 2>&1 || true
  docker volume rm "$postgres_volume" "$minio_volume" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -f -- "$state_file"
  echo "Isolated restore resources removed."
}

if [[ ${1:-} == "--destroy" ]]; then
  destroy_from_state "${2:?usage: verify-production-backup.sh --destroy STATE_FILE}"
  exit 0
fi

BACKUP_DIR=${1:?usage: verify-production-backup.sh BACKUP_DIR [--keep]}
KEEP_RESTORE=false
[[ ${2:-} == "--keep" ]] && KEEP_RESTORE=true
[[ -z ${2:-} || ${2:-} == "--keep" ]] || { echo "unknown option: ${2:-}" >&2; exit 1; }
BACKUP_DIR=$(cd "$BACKUP_DIR" && pwd -P)
if command -v cygpath >/dev/null 2>&1; then
  BACKUP_DIR=$(cygpath -m "$BACKUP_DIR")
  export MSYS_NO_PATHCONV=1
fi
[[ -s "$BACKUP_DIR/postgres.dump" ]] || { echo "missing postgres.dump" >&2; exit 1; }
[[ -s "$BACKUP_DIR/minio-data.tar.gz" ]] || { echo "missing MinIO volume backup" >&2; exit 1; }
[[ -s "$BACKUP_DIR/backup.manifest" && -s "$BACKUP_DIR/storage.bucket" ]] || { echo "missing backup manifest" >&2; exit 1; }
(cd "$BACKUP_DIR" && sha256sum --check backup.manifest)
storage_bucket=$(tr -d '\r\n' < "$BACKUP_DIR/storage.bucket")
[[ "$storage_bucket" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] || { echo "invalid storage.bucket" >&2; exit 1; }

suffix="$$-$RANDOM"
network="mlsuite-restore-network-$suffix"
postgres="mlsuite-restore-postgres-$suffix"
minio="mlsuite-restore-minio-$suffix"
api="mlsuite-restore-api-$suffix"
postgres_volume="mlsuite-restore-postgres-$suffix"
minio_volume="mlsuite-restore-minio-$suffix"
state_file="$BACKUP_DIR/restore.env"
[[ ! -e "$state_file" ]] || { echo "restore state already exists: $state_file" >&2; exit 1; }

cleanup() {
  docker rm -f "$api" "$postgres" "$minio" >/dev/null 2>&1 || true
  docker volume rm "$postgres_volume" "$minio_volume" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker network create "$network" >/dev/null
docker volume create "$postgres_volume" >/dev/null
docker volume create "$minio_volume" >/dev/null
docker run --rm -v "$minio_volume:/data" -v "$BACKUP_DIR:/backup:ro" postgres:18.6@sha256:5a5a84b19854a9ffaa54082c166ff4ec27473a361e496e5ea167f298f2da9722 \
  sh -c 'tar -C /data -xzf /backup/minio-data.tar.gz'
docker run -d --name "$postgres" --network "$network" -p 127.0.0.1::5432 \
  -e POSTGRES_DB=restored -e POSTGRES_USER=restore -e POSTGRES_PASSWORD=restore-pass \
  -e PGDATA=/var/lib/postgresql/data/pgdata \
  -v "$postgres_volume:/var/lib/postgresql/data" postgres:18.6@sha256:5a5a84b19854a9ffaa54082c166ff4ec27473a361e496e5ea167f298f2da9722 >/dev/null
docker run -d --name "$minio" --network "$network" -p 127.0.0.1::9000 \
  -e MINIO_ROOT_USER=restore -e MINIO_ROOT_PASSWORD=restore-secret \
  -v "$minio_volume:/data" quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z \
  server /data >/dev/null

for _ in $(seq 1 30); do
  docker exec "$postgres" pg_isready -U restore -d restored >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$postgres" pg_isready -U restore -d restored >/dev/null
docker cp "$BACKUP_DIR/postgres.dump" "$postgres:/tmp/postgres.dump"
docker exec "$postgres" pg_restore -U restore -d restored --no-owner --no-privileges /tmp/postgres.dump

docker run --rm --network "$network" \
  --entrypoint /bin/sh quay.io/minio/mc:RELEASE.2025-04-16T18-13-26Z -c "
    set -eu
    until mc alias set target http://$minio:9000 restore restore-secret >/dev/null 2>&1; do sleep 1; done
    mc ls target/$storage_bucket >/dev/null
    version_info=\$(mc version info target/$storage_bucket)
    case \"\$version_info\" in *[Ee]nabled*) ;; *) echo \"\$version_info\" >&2; exit 1;; esac
  "

if [[ "$KEEP_RESTORE" == true ]]; then
  db_port=$(docker port "$postgres" 5432/tcp | head -n 1); db_port=${db_port##*:}
  minio_port=$(docker port "$minio" 9000/tcp | head -n 1); minio_port=${minio_port##*:}
  cat > "$state_file" <<EOF
RESTORE_NETWORK=$network
RESTORE_POSTGRES_CONTAINER=$postgres
RESTORE_MINIO_CONTAINER=$minio
RESTORE_API_CONTAINER=$api
RESTORE_POSTGRES_VOLUME=$postgres_volume
RESTORE_MINIO_VOLUME=$minio_volume
RESTORE_DB_HOST=host.docker.internal
RESTORE_DB_PORT=$db_port
RESTORE_DB_NAME=restored
RESTORE_DB_USER=restore
RESTORE_DB_PASS=restore-pass
RESTORE_STORAGE_ENDPOINT=http://host.docker.internal:$minio_port
RESTORE_STORAGE_ACCESS_KEY=restore
RESTORE_STORAGE_SECRET_KEY=restore-secret
RESTORE_STORAGE_BUCKET=$storage_bucket
EOF
  trap - EXIT INT TERM
  echo "Isolated restore retained. State: $state_file"
else
  echo "Isolated PostgreSQL restore and versioned MinIO restore completed successfully."
fi
