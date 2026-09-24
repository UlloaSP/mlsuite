#!/usr/bin/env bash
set -euo pipefail
umask 077

root=$(cd "$(dirname "$0")/.." && pwd -P)
cd "$root"

ENV_FILE=${ENV_FILE:-.env}
DOCKER_BIN=${DOCKER_BIN:-docker}
leave_app_stopped=false
[[ "${1:-}" != --leave-app-stopped ]] || leave_app_stopped=true
[[ $# -le 1 ]] || { echo "usage: create-local-backup.sh [--leave-app-stopped]" >&2; exit 2; }
[[ -f "$ENV_FILE" ]] || { echo "$ENV_FILE does not exist" >&2; exit 1; }
for command in "$DOCKER_BIN" awk df find flock mv sha256sum sort; do
  command -v "$command" >/dev/null || { echo "missing command: $command" >&2; exit 1; }
done

env_value() {
  local line
  line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

backup_root=$(env_value LOCAL_BACKUP_ROOT || true)
backup_root=${backup_root:-backups}
retention=$(env_value LOCAL_BACKUP_RETENTION_COUNT || true)
retention=${retention:-7}
minimum_free=$(env_value LOCAL_BACKUP_MIN_FREE_PERCENT || true)
minimum_free=${minimum_free:-15}
[[ "$retention" =~ ^[0-9]+$ && "$retention" -ge 2 ]] || { echo "LOCAL_BACKUP_RETENTION_COUNT must be at least 2" >&2; exit 1; }
[[ "$minimum_free" =~ ^[0-9]+$ && "$minimum_free" -le 100 ]] || { echo "LOCAL_BACKUP_MIN_FREE_PERCENT must be between 0 and 100" >&2; exit 1; }

mkdir -p "$backup_root"
backup_root=$(cd "$backup_root" && pwd -P)
[[ "$backup_root" != / && "$backup_root" != "$root" ]] || { echo "unsafe LOCAL_BACKUP_ROOT: $backup_root" >&2; exit 1; }
chmod 700 "$backup_root"

compose=("$DOCKER_BIN" compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.prod.yml)
release_compose=$(env_value RELEASE_COMPOSE || true)
[[ -n "$release_compose" && "$release_compose" != /* && "$release_compose" != *..* && -f "$release_compose" ]] || {
  echo "RELEASE_COMPOSE must be an existing digest-pinned repository-relative path" >&2; exit 1;
}
compose+=(-f "$release_compose")
python3 deploy/verify_release_images.py --docker-bin "$DOCKER_BIN" \
  --env-file "$ENV_FILE" --release-compose "$release_compose" >/dev/null
"${compose[@]}" config --quiet

running=$("${compose[@]}" ps --status running --services 2>/dev/null || true)
lock="$backup_root/.backup.lock"
exec 9>"$lock"
flock -n 9 || { echo "another local backup is running" >&2; exit 1; }
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
created_epoch=$(date -u +%s)
partial="$backup_root/.partial-$timestamp-$$"
destination="$backup_root/production-$timestamp-$$"
[[ ! -e "$destination" ]] || { echo "backup destination already exists: $destination" >&2; exit 1; }
mkdir "$partial"

was_running() { grep -Fxq "$1" <<<"$running"; }
minio_stopped=false
apps_restored=false
restore_apps() {
  $leave_app_stopped && return 0
  services=()
  was_running spring-app && services+=(spring-app)
  was_running frontend && services+=(frontend)
  (( ${#services[@]} == 0 )) && { apps_restored=true; return 0; }
  "${compose[@]}" up -d --no-deps "${services[@]}" >/dev/null
  for service in "${services[@]}"; do
    container_id=$("${compose[@]}" ps -q "$service")
    [[ -n "$container_id" ]] || { echo "failed to restart $service" >&2; return 1; }
    ready=false
    for _ in $(seq 1 30); do
      state=$("$DOCKER_BIN" inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
      [[ "$state" != unhealthy && "$state" != exited && "$state" != dead ]] || break
      if [[ "$state" == healthy || "$state" == running ]]; then ready=true; break; fi
      sleep 2
    done
    $ready || { echo "$service did not return to a healthy/running state" >&2; return 1; }
  done
  apps_restored=true
}
cleanup() {
  status=$?
  trap - EXIT INT TERM
  if $minio_stopped && ! "${compose[@]}" up -d minio minio-init >/dev/null 2>&1; then
    echo "CRITICAL: MinIO could not be restarted" >&2
    status=1
  fi
  if ! $leave_app_stopped && ! $apps_restored && ! restore_apps; then
    echo "CRITICAL: application services could not be restored" >&2
    status=1
  fi
  if (( status != 0 )); then rm -rf -- "$partial"; fi
  exit "$status"
}
trap cleanup EXIT INT TERM

prune_backups() {
  local limit=$1 remove_count candidate i
  mapfile -t backups < <(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name 'production-*' -print | sort)
  remove_count=$(( ${#backups[@]} - limit ))
  for ((i = 0; i < remove_count; i++)); do
    candidate=${backups[$i]}
    [[ "$(cd "$(dirname "$candidate")" && pwd -P)" == "$backup_root" && "$(basename "$candidate")" == production-* ]] || {
      echo "refusing unsafe retention target: $candidate" >&2; return 1;
    }
    rm -rf -- "$candidate"
  done
}

project=$(env_value COMPOSE_PROJECT_NAME || true)
project=${project:-mlsuite}
bucket=$(env_value STORAGE_BUCKET)
[[ "$bucket" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] || { echo "invalid STORAGE_BUCKET" >&2; exit 1; }
pg_volume="${project}_pg_data"
minio_volume="${project}_minio_data"
"$DOCKER_BIN" volume inspect "$pg_volume" "$minio_volume" >/dev/null

# Keep one slot free before writing. On the only disk, reserve 125% of live data
# for the backup and another 125% for the mandatory isolated restore rehearsal.
prune_backups "$((retention - 1))"
# The single-quoted program must expand inside the measurement container.
# shellcheck disable=SC2016
volume_stats=$(MSYS_NO_PATHCONV=1 "$DOCKER_BIN" run --rm \
  -v "$pg_volume:/pg:ro" -v "$minio_volume:/minio:ro" postgres:18.6@sha256:5a5a84b19854a9ffaa54082c166ff4ec27473a361e496e5ea167f298f2da9722 \
  sh -c '
    source_kib=$(du -sk /pg /minio | awk "{total += \$1} END {print total}")
    pg_total=$(df -Pk /pg | awk "NR==2 {print \$2}")
    pg_available=$(df -Pk /pg | awk "NR==2 {print \$4}")
    minio_total=$(df -Pk /minio | awk "NR==2 {print \$2}")
    minio_available=$(df -Pk /minio | awk "NR==2 {print \$4}")
    [ "$pg_available" -le "$minio_available" ] || pg_available=$minio_available
    [ "$pg_total" -le "$minio_total" ] || pg_total=$minio_total
    printf "%s %s %s\n" "$source_kib" "$pg_available" "$pg_total"
  ')
read -r source_kib docker_available_kib docker_total_kib <<<"$volume_stats"
[[ "$source_kib" =~ ^[0-9]+$ && "$docker_available_kib" =~ ^[0-9]+$ && "$docker_total_kib" =~ ^[0-9]+$ ]] || {
  echo "could not measure durable data and Docker volume capacity" >&2; exit 1;
}
read -r total_kib available_kib < <(df -Pk "$backup_root" | awk 'NR==2 {print $2, $4}')
reserve_kib=$(( (total_kib * minimum_free + 99) / 100 ))
backup_estimate_kib=$(( (source_kib * 125 + 99) / 100 ))
restore_estimate_kib=$backup_estimate_kib
required_kib=$((reserve_kib + backup_estimate_kib + restore_estimate_kib))
if (( available_kib < required_kib )); then
  echo "insufficient backup-disk space: ${available_kib} KiB available, ${required_kib} KiB required for backup, restore rehearsal and reserve" >&2
  exit 1
fi
docker_reserve_kib=$(( (docker_total_kib * minimum_free + 99) / 100 ))
docker_required_kib=$((docker_reserve_kib + restore_estimate_kib))
if (( docker_available_kib < docker_required_kib )); then
  echo "insufficient Docker-volume space: ${docker_available_kib} KiB available, ${docker_required_kib} KiB required for restore rehearsal and reserve" >&2
  exit 1
fi

echo "Stopping application writes for a coordinated local backup." >&2
"${compose[@]}" stop frontend spring-app >/dev/null
"${compose[@]}" up -d postgres minio >/dev/null

db_user=$(env_value DB_ADMIN_USER)
legacy_user=$(env_value DB_LEGACY_OWNER)
db_name=$(env_value DB_PROD)
if ! "${compose[@]}" exec -T postgres pg_dump -U "$db_user" -d "$db_name" -Fc > "$partial/postgres.dump"; then
  "${compose[@]}" exec -T postgres pg_dump -U "$legacy_user" -d "$db_name" -Fc > "$partial/postgres.dump"
fi
[[ -s "$partial/postgres.dump" ]] || { echo "PostgreSQL backup is empty" >&2; exit 1; }

"${compose[@]}" stop minio >/dev/null
minio_stopped=true
MSYS_NO_PATHCONV=1 "$DOCKER_BIN" run --rm -v "$minio_volume:/data:ro" postgres:18.6@sha256:5a5a84b19854a9ffaa54082c166ff4ec27473a361e496e5ea167f298f2da9722 \
  tar -C /data -czf - . > "$partial/minio-data.tar.gz"
[[ -s "$partial/minio-data.tar.gz" ]] || { echo "MinIO backup is empty" >&2; exit 1; }
printf '%s\n' "$bucket" > "$partial/storage.bucket"
cat > "$partial/recovery.scope" <<EOF
mode=local-single-disk
physical_disk_failure_covered=false
created_utc=$timestamp
created_epoch=$created_epoch
EOF
(cd "$partial" && sha256sum postgres.dump minio-data.tar.gz storage.bucket recovery.scope > backup.manifest)
(cd "$partial" && sha256sum --check backup.manifest >/dev/null)
"${compose[@]}" up -d minio minio-init >/dev/null
minio_stopped=false
mv -T "$partial" "$destination"

prune_backups "$retention"

used_percent=$(df -P "$backup_root" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')
free_percent=$((100 - used_percent))
if (( free_percent < minimum_free )); then
  echo "backup created, but only ${free_percent}% disk space remains; required ${minimum_free}%" >&2
  exit 1
fi

restore_apps
echo "Local backup created at $destination; physical disk failure is not covered." >&2
printf '%s\n' "$destination"
