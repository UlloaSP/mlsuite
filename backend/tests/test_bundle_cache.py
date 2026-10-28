"""Verified bundles are kept by SHA-256, bounded by the size of their artifacts, verified once."""

import hashlib
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import pytest

from mlsuite_backend.artifact_store import ArtifactStore
from mlsuite_backend.bundles import LoadedBundles


def _keep(held: LoadedBundles, sha256: str, bundle: object, size: int) -> object:
    return held.verified(sha256, b"x" * size, lambda _content: bundle)


def test_held_bundles_are_bounded_by_artifact_size_least_recently_used_first() -> None:
    held = LoadedBundles(max_bytes=10)
    first, second, third = object(), object(), object()
    _keep(held, "a", first, 4)
    _keep(held, "b", second, 4)
    assert held.get("a") is first

    _keep(held, "c", third, 4)

    assert held.get("b") is None
    assert held.get("a") is first
    assert held.get("c") is third


def test_a_bundle_larger_than_the_bound_is_held_alone() -> None:
    held = LoadedBundles(max_bytes=10)
    small, large = object(), object()
    _keep(held, "small", small, 4)

    _keep(held, "large", large, 50)

    assert held.get("small") is None
    assert held.get("large") is large


def test_a_held_bundle_is_not_verified_or_counted_again() -> None:
    held = LoadedBundles(max_bytes=10)
    first = object()
    _keep(held, "a", first, 4)

    assert _keep(held, "a", object(), 4) is first
    _keep(held, "b", object(), 6)
    assert held.get("a") is first


def test_runs_sending_one_artifact_together_verify_it_once() -> None:
    held = LoadedBundles(max_bytes=10)
    bundle, release, calls = object(), threading.Event(), []

    def slow_verify(_content: bytes) -> object:
        calls.append(1)
        release.wait(timeout=5)
        return bundle

    with ThreadPoolExecutor(max_workers=3) as pool:
        results = [pool.submit(held.verified, "a", b"xx", slow_verify) for _ in range(3)]
        while held.verifying("a") is None:
            pass
        release.set()
        assert [result.result(timeout=5) for result in results] == [bundle] * 3

    assert calls == [1]
    assert held.verifying("a") is None


def test_a_failed_verification_fails_every_waiting_run_and_keeps_nothing() -> None:
    held = LoadedBundles(max_bytes=10)
    release = threading.Event()

    def failing_verify(_content: bytes) -> object:
        release.wait(timeout=5)
        raise ValueError("corrupt")

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [pool.submit(held.verified, "a", b"xx", failing_verify) for _ in range(2)]
        while held.verifying("a") is None:
            pass
        release.set()
        for result in results:
            with pytest.raises(ValueError, match="corrupt"):
                result.result(timeout=5)

    assert held.get("a") is None
    assert held.verifying("a") is None


def test_kept_artifacts_are_bounded_on_disk_least_recently_used_first(tmp_path) -> None:
    store = ArtifactStore(tmp_path, max_bytes=10)
    contents = {name: name.encode() * 4 for name in ("a", "b", "c")}
    digests = {name: hashlib.sha256(content).hexdigest() for name, content in contents.items()}
    store.keep(digests["a"], contents["a"])
    store.keep(digests["b"], contents["b"])
    old = time.time() - 60
    os.utime(tmp_path / f"{digests['b']}.mlbundle", (old, old))

    store.keep(digests["c"], contents["c"])

    assert store.read(digests["b"]) is None
    assert store.read(digests["a"]) == contents["a"]
    assert store.read(digests["c"]) == contents["c"]


def test_an_artifact_larger_than_the_disk_bound_is_kept_alone(tmp_path) -> None:
    store = ArtifactStore(tmp_path, max_bytes=10)
    small, large = b"s" * 4, b"l" * 50
    store.keep(hashlib.sha256(small).hexdigest(), small)

    store.keep(hashlib.sha256(large).hexdigest(), large)

    assert store.read(hashlib.sha256(small).hexdigest()) is None
    assert store.read(hashlib.sha256(large).hexdigest()) == large


def test_a_partial_file_a_stopped_worker_left_is_removed(tmp_path) -> None:
    store = ArtifactStore(tmp_path, max_bytes=10)
    abandoned = tmp_path / ("0" * 64 + ".123.456.partial")
    abandoned.write_bytes(b"half")
    old = time.time() - 3600
    os.utime(abandoned, (old, old))

    store.keep(hashlib.sha256(b"new").hexdigest(), b"new")

    assert not abandoned.exists()
