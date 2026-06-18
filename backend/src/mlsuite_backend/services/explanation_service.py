import json

from fastapi import UploadFile
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

from ..model_adapters import load_runtime_model_from_upload
from ..utils.crystal_tree import (
    build_tree_path_explanation,
    explain_with_feature_name_aliases,
    parse_trace_definitions,
)
from ..utils.dataframe import build_prediction_dataframe, parse_record_json
from ..utils.errors import bad_request, internal_runtime_error


async def explain(
    model_upload: UploadFile, data: str, traces: str
) -> dict[str, list[str]]:
    runtime = await load_runtime_model_from_upload(model_upload)
    model = runtime.model
    if not isinstance(model, (DecisionTreeClassifier, DecisionTreeRegressor)):
        message = f"crystal-tree requires a DecisionTree estimator, got {model.__class__.__name__}"
        raise bad_request(message)

    record = parse_record_json(data, "Invalid data JSON")
    try:
        raw_traces = json.loads(traces)
    except json.JSONDecodeError as exc:
        raise bad_request(f"Invalid traces JSON: {exc}") from exc
    if not isinstance(raw_traces, list):
        raise bad_request("Invalid traces JSON: traces must be a JSON array")

    frame = build_prediction_dataframe(model, record, require_all_features=True)
    feature_names = list(frame.columns)
    trace_definitions = parse_trace_definitions(raw_traces)

    try:
        explanations = explain_with_feature_name_aliases(
            model,
            frame,
            feature_names,
            trace_definitions,
        )
    except Exception as exc:  # pragma: no cover - third-party runtime failure path
        raise internal_runtime_error(f"crystal-tree explain error: {exc}") from exc

    trees = [item.ascii_tree() for item in explanations if item is not None]
    trees = [tree for tree in trees if tree.strip()]
    if not trees:
        trees = [build_tree_path_explanation(model, frame, feature_names)]
    return {"explanations": trees}
