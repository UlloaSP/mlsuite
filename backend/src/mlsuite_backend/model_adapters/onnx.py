"""ONNX tabular model execution behind the runtime adapter contract."""

from dataclasses import dataclass

import numpy as np
import onnx
import onnxruntime as ort
import pandas as pd

from ..utils.errors import bad_request
from .features import feature_names_from_count


INPUT_DTYPES = {
    "tensor(float)": np.float32,
    "tensor(double)": np.float64,
    "tensor(int32)": np.int32,
    "tensor(int64)": np.int64,
}


@dataclass
class OnnxModel:
    session: ort.InferenceSession
    kind: str
    labels: list[str | int]
    input_names: list[str]
    input_dtypes: list[type]
    feature_names_in_: list[str] | None
    n_features_in_: int
    probability_output: int | None
    specific_type: str = "ONNX"


def _class_labels(graph: onnx.GraphProto) -> list[str | int]:
    for op_type in ("ZipMap", "LinearClassifier", "TreeEnsembleClassifier"):
        for node in graph.node:
            if node.op_type != op_type or node.domain != "ai.onnx.ml":
                continue
            for attribute in node.attribute:
                if attribute.name == "classlabels_strings":
                    return [value.decode("utf-8") for value in attribute.strings]
                if attribute.name in ("classlabels_ints", "classlabels_int64s"):
                    return list(attribute.ints)
    return []


def _model_kind(outputs: list[ort.NodeArg], labels: list[str | int]) -> tuple[str, int | None]:
    if len(outputs) == 2 and labels:
        label_type = outputs[0].type
        probability_type = outputs[1].type
        if label_type in ("tensor(int64)", "tensor(string)") and (
            probability_type.startswith("seq(map(")
            or probability_type in ("tensor(float)", "tensor(double)")
        ):
            return "classifier", 1
    if len(outputs) == 1 and labels and outputs[0].type.startswith("seq(map("):
        return "classifier", 0
    if len(outputs) == 1 and outputs[0].type in ("tensor(float)", "tensor(double)"):
        shape = outputs[0].shape
        if len(shape) == 1 or (len(shape) == 2 and shape[1] == 1):
            return "regressor", None
    raise bad_request("ONNX model must expose class probabilities or one regression value per row.")


def load_onnx_model(content: bytes) -> OnnxModel:
    try:
        graph = onnx.load_model_from_string(content).graph
        session = ort.InferenceSession(content, providers=["CPUExecutionProvider"])
    except Exception as exc:
        raise bad_request("Cannot read ONNX artifact: the file is empty, corrupt, or incompatible.") from exc

    inputs = session.get_inputs()
    if not inputs:
        raise bad_request("ONNX model must have a tabular input.")
    widths = []
    dtypes = []
    for item in inputs:
        shape = item.shape
        dtype = INPUT_DTYPES.get(item.type)
        if len(shape) != 2 or not isinstance(shape[1], int) or shape[1] < 1 or dtype is None:
            raise bad_request("ONNX inputs must be two-dimensional numeric tensors with a fixed feature count.")
        widths.append(shape[1])
        dtypes.append(dtype)
    if len(inputs) > 1 and any(width != 1 for width in widths):
        raise bad_request("ONNX models with multiple inputs need one feature per input.")

    labels = _class_labels(graph)
    kind, probability_output = _model_kind(session.get_outputs(), labels)
    return OnnxModel(
        session=session,
        kind=kind,
        labels=labels,
        input_names=[item.name for item in inputs],
        input_dtypes=dtypes,
        feature_names_in_=[item.name for item in inputs] if len(inputs) > 1 else None,
        n_features_in_=sum(widths),
        probability_output=probability_output,
    )


def _input_array(frame: pd.DataFrame, dtype: type) -> np.ndarray:
    if np.issubdtype(dtype, np.integer):
        limits = np.iinfo(dtype)
        converted = []
        for value in frame.to_numpy().flat:
            if not isinstance(value, (int, float, np.integer, np.floating)) or (
                isinstance(value, (float, np.floating)) and
                (not np.isfinite(value) or not value.is_integer())
            ):
                raise bad_request("ONNX integer inputs require whole numbers within the input type range.")
            integer = int(value)
            if not limits.min <= integer <= limits.max:
                raise bad_request("ONNX integer inputs require whole numbers within the input type range.")
            converted.append(integer)
        return np.asarray(converted, dtype=dtype).reshape(frame.shape)
    return frame.to_numpy(dtype=dtype)


def _run(model: OnnxModel, frame: pd.DataFrame) -> list[object]:
    try:
        if len(model.input_names) == 1:
            feeds = {model.input_names[0]: _input_array(frame, model.input_dtypes[0])}
        else:
            feeds = {
                name: _input_array(frame[[name]], dtype)
                for name, dtype in zip(model.input_names, model.input_dtypes)
            }
        return model.session.run(None, feeds)
    except (ValueError, TypeError, OverflowError) as exc:
        raise bad_request(f"Invalid ONNX input values: {exc}") from exc


class OnnxAdapter:
    library = "onnx"

    def supports(self, model: object) -> bool:
        return isinstance(model, OnnxModel)

    def model_kind(self, model: OnnxModel) -> str:
        return model.kind

    def feature_names(self, model: OnnxModel) -> list[str]:
        return model.feature_names_in_ or feature_names_from_count(model.n_features_in_)

    def class_labels(self, model: OnnxModel) -> list[str]:
        return [str(label) for label in model.labels]

    def predict_classifier(self, model: OnnxModel, frame: pd.DataFrame) -> list[list[float]]:
        probabilities = _run(model, frame)[model.probability_output]
        if isinstance(probabilities, list) and all(isinstance(row, dict) for row in probabilities):
            values = np.asarray(
                [[row[label] for label in model.labels] for row in probabilities],
                dtype=float,
            )
        else:
            values = np.asarray(probabilities)
        if values.ndim != 2 or values.shape[1] != len(model.labels):
            raise bad_request("ONNX probability output does not match its class labels.")
        values = values.astype(float)
        if not np.all(np.isfinite(values) & (values >= 0) & (values <= 1)) or not np.allclose(
            values.sum(axis=1), 1, atol=1e-5
        ):
            raise bad_request("ONNX classifier output must contain class probabilities.")
        return values.tolist()

    def predict_regressor(self, model: OnnxModel, frame: pd.DataFrame) -> list[object]:
        values = np.asarray(_run(model, frame)[0])
        if values.ndim not in (1, 2) or (values.ndim == 2 and values.shape[1] != 1):
            raise bad_request("ONNX regression output must contain one value per row.")
        return values.reshape(-1).tolist()
