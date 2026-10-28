"""The environment builder: the only MLsuite service that downloads packages.

The API asks it to build the environment a model needs and to remove one no model uses. It
accepts a lock only when the allowlist grants all of it, checked here again whatever the caller
checked, and builds one environment at a time. It never loads a model.
"""

import asyncio
import base64
import binascii

import mlbundle
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

from .. import environments, policy
from ..config import ENVIRONMENT_ROOT
from .install import BuildFailed, build, remove


class BuildRequest(BaseModel):
    key: str
    writerVersion: str
    # The bundle's canonical pylock.toml, base64-encoded.
    lock: str


_one_at_a_time = asyncio.Lock()


def _parse(request: BuildRequest) -> mlbundle.EnvironmentLock:
    try:
        lock = mlbundle.EnvironmentLock.from_bytes(base64.b64decode(request.lock, validate=True))
    except (binascii.Error, ValueError, mlbundle.MLBundleError) as error:
        raise HTTPException(status_code=422, detail=f"Invalid environment lock: {error}") from None
    if environments.environment_key(lock, request.writerVersion) != request.key:
        raise HTTPException(status_code=422, detail="The key does not name this lock and mlbundle version")
    refused = policy.allowlist().violations(lock, request.writerVersion)
    if refused:
        raise HTTPException(
            status_code=422,
            detail={"message": "The environment needs packages MLsuite does not install", "refused": refused},
        )
    return lock


def create_builder_app() -> FastAPI:
    app = FastAPI()

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/environments")
    async def build_environment(request: BuildRequest) -> dict[str, object]:
        lock = _parse(request)
        async with _one_at_a_time:
            try:
                return await asyncio.to_thread(build, lock, request.writerVersion, policy.allowlist(), ENVIRONMENT_ROOT)
            except BuildFailed as error:
                raise HTTPException(status_code=502, detail=f"Could not install the environment: {error}") from None

    @app.delete("/environments/{key}", status_code=204)
    async def remove_environment(key: str) -> Response:
        if not environments.is_key(key) or key == environments.LEGACY:
            raise HTTPException(status_code=400, detail="Invalid environment key")
        async with _one_at_a_time:
            await asyncio.to_thread(remove, key, ENVIRONMENT_ROOT)
        return Response(status_code=204)

    return app


app = create_builder_app()
