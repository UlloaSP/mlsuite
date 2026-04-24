from fastapi import APIRouter, File, UploadFile

from ..services.model_service import read_metadata

router = APIRouter()


@router.post("/metadata")
async def metadata(model_file: UploadFile = File(...)) -> dict[str, str]:
    return await read_metadata(model_file)
