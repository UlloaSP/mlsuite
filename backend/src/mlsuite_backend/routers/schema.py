from fastapi import APIRouter, File, Form, Request, UploadFile

from ..services.schema_service import build_schema

router = APIRouter()


@router.post("/build_schema")
async def schema(
    request: Request,
    model_file: UploadFile = File(...),
    df_file: UploadFile | None = File(None),
    onehot_separator: str | None = Form(None),
) -> dict[str, object]:
    separator = onehot_separator
    if separator is None:
        raw_separator = (await request.form()).get("onehot_separator")
        if isinstance(raw_separator, str):
            separator = raw_separator
    separator = "__" if separator is None else separator
    return await build_schema(model_file, df_file, separator)
