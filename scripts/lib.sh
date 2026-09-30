# Shared helpers for the operational scripts. Source it; do not execute it.
# The scripts run from the repository checkout (the backup timer wrapper cds
# into it), so this file is always found next to its caller.

MLSUITE_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)

# Keep these pins identical to docker-compose.yml; deploy/test_compose_parity.py checks them.
POSTGRES_IMAGE=postgres:18.6@sha256:5a5a84b19854a9ffaa54082c166ff4ec27473a361e496e5ea167f298f2da9722
MINIO_IMAGE=ghcr.io/teableio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e

# env_value KEY [FILE] — last value of KEY in FILE (default $ENV_FILE); fails when unset.
env_value() {
  local file=${2:-$ENV_FILE} line
  [[ -f "$file" ]] || return 1
  line=$(grep -E "^${1}=" "$file" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

# read_state KEY FILE — like env_value, but an unset key reads as empty.
read_state() {
  env_value "$1" "$2" || true
}

# write_env KEY VALUE [FILE] — replace or append KEY=VALUE in FILE (default $ENV_FILE).
write_env() {
  local key=$1 value=$2 file=${3:-$ENV_FILE} tmp
  touch "$file"
  tmp=$(mktemp)
  grep -vE "^${key}=" "$file" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$file"
}

# require_release_compose PATH ENV_FILE [DOCKER_BIN] — PATH must be an existing
# repository-relative override that pins every application image by digest.
require_release_compose() {
  local release=$1 env_file=$2 docker_bin=${3:-docker}
  [[ -n "$release" && "$release" != /* && "$release" != *..* && -f "$MLSUITE_ROOT/$release" ]] || {
    echo "RELEASE_COMPOSE must be an existing digest-pinned repository-relative path" >&2
    return 1
  }
  python3 "$MLSUITE_ROOT/deploy/verify_release_images.py" --docker-bin "$docker_bin" \
    --env-file "$env_file" --release-compose "$release" >/dev/null
}
