from typing import Any

import pandas as pd
from fastapi import UploadFile

from ..model_adapters import RuntimeModel, load_artifact, load_runtime_model_from_upload, resolve_runtime_model
from ..model_adapters.features import FeatureMetadata, fit_dataframe
from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object


def _model_fields(filename: str, runtime: RuntimeModel, features: FeatureMetadata) -> dict[str, Any]:
    return {
        "fileName": filename,
        "type": runtime.kind,
        "specificType": runtime.specific_type,
        "library": runtime.library,
        "features": features.names,
        "featureSource": features.source,
    }


async def inspect_artifact(upload: UploadFile) -> dict[str, Any]:
    filename = upload.filename or ""
    artifact = await load_artifact(upload)

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

    return {"kind": "model", **_model_fields(filename, runtime, runtime.feature_metadata())}


async def match_artifacts(
    model_uploads: list[UploadFile],
    dataframe_uploads: list[UploadFile],
) -> dict[str, Any]:
    runtimes = [await load_runtime_model_from_upload(upload) for upload in model_uploads]
    dataframes = [await _load_dataframe(upload) for upload in dataframe_uploads]
    return {
        "models": [
            _match_model(index, upload.filename or "", runtime, dataframes)
            for index, (upload, runtime) in enumerate(zip(model_uploads, runtimes))
        ],
        "dataframes": [
            {
                "index": index,
                "fileName": upload.filename or "",
                "columns": [str(column) for column in dataframe.columns],
                "rows": len(dataframe),
            }
            for index, (upload, dataframe) in enumerate(zip(dataframe_uploads, dataframes))
        ],
    }


async def _load_dataframe(upload: UploadFile) -> pd.DataFrame:
    artifact = await load_uploaded_object(upload)
    if not isinstance(artifact, pd.DataFrame):
        raise bad_request("Dataframe files must contain pandas DataFrame objects.")
    if artifact.empty:
        raise bad_request("DataFrame is empty.")
    return artifact


def _match_model(
    index: int,
    filename: str,
    runtime: RuntimeModel,
    dataframes: list[pd.DataFrame],
) -> dict[str, Any]:
    features = runtime.feature_metadata()
    matches = [
        _match_dataframe(runtime, features, dataframe_index, dataframe)
        for dataframe_index, dataframe in enumerate(dataframes)
    ]
    compatible = [match["dataframeIndex"] for match in matches if match["compatible"]]
    return {
        "index": index,
        **_model_fields(filename, runtime, features),
        "matches": matches,
        "autoDataframeIndex": compatible[0] if len(compatible) == 1 else None,
    }


def _match_dataframe(
    runtime: RuntimeModel,
    features: FeatureMetadata,
    index: int,
    dataframe: pd.DataFrame,
) -> dict[str, Any]:
    fit = fit_dataframe(features, dataframe)
    smoke_passed, smoke_reason = (
        _predict_smoke(runtime, features, dataframe) if fit.compatible else (None, None)
    )
    return {
        "dataframeIndex": index,
        "compatible": fit.compatible,
        "missing": fit.missing,
        "extra": fit.extra,
        "mode": fit.mode,
        "reason": fit.reason,
        "smokePassed": smoke_passed,
        "smokeReason": smoke_reason,
        "score": 1.0 if fit.compatible else 0.0,
    }


def _predict_smoke(
    runtime: RuntimeModel,
    features: FeatureMetadata,
    dataframe: pd.DataFrame,
) -> tuple[bool, str | None]:
    try:
        frame = dataframe.head(3)
        if not features.generated:
            frame = frame[features.names]
        runtime.predict(frame)
        return True, None
    except Exception as exc:
        return False, f"predict smoke failed: {exc}"
