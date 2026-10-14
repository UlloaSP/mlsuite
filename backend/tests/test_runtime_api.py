import json
from io import BytesIO

import mlbundle
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from mlsuite_backend.main import app
from tests.helpers import (
    make_catboost_pipeline,
    make_classifier,
    make_multi_output_classifier,
    make_multi_output_regressor,
    make_onnx_classifier,
    make_positional_regressor,
    make_regressor,
    make_decimal_tree,
    make_tree,
    make_tree_with_unused_tail_feature,
    make_xgboost_classifier,
    make_xgboost_regressor,
    serialize_bundle,
)

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_metadata_describes_model() -> None:
    response = client.post(
        "/metadata",
        files={"model_file": serialize_bundle(make_xgboost_classifier(), "risk.mlbundle")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert set(payload.pop("schema")) == {
        "schema_version",
        "source",
        "onehot_separator",
        "fields",
        "reports",
    }
    manifest = payload.pop("manifest")
    assert manifest["writer_version"] == "0.1.0a3"
    assert manifest["model"]["estimator_class"] == "XGBClassifier"
    assert manifest["references"]["schema"] == "schema.json"
    importances = payload.pop("featureImportances")
    assert [item["feature"] for item in importances] == ["age", "income"]
    assert all(isinstance(item["importance"], float) for item in importances)
    assert payload == {
        "fileName": "risk.mlbundle",
        "type": "classifier",
        "specificType": "XGBClassifier",
        "library": "xgboost",
        "features": ["age", "income"],
        "featureSource": "model",
    }


def test_metadata_has_no_importances_for_a_model_without_structure() -> None:
    frame = pd.DataFrame({"first": [2.0], "second": [1.0]})
    response = client.post(
        "/metadata",
        files={"model_file": serialize_bundle(make_onnx_classifier(), training_data=frame)},
    )
    assert response.status_code == 200
    assert response.json()["featureImportances"] is None


def test_metadata_names_pipeline_importances_by_transformed_feature() -> None:
    response = client.post(
        "/metadata", files={"model_file": serialize_bundle(make_catboost_pipeline())}
    )
    assert response.status_code == 200
    importances = response.json()["featureImportances"]
    assert [item["feature"] for item in importances] == ["age", "income"]
    assert sum(item["importance"] for item in importances) == pytest.approx(100.0)


def test_metadata_names_the_features_of_a_model_without_names() -> None:
    response = client.post(
        "/metadata", files={"model_file": serialize_bundle(make_positional_regressor())}
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["features"] == ["feature_0", "feature_1"]
    assert payload["featureSource"] == "generated"


@pytest.mark.parametrize("filename", ["model.txt", "model.joblib", "model.onnx"])
def test_metadata_rejects_files_that_are_not_bundles(filename: str) -> None:
    response = client.post(
        "/metadata", files={"model_file": (filename, BytesIO(b"nope"), "text/plain")}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "File must be .mlbundle"


@pytest.mark.parametrize("content", [b"", b"This is not a bundle.", b"\x80\x04"])
def test_metadata_rejects_corrupt_bundle(content: bytes) -> None:
    response = client.post(
        "/metadata",
        files={"model_file": ("model.mlbundle", BytesIO(content), "application/octet-stream")},
    )
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Cannot load bundle:")


def test_predict_classifier_success() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_classifier())},
        data={"data": json.dumps({"age": "40", "income": "55000"})},
    )
    payload = response.json()
    assert response.status_code == 200
    assert set(payload["reports"][0]) == {
        "kind",
        "output",
        "execution_time",
        "mapping",
        "probabilities",
        "prediction",
    }
    assert payload["reports"][0]["kind"] == "classifier"
    assert payload["reports"][0]["prediction"] in payload["reports"][0]["mapping"]


def test_predict_xgboost_classifier_success() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_xgboost_classifier())},
        data={"data": json.dumps({"age": 40, "income": 55_000})},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["reports"][0]["kind"] == "classifier"
    assert payload["reports"][0]["mapping"] == ["0", "1"]
    assert payload["reports"][0]["probabilities"]


def test_predict_regressor_success() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_regressor())},
        data={"data": json.dumps({"rooms": 3, "area": 60})},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["reports"][0]["kind"] == "regressor"
    assert isinstance(payload["reports"][0]["values"], list)


def test_predict_xgboost_regressor_success() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_xgboost_regressor())},
        data={"data": json.dumps({"rooms": 3, "area": 60})},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["reports"][0]["kind"] == "regressor"
    assert isinstance(payload["reports"][0]["values"], list)


def test_predict_onnx_classifier_keeps_class_order() -> None:
    frame = pd.DataFrame({"first": [2.0], "second": [1.0]})
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_onnx_classifier(), training_data=frame)},
        data={"data": json.dumps({"0": 2, "1": 1})},
    )
    assert response.status_code == 200, response.text
    report = response.json()["reports"][0]
    assert report["mapping"] == ["low", "high"]
    assert sum(report["probabilities"]) == pytest.approx(1.0)


def test_predict_catboost_pipeline_success() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_catboost_pipeline())},
        data={"data": json.dumps({"age": 40, "income": 55_000})},
    )
    assert response.status_code == 200, response.text
    report = response.json()["reports"][0]
    assert report["mapping"] == ["0", "1"]
    assert sum(report["probabilities"]) == pytest.approx(1.0)


