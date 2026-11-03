"""What an uploaded bundle holds and which environment it needs.

A bundle is read with mlbundle.inspect, which validates its format, integrity and lock without
importing any model library, and is accepted only when the allowlist grants its whole environment;
its model is loaded later, in that environment, once built.
"""

import mlbundle
from fastapi import HTTPException, UploadFile

from .. import artifacts, environments, policy
from ..execution import run_inspection
from ..utils.errors import bad_request


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
        "environment": {**environments.describe(lock, manifest.writer_version), "lock": lock.to_bytes().decode()},
    }


async def read_metadata(upload: UploadFile) -> dict[str, object]:
    content = await artifacts.read_upload(upload)
    artifacts.keep(content)
    return await run_inspection(_inspect, content, upload.filename or "")
