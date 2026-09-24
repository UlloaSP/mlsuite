#!/usr/bin/env bash
set -euo pipefail

[[ $# -ge 1 && $# -le 2 ]] || {
  echo "usage: sudo install-backup-timer.sh ENV_FILE [SERVICE_USER]" >&2; exit 2;
}
(( EUID == 0 )) || { echo "run this installer as root" >&2; exit 1; }
for command in docker install python3 runuser sed systemctl; do
  command -v "$command" >/dev/null || { echo "missing command: $command" >&2; exit 1; }
done

root=$(cd "$(dirname "$0")/.." && pwd -P)
env_file=$(cd "$(dirname "$1")" && pwd -P)/$(basename "$1")
service_user=${2:-${SUDO_USER:-mlsuite}}
[[ -f "$env_file" ]] || { echo "environment file not found: $env_file" >&2; exit 1; }
[[ "$service_user" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo "invalid service user" >&2; exit 1; }
id "$service_user" >/dev/null 2>&1 || { echo "unknown service user: $service_user" >&2; exit 1; }
runuser -u "$service_user" -- docker info >/dev/null 2>&1 || {
  echo "$service_user cannot access Docker" >&2; exit 1;
}

env_value() {
  local line
  line=$(grep -E "^${1}=" "$env_file" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}
release_compose=$(env_value RELEASE_COMPOSE || true)
[[ -n "$release_compose" && "$release_compose" != /* && "$release_compose" != *..* \
  && -f "$root/$release_compose" ]] || {
  echo "RELEASE_COMPOSE must select an existing repository-relative release" >&2; exit 1;
}
python3 "$root/deploy/verify_release_images.py" \
  --env-file "$env_file" --release-compose "$release_compose" >/dev/null

shell_quote() { printf "'%s'" "${1//\'/\'\\\'\'}"; }
repo_quoted=$(shell_quote "$root")
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
  "$root/deploy/systemd/mlsuite-backup.service" > "$service"
install -o root -g root -m 0755 "$wrapper" /usr/local/sbin/mlsuite-backup
install -o root -g root -m 0644 "$service" /etc/systemd/system/mlsuite-backup.service
install -o root -g root -m 0644 "$root/deploy/systemd/mlsuite-backup.timer" \
  /etc/systemd/system/mlsuite-backup.timer
systemctl daemon-reload
systemctl enable --now mlsuite-backup.timer
systemctl is-enabled --quiet mlsuite-backup.timer
systemctl is-active --quiet mlsuite-backup.timer
echo "Installed daily MLSuite backup timer for $service_user."
