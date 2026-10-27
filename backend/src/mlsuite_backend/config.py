"""Runtime configuration."""

import os
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
# The runtime serves requests in this many worker processes, each with its own interpreter, so
# model work uses as many cores; each worker holds the bundles it loaded.
RUNTIME_WORKERS = _positive_int("RUNTIME_WORKERS", 2)
# Each worker runs predictions and explanations on this many threads at most; more waits. One
# thread is fastest: the interpreter runs one thread's Python at a time, and threads contending
# for it were slower (classifier +37%, 160-tree forest +76% with one thread instead of eight).
RUNTIME_MAX_CONCURRENT = _positive_int("RUNTIME_MAX_CONCURRENT", 1)
# Verified bundles are kept while their artifacts total at most this size, in each worker's
# memory and once more on disk for every worker; the newest is kept even when it alone is larger.
BUNDLE_CACHE_BYTES = _positive_int("RUNTIME_BUNDLE_CACHE_MB", 512) * 1024 * 1024
# Where the workers keep the verified artifacts they share.
ARTIFACT_DIRECTORY = Path(tempfile.gettempdir()) / "mlsuite-artifacts"
