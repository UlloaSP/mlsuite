"""Load uploaded .mlbundle artifacts, verifying each one once."""

import hashlib
import threading
from collections import OrderedDict
from dataclasses import replace

import mlbundle
from fastapi import UploadFile

from .config import BUNDLE_CACHE_BYTES, BUNDLE_SUFFIX
from .execution import run_model_work
from .utils.errors import bad_request


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


# Spring sends the artifact with every request and verifying a bundle can take seconds,
# so verified bundles are kept by content hash.
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


def _load(content: bytes) -> mlbundle.LoadedBundle:
    sha256 = hashlib.sha256(content).hexdigest()
    bundle = _loaded.get(sha256)
    if bundle is None:
        bundle = _loaded.keep(sha256, _verify(content), len(content))
    return bundle


async def load_bundle(upload: UploadFile) -> mlbundle.LoadedBundle:
    if not (upload.filename or "").lower().endswith(BUNDLE_SUFFIX):
        raise bad_request(f"File must be {BUNDLE_SUFFIX}")
    return await run_model_work(_load, await upload.read())
