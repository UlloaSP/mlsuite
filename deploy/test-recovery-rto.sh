#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd -P)
work=$(mktemp -d)
cleanup() { rm -rf -- "$work"; }
trap cleanup EXIT INT TERM

cat > "$work/test.env" <<EOF
RECOVERY_RTO_MINUTES=8
EOF

elapsed=$(ENV_FILE="$work/test.env" bash "$root/scripts/verify-recovery-rto.sh" 1000 1479)
[[ "$elapsed" == 479 ]] || { echo "unexpected measured RTO: $elapsed" >&2; exit 1; }
grep -Fx "RECOVERY_LAST_RTO_SECONDS=479" "$work/test.env" >/dev/null
grep -Fx "RECOVERY_LAST_RESTORE_RESULT=passed" "$work/test.env" >/dev/null
grep -E '^RECOVERY_LAST_RESTORE_UTC=.+Z$' "$work/test.env" >/dev/null

if ENV_FILE="$work/test.env" bash "$root/scripts/verify-recovery-rto.sh" 1000 1481 >/dev/null 2>&1; then
  echo "restore exceeding RTO unexpectedly passed" >&2; exit 1
fi
grep -Fx "RECOVERY_LAST_RTO_SECONDS=481" "$work/test.env" >/dev/null
grep -Fx "RECOVERY_LAST_RESTORE_RESULT=failed-rto" "$work/test.env" >/dev/null
if ENV_FILE="$work/test.env" bash "$root/scripts/verify-recovery-rto.sh" \
  1000 1200 failed-smoke >/dev/null 2>&1; then
  echo "failed smoke test unexpectedly passed" >&2; exit 1
fi
grep -Fx "RECOVERY_LAST_RTO_SECONDS=200" "$work/test.env" >/dev/null
grep -Fx "RECOVERY_LAST_RESTORE_RESULT=failed-smoke" "$work/test.env" >/dev/null
if ENV_FILE="$work/test.env" bash "$root/scripts/verify-recovery-rto.sh" invalid 1480 >/dev/null 2>&1; then
  echo "invalid recovery timestamp unexpectedly passed" >&2; exit 1
fi
echo "Recovery RTO verification contract verified."
