#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd -P)
work=$(mktemp -d)
cleanup() { rm -rf -- "$work"; }
trap cleanup EXIT INT TERM
backup="$work/backups/production-test"
mkdir -p "$backup"
printf 'payload\n' > "$backup/postgres.dump"
printf 'bucket\n' > "$backup/storage.bucket"
printf 'archive\n' > "$backup/minio-data.tar.gz"
cat > "$work/test.env" <<EOF
LOCAL_BACKUP_ROOT=$work/backups
RECOVERY_RPO_MINUTES=60
EOF

write_scope() {
  cat > "$backup/recovery.scope" <<EOF
mode=local-single-disk
physical_disk_failure_covered=false
created_epoch=$1
EOF
  (cd "$backup" && sha256sum postgres.dump storage.bucket minio-data.tar.gz recovery.scope > backup.manifest)
}

write_scope "$(date -u +%s)"
ENV_FILE="$work/test.env" "$root/scripts/verify-backup-rpo.sh" >/dev/null

write_scope "$(( $(date -u +%s) - 3601 ))"
if ENV_FILE="$work/test.env" "$root/scripts/verify-backup-rpo.sh" >/dev/null 2>&1; then
  echo "stale backup unexpectedly satisfied RPO" >&2; exit 1
fi

write_scope "$(date -u +%s)"
printf 'corrupt\n' >> "$backup/postgres.dump"
if ENV_FILE="$work/test.env" "$root/scripts/verify-backup-rpo.sh" >/dev/null 2>&1; then
  echo "corrupt backup unexpectedly satisfied RPO" >&2; exit 1
fi
echo "Backup RPO verification contract verified."
