#!/usr/bin/env bash
set -euo pipefail

[[ $# -ge 1 && $# -le 3 ]] || {
  echo "usage: verify-recovery-rto.sh START_EPOCH [END_EPOCH] [failed-smoke]" >&2; exit 2;
}

ENV_FILE=${ENV_FILE:-.env}
[[ -f "$ENV_FILE" ]] || { echo "environment file not found: $ENV_FILE" >&2; exit 1; }

env_value() {
  local line
  line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

start_epoch=$1
end_epoch=${2:-$(date -u +%s)}
result_mode=${3:-verify}
rto_minutes=$(env_value RECOVERY_RTO_MINUTES || true)
[[ "$start_epoch" =~ ^[0-9]+$ && "$end_epoch" =~ ^[0-9]+$ ]] || {
  echo "recovery timestamps must be epoch seconds" >&2; exit 1;
}
[[ "$rto_minutes" =~ ^[1-9][0-9]*$ ]] || {
  echo "RECOVERY_RTO_MINUTES must be a positive integer" >&2; exit 1;
}
(( end_epoch >= start_epoch )) || { echo "recovery end precedes its start" >&2; exit 1; }
[[ "$result_mode" == verify || "$result_mode" == failed-smoke ]] || {
  echo "recovery result mode must be failed-smoke when supplied" >&2; exit 1;
}

write_env() {
  local key=$1 value=$2 tmp
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
}

elapsed_seconds=$((end_epoch - start_epoch))
limit_seconds=$((rto_minutes * 60))
write_env RECOVERY_LAST_RESTORE_UTC "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
write_env RECOVERY_LAST_RTO_SECONDS "$elapsed_seconds"
if [[ "$result_mode" == failed-smoke ]]; then
  write_env RECOVERY_LAST_RESTORE_RESULT failed-smoke
  echo "restore rehearsal smoke tests failed after ${elapsed_seconds}s" >&2
  exit 1
fi
(( elapsed_seconds <= limit_seconds )) || {
  write_env RECOVERY_LAST_RESTORE_RESULT failed-rto
  echo "restore rehearsal took ${elapsed_seconds}s; RTO limit is ${limit_seconds}s" >&2; exit 1;
}
write_env RECOVERY_LAST_RESTORE_RESULT passed
printf '%s\n' "$elapsed_seconds"
