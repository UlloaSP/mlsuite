import os
import sys
from pathlib import Path

# Read when the runtime's configuration is imported, so set before any test imports it.
_LEGACY = Path(__file__).resolve().parents[1] / "legacy" / ".venv"
os.environ.setdefault(
    "RUNTIME_LEGACY_PYTHON", str(_LEGACY / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python"))
)
os.environ.setdefault("RUNTIME_WORKERS", "4")

import pytest  # noqa: E402

from mlsuite_backend import artifacts, environments, policy  # noqa: E402
from mlsuite_backend.artifact_store import ArtifactStore  # noqa: E402
from mlsuite_backend.config import BUNDLE_CACHE_BYTES  # noqa: E402
from mlsuite_backend.environments import LEGACY, Environment  # noqa: E402
from tests.client import client  # noqa: E402


@pytest.fixture(autouse=True)
def artifact_directory(tmp_path, monkeypatch):
    """Each test keeps artifacts in a directory of its own, never in the system temp directory."""
    directory = tmp_path / "artifacts"
    monkeypatch.setattr(artifacts, "store", ArtifactStore(directory, BUNDLE_CACHE_BYTES))
    return directory


@pytest.fixture(autouse=True)
def built_environments(monkeypatch):
    """Every bundle's environment runs in this interpreter, which holds mlbundle and every library.

    It holds more than any lock, so these environments skip check_environment; the builder's
    environments, which hold exactly their lock, are proved by test_environment_check.
    """
    resolve = environments.resolve

    def resolved(key: str, root: Path = environments.ENVIRONMENT_ROOT) -> Environment:
        if key == LEGACY:
            return resolve(key, root)
        return Environment(key, Path(sys.executable), checked=False)

    monkeypatch.setattr(environments, "resolve", resolved)


class _Unrestricted:
    """Grants every lock: tests export with whatever this interpreter holds (test_policy checks the real list)."""

    mlbundle: dict[str, str] = {}

    def violations(self, _lock: object, _writer_version: str) -> list[str]:
        return []


@pytest.fixture(autouse=True)
def unrestricted_allowlist(request, monkeypatch):
    if "allowlist" not in request.keywords:
        monkeypatch.setattr(policy, "allowlist", _Unrestricted)


def pytest_configure(config) -> None:
    config.addinivalue_line("markers", "allowlist: the test applies the allowlist it sets itself")


def pytest_sessionfinish() -> None:
    client.__exit__(None, None, None)
