import mlbundle
import pandas as pd
from fastapi import UploadFile
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

from ..bundles import load_bundle
from ..utils.crystal_tree import (
    build_tree_path_explanation,
    explain_with_feature_name_aliases,
    parse_trace_definitions,
)
from ..utils.errors import bad_request, internal_runtime_error
from ..utils.records import parse_record_json


async def explain(model_upload: UploadFile, data: str, traces: str) -> dict[str, list[dict[str, str]]]:
    bundle = await load_bundle(model_upload)
    model = bundle.native_model
    if not isinstance(model, (DecisionTreeClassifier, DecisionTreeRegressor)):
        message = f"crystal-tree requires a DecisionTree estimator, got {model.__class__.__name__}"
        raise bad_request(message)

    record = parse_record_json(data, "Invalid data JSON")
    trace_definitions = parse_trace_definitions(traces)
    feature_names = list(bundle.feature_names)
    try:
        frame = pd.DataFrame([bundle.row_from_record(record)], columns=feature_names)
    except mlbundle.PredictionInputError as exc:
        raise bad_request(str(exc)) from exc

    try:
        generated_trees = explain_with_feature_name_aliases(
            model,
            frame,
            feature_names,
            trace_definitions,
        )
    except Exception as exc:  # pragma: no cover - third-party runtime failure path
        raise internal_runtime_error(f"crystal-tree explain error: {exc}") from exc

    trees = [item.ascii_tree() for item in generated_trees if item is not None]
    trees = [tree for tree in trees if tree.strip()]
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
