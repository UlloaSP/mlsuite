import pytest

from mlsuite_backend import bundles
from mlsuite_backend.artifact_store import ArtifactStore
from mlsuite_backend.config import BUNDLE_CACHE_BYTES


@pytest.fixture(autouse=True)
def artifact_directory(tmp_path, monkeypatch):
    """Each test keeps artifacts in a directory of its own, never in the system temp directory."""
    directory = tmp_path / "artifacts"
    monkeypatch.setattr(bundles, "_store", ArtifactStore(directory, BUNDLE_CACHE_BYTES))
    return directory
