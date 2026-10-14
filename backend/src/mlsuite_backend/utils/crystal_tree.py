from decimal import Decimal
from typing import Any

import pandas as pd
from crystal_tree.crystal_tree import CrystalTreeContext
from crystal_tree.adapters import ScikitLearnAdapter
from dafact import Dafacter
from pydantic import BaseModel, TypeAdapter, ValidationError
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


class TraceConditionDefinition(BaseModel):
    operator: str
    value: Any = None


class TraceDefinition(BaseModel):
    text: str
    feature: str
    targetClass: Any = None
    conditions: list[TraceConditionDefinition] = []


_TRACE_LIST = TypeAdapter(list[TraceDefinition])


def require_no_traces(payload: str) -> None:
    try:
        definitions = _TRACE_LIST.validate_json(payload)
    except ValidationError as exc:
        raise bad_request(f"Invalid traces JSON: {exc}") from exc
    # crystal-tree 0.3 still writes traces in the syntax xclingo 2.0b24 no longer parses.
    if definitions:
        raise bad_request("Custom traces are not supported by crystal-tree 0.3")


def decimal_places(frame: pd.DataFrame) -> int:
    """The scale that keeps every instance value exact once crystal-tree encodes it as an integer."""
    exponents = (Decimal(str(float(value))).normalize().as_tuple().exponent for value in frame.to_numpy().ravel())
    return max((-int(exponent) for exponent in exponents), default=0)


def explain_tree(model: object, frame: pd.DataFrame) -> list[str]:
    # CrystalTree.explain in crystal-tree 0.3 renders thresholds with a fixed factor of 1,
    # so its public building blocks are composed here instead.
    factor = decimal_places(frame)
    control = XclingoControl(["1"], n_explanations="0")
    control.add("base", [], Dafacter(frame, factor=factor).as_program_string())
    control.add(
        "base",
        [],
        ScikitLearnAdapter(model).get_logic_program(
            factor, prediction_traces="", feature_traces="", feature_names=list(frame.columns)
        ),
    )
    control.ground([("base", [])])
    return [
        render(explanation)
        for x_model in control.solve()
        for graph_model in x_model.explain_model(controlContext=CrystalTreeContext(factor=factor))
        for symbol in graph_model.show_trace
        if (explanation := graph_model.explain(symbol)) is not None
    ]


def render(explanation: Any) -> str:
    """xclingo 2.0b24 keeps the quotes of each label, which the explanation text does not show."""
    lines = ["  *"]
    for node, level in explanation.preorder_iterator(only_labelled=True):
        text = ";".join(sorted(label.strip('"') for label in node.labels))
        lines.append(f"{'  |' * level}__{text}")
    return "\n".join(lines) + "\n"
