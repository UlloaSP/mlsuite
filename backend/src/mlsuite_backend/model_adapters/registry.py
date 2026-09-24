from fastapi import UploadFile

from .base import ModelAdapter, RuntimeModel
from .onnx import load_onnx_model, OnnxAdapter
from .sklearn import SklearnAdapter
from .xgboost import XGBoostAdapter
from ..config import JOBLIB_SUFFIX
from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object

ADAPTERS: tuple[ModelAdapter, ...] = (
    OnnxAdapter(),
    XGBoostAdapter(),
    SklearnAdapter(),
)


def resolve_runtime_model(model: object) -> RuntimeModel:
    for adapter in ADAPTERS:
        if adapter.supports(model):
            return RuntimeModel(model=model, adapter=adapter)
    raise bad_request("Model must be a supported classifier or regressor.")


async def load_runtime_model_from_upload(
    upload: UploadFile,
    allowed_suffix: str = JOBLIB_SUFFIX,
) -> RuntimeModel:
    if (upload.filename or "").lower().endswith(".onnx"):
        return resolve_runtime_model(load_onnx_model(await upload.read()))
    return resolve_runtime_model(
        await load_uploaded_object(upload, allowed_suffix=allowed_suffix)
    )
