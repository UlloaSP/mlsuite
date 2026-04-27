from fastapi import APIRouter, File, Form, UploadFile

from ..services.prediction_service import predict

router = APIRouter()


@router.post("/predict")
async def predict_route(
    model_file: UploadFile = File(..., media_type="application/octet-stream"),
    data: str = Form(...),
) -> dict[str, object]:
    return await predict(model_file, data)
