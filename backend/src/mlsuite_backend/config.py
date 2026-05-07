"""Runtime configuration."""

import os


def _split_csv(name: str) -> list[str]:
    value = os.environ.get(name, "")
    return [item.strip() for item in value.split(",") if item.strip()]


CORS_ALLOW_ORIGINS = _split_csv("CORS_ALLOW_ORIGINS")
JOBLIB_SUFFIX = ".joblib"
