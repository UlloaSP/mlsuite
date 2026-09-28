import pickle
import tempfile
from pathlib import Path

import joblib
from fastapi import UploadFile

from ..config import JOBLIB_SUFFIX
from .errors import bad_request


async def load_uploaded_object(upload: UploadFile) -> object:
    if upload.filename is not None and not upload.filename.endswith(JOBLIB_SUFFIX):
        raise bad_request(f"File must be {JOBLIB_SUFFIX}")
    with tempfile.NamedTemporaryFile(suffix=JOBLIB_SUFFIX, delete=False) as temporary_file:
        temporary_file.write(await upload.read())
        temporary_path = temporary_file.name
    try:
        return joblib.load(temporary_path)
    except (
        EOFError, pickle.UnpicklingError, KeyError, ValueError, ImportError, AttributeError
    ) as error:
        raise bad_request(
            "Cannot read joblib artifact: the file is empty, corrupt, or incompatible."
        ) from error
    finally:
        Path(temporary_path).unlink(missing_ok=True)
