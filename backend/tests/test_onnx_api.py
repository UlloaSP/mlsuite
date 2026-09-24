"""ONNX artifacts exercise the same inspect, schema, match, and predict contracts."""

import json
from io import BytesIO

import numpy as np
import onnx
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from onnx import TensorProto, helper, numpy_helper

from mlsuite_backend.main import app
from tests.helpers import serialize_joblib


client = TestClient(app)


def _upload(content: bytes, name: str = "risk.onnx") -> tuple[str, BytesIO, str]:
    return name, BytesIO(content), "application/octet-stream"


def _model(nodes, inputs, outputs, initializers=(), ml_opset=False) -> bytes:
    graph = helper.make_graph(nodes, "tabular", inputs, outputs, initializer=initializers)
    opsets = [helper.make_opsetid("", 13)]
    if ml_opset:
        opsets.append(helper.make_opsetid("ai.onnx.ml", 1))
    model = helper.make_model(graph, opset_imports=opsets, ir_version=8)
    onnx.checker.check_model(model)
    return model.SerializeToString()


def _classifier(with_zipmap: bool = False, post_transform: str = "SOFTMAX") -> bytes:
    probability_name = "raw_probabilities" if with_zipmap else "probabilities"
    nodes = [
        helper.make_node(
            "LinearClassifier", ["features"], ["label", probability_name],
            domain="ai.onnx.ml", coefficients=[1.0, -1.0, -1.0, 1.0],
            intercepts=[0.0, 0.0], classlabels_strings=["low", "high"],
            post_transform=post_transform,
        )
    ]
    probability_type = helper.make_tensor_value_info("probabilities", TensorProto.FLOAT, [None, 2])
    if with_zipmap:
        nodes.append(helper.make_node(
            "ZipMap", [probability_name], ["probabilities"], domain="ai.onnx.ml",
            classlabels_strings=["low", "high"],
        ))
        probability_type = helper.make_value_info(
            "probabilities",
            helper.make_sequence_type_proto(helper.make_map_type_proto(
                TensorProto.STRING, helper.make_tensor_type_proto(TensorProto.FLOAT, []),
            )),
        )
    return _model(
        nodes,
        [helper.make_tensor_value_info("features", TensorProto.FLOAT, [None, 2])],
        [
            helper.make_tensor_value_info("label", TensorProto.STRING, [None]),
            probability_type,
        ],
        ml_opset=True,
    )


def _regressor() -> bytes:
    weight = numpy_helper.from_array(np.array([[2.0], [3.0]], dtype=np.float32), "weights")
    return _model(
        [helper.make_node("MatMul", ["features", "weights"], ["prediction"])],
        [helper.make_tensor_value_info("features", TensorProto.FLOAT, [None, 2])],
        [helper.make_tensor_value_info("prediction", TensorProto.FLOAT, [None, 1])],
        [weight],
    )


def _named_inputs_regressor() -> bytes:
    return _model(
        [helper.make_node("Add", ["age", "income"], ["prediction"])],
        [
            helper.make_tensor_value_info("age", TensorProto.FLOAT, [None, 1]),
            helper.make_tensor_value_info("income", TensorProto.FLOAT, [None, 1]),
        ],
        [helper.make_tensor_value_info("prediction", TensorProto.FLOAT, [None, 1])],
    )


def _integer_regressor() -> bytes:
    return _model(
        [helper.make_node("Cast", ["feature"], ["prediction"], to=TensorProto.FLOAT)],
        [helper.make_tensor_value_info("feature", TensorProto.INT64, [None, 1])],
        [helper.make_tensor_value_info("prediction", TensorProto.FLOAT, [None, 1])],
    )


def test_inspect_and_metadata_identify_onnx_classifier() -> None:
    for endpoint, key in (("/inspect_artifact", "artifact_file"), ("/metadata", "model_file")):
        response = client.post(endpoint, files={key: _upload(_classifier())})
        assert response.status_code == 200, response.text
        assert response.json()["type"] == "classifier"
        assert response.json()["specificType"] == "ONNX"
        if endpoint == "/inspect_artifact":
            assert response.json()["library"] == "onnx"
            assert response.json()["features"] == ["feature_1", "feature_2"]


def test_classifier_schema_and_prediction_keep_class_order() -> None:
    model = _classifier()
    schema = client.post("/build_schema", files={"model_file": _upload(model)})
    assert schema.status_code == 200, schema.text
    assert schema.json()["reports"][0]["labels"] == ["low", "high"]
    assert [field["mappedTo"] for field in schema.json()["fields"]] == [0, 1]

    prediction = client.post(
        "/predict", files={"model_file": _upload(model)},
        data={"data": json.dumps({"first": 2, "second": 1})},
    )
    assert prediction.status_code == 200, prediction.text
    report = prediction.json()["reports"][0]
    assert report["mapping"] == ["low", "high"]
    assert len(report["probabilities"][0]) == 2
    assert sum(report["probabilities"][0]) == pytest.approx(1.0)


