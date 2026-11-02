"""Export hand-built ONNX bundles (onnx.helper graphs): python export_onnx.py <env-name> <output>."""

from __future__ import annotations

import sys

import numpy as np
import onnxruntime as ort
import pandas as pd
from onnx import TensorProto, helper

from common import Case, binary_target, multiclass_target, numeric_frame, regression_target, run

N, N_TEST, SAMPLES = 160, 7, 3
X, X_TEST = numeric_frame(0, N), numeric_frame(1, N_TEST)
OPSETS = [helper.make_opsetid("", 13), helper.make_opsetid("ai.onnx.ml", 1)]
INPUT = helper.make_tensor_value_info("features", TensorProto.FLOAT, [None, 4])
MC = ["cold", "hot", "mild"]
MC_COEF = [1.0, 0.5, 0.0, -0.4,  -1.0, -0.5, 0.0, 0.4,  0.1, 0.2, -0.3, 0.05]


def _model(nodes, outputs) -> bytes:
    graph = helper.make_graph(nodes, "tabular", [INPUT], outputs)
    return helper.make_model(graph, opset_imports=OPSETS, ir_version=8).SerializeToString()


def tensor_classifier() -> bytes:
    node = helper.make_node("LinearClassifier", ["features"], ["label", "probabilities"], domain="ai.onnx.ml",
                            coefficients=MC_COEF, intercepts=[0.1, -0.2, 0.0],
                            classlabels_strings=MC, post_transform="SOFTMAX")
    return _model([node], [helper.make_tensor_value_info("label", TensorProto.STRING, [None]),
                           helper.make_tensor_value_info("probabilities", TensorProto.FLOAT, [None, 3])])


def zipmap_classifier() -> bytes:
    linear = helper.make_node("LinearClassifier", ["features"], ["label", "raw"], domain="ai.onnx.ml",
                              coefficients=[0.9, -0.6, 0.3, 0.1, -0.9, 0.6, -0.3, -0.1], intercepts=[0.2, -0.2],
                              classlabels_ints=[0, 1], post_transform="SOFTMAX")
    zipmap = helper.make_node("ZipMap", ["raw"], ["probabilities"], domain="ai.onnx.ml", classlabels_int64s=[0, 1])
    map_type = helper.make_map_type_proto(TensorProto.INT64, helper.make_tensor_type_proto(TensorProto.FLOAT, []))
    seq = helper.make_value_info("probabilities", helper.make_sequence_type_proto(map_type))
    return _model([linear, zipmap], [helper.make_tensor_value_info("label", TensorProto.INT64, [None]), seq])


def linear_regressor() -> bytes:
    node = helper.make_node("LinearRegressor", ["features"], ["variable"], domain="ai.onnx.ml",
                            coefficients=[1.7, -2.3, 0.5, -0.8], intercepts=[0.25])
    return _model([node], [helper.make_tensor_value_info("variable", TensorProto.FLOAT, [None, 1])])


def onnx_native(data: bytes, kind: str):
    session = ort.InferenceSession(data, providers=["CPUExecutionProvider"])

    def predict(_model, rows):
        outputs = session.run(None, {"features": np.asarray(rows, dtype=np.float32)})
        if kind == "regressor":
            return [{"value": float(np.asarray(outputs[0]).reshape(-1)[0])}]
        label, probs = outputs[0][0], outputs[1][0]
        if isinstance(probs, dict):
            probs = [probs[k] for k in sorted(probs)]
        result = {"probabilities": [float(p) for p in probs]}
        # Label index in graph class order (the order bundle labels use).
        order = MC if kind == "mc" else [0, 1]
        result["label_index"] = [str(o) for o in order].index(str(label.decode() if isinstance(label, bytes) else label))
        return [result]

    return predict


def case(case_id, description, kind, data_fn, target, native_kind):
    data = data_fn()

    def build():
        y = target(X)
        kwargs = {"training_data": pd.concat([X, y], axis=1), "target_names": ["target"], "sample_rows": SAMPLES}
        return data, kwargs, X_TEST

    return Case(case_id, description, kind, False, build, native=onnx_native(data, native_kind), native_frame=False)


def cases() -> list[Case]:
    return [
        case("onnx_linear_clf_tensor_mc", "ONNX LinearClassifier 3 string classes, label + probability tensor outputs",
             "classifier", tensor_classifier, multiclass_target, "mc"),
        case("onnx_linear_clf_zipmap_bin", "ONNX LinearClassifier int64 classes [0,1] ending in ZipMap (label + seq(map))",
             "classifier", zipmap_classifier, lambda f: binary_target(f).map({"no": 0, "yes": 1}), "bin"),
        case("onnx_linear_reg", "ONNX LinearRegressor, [batch,1] float output", "regressor",
             linear_regressor, regression_target, "regressor"),
    ]


if __name__ == "__main__":
    run(sys.argv[1], cases())
