from typing import Any

from fastapi import APIRouter, File, UploadFile

from ..services.artifact_service import inspect_artifact, match_artifacts

router = APIRouter()


@router.post("/inspect_artifact")
async def inspect_artifact_route(
    artifact_file: UploadFile = File(...),
) -> dict[str, Any]:
    return await inspect_artifact(artifact_file)


@router.post("/match_artifacts")
async def match_artifacts_route(
    model_files: list[UploadFile] = File(...),
    dataframe_files: list[UploadFile] = File(...),
) -> dict[str, Any]:
    return await match_artifacts(model_files, dataframe_files)
