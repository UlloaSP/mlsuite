"""Artifacts by SHA-256, on the disk the workers read.

A run names its artifact by SHA-256 and sends no bytes. When the runtime does not hold that
artifact it answers 409 (ARTIFACT_NOT_LOADED); the caller then sends the artifact with the same
hash, which must match the bytes. Workers load from here and hash the bytes again, so a damaged
file fails its request instead of running another model.
"""

import hashlib
import re
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .artifact_store import ArtifactStore
from .config import ARTIFACT_DIRECTORY, BUNDLE_CACHE_BYTES, BUNDLE_SUFFIX
from .utils.errors import bad_request

ARTIFACT_NOT_LOADED = 409
_SHA256 = re.compile(r"[0-9a-f]{64}")

store = ArtifactStore(ARTIFACT_DIRECTORY, BUNDLE_CACHE_BYTES)


async def read_upload(upload: UploadFile) -> bytes:
    if not (upload.filename or "").lower().endswith(BUNDLE_SUFFIX):
        raise bad_request(f"File must be {BUNDLE_SUFFIX}")
    return await upload.read()


def keep(content: bytes, declared_sha256: str | None = None) -> tuple[str, Path]:
    """Keeps an upload's bytes for the workers; returns their SHA-256 and where they are."""
    sha256 = hashlib.sha256(content).hexdigest()
    if declared_sha256 is not None and sha256 != declared_sha256:
        raise bad_request("Artifact does not match its SHA-256")
    path = store.keep(sha256, content)
    if path is None:
        raise HTTPException(status_code=507, detail="The runtime cannot keep the artifact on disk")
    return sha256, path


async def resolve(artifact_sha256: str, upload: UploadFile | None) -> Path:
    """Where the artifact a run names is, from the bytes sent with it or else from those held."""
    if not _SHA256.fullmatch(artifact_sha256):
        raise bad_request("artifact_sha256 must be a lowercase hexadecimal SHA-256")
    if upload is not None:
        return keep(await read_upload(upload), artifact_sha256)[1]
    path = store.held(artifact_sha256)
    if path is None:
        raise HTTPException(
            status_code=ARTIFACT_NOT_LOADED,
            detail="Artifact is not loaded; send it with its SHA-256",
        )
    return path
