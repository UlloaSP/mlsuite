#!/usr/bin/env bash
#
# Deploys the published release of one commit, already merged into this checkout.
# Usage: deploy-release.sh COMMIT PREVIOUS_COMMIT
#
# Nothing running is touched until the environment file is valid and every image is on the host.
# Then the existing data is backed up, and a backup that fails stops the deployment. A release
# that does not become ready is replaced by the one that was running, or stopped when nothing was.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib.sh

ENV_FILE=.env
READY_ATTEMPTS=${DEPLOY_READY_ATTEMPTS:-60}
READY_DELAY_SECONDS=${DEPLOY_READY_DELAY_SECONDS:-5}
RELEASE_WAIT_MINUTES=${DEPLOY_RELEASE_WAIT_MINUTES:-30}

compose() {
  local release=$1
  shift
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.prod.yml -f "$release" "$@"
}

project() {
  local name
  name=$(env_value COMPOSE_PROJECT_NAME || true)
  printf '%s' "${name:-mlsuite}"
}

running() {
  [[ -n "$(docker ps --quiet --filter "label=com.docker.compose.project=$(project)" --filter status=running)" ]]
}

has_data() {
  docker volume inspect "$(project)_pg_data" >/dev/null 2>&1
}

ready() {
  curl -fsS --max-time 5 "http://127.0.0.1:$(env_value WEB_PORT)/api/readiness" |
    python3 -c 'import json,sys; raise SystemExit(json.load(sys.stdin).get("ready") is not True)' 2>/dev/null
}

wait_ready() {
  local attempt
  for ((attempt = 0; attempt < READY_ATTEMPTS; attempt++)); do
    ready && return 0
    sleep "$READY_DELAY_SECONDS"
  done
  return 1
}

# The steps chain because this runs as a condition, where `set -e` does not apply. Without a
# running release there is no fallback: nothing to fetch, pull or return to.
prepare() {
  local commit=$1 previous=$2 candidate=$3 fallback=$4
  python3 deploy/check_env.py --env-file "$ENV_FILE" &&
    [[ "$(env_value WEB_PORT)" =~ ^[0-9]+$ ]] &&
    { [[ -z "$fallback" ]] || python3 deploy/fetch_release.py --commit "$previous" --output "$fallback"; } &&
    python3 deploy/fetch_release.py --commit "$commit" --output "$candidate" \
      --wait-minutes "$RELEASE_WAIT_MINUTES" &&
    require_release_compose "$candidate" "$ENV_FILE" &&
    { [[ -z "$fallback" ]] || compose "$fallback" pull --quiet; } &&
    compose "$candidate" pull --quiet
}

# use COMMIT FILE — check out COMMIT with FILE as its release Compose.
use() {
  git reset --quiet --hard "$1"
  cp "$2" "$(env_value RELEASE_COMPOSE)"
}

main() {
  local commit=$1 previous=$2
  local candidate=.releases/candidate.yml fallback= release_compose backup= kept

  # The release override is derived by this checkout's scripts, so they must be the commit's own.
  if [[ "$(git rev-parse HEAD)" != "$(git rev-parse --verify --quiet "$commit^{commit}")" ]]; then
    echo "Nothing was deployed: this checkout is not at $commit." >&2
    return 1
  fi
  running && fallback=.releases/fallback.yml
  kept="nothing was running before"
  [[ -z "$fallback" ]] || kept="the running release stays"
  if ! prepare "$commit" "$previous" "$candidate" "$fallback"; then
    git reset --quiet --hard "$previous"
    echo "Nothing was deployed: $kept." >&2
    return 1
  fi

  # The backup stops and restarts the application, so it runs on exactly what is running: restarting
  # the new release here would start it before its migrations. With nothing running it starts only
  # the data services, from the release about to run on them.
  release_compose=$(env_value RELEASE_COMPOSE)
  if [[ -n "$fallback" ]]; then use "$previous" "$fallback"; else use "$commit" "$candidate"; fi
  if [[ -n "$fallback" ]] || has_data; then
    if ! backup=$(ENV_FILE="$ENV_FILE" bash scripts/create-local-backup.sh); then
      git reset --quiet --hard "$previous"
      [[ -n "$fallback" ]] || rm -f -- "$release_compose"
      echo "The backup failed, so nothing was deployed: $kept." >&2
      return 1
    fi
  else
    echo "Nothing to back up: $(project)_pg_data does not exist." >&2
  fi

  use "$commit" "$candidate"
  if compose "$release_compose" up -d && wait_ready; then
    echo "Deployed $commit."
    return 0
  fi

  echo "The release of $commit did not become ready." >&2
  compose "$release_compose" ps >&2 || true
  compose "$release_compose" logs --no-color --tail=40 db-migrate spring-app >&2 || true

  if [[ -z "$fallback" ]]; then
    if compose "$release_compose" down; then
      echo "Nothing was running before, so the host is left stopped. Its volumes are kept." >&2
    else
      echo "Nothing was running before, but stopping the release failed: check docker compose ps." >&2
    fi
    git reset --quiet --hard "$previous"
    rm -f -- "$release_compose"
    [[ -z "$backup" ]] || echo "$backup holds the data from before this deployment." >&2
    return 1
  fi

  use "$previous" "$fallback"
  if compose "$release_compose" up -d && wait_ready; then
    echo "Rolled back to $previous. Migrations do not roll back: $backup holds the data before them." >&2
  else
    echo "Rolling back to $previous did not become ready."       "If the release migrated the database, restore $backup." >&2
  fi
  return 1
}

# All on one line, and every step in a function: rolling back replaces this file, and bash reads
# a script as it runs it.
main "$@"; exit $?
