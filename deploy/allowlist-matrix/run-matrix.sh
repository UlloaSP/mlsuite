#!/usr/bin/env bash
#
# Proves the allowlist on this host: builds the runtime image, runs the builder and the runtime
# with Compose's memory limits on a network, volume and image of their own, and predicts the
# corpus. Whatever runs here beside it is left alone, and all of this is removed at the end.
# Usage: run-matrix.sh CORPUS_DIRECTORY BACKEND_DIRECTORY

set -euo pipefail

corpus=$1
backend=$2
driver=$(dirname "${BASH_SOURCE[0]}")/driver.py
name=mlsuite-allowlist-$$
image=$name:test

cleanup() {
  docker rm -f "$name-builder" "$name-runtime" >/dev/null 2>&1 || true
  docker network rm "$name" >/dev/null 2>&1 || true
  docker volume rm "$name" >/dev/null 2>&1 || true
  docker image rm "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker build --quiet --tag "$image" "$backend" >/dev/null
docker network create "$name" >/dev/null
docker volume create "$name" >/dev/null

docker run --detach --name "$name-builder" --network "$name" --network-alias runtime-builder --memory 2g \
  --env RUNTIME_BUILDER_HOST=0.0.0.0 --env RUNTIME_BUILDER_PORT=8001 \
  --volume "$name:/var/lib/mlsuite/environments" "$image" mlsuite_backend.builder >/dev/null
docker run --detach --name "$name-runtime" --network "$name" --network-alias py-analyzer --memory 6g \
  --env PYTHON_HOST=0.0.0.0 --env PYTHON_PORT=8000 --env RUNTIME_WORKERS=4 \
  --volume "$name:/var/lib/mlsuite/environments:ro" "$image" >/dev/null

# The corpus reaches the driver through its input: a bind mount would need a path on the Docker
# host, which may not be this machine's.
tar -cf - -C "$corpus" corpus.json bundles -C "$(cd "$(dirname "$driver")" && pwd -P)" driver.py |
  docker run --interactive --rm --network "$name" --entrypoint sh "$image" -c '
  mkdir /tmp/corpus && tar -xC /tmp/corpus &&
  for service in py-analyzer:8000 runtime-builder:8001; do
    for _ in $(seq 1 30); do
      /app/.venv/bin/python -c "import sys, urllib.request; urllib.request.urlopen(\"http://$service/health\", timeout=2)" \
        2>/dev/null && break
      sleep 1
    done
  done
  exec /app/.venv/bin/python /tmp/corpus/driver.py /tmp/corpus'
