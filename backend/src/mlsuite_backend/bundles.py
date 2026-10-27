"""Load .mlbundle artifacts by SHA-256, verifying each one once.

A run names its artifact by SHA-256 and sends no bytes. When the runtime does not hold that
artifact it answers 409 (ARTIFACT_NOT_LOADED); the caller then sends the artifact with the same
hash, which must match the bytes.
"""

import hashlib
import re
import threading
from collections import OrderedDict
from dataclasses import replace

import mlbundle
from fastapi import HTTPException, UploadFile

from .config import BUNDLE_CACHE_BYTES, BUNDLE_SUFFIX
from .execution import run_model_work
from .utils.errors import bad_request

ARTIFACT_NOT_LOADED = 409
_SHA256 = re.compile(r"[0-9a-f]{64}")


class LoadedBundles:
    """Verified bundles by SHA-256, least recently used first, bounded by their artifacts' size."""

    def __init__(self, max_bytes: int) -> None:
        self._max_bytes = max_bytes
        self._entries: OrderedDict[str, tuple[mlbundle.LoadedBundle, int]] = OrderedDict()
        self._bytes = 0
        self._lock = threading.Lock()

    def get(self, sha256: str) -> mlbundle.LoadedBundle | None:
        with self._lock:
            entry = self._entries.get(sha256)
            if entry is None:
                return None
            self._entries.move_to_end(sha256)
            return entry[0]

    def keep(self, sha256: str, bundle: mlbundle.LoadedBundle, size: int) -> mlbundle.LoadedBundle:
        """Keep the bundle, evicting the least recently used; the newest is kept even if alone too large."""
        with self._lock:
            if sha256 in self._entries:
                self._entries.move_to_end(sha256)
                return self._entries[sha256][0]
            self._entries[sha256] = (bundle, size)
            self._bytes += size
            while self._bytes > self._max_bytes and len(self._entries) > 1:
                _, (_, evicted) = self._entries.popitem(last=False)
                self._bytes -= evicted
            return bundle


_loaded = LoadedBundles(BUNDLE_CACHE_BYTES)


def _verify(content: bytes) -> mlbundle.LoadedBundle:
    try:
        bundle = mlbundle.load(content)
    except mlbundle.MLBundleError as error:
        raise bad_request(f"Cannot load bundle: {error}") from error
    # Of the structure only the feature importances are read here; its trees, like the
    # samples, can outweigh the model in memory.
    structure = bundle.structure and {
        key: bundle.structure[key]
        for key in ("family", "feature_importances", "pipeline")
        if key in bundle.structure
    }
    return replace(bundle, structure=structure, samples=None)


def _load(content: bytes, declared_sha256: str | None) -> mlbundle.LoadedBundle:
    sha256 = hashlib.sha256(content).hexdigest()
    if declared_sha256 is not None and sha256 != declared_sha256:
        raise bad_request("Artifact does not match its SHA-256")
    bundle = _loaded.get(sha256)
    if bundle is None:
        bundle = _loaded.keep(sha256, _verify(content), len(content))
    return bundle


async def _read(upload: UploadFile) -> bytes:
    if not (upload.filename or "").lower().endswith(BUNDLE_SUFFIX):
        raise bad_request(f"File must be {BUNDLE_SUFFIX}")
    return await upload.read()


async def load_bundle(upload: UploadFile) -> mlbundle.LoadedBundle:
    """An artifact sent without a hash: one being inspected before it is stored."""
    return await run_model_work(_load, await _read(upload), None)


async def resolve_bundle(artifact_sha256: str, upload: UploadFile | None) -> mlbundle.LoadedBundle:
    """The bundle a run names by SHA-256, from the bytes sent with it or else from those held."""
    if not _SHA256.fullmatch(artifact_sha256):
        raise bad_request("artifact_sha256 must be a lowercase hexadecimal SHA-256")
    if upload is not None:
        return await run_model_work(_load, await _read(upload), artifact_sha256)
    bundle = _loaded.get(artifact_sha256)
    if bundle is None:
        raise HTTPException(
            status_code=ARTIFACT_NOT_LOADED,
            detail="Artifact is not loaded; send it with its SHA-256",
        )
    return bundle