def test_zipmap_classifier_keeps_probability_label_order() -> None:
    prediction = client.post(
        "/predict", files={"model_file": _upload(_classifier(with_zipmap=True))},
        data={"data": json.dumps({"first": 2, "second": 1})},
    )
    assert prediction.status_code == 200, prediction.text
    report = prediction.json()["reports"][0]
    assert report["mapping"] == ["low", "high"]
    assert sum(report["probabilities"][0]) == pytest.approx(1.0)


def test_classifier_accepts_probabilities_before_labels() -> None:
    model = onnx.load_model_from_string(_classifier())
    outputs = list(model.graph.output)
    model.graph.ClearField("output")
    model.graph.output.extend(reversed(outputs))
    onnx.checker.check_model(model)
    content = model.SerializeToString()

    inspected = client.post("/inspect_artifact", files={"artifact_file": _upload(content)})
    assert inspected.status_code == 200, inspected.text
    assert inspected.json()["type"] == "classifier"

    prediction = client.post(
        "/predict", files={"model_file": _upload(content)},
        data={"data": json.dumps({"first": 2, "second": 1})},
    )
    assert prediction.status_code == 200, prediction.text
    assert prediction.json()["reports"][0]["mapping"] == ["low", "high"]


def test_classifier_rejects_unnormalized_scores() -> None:
    response = client.post(
        "/predict", files={"model_file": _upload(_classifier(post_transform="NONE"))},
        data={"data": json.dumps({"first": 2, "second": 1})},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "ONNX classifier output must contain class probabilities."


def test_regressor_prediction_and_dataframe_match() -> None:
    model = _regressor()
    frame = pd.DataFrame({"first": [2.0, 3.0], "second": [1.0, 1.0]})
    matched = client.post(
        "/match_artifacts",
        files=[
            ("model_files", _upload(model)),
            ("dataframe_files", serialize_joblib(frame, "features.joblib")),
        ],
    )
    assert matched.status_code == 200, matched.text
    assert matched.json()["models"][0]["autoDataframeIndex"] == 0
    assert matched.json()["models"][0]["matches"][0]["smokePassed"] is True

    prediction = client.post(
        "/predict", files={"model_file": _upload(model)},
        data={"data": json.dumps({"first": 2, "second": 1})},
    )
    assert prediction.status_code == 200, prediction.text
    assert prediction.json()["reports"][0]["values"] == pytest.approx([7.0])


def test_named_inputs_use_input_names_as_schema_fields() -> None:
    model = _named_inputs_regressor()
    schema = client.post("/build_schema", files={"model_file": _upload(model)})
    assert schema.status_code == 200, schema.text
    assert [field["mappedTo"] for field in schema.json()["fields"]] == ["age", "income"]

    prediction = client.post(
        "/predict", files={"model_file": _upload(model)},
        data={"data": json.dumps({"age": 2, "income": 3})},
    )
    assert prediction.status_code == 200, prediction.text
    assert prediction.json()["reports"][0]["values"] == [5.0]


def test_integer_input_rejects_fractional_values_without_truncating() -> None:
    model = _integer_regressor()
    accepted = client.post(
        "/predict", files={"model_file": _upload(model)},
        data={"data": json.dumps({"feature": 4})},
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["reports"][0]["values"] == [4.0]

    rejected = client.post(
        "/predict", files={"model_file": _upload(model)},
        data={"data": json.dumps({"feature": 4.5})},
    )
    assert rejected.status_code == 400
    assert rejected.json()["detail"].startswith("ONNX integer inputs require whole numbers")


@pytest.mark.parametrize("content", [b"", b"not an ONNX model"])
def test_corrupt_onnx_is_rejected(content: bytes) -> None:
    response = client.post("/inspect_artifact", files={"artifact_file": _upload(content)})
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Cannot read ONNX artifact")


def test_unsupported_onnx_output_is_rejected() -> None:
    model = _model(
        [helper.make_node("Identity", ["features"], ["result"])],
        [helper.make_tensor_value_info("features", TensorProto.FLOAT, [None, 2])],
        [helper.make_tensor_value_info("result", TensorProto.FLOAT, [None, 2])],
    )
    response = client.post("/metadata", files={"model_file": _upload(model)})
    assert response.status_code == 400
    assert "class probabilities or one regression value" in response.json()["detail"]


def test_fixed_batch_larger_than_one_is_rejected_during_inspection() -> None:
    model = _model(
        [helper.make_node("Identity", ["features"], ["prediction"])],
        [helper.make_tensor_value_info("features", TensorProto.FLOAT, [2, 1])],
        [helper.make_tensor_value_info("prediction", TensorProto.FLOAT, [2, 1])],
    )
    response = client.post("/inspect_artifact", files={"artifact_file": _upload(model)})
    assert response.status_code == 400
    assert response.json()["detail"] == "ONNX inputs must accept a single row for prediction."


def test_invalid_onnx_values_are_client_errors() -> None:
    response = client.post(
        "/predict", files={"model_file": _upload(_regressor())},
        data={"data": json.dumps({"first": "wrong", "second": 1})},
    )
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid ONNX input values")
