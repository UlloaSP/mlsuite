#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd -P)
cd "$root"
ENV_FILE=${ENV_FILE:-.env}
[[ -f "$ENV_FILE" ]] || { echo "$ENV_FILE does not exist" >&2; exit 1; }

env_value() {
  local line
  line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

backup_root=$(env_value LOCAL_BACKUP_ROOT || true)
backup_root=${backup_root:-backups}
rpo_minutes=$(env_value RECOVERY_RPO_MINUTES || true)
[[ "$rpo_minutes" =~ ^[1-9][0-9]*$ ]] || {
  echo "RECOVERY_RPO_MINUTES must be a positive integer" >&2; exit 1;
}
[[ -d "$backup_root" ]] || { echo "backup root does not exist: $backup_root" >&2; exit 1; }
backup_root=$(cd "$backup_root" && pwd -P)

latest=$(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name 'production-*' \
  -printf '%T@ %p\n' | sort -nr | head -n1 | cut -d' ' -f2-)
[[ -n "$latest" ]] || { echo "no completed production backup exists" >&2; exit 1; }
[[ -s "$latest/backup.manifest" && -s "$latest/recovery.scope" ]] || {
  echo "latest backup is incomplete: $latest" >&2; exit 1;
}
grep -Eq ' [ *]recovery\.scope$' "$latest/backup.manifest" || {
  echo "latest backup manifest does not protect recovery.scope" >&2; exit 1;
}
(cd "$latest" && sha256sum --check backup.manifest >/dev/null)
created_epoch=$(sed -n 's/^created_epoch=//p' "$latest/recovery.scope" | tail -n1)
[[ "$created_epoch" =~ ^[0-9]+$ ]] || { echo "latest backup has no valid creation epoch" >&2; exit 1; }
now=$(date -u +%s)
age_seconds=$((now - created_epoch))
(( age_seconds >= 0 )) || { echo "latest backup timestamp is in the future" >&2; exit 1; }
(( age_seconds <= rpo_minutes * 60 )) || {
  echo "latest backup is ${age_seconds}s old and exceeds the ${rpo_minutes}m RPO" >&2; exit 1;
}
echo "Latest verified backup satisfies the ${rpo_minutes}-minute RPO: $latest"
