import tempfile
from pathlib import Path

import joblib
from fastapi import UploadFile

from .errors import bad_request


def validate_upload_suffix(filename: str | None, allowed_suffix: str) -> None:
    if filename is not None and not filename.endswith(allowed_suffix):
        raise bad_request(f"File must be {allowed_suffix}")


async def load_uploaded_object(
    upload: UploadFile,
    allowed_suffix: str = ".joblib",
) -> object:
    validate_upload_suffix(upload.filename, allowed_suffix)
    suffix = Path(upload.filename or allowed_suffix).suffix or allowed_suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary_file:
        temporary_file.write(await upload.read())
        temporary_path = temporary_file.name
    try:
        return joblib.load(temporary_path)
    finally:
        Path(temporary_path).unlink(missing_ok=True)