def test_predict_reads_positional_model_inputs_by_position() -> None:
    frame = pd.DataFrame({"height": [1.7, 1.8], "weight": [70, 80]})
    name, content, media_type = serialize_bundle(make_positional_regressor(), training_data=frame)

    def predict(record: dict[str, object]):
        return client.post(
            "/predict",
            files={"model_file": (name, BytesIO(content.getvalue()), media_type)},
            data={"data": json.dumps(record)},
        )

    assert predict({"0": 2, "1": 45}).json()["reports"][0]["values"] == pytest.approx([160_000])
    by_name = predict({"height": 2, "weight": 45})
    assert by_name.status_code == 400
    assert "Missing features" in by_name.json()["detail"]


def test_predict_answers_every_output_of_a_regressor() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_multi_output_regressor())},
        data={"data": json.dumps({"rooms": 3, "area": 60})},
    )
    assert response.status_code == 200, response.text
    reports = response.json()["reports"]
    assert [report["output"] for report in reports] == [0, 1]
    assert reports[0]["values"] == pytest.approx([220.0])
    assert reports[1]["values"] == pytest.approx([3.0])


def test_predict_answers_every_output_of_a_classifier() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_multi_output_classifier())},
        data={"data": json.dumps({"rooms": 3, "area": 60})},
    )
    assert response.status_code == 200, response.text
    reports = response.json()["reports"]
    assert [report["output"] for report in reports] == [0, 1]
    assert [report["mapping"] for report in reports] == [["flat", "house"], ["0", "1"]]
    assert [report["probabilities"] for report in reports] == [[0.0, 1.0], [1.0, 0.0]]
    assert [report["prediction"] for report in reports] == ["house", "0"]


def test_predict_verifies_a_bundle_once_across_requests(monkeypatch) -> None:
    loads = []
    load = mlbundle.load

    def counting_load(content: bytes) -> mlbundle.LoadedBundle:
        loads.append(content)
        return load(content)

    monkeypatch.setattr(mlbundle, "load", counting_load)
    name, content, media_type = serialize_bundle(make_regressor())
    for _ in range(2):
        response = client.post(
            "/predict",
            files={"model_file": (name, BytesIO(content.getvalue()), media_type)},
            data={"data": json.dumps({"rooms": 3, "area": 60})},
        )
        assert response.status_code == 200
    assert len(loads) == 1


def test_predict_rejects_invalid_json() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_classifier())},
        data={"data": "{oops"},
    )
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid JSON:")


def test_predict_rejects_non_numeric_value() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_bundle(make_classifier())},
        data={"data": json.dumps({"age": "old", "income": 55_000})},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == 'Feature "age": expected a decimal or true/false string.'


def test_explain_success() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_bundle(make_tree())},
        data={"data": json.dumps({"age": 40, "income": 55_000}), "traces": "[]"},
    )
    assert response.status_code == 200
    assert response.json()["reports"][0]["explanation"] == (
        "  *\n  |__Predicted class 0 for instance 0 (100 probability)\n  |  |__income <= 57500.0\n"
    )


def test_explain_keeps_decimal_inputs_exact() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_bundle(make_decimal_tree())},
        data={"data": json.dumps({"ratio": 0.19}), "traces": "[]"},
    )
    assert response.status_code == 200
    explanation = response.json()["reports"][0]["explanation"]
    assert "Predicted class 0" in explanation
    assert "ratio <= 0.19" in explanation


def test_explain_success_when_tree_does_not_use_tail_features() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_bundle(make_tree_with_unused_tail_feature())},
        data={
            "data": json.dumps({"age": 40, "income": 55_000, "unused": 7}),
            "traces": "[]",
        },
    )
    payload = response.json()
    assert response.status_code == 200
    assert "income <= 57500.0" in payload["reports"][0]["explanation"]


def test_explain_rejects_non_tree_model() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_bundle(make_classifier())},
        data={"data": json.dumps({"age": 40, "income": 55_000}), "traces": "[]"},
    )
    assert response.status_code == 400
    assert "DecisionTree estimator" in response.json()["detail"]


def test_explain_rejects_invalid_traces_json() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_bundle(make_tree())},
        data={"data": json.dumps({"age": 40, "income": 55_000}), "traces": "{bad"},
    )
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid traces JSON:")


def test_explain_rejects_invalid_trace_shape() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_bundle(make_tree())},
        data={
            "data": json.dumps({"age": 40, "income": 55_000}),
            "traces": json.dumps([{"text": "old", "conditions": [{"value": 1}]}]),
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid traces JSON:")


def test_explain_rejects_custom_traces() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_bundle(make_tree())},
        data={
            "data": json.dumps({"age": 40, "income": 55_000}),
            "traces": json.dumps([{"text": "Predicted %_class", "feature": "prediction"}]),
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Custom traces are not supported by crystal-tree 0.3"


def test_explain_rejects_missing_features() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_bundle(make_tree())},
        data={"data": json.dumps({"age": 40}), "traces": "[]"},
    )
    assert response.status_code == 400
    assert "Missing features" in response.json()["detail"]


def test_explain_falls_back_when_crystal_tree_returns_none(monkeypatch) -> None:
    import mlsuite_backend.services.explanation_service as explanation_service

    monkeypatch.setattr(
        explanation_service,
        "explain_tree",
        lambda *_args, **_kwargs: [],
    )
    response = client.post(
        "/explain",
        files={"model_file": serialize_bundle(make_tree())},
        data={"data": json.dumps({"age": 40, "income": 55_000}), "traces": "[]"},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["reports"][0]["explanation"].startswith("Prediction path")
