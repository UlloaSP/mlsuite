"""Runtime configuration."""

import os
import sys
import tempfile
from pathlib import Path


def _split_csv(name: str) -> list[str]:
    value = os.environ.get(name, "")
    return [item.strip() for item in value.split(",") if item.strip()]


def _positive_int(name: str, default: int) -> int:
    value = int(os.environ.get(name) or default)
    if value < 1:
        raise ValueError(f"{name} must be at least 1")
    return value


CORS_ALLOW_ORIGINS = _split_csv("CORS_ALLOW_ORIGINS")
BUNDLE_SUFFIX = ".mlbundle"
# Model work runs in at most this many processes in all, each running one request at a time in
# one model's environment; a busy environment may take several. One thread each is fastest: the
# interpreter runs one thread's Python at a time, and contending threads were slower.
RUNTIME_WORKERS = _positive_int("RUNTIME_WORKERS", 2)
# Each worker process keeps the bundles it loaded while their artifacts total at most this size;
# the runtime keeps the artifacts it received on disk within the same bound.
BUNDLE_CACHE_BYTES = _positive_int("RUNTIME_BUNDLE_CACHE_MB", 512) * 1024 * 1024
# A worker answering nothing for this long is stopped, and its request fails.
WORKER_TIMEOUT_SECONDS = _positive_int("RUNTIME_WORKER_TIMEOUT_SECONDS", 300)
# Where the runtime keeps the verified artifacts its workers read.
ARTIFACT_DIRECTORY = Path(tempfile.gettempdir()) / "mlsuite-artifacts"
# Built environments, one directory per environment key; the builder writes, the runtime reads.
ENVIRONMENT_ROOT = Path(os.environ.get("RUNTIME_ENVIRONMENT_ROOT") or "/var/lib/mlsuite/environments")
# The frozen environment that serves bundles written before locks existed (mlbundle 0.2.1).
LEGACY_PYTHON = Path(os.environ.get("RUNTIME_LEGACY_PYTHON") or "/opt/mlsuite/legacy/bin/python")
ALLOWLIST_PATH = Path(
    os.environ.get("RUNTIME_ALLOWLIST") or Path(__file__).resolve().parents[2] / "environment-allowlist.toml"
)
# The index the builder installs from, whatever URLs a lock names.
PACKAGE_INDEX_URL = os.environ.get("RUNTIME_PACKAGE_INDEX_URL") or "https://pypi.org/simple"
UV_BINARY = os.environ.get("RUNTIME_UV") or "uv"
VENV_PYTHON = Path("Scripts/python.exe") if sys.platform == "win32" else Path("bin/python")
