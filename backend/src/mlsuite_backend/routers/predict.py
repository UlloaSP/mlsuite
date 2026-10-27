from fastapi import APIRouter, File, Form, UploadFile

from ..services.prediction_service import predict

router = APIRouter()


@router.post("/predict")
async def predict_route(
    artifact_sha256: str = Form(...),
    data: str = Form(...),
    model_file: UploadFile | None = File(default=None, media_type="application/octet-stream"),
) -> dict[str, object]:
    return await predict(artifact_sha256, model_file, data)
