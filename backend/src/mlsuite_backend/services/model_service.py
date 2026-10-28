"""What an uploaded bundle holds and which environment it needs.

A bundle with a lock is read with mlbundle.inspect, which validates its format, integrity and lock
without importing any model library, and is accepted only when the allowlist grants its whole
environment; its model is loaded later, in that environment, once built. A bundle written before
locks existed is loaded by a worker of the frozen legacy environment, as before.
"""

import io
import zipfile

import mlbundle
from fastapi import HTTPException, UploadFile

from .. import artifacts, environments, policy
from ..environments import LEGACY
from ..execution import run_inspection
from ..utils.errors import bad_request
from . import runs

_LOCK_MEMBER = "pylock.toml"


def _has_lock(content: bytes) -> bool:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            return _LOCK_MEMBER in archive.namelist()
    except zipfile.BadZipFile:
        return True  # Not a bundle at all; mlbundle.inspect says why.


def _inspect(content: bytes, filename: str) -> dict[str, object]:
    try:
        view = mlbundle.inspect(content)
    except mlbundle.MLBundleError as error:
        raise bad_request(f"Cannot load bundle: {error}") from error
    lock, manifest = view.environment_lock, view.manifest
    refused = policy.allowlist().violations(lock, manifest.writer_version)
    if refused:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "The bundle needs packages MLsuite does not install",
                "refused": refused,
            },
        )
    return {
        "fileName": filename,
        "type": manifest.model.kind.value,
        "specificType": manifest.model.estimator_class,
        "library": manifest.model.library.value,
        "features": list(manifest.features.names),
        "featureSource": manifest.features.origin.value,
        "schema": view.schema,
        "manifest": manifest.model_dump(mode="json", by_alias=True),
        # Read from the model's structure once it loads in its environment.
        "featureImportances": None,
        "environment": {**environments.describe(lock, manifest.writer_version), "lock": lock.to_bytes().decode()},
    }


async def read_metadata(upload: UploadFile) -> dict[str, object]:
    content = await artifacts.read_upload(upload)
    filename = upload.filename or ""
    sha256, path = artifacts.keep(content)
    if _has_lock(content):
        return await run_inspection(_inspect, content, filename)
    answer = await runs.run(LEGACY, "metadata", path, sha256, filename=filename)
    return {**answer, "environment": {"key": LEGACY}}
