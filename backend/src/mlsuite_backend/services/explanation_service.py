import mlbundle
import pandas as pd
from fastapi import UploadFile
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

from ..bundles import resolve_bundle
from ..execution import run_model_work
from ..utils.crystal_tree import (
    build_tree_path_explanation,
    explain_tree,
    require_no_traces,
)
from ..utils.errors import bad_request, internal_runtime_error
from ..utils.records import parse_record_json


async def explain(
    artifact_sha256: str, model_upload: UploadFile | None, data: str, traces: str
) -> dict[str, list[dict[str, str]]]:
    bundle = await resolve_bundle(artifact_sha256, model_upload)
    return await run_model_work(_explain, bundle, data, traces)


def _explain(bundle: mlbundle.LoadedBundle, data: str, traces: str) -> dict[str, list[dict[str, str]]]:
    model = bundle.native_model
    if not isinstance(model, (DecisionTreeClassifier, DecisionTreeRegressor)):
        message = f"crystal-tree requires a DecisionTree estimator, got {model.__class__.__name__}"
        raise bad_request(message)

    record = parse_record_json(data, "Invalid data JSON")
    require_no_traces(traces)
    feature_names = list(bundle.feature_names)
    try:
        frame = pd.DataFrame([bundle.row_from_record(record)], columns=feature_names)
    except mlbundle.PredictionInputError as exc:
        raise bad_request(str(exc)) from exc

    try:
        trees = explain_tree(model, frame)
    except Exception as exc:  # pragma: no cover - third-party runtime failure path
        raise internal_runtime_error(f"crystal-tree explain error: {exc}") from exc

    if not trees:
        trees = [build_tree_path_explanation(model, frame, feature_names)]
    return {
        "reports": [
            {
                "kind": "Crystal Tree",
                "explanation": "\n\n".join(trees),
            }
        ]
    }
