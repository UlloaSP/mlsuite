import pandas as pd
from fastapi import UploadFile
from mlschema import MLSchema
from mlschema.strategies import (
    BooleanStrategy,
    CategoryStrategy,
    DateStrategy,
    NumberStrategy,
    TextStrategy,
)
from sklearn.base import ClassifierMixin, RegressorMixin

from .model_service import load_estimator_from_upload
from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object


def _get_feature_names(model: object) -> list[str]:
    if hasattr(model, "feature_names_in_"):
        return list(model.feature_names_in_)
    if hasattr(model, "get_feature_names_out"):
        return list(model.get_feature_names_out())
    raise bad_request("No feature names found in the model.")


def _build_base_dataframe(features: list[str]) -> pd.DataFrame:
    return pd.DataFrame([[1] * len(features)], columns=features, dtype=object)


def _load_candidate_dataframe(candidate: object, features: list[str]) -> pd.DataFrame:
    if not isinstance(candidate, pd.DataFrame):
        raise bad_request("File does not contain a DataFrame.")
    if candidate.empty:
        raise bad_request("DataFrame is empty.")
    missing = set(features) - set(candidate.columns)
    if missing:
        raise bad_request(f"DataFrame does not contain all required columns: {missing}")
    return candidate[features]


def _build_schema_reports(model: object) -> list[dict[str, object]]:
    if isinstance(model, ClassifierMixin):
        return [{
            "kind": "classifier",
            "label": "Predicted class",
            "labels": [str(item) for item in model.classes_],
            "showClassProbabilities": True,
        }]
    if isinstance(model, RegressorMixin):
        return [{"kind": "regressor", "label": "Predicted value"}]
    return []


def _create_schema_builder() -> MLSchema:
    builder = MLSchema()
    builder.register(TextStrategy())
    builder.register(NumberStrategy())
    builder.register(CategoryStrategy())
    builder.register(BooleanStrategy())
    builder.register(DateStrategy())
    return builder


async def build_schema(
    model_upload: UploadFile,
    df_upload: UploadFile | None,
) -> dict[str, object]:
    model = await load_estimator_from_upload(model_upload)
    if not isinstance(model, (ClassifierMixin, RegressorMixin)):
        raise bad_request("Model must be a classifier or regressor.")

    features = _get_feature_names(model)
    data_frame = _build_base_dataframe(features)
    if df_upload is not None:
        candidate = await load_uploaded_object(df_upload)
        data_frame = _load_candidate_dataframe(candidate, features)

    schema = _create_schema_builder().build(data_frame)
    schema["explanations"] = (
        schema["explanations"]
        if isinstance(schema.get("explanations"), list)
        else []
    )
    schema["reports"] = _build_schema_reports(model)
    return schema
