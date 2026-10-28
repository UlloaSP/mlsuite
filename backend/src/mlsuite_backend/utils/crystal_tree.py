"""Crystal Tree explanations of a decision tree, read as data from the bundle's structure.

The runtime never loads a model to explain it: the model's worker answers with the tree's arrays
(structure.json) and the row a record becomes, and the explanation is composed here, where
crystal-tree and clingo live, outside every model's environment.
"""

import math
from decimal import Decimal
from types import SimpleNamespace
from typing import Any

import numpy as np
import pandas as pd
from crystal_tree.crystal_tree import CrystalTreeContext
from crystal_tree.adapters import ScikitLearnAdapter
from dafact import Dafacter
from pydantic import BaseModel, TypeAdapter, ValidationError
from xclingo import XclingoControl

from .errors import bad_request


def tree_model(tree: dict[str, Any]) -> SimpleNamespace:
    """The arrays crystal-tree reads from a scikit-learn tree (model.tree_), from structure.json."""
    arrays = {
        name: np.asarray(tree[name])
        for name in ("children_left", "children_right", "feature", "threshold", "value")
    }
    return SimpleNamespace(tree_=SimpleNamespace(node_count=int(tree["node_count"]), **arrays))


def format_tree_threshold(value: object) -> str:
    if isinstance(value, float):
        return f"{value:.6g}"
    return str(value)


def build_tree_path_explanation(
    tree: dict[str, Any],
    row: list[float],
    feature_names: list[str],
    class_labels: list[str] | None,
) -> str:
    """The path the row takes from the root to its leaf, and what that leaf predicts."""
    node = 0
    lines = ["Prediction path"]
    while tree["children_left"][node] != -1:
        feature_index = tree["feature"][node]
        threshold = tree["threshold"][node]
        value = row[feature_index]
        if math.isnan(value):
            left = bool(tree.get("missing_go_to_left", [False] * len(tree["feature"]))[node])
            operator = "missing, goes"
            lines.append(f"|- {feature_names[feature_index]} {operator} {'left' if left else 'right'}")
        else:
            left = value <= threshold
            operator = "<=" if left else ">"
            lines.append(
                f"|- {feature_names[feature_index]} {operator} {format_tree_threshold(threshold)} (value={value})"
            )
        node = tree["children_left"][node] if left else tree["children_right"][node]
    leaf = tree["value"][node][0]
    if class_labels is None:
        lines.append(f"\\- value = {leaf[0]}")
    else:
        lines.append(f"\\- class = {class_labels[leaf.index(max(leaf))]}")
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


def explain_tree(tree: dict[str, Any], frame: pd.DataFrame) -> list[str]:
    # CrystalTree.explain in crystal-tree 0.3 renders thresholds with a fixed factor of 1,
    # so its public building blocks are composed here instead.
    factor = decimal_places(frame)
    control = XclingoControl(["1"], n_explanations="0")
    control.add("base", [], Dafacter(frame, factor=factor).as_program_string())
    control.add(
        "base",
        [],
        ScikitLearnAdapter(tree_model(tree)).get_logic_program(
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
