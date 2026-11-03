import os
import sys
from pathlib import Path

# Read when the runtime's configuration is imported, so set before any test imports it.
os.environ.setdefault("RUNTIME_WORKERS", "4")

import pytest  # noqa: E402

from mlsuite_backend import artifacts, environments, policy  # noqa: E402
from mlsuite_backend.artifact_store import ArtifactStore  # noqa: E402
from mlsuite_backend.config import BUNDLE_CACHE_BYTES  # noqa: E402
from mlsuite_backend.environments import Environment  # noqa: E402
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
    def resolved(key: str, root: Path = environments.ENVIRONMENT_ROOT) -> Environment:
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


@pytest.fixture(autouse=True)
def downloadable_python(request, monkeypatch):
    """Any CPython counts as downloadable, whatever uv this machine has (test_policy asks the real one)."""
    if "real_uv" not in request.keywords:
        monkeypatch.setattr(policy, "python_installable", lambda _version: True)


def pytest_configure(config) -> None:
    config.addinivalue_line("markers", "allowlist: the test applies the allowlist it sets itself")
    config.addinivalue_line("markers", "real_uv: the test asks this machine's uv which CPython it can download")


def pytest_sessionfinish() -> None:
    client.__exit__(None, None, None)
