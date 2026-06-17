import pandas as pd
from fastapi import UploadFile
from mlschema import infer_schema

from ..model_adapters import load_runtime_model_from_upload
from ..model_adapters.features import FeatureMetadata
from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object


def _build_base_dataframe(features: list[str]) -> pd.DataFrame:
    return pd.DataFrame([[1] * len(features)], columns=features)


def _with_mapped_fields(
    fields: list[dict[str, object]],
    features: list[str],
) -> list[dict[str, object]]:
    return [
        {**field, "mappedTo": field.get("mappedTo") or features[index]}
        for index, field in enumerate(fields)
    ]


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
            "mappedTo": "classifier",
            "labels": runtime.class_labels(),
            "showClassProbabilities": True,
        }]
    if runtime.kind == "regressor":
        return [{"kind": "regressor", "label": "Predicted value", "mappedTo": "regressor"}]
    return []


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

    return {
        "fields": _with_mapped_fields(infer_schema(data_frame), features.names),
        "reports": _build_schema_reports(runtime),
    }
