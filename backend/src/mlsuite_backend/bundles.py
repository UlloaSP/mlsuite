"""Load uploaded .mlbundle artifacts, verifying each one once."""

import hashlib
from collections import OrderedDict
from dataclasses import replace

import mlbundle
from fastapi import UploadFile

from .config import BUNDLE_SUFFIX, LOADED_BUNDLE_CACHE_SIZE
from .utils.errors import bad_request

# Spring sends the artifact with every request and verifying a bundle can take seconds,
# so verified bundles are kept by content hash.
_loaded: OrderedDict[str, mlbundle.LoadedBundle] = OrderedDict()


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


async def load_bundle(upload: UploadFile) -> mlbundle.LoadedBundle:
    if not (upload.filename or "").lower().endswith(BUNDLE_SUFFIX):
        raise bad_request(f"File must be {BUNDLE_SUFFIX}")
    content = await upload.read()
    key = hashlib.sha256(content).hexdigest()
    bundle = _loaded.get(key)
    if bundle is None:
        bundle = _loaded[key] = _verify(content)
        if len(_loaded) > LOADED_BUNDLE_CACHE_SIZE:
            _loaded.popitem(last=False)
    else:
        _loaded.move_to_end(key)
    return bundle
