#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd -P)
work=$(mktemp -d)
cleanup() { rm -rf -- "$work"; }
trap cleanup EXIT INT TERM

fake_docker="$work/docker"
calls="$work/docker.calls"
fake_bin="$work/fake-bin"
mkdir "$fake_bin"
cat > "$fake_bin/df" <<'EOF'
#!/usr/bin/env bash
printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\n'
printf 'fake %s 1 %s 1%% /fake\n' "${FAKE_HOST_TOTAL_KIB:-100000}" "${FAKE_HOST_AVAILABLE_KIB:-90000}"
EOF
cat > "$fake_bin/date" <<'EOF'
#!/usr/bin/env bash
printf '20260921T000000Z\n'
EOF
chmod +x "$fake_bin/df" "$fake_bin/date"
cat > "$fake_docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$FAKE_DOCKER_CALLS"
if [[ "${1:-}" == compose ]]; then
  for ((i=1; i<=$#; i++)); do
    arg=${!i}
    if [[ "$arg" == ps && "$*" == *' -q '* ]]; then printf 'fake-container'; exit 0; fi
    if [[ "$arg" == ps ]]; then printf '%s\n' postgres minio spring-app frontend; exit 0; fi
    if [[ "$arg" == exec ]]; then printf 'postgres-backup'; exit 0; fi
  done
  exit 0
fi
if [[ "${1:-}" == run ]]; then
  if [[ "$*" == *'du -sk /pg /minio'* ]]; then
    sleep "${FAKE_SIZE_SLEEP:-0}"
    printf '%s %s %s' "${FAKE_SOURCE_KIB:-1}" "${FAKE_DOCKER_AVAILABLE_KIB:-90000}" "${FAKE_DOCKER_TOTAL_KIB:-100000}"
    exit 0
  fi
  [[ "${FAKE_FAIL_RUN:-false}" != true ]] || exit 9
  printf 'minio-volume-backup'
fi
if [[ "${1:-}" == inspect ]]; then printf 'healthy'; fi
EOF
chmod +x "$fake_docker"

backup_root="$work/backups"
mkdir -p "$backup_root/production-20200101T000000Z" "$backup_root/production-20200102T000000Z"
env_file="$work/test.env"
cat > "$env_file" <<EOF
DB_ADMIN_USER=admin
DB_LEGACY_OWNER=legacy
DB_PROD=mlsuite
STORAGE_BUCKET=mlsuite
COMPOSE_PROJECT_NAME=mlsuite
LOCAL_BACKUP_ROOT=$backup_root
LOCAL_BACKUP_RETENTION_COUNT=2
LOCAL_BACKUP_MIN_FREE_PERCENT=0
RELEASE_COMPOSE=
EOF

export FAKE_DOCKER_CALLS="$calls"
export PATH="$fake_bin:$PATH"
destination=$(cd "$root" && ENV_FILE="$env_file" DOCKER_BIN="$fake_docker" \
  ./scripts/create-local-backup.sh --leave-app-stopped)
[[ -d "$destination" ]]
[[ -s "$destination/postgres.dump" && -s "$destination/minio-data.tar.gz" ]]
grep -Fxq 'mode=local-single-disk' "$destination/recovery.scope"
grep -Fxq 'physical_disk_failure_covered=false' "$destination/recovery.scope"
(cd "$destination" && sha256sum --check backup.manifest >/dev/null)
[[ $(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name 'production-*' | wc -l) -eq 2 ]]
[[ -f "$backup_root/.backup.lock" ]]
grep -q 'stop frontend spring-app' "$calls"
grep -q 'stop minio' "$calls"
if grep -q 'up -d --no-deps spring-app' "$calls"; then exit 1; fi

: > "$calls"
destination=$(cd "$root" && ENV_FILE="$env_file" DOCKER_BIN="$fake_docker" \
  ./scripts/create-local-backup.sh)
[[ -d "$destination" ]]
grep -q 'up -d --no-deps spring-app frontend' "$calls"

: > "$calls"
if (cd "$root" && FAKE_SOURCE_KIB=100 FAKE_HOST_AVAILABLE_KIB=249 ENV_FILE="$env_file" DOCKER_BIN="$fake_docker" \
  ./scripts/create-local-backup.sh >/dev/null 2>&1); then
  exit 1
fi
if grep -q 'stop frontend spring-app' "$calls"; then exit 1; fi

: > "$calls"
first_output="$work/first.out"
(cd "$root" && FAKE_SIZE_SLEEP=3 ENV_FILE="$env_file" DOCKER_BIN="$fake_docker" \
  ./scripts/create-local-backup.sh >"$first_output") &
first_pid=$!
sleep 1
if (cd "$root" && ENV_FILE="$env_file" DOCKER_BIN="$fake_docker" \
  ./scripts/create-local-backup.sh >/dev/null 2>"$work/concurrent.err"); then
  exit 1
fi
grep -q 'another local backup is running' "$work/concurrent.err"
wait "$first_pid"

: > "$calls"
if (cd "$root" && FAKE_FAIL_RUN=true ENV_FILE="$env_file" DOCKER_BIN="$fake_docker" \
  ./scripts/create-local-backup.sh >/dev/null 2>&1); then
  exit 1
fi
[[ -f "$backup_root/.backup.lock" ]]
if find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name '.partial-*' | grep -q .; then exit 1; fi
grep -q 'up -d minio minio-init' "$calls"
grep -q 'up -d --no-deps spring-app frontend' "$calls"

echo "Single-disk local backup contract verified."
