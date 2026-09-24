#!/usr/bin/env bash
set -euo pipefail

(( EUID == 0 )) || { echo "run this test through sudo" >&2; exit 1; }
root=$(cd "$(dirname "$0")/.." && pwd -P)
work=$(mktemp -d)
cleanup() { rm -rf -- "$work"; }
trap cleanup EXIT INT TERM
fake_bin="$work/bin"
log="$work/commands.log"
mkdir -p "$fake_bin"

for command in docker install python3 runuser systemctl id; do
  cat > "$fake_bin/$command" <<'EOF'
#!/usr/bin/env bash
name=$(basename "$0")
printf '%s %s\n' "$name" "$*" >> "$INSTALL_LOG"
count_file="$INSTALL_COUNT_DIR/$name"
count=0
[[ -f "$count_file" ]] && count=$(<"$count_file")
count=$((count + 1))
printf '%s' "$count" > "$count_file"
if [[ -n "${FAIL_PATTERN:-}" && "$name $*" == *"$FAIL_PATTERN"* ]]; then
  exit 1
fi
if [[ -n "${FAIL_CALL:-}" && "$FAIL_CALL" == "$name:$count" ]]; then
  exit 1
fi
if [[ "$name" == install ]]; then
  source_file=${@: -2:1}
  destination=${@: -1}
  printf '\n--- %s ---\n' "$destination" >> "$INSTALL_CAPTURE"
  cat "$source_file" >> "$INSTALL_CAPTURE"
fi
exit 0
EOF
  chmod +x "$fake_bin/$command"
done

cat > "$work/test.env" <<EOF
RELEASE_COMPOSE=docker-compose.dev.yml
EOF

mkdir -p "$work/success-counts"
env PATH="$fake_bin:$PATH" INSTALL_LOG="$log" INSTALL_CAPTURE="$work/installed.txt" \
  INSTALL_COUNT_DIR="$work/success-counts" \
  bash "$root/scripts/install-backup-timer.sh" "$work/test.env" mlsuite_test >/dev/null

grep -F "install -o root -g root -m 0755" "$log" >/dev/null
grep -F "/usr/local/sbin/mlsuite-backup" "$log" >/dev/null
grep -F "/etc/systemd/system/mlsuite-backup.service" "$log" >/dev/null
grep -F "/etc/systemd/system/mlsuite-backup.timer" "$log" >/dev/null
grep -F "systemctl daemon-reload" "$log" >/dev/null
grep -F "systemctl enable --now mlsuite-backup.timer" "$log" >/dev/null
grep -F "systemctl is-enabled --quiet mlsuite-backup.timer" "$log" >/dev/null
grep -F "systemctl is-active --quiet mlsuite-backup.timer" "$log" >/dev/null
grep -F "User=mlsuite_test" "$work/installed.txt" >/dev/null
grep -F "ENV_FILE='$work/test.env'" "$work/installed.txt" >/dev/null

if env PATH="$fake_bin:$PATH" INSTALL_LOG="$log" INSTALL_CAPTURE="$work/installed.txt" \
  INSTALL_COUNT_DIR="$work/success-counts" \
  bash "$root/scripts/install-backup-timer.sh" "$work/test.env" 'Bad User!' >/dev/null 2>&1; then
  echo "invalid service user unexpectedly passed" >&2; exit 1
fi

expect_failure() {
  local pattern=$1 env_file=${2:-$work/test.env} fail_call=${3:-}
  local count_dir
  count_dir=$(mktemp -d "$work/counts.XXXXXX")
  if env PATH="$fake_bin:$PATH" INSTALL_LOG="$log" INSTALL_CAPTURE="$work/installed.txt" \
    INSTALL_COUNT_DIR="$count_dir" FAIL_PATTERN="$pattern" FAIL_CALL="$fail_call" \
    bash "$root/scripts/install-backup-timer.sh" \
    "$env_file" mlsuite_test >/dev/null 2>&1; then
    echo "installer unexpectedly passed while failing: ${fail_call:-$pattern}" >&2; exit 1
  fi
}

if bash "$root/scripts/install-backup-timer.sh" >/dev/null 2>&1; then
  echo "installer without arguments unexpectedly passed" >&2; exit 1
fi
if bash "$root/scripts/install-backup-timer.sh" "$work/missing.env" mlsuite_test >/dev/null 2>&1; then
  echo "installer with missing environment unexpectedly passed" >&2; exit 1
fi
mkdir -p "$work/empty-path"
if env PATH="$work/empty-path" /usr/bin/bash "$root/scripts/install-backup-timer.sh" \
  "$work/test.env" mlsuite_test >/dev/null 2>&1; then
  echo "installer with missing commands unexpectedly passed" >&2; exit 1
fi
expect_failure "id mlsuite_test"
expect_failure "runuser -u mlsuite_test"
expect_failure "python3 "
expect_failure "" "$work/test.env" "install:1"
expect_failure "" "$work/test.env" "install:2"
expect_failure "" "$work/test.env" "install:3"
expect_failure "systemctl daemon-reload"
expect_failure "systemctl enable --now"
expect_failure "systemctl is-enabled --quiet"
expect_failure "systemctl is-active --quiet"

cat > "$work/invalid-release.env" <<EOF
RELEASE_COMPOSE=missing-release.yml
EOF
expect_failure "never-matches" "$work/invalid-release.env"

if [[ -x /usr/sbin/runuser ]] && /usr/sbin/runuser -u nobody -- \
  bash "$root/scripts/install-backup-timer.sh" "$work/test.env" mlsuite_test >/dev/null 2>&1; then
  echo "non-root installer unexpectedly passed" >&2; exit 1
fi
echo "Backup timer installer contract verified."
