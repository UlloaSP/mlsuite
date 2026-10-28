import hashlib
import io
import tempfile
from pathlib import Path

import mlbundle
import pandas as pd
from catboost import CatBoostClassifier
from onnx import TensorProto, helper
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier, XGBRegressor

from mlsuite_backend.environments import LEGACY, environment_key

FIXTURES = Path(__file__).parent / "fixtures"
# Locks already resolved in this interpreter: generating one asks uv and the index for every
# target, so each export first tries the locks it has.
_LOCKS: list[bytes] = []


def _export(model: object, path: Path, **options: object) -> None:
    for lock in _LOCKS:
        try:
            mlbundle.export(model, path, environment_lock=lock, overwrite=True, **options)
            return
        except mlbundle.MLBundleError:
            continue
    view = mlbundle.export(model, path, overwrite=True, **options)
    _LOCKS.append(view.environment_lock.to_bytes())


def serialize_bundle(
    model: object,
    filename: str = "model.mlbundle",
    training_data: pd.DataFrame | None = None,
    onehot_separator: str = "__",
    sample_rows: int | None = None,
) -> tuple[str, io.BytesIO, str]:
    """Export a model as an upload; without a training frame the bundle's schema is the default one."""
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "model.mlbundle"
        _export(model, path, training_data=training_data, onehot_separator=onehot_separator, sample_rows=sample_rows)
        content = path.read_bytes()
    return (Path(filename).name, io.BytesIO(content), "application/octet-stream")


def legacy_bundle(name: str) -> tuple[str, io.BytesIO, str]:
    """A bundle mlbundle 0.2.1 wrote, before bundles carried a lock."""
    return (f"{name}.mlbundle", io.BytesIO((FIXTURES / f"{name}.mlbundle").read_bytes()), "application/octet-stream")


def environment_of(upload: tuple[str, io.BytesIO, str]) -> str:
    """The environment key a run of this upload names."""
    try:
        view = mlbundle.inspect(upload[1].getvalue())
    except mlbundle.InvalidContainerError:
        return LEGACY
    return environment_key(view.environment_lock, view.manifest.writer_version)


def sha256_of(upload: tuple[str, io.BytesIO, str]) -> str:
    return hashlib.sha256(upload[1].getvalue()).hexdigest()


def run_fields(upload: tuple[str, io.BytesIO, str], **fields: str) -> dict[str, str]:
    """A run's form fields naming the artifact and its environment, without the bytes."""
    return {"artifact_sha256": sha256_of(upload), "environment": environment_of(upload), **fields}


def run_request(upload: tuple[str, io.BytesIO, str], **fields: str) -> dict[str, dict[str, object]]:
    """A run's form sending the artifact with its SHA-256, as a caller does after a 409."""
    return {"files": {"model_file": upload}, "data": run_fields(upload, **fields)}


def make_classifier() -> LogisticRegression:
    features = pd.DataFrame(
        {
            "age": [22, 35, 47, 52, 46, 56],
            "income": [20_000, 45_000, 80_000, 90_000, 70_000, 120_000],
        }
    )
    labels = [0, 0, 1, 1, 1, 1]
    return LogisticRegression().fit(features, labels)


def make_onehot_classifier() -> LogisticRegression:
    features = pd.DataFrame(
        {
            "color__red": [1, 0, 1, 0],
            "color__blue": [0, 1, 0, 1],
            "size": [10, 20, 12, 22],
        }
    )
    labels = [0, 1, 0, 1]
    return LogisticRegression().fit(features, labels)


def make_regressor() -> LinearRegression:
    features = pd.DataFrame(
        {
            "rooms": [1, 2, 3, 4],
            "area": [30, 45, 60, 90],
        }
    )
    labels = [100_000, 160_000, 220_000, 340_000]
    return LinearRegression().fit(features, labels)


def make_tree() -> DecisionTreeClassifier:
    features = pd.DataFrame(
        {
            "age": [22, 35, 47, 52, 46, 56],
            "income": [20_000, 45_000, 80_000, 90_000, 70_000, 120_000],
        }
    )
    labels = [0, 0, 1, 1, 1, 1]
    return DecisionTreeClassifier(random_state=0, max_depth=3).fit(features, labels)


def make_decimal_tree() -> DecisionTreeClassifier:
    features = pd.DataFrame({"ratio": [0.11, 0.12, 0.27, 0.29]})
    return DecisionTreeClassifier(random_state=0).fit(features, [0, 0, 1, 1])


