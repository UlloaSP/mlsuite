import json
import math

from crystal_tree import Condition, CrystalTree, Trace
from crystal_tree.crystal_tree import CrystalTreeContext, Dafacter
from sklearn.tree import DecisionTreeClassifier
from xclingo import XclingoControl

from .errors import bad_request


def format_tree_threshold(value: object) -> str:
    if isinstance(value, float):
        return f"{value:.6g}"
    return str(value)


def build_tree_path_explanation(
    model: object,
    instance_df: object,
    feature_names: list[str],
) -> str:
    tree = model.tree_
    instance = instance_df.iloc[0]
    node_indicator = model.decision_path(instance_df)
    leaf_id = model.apply(instance_df)[0]
    node_indexes = node_indicator.indices[
        node_indicator.indptr[0] : node_indicator.indptr[1]
    ]
    lines = ["Prediction path"]
    for node_id in node_indexes:
        if node_id == leaf_id:
            continue
        feature_index = tree.feature[node_id]
        if feature_index < 0:
            continue
        feature_name = feature_names[feature_index]
        threshold = tree.threshold[node_id]
        value = instance.iloc[feature_index]
        operator = "<=" if value <= threshold else ">"
        lines.append(
            f"|- {feature_name} {operator} {format_tree_threshold(threshold)} (value={value})"
        )
    predicted = model.predict(instance_df)[0]
    label = "class" if isinstance(model, DecisionTreeClassifier) else "value"
    lines.append(f"\\- {label} = {predicted}")
    return "\n".join(lines)


def build_feature_value_alias_program(feature_names: list[str]) -> str:
    return "\n".join(
        f"value(I,{json.dumps(str(name))},V) :- value(I,{index},V)."
        for index, name in enumerate(feature_names)
    )


def build_threshold_compatibility_program(model: object, factor: int) -> str:
    multiplier = 10**factor
    thresholds = []
    for threshold in model.tree_.threshold:
        if threshold == -2 or math.isinf(threshold) or math.isnan(threshold):
            continue
        thresholds.append(int(threshold * multiplier))
    return "\n".join(f"thres({threshold})." for threshold in sorted(set(thresholds)))


def render_traces(traces: list[Trace]) -> str:
    return "\n".join(trace.to_xclingo_code() for trace in traces)


def get_logic_feature_count(model: object) -> int:
    used_features = [int(index) for index in model.tree_.feature if index >= 0]
    return max(used_features) + 1 if used_features else 0


def parse_trace_definitions(raw_traces: list[object]) -> list[Trace]:
    traces: list[Trace] = []
    for item in raw_traces:
        if not isinstance(item, dict):
            raise bad_request("Invalid traces JSON: each trace must be an object")
        text = item.get("text")
        feature = item.get("feature")
        if not isinstance(text, str) or not isinstance(feature, str):
            raise bad_request(
                "Invalid traces JSON: trace text and feature are required"
            )
        conditions = []
        for condition in item.get("conditions", []):
            if not isinstance(condition, dict):
                raise bad_request("Invalid traces JSON: condition must be an object")
            operator = condition.get("operator")
            if not isinstance(operator, str):
                raise bad_request("Invalid traces JSON: condition operator is required")
            conditions.append(Condition(operator, condition.get("value")))
        traces.append(
            Trace(
                text,
                feature,
                conditions=conditions,
                target_class=item.get("targetClass"),
            )
        )
    return traces


def explain_with_feature_name_aliases(
    model: object,
    instance_df: object,
    feature_names: list[str],
    trace_definitions: list[Trace],
) -> list[object]:
    crystal_tree = CrystalTree(model)
    logic_feature_count = get_logic_feature_count(model)
    if logic_feature_count == 0:
        return []
    logic_feature_names = feature_names[:logic_feature_count]
    logic_instance_df = instance_df.iloc[:, :logic_feature_count]
    for trace in trace_definitions:
        crystal_tree.add_trace(trace)
    factor = crystal_tree.factor
    if factor is None:
        factor = crystal_tree.max_decimal_places(logic_instance_df)
    crystal_tree.set_logic_tree(feature_names=logic_feature_names, factor=factor)
    control = XclingoControl(n_solutions=1, n_explanations=1)
    control.add(
        "base",
        [],
        Dafacter(
            logic_instance_df, logic_feature_names, factor=factor
        ).as_program_string(),
    )
    control.add("base", [], build_feature_value_alias_program(logic_feature_names))
    control.add(
        "base", [], build_threshold_compatibility_program(crystal_tree._dt, factor)
    )
    control.add("base", [], crystal_tree._logic_tree.get_paths())
    control.add("base", [], crystal_tree._logic_tree.extra)
    prediction_traces = (
        crystal_tree.prediction_traces or crystal_tree._logic_tree.prediction_traces
    )
    feature_traces = (
        crystal_tree.feature_traces or crystal_tree._logic_tree.feature_traces
    )
    control.add(
        "base",
        [],
        render_traces(prediction_traces)
        if isinstance(prediction_traces, list)
        else prediction_traces,
    )
    control.add(
        "base",
        [],
        render_traces(feature_traces)
        if isinstance(feature_traces, list)
        else feature_traces,
    )
    control.ground([("base", [])], explainer_context=CrystalTreeContext(factor))
    return list(next(control.explain()))
