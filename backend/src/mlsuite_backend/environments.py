"""Environments by key: which interpreter runs a model, and whether it is ready.

A bundle's lock names every distribution its model needs except mlbundle, which the manifest's
writer_version pins; an environment is that pair. Its key is the SHA-256 of the lock's
environment_id and the writer version, so bundles that need the same files share one
environment. Bundles written before locks existed (mlbundle 0.2.1) run in the frozen legacy
environment, whose key is LEGACY.
"""

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path

import mlbundle

from .config import ENVIRONMENT_ROOT, LEGACY_PYTHON, VENV_PYTHON

LEGACY = "legacy"
READY_FILE = "ready.json"
_KEY = re.compile(r"[0-9a-f]{64}")


class EnvironmentUnavailable(Exception):
    """The environment a run names has not been built here, or is no longer."""


@dataclass(frozen=True)
class Environment:
    key: str
    python: Path
    # Built environments hold exactly their lock; check_environment proves it before loading.
    checked: bool


def environment_key(lock: mlbundle.EnvironmentLock, writer_version: str) -> str:
    return hashlib.sha256(f"{lock.environment_id}\n{writer_version}".encode()).hexdigest()


def is_key(value: str) -> bool:
    return value == LEGACY or _KEY.fullmatch(value) is not None


def directory(key: str, root: Path = ENVIRONMENT_ROOT) -> Path:
    if not _KEY.fullmatch(key):
        raise ValueError("Invalid environment key")
    return root / key


def describe(lock: mlbundle.EnvironmentLock, writer_version: str) -> dict[str, object]:
    """What an environment holds, as the API stores it for every result it runs."""
    return {
        "key": environment_key(lock, writer_version),
        "environmentId": lock.environment_id,
        "writerVersion": writer_version,
        "pythonVersion": lock.python_version,
        "packages": [{"name": package.name, "version": package.version} for package in lock.packages],
    }


def resolve(key: str, root: Path = ENVIRONMENT_ROOT) -> Environment:
    if key == LEGACY:
        return Environment(LEGACY, LEGACY_PYTHON, checked=False)
    built = directory(key, root)
    if not (built / READY_FILE).is_file():
        raise EnvironmentUnavailable(key)
    return Environment(key, built / "venv" / VENV_PYTHON, checked=True)


def read_ready(key: str, root: Path = ENVIRONMENT_ROOT) -> dict[str, object] | None:
    try:
        return json.loads((directory(key, root) / READY_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
