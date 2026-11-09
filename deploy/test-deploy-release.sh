#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd -P)
work=$(mktemp -d)
cleanup() {
  local status=$?
  (( status == 0 )) || cat "$work/out" 2>/dev/null || true
  rm -rf -- "$work"
}
trap cleanup EXIT INT TERM

real_python=$(command -v python3 || command -v python)
fake_bin="$work/fake-bin"
mkdir "$fake_bin"
export REAL_PYTHON=$real_python FAKE_CALLS="$work/calls"

# Publication and the registry are out of reach here; everything else runs for real.
cat > "$fake_bin/python3" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == deploy/fetch_release.py ]]; then
  [[ "$3" != "${FAKE_UNPUBLISHED:-}" ]] || { echo "not published" >&2; exit 1; }
  mkdir -p "$(dirname "$5")"
  printf '# %s\nservices: {}\n' "$3" > "$5"
  exit 0
fi
exec "$REAL_PYTHON" "$@"
EOF
cat > "$fake_bin/docker" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == *'config --format json'* ]]; then
  digest=sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
  printf '{"services":{'
  for service in artifact-prune db-migrate spring-app; do
    printf '"%s":{"image":"ghcr.io/example/mlsuite-api@%s"},' "$service" "$digest"
  done
  for service in py-analyzer runtime-builder; do
    printf '"%s":{"image":"ghcr.io/example/mlsuite-sklearn-backend@%s"},' "$service" "$digest"
  done
  printf '"frontend":{"image":"ghcr.io/example/mlsuite-frontend@%s"},' "$digest"
  printf '"ops-agent":{"image":"ghcr.io/example/mlsuite-ops-agent@%s"}}}' "$digest"
  exit 0
fi
# FAKE_HOST: running (the default), stopped (data but nothing running) or empty.
case "$*" in
  'ps --quiet '*) [[ "${FAKE_HOST:-running}" != running ]] || echo 0123456789ab; exit 0 ;;
  'volume inspect '*) [[ "${FAKE_HOST:-running}" != empty ]]; exit ;;
esac
printf '%s\n' "$*" >> "$FAKE_CALLS"
[[ "$*" != *' pull '* || "${FAKE_FAIL_PULL:-}" != true ]]
EOF
# Ready unless the release Compose names a commit that never becomes ready.
cat > "$fake_bin/curl" <<'EOF'
#!/usr/bin/env bash
for commit in ${FAKE_NEVER_READY:-}; do
  if grep -q "$commit" docker-compose.release.yml; then printf '{"ready":false}'; exit 0; fi
