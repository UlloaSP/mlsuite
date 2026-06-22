from fastapi import APIRouter, File, Form, UploadFile

from ..services.schema_service import build_schema

router = APIRouter()


@router.post("/build_schema")
async def schema(
    model_file: UploadFile = File(...),
    df_file: UploadFile | None = File(None),
    onehot_separator: str | None = Form(None),
) -> dict[str, object]:
    separator = "__" if onehot_separator is None else onehot_separator
    return await build_schema(model_file, df_file, separator)
