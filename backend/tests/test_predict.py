import json

import pandas as pd
import pytest

from tests.client import client
from tests.helpers import (
    make_catboost_pipeline,
    make_classifier,
    make_multi_output_classifier,
    make_multi_output_regressor,
    make_onnx_classifier,
    make_positional_regressor,
    make_regressor,
    make_xgboost_classifier,
    make_xgboost_regressor,
    run_request,
    serialize_bundle,
)



def _predict(model: object, record: dict[str, object], **export: object):
    upload = serialize_bundle(model, **export)
    return client.post("/predict", **run_request(upload, data=json.dumps(record)))


def test_predict_classifier_success() -> None:
    response = _predict(make_classifier(), {"age": "40", "income": "55000"})
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
    response = _predict(make_xgboost_classifier(), {"age": 40, "income": 55_000})
    payload = response.json()
    assert response.status_code == 200
    assert payload["reports"][0]["kind"] == "classifier"
    assert payload["reports"][0]["mapping"] == ["0", "1"]
    assert payload["reports"][0]["probabilities"]


@pytest.mark.parametrize("make_model", [make_regressor, make_xgboost_regressor])
def test_predict_regressor_success(make_model) -> None:
    response = _predict(make_model(), {"rooms": 3, "area": 60})
    payload = response.json()
    assert response.status_code == 200
    assert payload["reports"][0]["kind"] == "regressor"
    assert isinstance(payload["reports"][0]["values"], list)


def test_predict_onnx_classifier_keeps_class_order() -> None:
    frame = pd.DataFrame({"first": [2.0], "second": [1.0]})
    response = _predict(make_onnx_classifier(), {"0": 2, "1": 1}, training_data=frame)
    assert response.status_code == 200, response.text
    report = response.json()["reports"][0]
    assert report["mapping"] == ["low", "high"]
    assert sum(report["probabilities"]) == pytest.approx(1.0)


def test_predict_catboost_pipeline_success() -> None:
    response = _predict(make_catboost_pipeline(), {"age": 40, "income": 55_000})
    assert response.status_code == 200, response.text
    report = response.json()["reports"][0]
    assert report["mapping"] == ["0", "1"]
    assert sum(report["probabilities"]) == pytest.approx(1.0)


def test_predict_reads_positional_model_inputs_by_position() -> None:
    frame = pd.DataFrame({"height": [1.7, 1.8], "weight": [70, 80]})
    upload = serialize_bundle(make_positional_regressor(), training_data=frame)

    def predict(record: dict[str, object]):
        return client.post("/predict", **run_request(upload, data=json.dumps(record)))

    assert predict({"0": 2, "1": 45}).json()["reports"][0]["values"] == pytest.approx([160_000])
    by_name = predict({"height": 2, "weight": 45})
    assert by_name.status_code == 400
    assert "Missing features" in by_name.json()["detail"]


def test_predict_answers_every_output_of_a_regressor() -> None:
    response = _predict(make_multi_output_regressor(), {"rooms": 3, "area": 60})
    assert response.status_code == 200, response.text
    reports = response.json()["reports"]
    assert [report["output"] for report in reports] == [0, 1]
    assert reports[0]["values"] == pytest.approx([220.0])
    assert reports[1]["values"] == pytest.approx([3.0])


def test_predict_answers_every_output_of_a_classifier() -> None:
    response = _predict(make_multi_output_classifier(), {"rooms": 3, "area": 60})
    assert response.status_code == 200, response.text
    reports = response.json()["reports"]
    assert [report["output"] for report in reports] == [0, 1]
    assert [report["mapping"] for report in reports] == [["flat", "house"], ["0", "1"]]
    assert [report["probabilities"] for report in reports] == [[0.0, 1.0], [1.0, 0.0]]
    assert [report["prediction"] for report in reports] == ["house", "0"]


def test_predict_rejects_invalid_json() -> None:
    upload = serialize_bundle(make_classifier())
    response = client.post("/predict", **run_request(upload, data="{oops"))
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid JSON:")


def test_predict_rejects_non_numeric_value() -> None:
    response = _predict(make_classifier(), {"age": "old", "income": 55_000})
    assert response.status_code == 400
    assert response.json()["detail"] == 'Feature "age": expected a decimal or true/false string.'
