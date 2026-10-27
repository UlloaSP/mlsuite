from fastapi import APIRouter, File, Form, UploadFile

from ..services.explanation_service import explain

router = APIRouter()


@router.post("/explain")
async def explain_route(
    artifact_sha256: str = Form(...),
    data: str = Form(...),
    traces: str = Form(default="[]"),
    model_file: UploadFile | None = File(default=None, media_type="application/octet-stream"),
) -> dict[str, list[dict[str, str]]]:
    return await explain(artifact_sha256, model_file, data, traces)
