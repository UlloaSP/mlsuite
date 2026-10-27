"""Runtime configuration."""

import os


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
# Model work (verifying, predicting, explaining) runs on this many threads at most; more waits.
RUNTIME_MAX_CONCURRENT = _positive_int("RUNTIME_MAX_CONCURRENT", 8)
# Verified bundles are kept while their artifacts total at most this size; the newest is kept
# even when it alone is larger.
BUNDLE_CACHE_BYTES = _positive_int("RUNTIME_BUNDLE_CACHE_MB", 512) * 1024 * 1024
