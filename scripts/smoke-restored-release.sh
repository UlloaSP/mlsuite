#!/usr/bin/env bash
set -euo pipefail

ACTION=${1:?usage: smoke-restored-release.sh start|stop STATE_FILE ENV_FILE RELEASE_COMPOSE [--baseline]}
STATE_FILE=${2:?restore state file is required}
ENV_FILE=${3:-.env}
RELEASE_COMPOSE=${4:-docker-compose.release.yml}
BASELINE=${5:-}

read_state() {
  sed -n "s/^${1}=//p" "$STATE_FILE" | tail -n 1
}

[[ -f "$STATE_FILE" ]] || { echo "restore state not found: $STATE_FILE" >&2; exit 1; }
api_container=$(read_state RESTORE_API_CONTAINER)
[[ "$api_container" =~ ^mlsuite-restore-api-[0-9]+-[0-9]+$ ]] || {
  echo "unsafe restore API container name: $api_container" >&2
  exit 1
}
smoke_project=${api_container/mlsuite-restore-api-/mlsuite-restore-smoke-}

[[ -f "$ENV_FILE" && -f "$RELEASE_COMPOSE" ]] || {
  echo "environment or release Compose file not found" >&2
  exit 1
}
python3 deploy/verify_release_images.py \
  --env-file "$ENV_FILE" --release-compose "$RELEASE_COMPOSE" >/dev/null
COMPOSE=(docker compose --project-name "$smoke_project" --env-file "$ENV_FILE" \
  -f docker-compose.yml -f docker-compose.prod.yml -f "$RELEASE_COMPOSE")
cleanup_smoke() {
  docker rm -f "$api_container" >/dev/null 2>&1 || true
  "${COMPOSE[@]}" down --remove-orphans >/dev/null 2>&1 || true
}

if [[ "$ACTION" == stop ]]; then
  cleanup_smoke
  echo "Isolated release smoke environment removed."
  exit 0
fi
[[ "$ACTION" == start ]] || { echo "action must be start or stop" >&2; exit 1; }
trap cleanup_smoke EXIT INT TERM

db_host=$(read_state RESTORE_DB_HOST)
db_port=$(read_state RESTORE_DB_PORT)
db_name=$(read_state RESTORE_DB_NAME)
db_user=$(read_state RESTORE_DB_USER)
db_pass=$(read_state RESTORE_DB_PASS)
storage_endpoint=$(read_state RESTORE_STORAGE_ENDPOINT)
storage_access=$(read_state RESTORE_STORAGE_ACCESS_KEY)
storage_secret=$(read_state RESTORE_STORAGE_SECRET_KEY)
storage_bucket=$(read_state RESTORE_STORAGE_BUCKET)
spring_port=$(sed -n 's/^SPRING_PORT=//p' "$ENV_FILE" | tail -n 1)
spring_port=${spring_port:-8080}
smoke_port=$(sed -n 's/^RESTORE_SMOKE_PORT=//p' "$ENV_FILE" | tail -n 1)
smoke_port=${smoke_port:-18080}
[[ "$db_port" =~ ^[0-9]+$ && "$spring_port" =~ ^[0-9]+$ && "$smoke_port" =~ ^[0-9]+$ ]] || {
  echo "restore ports must be numeric" >&2
  exit 1
}

DB_ENV=(-e DB_HOST="$db_host" -e DB_PORT="$db_port" -e DB_PROD="$db_name" \
  -e DB_USER="$db_user" -e DB_PASS="$db_pass")
baseline_env=()
if [[ "$BASELINE" == --baseline ]]; then
  baseline_env=(-e FLYWAY_BASELINE_ON_MIGRATE=true -e FLYWAY_BASELINE_VERSION=1)
fi

"${COMPOSE[@]}" run --rm --no-deps \
  "${DB_ENV[@]}" -e DB_MIGRATION_USER="$db_user" -e DB_MIGRATION_PASS="$db_pass" \
  "${baseline_env[@]}" db-migrate

STORAGE_ENV=(-e STORAGE_ENDPOINT="$storage_endpoint" -e STORAGE_ACCESS_KEY="$storage_access" \
  -e STORAGE_SECRET_KEY="$storage_secret" -e STORAGE_BUCKET="$storage_bucket" \
  -e STORAGE_AUTO_CREATE_BUCKET=false -e STORAGE_RETAIN_INLINE_COPY=true)
"${COMPOSE[@]}" run --rm --no-deps "${DB_ENV[@]}" "${STORAGE_ENV[@]}" \
  -e ARTIFACT_MIGRATION_COMMAND=migrate artifact-migrate
"${COMPOSE[@]}" run --rm --no-deps "${DB_ENV[@]}" "${STORAGE_ENV[@]}" \
  -e ARTIFACT_MIGRATION_COMMAND=verify artifact-migrate

"${COMPOSE[@]}" up -d --no-deps py-analyzer
docker rm -f "$api_container" >/dev/null 2>&1 || true
"${COMPOSE[@]}" run -d --no-deps --name "$api_container" \
  -p "127.0.0.1:${smoke_port}:${spring_port}" "${DB_ENV[@]}" "${STORAGE_ENV[@]}" \
  -e FLYWAY_ENABLED=false -e MODEL_MUTATIONS_REQUIRE_VERSION=true spring-app >/dev/null

for _ in $(seq 1 30); do
  if curl --fail --silent "http://127.0.0.1:${smoke_port}/actuator/health/readiness" >/dev/null; then
    trap - EXIT INT TERM
    echo "Restored release is ready at http://127.0.0.1:${smoke_port}"
    exit 0
  fi
  sleep 2
done
docker logs "$api_container" >&2 || true
echo "restored release did not become ready" >&2
exit 1
