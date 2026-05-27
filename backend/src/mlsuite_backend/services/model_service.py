from fastapi import UploadFile

from ..model_adapters import load_runtime_model_from_upload


async def read_metadata(upload: UploadFile) -> dict[str, str]:
    runtime = await load_runtime_model_from_upload(upload)
    return {
        "fileName": upload.filename or "",
        "type": runtime.kind,
        "specificType": runtime.specific_type,
    }
