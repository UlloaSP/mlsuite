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

from ..model_adapters import load_runtime_model_from_upload
from ..model_adapters.features import FeatureMetadata
from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object


def _build_base_dataframe(features: list[str]) -> pd.DataFrame:
    return pd.DataFrame([[1] * len(features)], columns=features, dtype=object)


def _load_candidate_dataframe(candidate: object, features: FeatureMetadata) -> pd.DataFrame:
    if not isinstance(candidate, pd.DataFrame):
        raise bad_request("File does not contain a DataFrame.")
    if candidate.empty:
        raise bad_request("DataFrame is empty.")
    if features.generated:
        if len(candidate.columns) != len(features.names):
            raise bad_request(
                "DataFrame feature count mismatch: "
                f"model expects {len(features.names)} columns, dataframe has {len(candidate.columns)}."
            )
        return candidate
    missing = set(features.names) - set(candidate.columns)
    if missing:
        raise bad_request(f"DataFrame does not contain all required columns: {missing}")
    return candidate[features.names]


def _build_schema_reports(runtime) -> list[dict[str, object]]:
    if runtime.kind == "classifier":
        return [{
            "kind": "classifier",
            "label": "Predicted class",
            "labels": runtime.class_labels(),
            "showClassProbabilities": True,
        }]
    if runtime.kind == "regressor":
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
    runtime = await load_runtime_model_from_upload(model_upload)
    features = runtime.feature_metadata()
    data_frame = _build_base_dataframe(features.names)
    if df_upload is not None:
        candidate = await load_uploaded_object(df_upload)
        data_frame = _load_candidate_dataframe(candidate, features)

    schema = _create_schema_builder().build(data_frame)
    schema.pop("explanations", None)
    schema["reports"] = _build_schema_reports(runtime)
    return schema
