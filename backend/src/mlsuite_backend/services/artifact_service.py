from typing import Any

import pandas as pd
from fastapi import UploadFile

from ..config import JOBLIB_SUFFIX
from ..model_adapters import resolve_runtime_model
from ..utils.errors import bad_request
from ..utils.uploads import load_uploaded_object


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
    }
