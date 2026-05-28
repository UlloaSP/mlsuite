from typing import Any

import pandas as pd
from fastapi import UploadFile

from ..config import JOBLIB_SUFFIX
from ..model_adapters import resolve_runtime_model
from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object


def _dataframe_summary(index: int, upload: UploadFile, dataframe: pd.DataFrame) -> dict[str, Any]:
    return {
        "index": index,
        "fileName": upload.filename or "",
        "columns": [str(column) for column in dataframe.columns],
        "rows": len(dataframe),
    }


async def inspect_artifact(upload: UploadFile) -> dict[str, Any]:
    artifact = await load_uploaded_object(upload, allowed_suffix=JOBLIB_SUFFIX)
    filename = upload.filename or ""

    if isinstance(artifact, pd.DataFrame):
        return {
            "kind": "dataframe",
            "fileName": filename,
            "rows": len(artifact),
            "columns": [str(column) for column in artifact.columns],
        }

    try:
        runtime = resolve_runtime_model(artifact)
    except Exception:
        raise bad_request("Artifact must be a supported model or pandas DataFrame.")

    return {
        "kind": "model",
        "fileName": filename,
        "type": runtime.kind,
        "specificType": runtime.specific_type,
        "library": runtime.adapter.library,
        "features": runtime.feature_names(),
        "featureSource": runtime.feature_metadata().source,
    }


async def match_artifacts(
    model_uploads: list[UploadFile],
    dataframe_uploads: list[UploadFile],
) -> dict[str, Any]:
    models = []
    dataframes = []

    for index, upload in enumerate(model_uploads):
        artifact = await load_uploaded_object(upload, allowed_suffix=JOBLIB_SUFFIX)
        runtime = resolve_runtime_model(artifact)
        features = runtime.feature_metadata()
        models.append({
            "index": index,
            "fileName": upload.filename or "",
            "type": runtime.kind,
            "specificType": runtime.specific_type,
            "library": runtime.adapter.library,
            "features": features.names,
            "featureSource": features.source,
            "runtime": runtime,
        })

    for index, upload in enumerate(dataframe_uploads):
        artifact = await load_uploaded_object(upload, allowed_suffix=JOBLIB_SUFFIX)
        if not isinstance(artifact, pd.DataFrame):
            raise bad_request("Dataframe files must contain pandas DataFrame objects.")
        if artifact.empty:
            raise bad_request("DataFrame is empty.")
        dataframes.append((upload, artifact, _dataframe_summary(index, upload, artifact)))

    dataframe_summaries = [summary for *_unused, summary in dataframes]
    model_matches = [_match_model(model, dataframes) for model in models]
    return {
        "models": model_matches,
        "dataframes": dataframe_summaries,
    }


def _match_model(
    model: dict[str, Any],
    dataframes: list[tuple[UploadFile, pd.DataFrame, dict[str, Any]]],
) -> dict[str, Any]:
    features = [str(feature) for feature in model["features"]]
    required = set(features)
    matches = []

    for _upload, dataframe, summary in dataframes:
        columns = {str(column) for column in dataframe.columns}
        if model["featureSource"] == "generated":
            compatible = len(dataframe.columns) == len(features)
            missing = []
            extra = []
            mode = "count"
            reason = None if compatible else (
                f"model expects {len(features)} columns, dataframe has {len(dataframe.columns)}"
            )
        else:
            missing = sorted(required - columns)
            extra = sorted(columns - required)
            compatible = not missing
            mode = "columns"
            reason = None if compatible else "missing required columns"
        smoke_passed = None
        smoke_reason = None
        if compatible:
            smoke_passed, smoke_reason = _predict_smoke(model, dataframe)
        matches.append({
            "dataframeIndex": summary["index"],
            "compatible": compatible,
            "missing": missing,
            "extra": extra,
            "mode": mode,
            "reason": reason,
            "smokePassed": smoke_passed,
            "smokeReason": smoke_reason,
            "score": 1.0 if compatible else 0.0,
        })

    compatible_matches = [match for match in matches if match["compatible"]]
    auto_index = compatible_matches[0]["dataframeIndex"] if len(compatible_matches) == 1 else None
    public_model = {key: value for key, value in model.items() if key != "runtime"}
    return {
        **public_model,
        "matches": matches,
        "autoDataframeIndex": auto_index,
    }


def _predict_smoke(
    model: dict[str, Any],
    dataframe: pd.DataFrame,
) -> tuple[bool, str | None]:
    runtime = model["runtime"]
    try:
        frame = dataframe.head(min(3, len(dataframe)))
        if model["featureSource"] == "model":
            frame = frame[[str(feature) for feature in model["features"]]]
        if runtime.kind == "classifier":
            runtime.predict_classifier(frame)
        elif runtime.kind == "regressor":
            runtime.predict_regressor(frame)
        return True, None
    except Exception as exc:
        return False, f"predict smoke failed: {exc}"
