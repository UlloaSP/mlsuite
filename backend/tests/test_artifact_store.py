"""Artifacts kept on disk by SHA-256 for the workers, bounded by size, least recently used out first."""

import hashlib
import os
import time

from mlsuite_backend.artifact_store import ArtifactStore


def _digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def test_kept_artifacts_are_bounded_on_disk_least_recently_used_first(tmp_path) -> None:
    store = ArtifactStore(tmp_path, max_bytes=10)
    contents = {name: name.encode() * 4 for name in ("a", "b", "c")}
    store.keep(_digest(contents["a"]), contents["a"])
    store.keep(_digest(contents["b"]), contents["b"])
    old = time.time() - 60
    os.utime(tmp_path / f"{_digest(contents['b'])}.mlbundle", (old, old))

    store.keep(_digest(contents["c"]), contents["c"])

    assert store.held(_digest(contents["b"])) is None
    assert store.held(_digest(contents["a"])).read_bytes() == contents["a"]
    assert store.held(_digest(contents["c"])).read_bytes() == contents["c"]


def test_an_artifact_larger_than_the_disk_bound_is_kept_alone(tmp_path) -> None:
    store = ArtifactStore(tmp_path, max_bytes=10)
    small, large = b"s" * 4, b"l" * 50
    store.keep(_digest(small), small)

    path = store.keep(_digest(large), large)

    assert store.held(_digest(small)) is None
    assert path == store.held(_digest(large))
    assert path.read_bytes() == large


def test_keeping_held_bytes_again_writes_nothing(tmp_path) -> None:
    store = ArtifactStore(tmp_path, max_bytes=100)
    content = b"model"
    first = store.keep(_digest(content), content)
    first.write_bytes(b"marker")

    assert store.keep(_digest(content), content) == first
    assert first.read_bytes() == b"marker"


def test_bytes_that_cannot_be_written_are_not_kept(tmp_path) -> None:
    blocked = tmp_path / "a-file"
    blocked.write_text("not a directory")
    store = ArtifactStore(blocked / "artifacts", max_bytes=100)

    assert store.keep(_digest(b"model"), b"model") is None
    assert store.held(_digest(b"model")) is None


def test_a_partial_file_a_stopped_writer_left_is_removed(tmp_path) -> None:
    store = ArtifactStore(tmp_path, max_bytes=10)
    abandoned = tmp_path / ("0" * 64 + ".123.456.partial")
    abandoned.write_bytes(b"half")
    old = time.time() - 3600
    os.utime(abandoned, (old, old))

    store.keep(_digest(b"new"), b"new")

    assert not abandoned.exists()
