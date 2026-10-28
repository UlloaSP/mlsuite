"""Model work sent to a worker of the run's environment, its failures answered as HTTP errors."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import HTTPException

from .. import environments
from ..environments import Environment, EnvironmentUnavailable
from ..utils.errors import bad_request, internal_runtime_error
from ..workers import Worker, WorkerError, WorkerFailed, WorkerPool

# The run names an environment this runtime has not built (yet, or any longer); the API prepares
# it again before the model runs.
ENVIRONMENT_NOT_READY = 424

pool = WorkerPool()


def environment(key: str) -> Environment:
    if not environments.is_key(key):
        raise bad_request("environment must be a lowercase hexadecimal SHA-256 or legacy")
    try:
        return environments.resolve(key)
    except EnvironmentUnavailable:
        raise HTTPException(
            status_code=ENVIRONMENT_NOT_READY,
            detail="The model's environment is not prepared on this runtime",
        ) from None


@asynccontextmanager
async def worker(key: str) -> AsyncIterator[Worker]:
    async with pool.worker(environment(key)) as taken:
        yield taken


async def call(taken: Worker, op: str, path: Path, sha256: str, **fields: object) -> object:
    try:
        return await taken.call({"op": op, "path": str(path), "sha256": sha256, **fields})
    except WorkerError as error:
        raise HTTPException(status_code=error.status, detail=error.detail) from None
    except WorkerFailed as error:
        raise internal_runtime_error(str(error)) from None


async def run(key: str, op: str, path: Path, sha256: str, **fields: object) -> object:
    async with worker(key) as taken:
        return await call(taken, op, path, sha256, **fields)
