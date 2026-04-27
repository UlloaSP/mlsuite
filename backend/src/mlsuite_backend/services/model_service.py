from fastapi import UploadFile
from sklearn.base import BaseEstimator

from ..config import JOBLIB_SUFFIX
from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object


async def load_estimator_from_upload(
    upload: UploadFile,
    allowed_suffix: str = JOBLIB_SUFFIX,
) -> BaseEstimator:
    estimator = await load_uploaded_object(upload, allowed_suffix=allowed_suffix)
    if not isinstance(estimator, BaseEstimator):
        raise bad_request("Not a sklearn estimator.")
    return estimator


async def read_metadata(upload: UploadFile) -> dict[str, str]:
    estimator = await load_estimator_from_upload(upload)
    estimator_type = getattr(estimator, "_estimator_type", "")
    return {
        "fileName": upload.filename or "",
        "type": str(estimator_type),
        "specificType": estimator.__class__.__name__,
    }