def make_tree_with_unused_tail_feature() -> DecisionTreeClassifier:
    features = pd.DataFrame(
        {
            "age": [22, 35, 47, 52, 46, 56],
            "income": [20_000, 45_000, 80_000, 90_000, 70_000, 120_000],
            "unused": [7, 7, 7, 7, 7, 7],
        }
    )
    labels = [0, 0, 1, 1, 1, 1]
    return DecisionTreeClassifier(random_state=0, max_depth=1).fit(features, labels)


def make_positional_classifier() -> LogisticRegression:
    features = [
        [22, 20_000],
        [35, 45_000],
        [47, 80_000],
        [52, 90_000],
        [46, 70_000],
        [56, 120_000],
    ]
    labels = [0, 0, 1, 1, 1, 1]
    return LogisticRegression().fit(features, labels)


def make_positional_onehot_classifier() -> LogisticRegression:
    features = [[10, 1, 0], [20, 0, 1], [12, 1, 0], [22, 0, 1]]
    labels = [0, 1, 0, 1]
    return LogisticRegression().fit(features, labels)


def make_positional_regressor() -> LinearRegression:
    features = [[1, 30], [2, 45], [3, 60], [4, 90]]
    labels = [100_000, 160_000, 220_000, 340_000]
    return LinearRegression().fit(features, labels)


def make_xgboost_classifier() -> XGBClassifier:
    features = pd.DataFrame(
        {
            "age": [22, 35, 47, 52, 46, 56],
            "income": [20_000, 45_000, 80_000, 90_000, 70_000, 120_000],
        }
    )
    labels = [0, 0, 1, 1, 1, 1]
    return XGBClassifier(n_estimators=3, max_depth=2, eval_metric="logloss").fit(
        features, labels
    )


def make_xgboost_regressor() -> XGBRegressor:
    features = pd.DataFrame(
        {
            "rooms": [1, 2, 3, 4],
            "area": [30, 45, 60, 90],
        }
    )
    labels = [100_000, 160_000, 220_000, 340_000]
    return XGBRegressor(n_estimators=3, max_depth=2).fit(features, labels)


def make_catboost_pipeline() -> Pipeline:
    features = pd.DataFrame(
        {
            "age": [22.0, 35.0, 47.0, 52.0, 46.0, 56.0],
            "income": [20_000.0, 45_000.0, 80_000.0, 90_000.0, 70_000.0, 120_000.0],
        }
    )
    labels = [0, 0, 1, 1, 1, 1]
    estimator = CatBoostClassifier(iterations=3, depth=2, verbose=False, allow_writing_files=False)
    return Pipeline([("est", estimator)]).fit(features, labels)


def make_multi_output_regressor() -> LinearRegression:
    features = pd.DataFrame({"rooms": [1, 2, 3, 4], "area": [30, 45, 60, 90]})
    targets = [[100, 1], [160, 2], [220, 3], [340, 4]]
    return LinearRegression().fit(features, targets)


def make_multi_output_classifier() -> DecisionTreeClassifier:
    features = pd.DataFrame({"rooms": [1, 2, 3, 4], "area": [30, 45, 60, 90]})
    targets = [["flat", 0], ["flat", 1], ["house", 0], ["house", 1]]
    return DecisionTreeClassifier(random_state=0).fit(features, targets)


def make_onnx_classifier() -> bytes:
    """A two-feature ONNX classifier whose graph names its classes low and high."""
    node = helper.make_node(
        "LinearClassifier", ["features"], ["label", "probabilities"],
        domain="ai.onnx.ml", coefficients=[1.0, -1.0, -1.0, 1.0],
        intercepts=[0.0, 0.0], classlabels_strings=["low", "high"],
        post_transform="SOFTMAX",
    )
    graph = helper.make_graph(
        [node],
        "tabular",
        [helper.make_tensor_value_info("features", TensorProto.FLOAT, [None, 2])],
        [
            helper.make_tensor_value_info("label", TensorProto.STRING, [None]),
            helper.make_tensor_value_info("probabilities", TensorProto.FLOAT, [None, 2]),
        ],
    )
    opsets = [helper.make_opsetid("", 13), helper.make_opsetid("ai.onnx.ml", 1)]
    return helper.make_model(graph, opset_imports=opsets, ir_version=8).SerializeToString()