done
printf '{"ready":true}'
EOF
chmod +x "$fake_bin"/*
export PATH="$fake_bin:$PATH" DEPLOY_READY_ATTEMPTS=2 DEPLOY_READY_DELAY_SECONDS=0 DEPLOY_RELEASE_WAIT_MINUTES=0

new_checkout() {
  local repo=$1 name value
  mkdir -p "$repo/.github"
  cp -R "$root/scripts" "$root/deploy" "$repo/"
  cp -R "$root/.github/scripts" "$repo/.github/"
  cp "$root"/docker-compose.yml "$root"/docker-compose.prod.yml "$repo/"
  printf '.env\n.releases/\ndocker-compose.release.yml\n' > "$repo/.gitignore"
  # Its own test is deploy/test-local-backup.sh; here it records what it ran on.
  cat > "$repo/scripts/create-local-backup.sh" <<'EOF'
#!/usr/bin/env bash
printf 'backup on %s %s\n' "$(git log -1 --format=%s)" "$(head -n 1 docker-compose.release.yml)" >> "$FAKE_CALLS"
[[ "${FAKE_FAIL_BACKUP:-}" != true ]] || exit 1
printf 'backups/production-test\n'
EOF
  git -C "$repo" init --quiet --initial-branch=main
  git -C "$repo" add -A
  git -C "$repo" -c user.name=test -c user.email=test@example.com commit --quiet -m previous
  git -C "$repo" tag previous
  # Rolling back then replaces the script while it runs, as a real release may.
  sed -i '2i # The new release moves every line of this script.' "$repo/scripts/deploy-release.sh"
  git -C "$repo" -c user.name=test -c user.email=test@example.com commit --quiet -am new
  git -C "$repo" tag new

  "$real_python" - "$root" > "$repo/.env" <<'EOF'
import re, sys
from pathlib import Path
names = set()
for name in ("docker-compose.yml", "docker-compose.prod.yml"):
    names.update(re.findall(r"\$\{([A-Z][A-Z0-9_]*)\}", (Path(sys.argv[1]) / name).read_text()))
for name in sorted(names):
    print(f"{name}={'x' * 32}")
EOF
  # The Compose project names the volumes the deployment backs up, so it keeps a real name.
  sed -i '/^WEB_PORT=/d; /^RELEASE_COMPOSE=/d; /^COMPOSE_PROJECT_NAME=/d' "$repo/.env"
  printf 'WEB_PORT=5173\nRELEASE_COMPOSE=docker-compose.release.yml\nCOMPOSE_PROJECT_NAME=mlsuite\n' >> "$repo/.env"
  printf '# running\n' > "$repo/docker-compose.release.yml"
  : > "$FAKE_CALLS"
}

deploy() {
  local repo=$1
  bash "$repo/scripts/deploy-release.sh" "$(git -C "$repo" rev-parse new)" "$(git -C "$repo" rev-parse previous)"
}

# `! command` never stops a script under `set -e`.
expect_no_call() {
  if grep -q "$1" "$FAKE_CALLS"; then
    echo "unexpected docker call: $1" >&2
    return 1
  fi
}

expect_untouched() {
  local repo=$1 output=$2
  [[ "$(git -C "$repo" rev-parse HEAD)" == "$(git -C "$repo" rev-parse main~0)" ]]
  [[ "$(git -C "$repo" log -1 --format=%s)" == previous ]]
  grep -qx '# running' "$repo/docker-compose.release.yml"
  expect_no_call ' up '
  grep -q 'Nothing was deployed' "$output"
}

repo="$work/ready"; new_checkout "$repo"
deploy "$repo" > "$work/out" 2>&1
[[ "$(git -C "$repo" log -1 --format=%s)" == new ]]
grep -q "$(git -C "$repo" rev-parse HEAD)" "$repo/docker-compose.release.yml"
[[ "$(grep -c ' up -d' "$FAKE_CALLS")" == 1 ]]
grep -q 'fallback.yml pull --quiet' "$FAKE_CALLS"
grep -q 'candidate.yml pull --quiet' "$FAKE_CALLS"
# The backup comes after every image is here, before anything changes, on what is running.
grep -q "backup on previous # $(git -C "$repo" rev-parse previous)" "$FAKE_CALLS"
[[ "$(grep -n ' pull ' "$FAKE_CALLS" | tail -n 1 | cut -d: -f1)" -lt "$(grep -n '^backup on' "$FAKE_CALLS" | cut -d: -f1)" ]]
[[ "$(grep -n '^backup on' "$FAKE_CALLS" | cut -d: -f1)" -lt "$(grep -n ' up -d' "$FAKE_CALLS" | cut -d: -f1)" ]]

repo="$work/env"; new_checkout "$repo"
sed -i '/^DB_PASS=/d' "$repo/.env"
if deploy "$repo" > "$work/out" 2>&1; then exit 1; fi
grep -q 'DB_PASS is not set' "$work/out"
expect_untouched "$repo" "$work/out"
expect_no_call ' pull '
expect_no_call '^backup on'

repo="$work/not-merged"; new_checkout "$repo"
git -C "$repo" reset --quiet --hard previous
if deploy "$repo" > "$work/out" 2>&1; then exit 1; fi
grep -q 'Nothing was deployed: this checkout is not at' "$work/out"
[[ ! -s "$FAKE_CALLS" ]]

repo="$work/unpublished"; new_checkout "$repo"
if FAKE_UNPUBLISHED=$(git -C "$repo" rev-parse new) deploy "$repo" > "$work/out" 2>&1; then exit 1; fi
expect_untouched "$repo" "$work/out"

repo="$work/pull"; new_checkout "$repo"
if FAKE_FAIL_PULL=true deploy "$repo" > "$work/out" 2>&1; then exit 1; fi
expect_untouched "$repo" "$work/out"

repo="$work/backup"; new_checkout "$repo"
if FAKE_FAIL_BACKUP=true deploy "$repo" > "$work/out" 2>&1; then exit 1; fi
[[ "$(git -C "$repo" log -1 --format=%s)" == previous ]]
grep -q "$(git -C "$repo" rev-parse previous)" "$repo/docker-compose.release.yml"
expect_no_call ' up '
grep -q 'The backup failed, so nothing was deployed' "$work/out"

repo="$work/rollback"; new_checkout "$repo"
new=$(git -C "$repo" rev-parse new); previous=$(git -C "$repo" rev-parse previous)
if FAKE_NEVER_READY=$new deploy "$repo" > "$work/out" 2>&1; then exit 1; fi
[[ "$(git -C "$repo" rev-parse HEAD)" == "$previous" ]]
grep -q "$previous" "$repo/docker-compose.release.yml"
[[ "$(grep -c ' up -d' "$FAKE_CALLS")" == 2 ]]
grep -q 'logs --no-color --tail=40 db-migrate spring-app' "$FAKE_CALLS"
grep -q "Rolled back to $previous" "$work/out"
grep -q 'backups/production-test holds the data' "$work/out"

repo="$work/stuck"; new_checkout "$repo"
new=$(git -C "$repo" rev-parse new); previous=$(git -C "$repo" rev-parse previous)
if FAKE_NEVER_READY="$new $previous" deploy "$repo" > "$work/out" 2>&1; then exit 1; fi
grep -q 'restore backups/production-test' "$work/out"

# An empty host has nothing to back up or return to, so the previous commit needs no release.
repo="$work/empty"; new_checkout "$repo"; rm "$repo/docker-compose.release.yml"
new=$(git -C "$repo" rev-parse new); previous=$(git -C "$repo" rev-parse previous)
FAKE_HOST=empty FAKE_UNPUBLISHED=$previous deploy "$repo" > "$work/out" 2>&1
[[ "$(git -C "$repo" log -1 --format=%s)" == new ]]
grep -q "$new" "$repo/docker-compose.release.yml"
[[ "$(grep -c ' up -d' "$FAKE_CALLS")" == 1 ]]
expect_no_call 'fallback.yml'
expect_no_call '^backup on'
grep -q 'Nothing to back up: mlsuite_pg_data does not exist' "$work/out"

repo="$work/empty-unpublished"; new_checkout "$repo"; rm "$repo/docker-compose.release.yml"
if FAKE_HOST=empty FAKE_UNPUBLISHED=$(git -C "$repo" rev-parse new) deploy "$repo" > "$work/out" 2>&1; then exit 1; fi
[[ "$(git -C "$repo" log -1 --format=%s)" == previous ]]
[[ ! -e "$repo/docker-compose.release.yml" ]]
expect_no_call ' up '
grep -q 'Nothing was deployed: nothing was running before' "$work/out"

repo="$work/empty-stuck"; new_checkout "$repo"; rm "$repo/docker-compose.release.yml"
new=$(git -C "$repo" rev-parse new); previous=$(git -C "$repo" rev-parse previous)
if FAKE_HOST=empty FAKE_NEVER_READY=$new deploy "$repo" > "$work/out" 2>&1; then exit 1; fi
[[ "$(git -C "$repo" rev-parse HEAD)" == "$previous" ]]
[[ ! -e "$repo/docker-compose.release.yml" ]]
[[ "$(grep -c ' up -d' "$FAKE_CALLS")" == 1 ]]
grep -q 'docker-compose.release.yml down$' "$FAKE_CALLS"
expect_no_call '^backup on'
grep -q 'the host is left stopped. Its volumes are kept' "$work/out"

# Data with nothing running is backed up all the same, by the release about to run on it.
repo="$work/stopped"; new_checkout "$repo"; rm "$repo/docker-compose.release.yml"
new=$(git -C "$repo" rev-parse new)
FAKE_HOST=stopped deploy "$repo" > "$work/out" 2>&1
grep -q "backup on new # $new" "$FAKE_CALLS"
[[ "$(grep -n '^backup on' "$FAKE_CALLS" | cut -d: -f1)" -lt "$(grep -n ' up -d' "$FAKE_CALLS" | cut -d: -f1)" ]]
expect_no_call 'fallback.yml'

printf 'Deploy release checks passed\n'
