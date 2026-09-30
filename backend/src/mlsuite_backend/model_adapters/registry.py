"""Resolve uploaded artifacts into runtime models with one prediction contract."""

from dataclasses import dataclass

import pandas as pd
from fastapi import UploadFile
from sklearn.base import BaseEstimator, ClassifierMixin, RegressorMixin
from xgboost import XGBModel

from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object
from .features import FeatureMetadata, feature_metadata, list_class_labels
from .onnx import OnnxModel, load_onnx_model

ONNX_SUFFIX = ".onnx"


@dataclass(frozen=True)
class RuntimeModel:
    model: object
    kind: str
    library: str

    @property
    def specific_type(self) -> str:
        return getattr(self.model, "specific_type", self.model.__class__.__name__)

    def feature_metadata(self) -> FeatureMetadata:
        return feature_metadata(self.model)

    def class_labels(self) -> list[str]:
        return list_class_labels(self.model)

    def predict(self, frame: pd.DataFrame) -> list[object]:
        """Return class probabilities for classifiers and values for regressors."""
        if self.kind == "classifier":
            return self.model.predict_proba(frame).tolist()
        return self.model.predict(frame).tolist()


def _estimator_kind(model: BaseEstimator) -> str:
    if isinstance(model, ClassifierMixin):
        return "classifier"
    if isinstance(model, RegressorMixin):
        return "regressor"
    return str(getattr(model, "_estimator_type", ""))


def resolve_runtime_model(model: object) -> RuntimeModel:
    if isinstance(model, OnnxModel):
        return RuntimeModel(model=model, kind=model.kind, library="onnx")
    if isinstance(model, BaseEstimator):
        kind = _estimator_kind(model)
        if kind in ("classifier", "regressor"):
            library = "xgboost" if isinstance(model, XGBModel) else "sklearn"
            return RuntimeModel(model=model, kind=kind, library=library)
    raise bad_request("Model must be a supported classifier or regressor.")


async def load_artifact(upload: UploadFile) -> object:
    if (upload.filename or "").lower().endswith(ONNX_SUFFIX):
        return load_onnx_model(await upload.read())
    return await load_uploaded_object(upload)


async def load_runtime_model_from_upload(upload: UploadFile) -> RuntimeModel:
    return resolve_runtime_model(await load_artifact(upload))
