import pandas as pd
from fastapi import UploadFile
from mlschema import infer_schema

from ..model_adapters import RuntimeModel, load_runtime_model_from_upload
from ..model_adapters.features import FeatureMetadata, fit_dataframe
from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object


def _build_base_dataframe(features: FeatureMetadata) -> pd.DataFrame:
    values = [[1] * len(features.names)]
    if features.generated:
        return pd.DataFrame(values)
    return pd.DataFrame(values, columns=features.names)


def _load_candidate_dataframe(
    candidate: object, features: FeatureMetadata
) -> pd.DataFrame:
    if not isinstance(candidate, pd.DataFrame):
        raise bad_request("File does not contain a DataFrame.")
    if candidate.empty:
        raise bad_request("DataFrame is empty.")
    fit = fit_dataframe(features, candidate)
    if not fit.compatible and features.generated:
        raise bad_request(f"DataFrame feature count mismatch: {fit.reason}.")
    if not fit.compatible:
        raise bad_request(
            f"DataFrame does not contain all required columns: {', '.join(fit.missing)}"
        )
    if features.generated:
        return candidate.set_axis(range(len(candidate.columns)), axis="columns")
    return candidate[features.names]


def _restore_positional_labels(
    fields: list[dict[str, object]],
    labels: list[str],
) -> list[dict[str, object]]:
    next_fields = []
    for field in fields:
        mapped_to = field.get("mappedTo")
        if isinstance(mapped_to, int) and mapped_to < len(labels):
            next_fields.append({**field, "label": labels[mapped_to]})
        else:
            next_fields.append(field)
    return next_fields


def _build_schema_fields(
    data_frame: pd.DataFrame,
    features: FeatureMetadata,
    onehot_separator: str,
    original_labels: list[str] | None,
) -> list[dict[str, object]]:
    fields = infer_schema(data_frame, onehot_separator=onehot_separator)
    if features.generated and original_labels is not None:
        return _restore_positional_labels(fields, original_labels)
    return fields


def _build_schema_reports(runtime: RuntimeModel) -> list[dict[str, object]]:
    if runtime.kind == "classifier":
        return [
            {
                "kind": "classifier",
                "label": "Predicted class",
                "mappedTo": "classifier",
                "labels": runtime.class_labels(),
                "showClassProbabilities": True,
            }
        ]
    return [{"kind": "regressor", "label": "Predicted value", "mappedTo": "regressor"}]


async def build_schema(
    model_upload: UploadFile,
    df_upload: UploadFile | None,
    onehot_separator: str = "__",
) -> dict[str, object]:
    if onehot_separator == "":
        raise bad_request("One-hot separator cannot be empty.")
    runtime = await load_runtime_model_from_upload(model_upload)
    features = runtime.feature_metadata()
    data_frame = _build_base_dataframe(features)
    original_labels = None
    if df_upload is not None:
        candidate = await load_uploaded_object(df_upload)
        if isinstance(candidate, pd.DataFrame):
            original_labels = [str(column) for column in candidate.columns]
        data_frame = _load_candidate_dataframe(candidate, features)

    return {
        "fields": _build_schema_fields(
            data_frame,
            features,
            onehot_separator,
            original_labels,
        ),
        "reports": _build_schema_reports(runtime),
    }
