from fastapi import APIRouter, File, UploadFile

from ..services.schema_service import build_schema

router = APIRouter()


@router.post("/build_schema")
async def schema(
    model_file: UploadFile = File(...),
    df_file: UploadFile | None = File(None),
) -> dict[str, object]:
    return await build_schema(model_file, df_file)
