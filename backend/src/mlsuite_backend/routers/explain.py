from fastapi import APIRouter, File, Form, UploadFile

from ..services.explanation_service import explain

router = APIRouter()


@router.post("/explain")
async def explain_route(
    model_file: UploadFile = File(..., media_type="application/octet-stream"),
    data: str = Form(...),
    traces: str = Form(default="[]"),
) -> dict[str, list[str]]:
    return await explain(model_file, data, traces)
