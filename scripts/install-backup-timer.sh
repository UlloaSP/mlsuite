#!/usr/bin/env bash
set -euo pipefail

[[ $# -ge 1 && $# -le 2 ]] || {
  echo "usage: sudo install-backup-timer.sh ENV_FILE [SERVICE_USER]" >&2; exit 2;
}
(( EUID == 0 )) || { echo "run this installer as root" >&2; exit 1; }
for command in docker install python3 runuser sed systemctl; do
  command -v "$command" >/dev/null || { echo "missing command: $command" >&2; exit 1; }
done

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
env_file=$(cd "$(dirname "$1")" && pwd -P)/$(basename "$1")
service_user=${2:-${SUDO_USER:-mlsuite}}
[[ -f "$env_file" ]] || { echo "environment file not found: $env_file" >&2; exit 1; }
[[ "$service_user" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo "invalid service user" >&2; exit 1; }
id "$service_user" >/dev/null 2>&1 || { echo "unknown service user: $service_user" >&2; exit 1; }
runuser -u "$service_user" -- docker info >/dev/null 2>&1 || {
  echo "$service_user cannot access Docker" >&2; exit 1;
}

release_compose=$(env_value RELEASE_COMPOSE "$env_file" || true)
require_release_compose "$release_compose" "$env_file"

shell_quote() { printf "'%s'" "${1//\'/\'\\\'\'}"; }
repo_quoted=$(shell_quote "$MLSUITE_ROOT")
env_quoted=$(shell_quote "$env_file")
wrapper=$(mktemp)
service=$(mktemp)
cleanup() { rm -f -- "$wrapper" "$service"; }
trap cleanup EXIT INT TERM
cat > "$wrapper" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd $repo_quoted
exec env ENV_FILE=$env_quoted ./scripts/create-local-backup.sh
EOF
sed "s/@@SERVICE_USER@@/$service_user/g" \
  "$MLSUITE_ROOT/deploy/systemd/mlsuite-backup.service" > "$service"
install -o root -g root -m 0755 "$wrapper" /usr/local/sbin/mlsuite-backup
install -o root -g root -m 0644 "$service" /etc/systemd/system/mlsuite-backup.service
install -o root -g root -m 0644 "$MLSUITE_ROOT/deploy/systemd/mlsuite-backup.timer" \
  /etc/systemd/system/mlsuite-backup.timer
systemctl daemon-reload
systemctl enable --now mlsuite-backup.timer
systemctl is-enabled --quiet mlsuite-backup.timer
systemctl is-active --quiet mlsuite-backup.timer
echo "Installed daily MLSuite backup timer for $service_user."
