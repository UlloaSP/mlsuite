from typing import Any

from fastapi import APIRouter, File, UploadFile

from ..services.artifact_service import inspect_artifact

router = APIRouter()


@router.post("/inspect_artifact")
async def inspect_artifact_route(artifact_file: UploadFile = File(...)) -> dict[str, Any]:
    return await inspect_artifact(artifact_file)
