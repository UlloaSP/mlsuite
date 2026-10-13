import pandas as pd
from fastapi.testclient import TestClient

from mlsuite_backend.main import app
from tests.helpers import (
    make_classifier,
    make_multi_output_classifier,
    make_multi_output_regressor,
    make_onehot_classifier,
    make_positional_classifier,
    make_positional_onehot_classifier,
    make_positional_regressor,
    make_xgboost_regressor,
    serialize_bundle,
)

client = TestClient(app)


def _schema(upload: tuple) -> dict:
    response = client.post("/metadata", files={"model_file": upload})
    assert response.status_code == 200, response.text
    return response.json()["schema"]


def test_schema_returns_bundle_fields_and_report() -> None:
    frame = pd.DataFrame({"age": [30, 32], "income": [50_000, 51_000]})
    payload = _schema(serialize_bundle(make_classifier(), training_data=frame))
    assert [field["kind"] for field in payload["fields"]] == ["number", "number"]
    assert [field["mappedTo"] for field in payload["fields"]] == ["age", "income"]
    assert payload["schema_version"] == "2"
    assert payload["source"] == "training_data"
    assert payload["onehot_separator"] == "__"
    assert payload["reports"] == [
        {
            "kind": "classifier",
            "label": "Predicted class",
            "mappedTo": 0,
            "labels": ["0", "1"],
            "showClassProbabilities": True,
        }
    ]


def test_schema_supports_xgboost_regressor() -> None:
    payload = _schema(serialize_bundle(make_xgboost_regressor()))
    assert [field["kind"] for field in payload["fields"]] == ["number", "number"]
    assert payload["reports"] == [{"kind": "regressor", "label": "Predicted value", "mappedTo": 0}]


def test_schema_maps_positional_model_fields_to_positions() -> None:
    frame = pd.DataFrame({"height": [1.7, 1.8], "weight": [70, 80]})
    payload = _schema(serialize_bundle(make_positional_regressor(), training_data=frame))
    assert [field["label"] for field in payload["fields"]] == ["height", "weight"]
    assert [field["mappedTo"] for field in payload["fields"]] == [0, 1]


def test_schema_maps_positional_onehot_options_to_positions() -> None:
    frame = pd.DataFrame({"size": [10, 20], "color__red": [1, 0], "color__blue": [0, 1]})
    payload = _schema(serialize_bundle(make_positional_onehot_classifier(), training_data=frame))
    assert [field["mappedTo"] for field in payload["fields"] if "mappedTo" in field] == [0]
    assert payload["fields"][1]["options"] == [
        {"label": "red", "value": "red", "mappedTo": 1},
        {"label": "blue", "value": "blue", "mappedTo": 2},
    ]


def test_schema_without_training_data_returns_the_default_schema() -> None:
    payload = _schema(serialize_bundle(make_classifier()))
    assert payload["source"] == "default"
    assert payload["fields"] == [
        {"label": "age", "required": True, "mappedTo": "age", "kind": "number", "step": 0.1},
        {"label": "income", "required": True, "mappedTo": "income", "kind": "number", "step": 0.1},
    ]


def test_schema_without_training_data_labels_positional_features() -> None:
    payload = _schema(serialize_bundle(make_positional_classifier()))
    assert [field["label"] for field in payload["fields"]] == ["feature_0", "feature_1"]
    assert [field["mappedTo"] for field in payload["fields"]] == [0, 1]


def test_schema_maps_each_regressor_output_to_its_position() -> None:
    payload = _schema(serialize_bundle(make_multi_output_regressor()))
    assert payload["reports"] == [
        {"kind": "regressor", "label": "Predicted value 0", "mappedTo": 0},
        {"kind": "regressor", "label": "Predicted value 1", "mappedTo": 1},
    ]


def test_schema_maps_each_classifier_output_to_its_position() -> None:
    payload = _schema(serialize_bundle(make_multi_output_classifier()))
    assert [report["mappedTo"] for report in payload["reports"]] == [0, 1]
    assert [report["label"] for report in payload["reports"]] == [
        "Predicted class 0",
        "Predicted class 1",
    ]
    assert [report["labels"] for report in payload["reports"]] == [["flat", "house"], ["0", "1"]]


def test_schema_groups_onehot_columns() -> None:
    frame = pd.DataFrame(
        {
            "color__red": [1, 0],
            "color__blue": [0, 1],
            "size": [10, 20],
        }
    )
    payload = _schema(serialize_bundle(make_onehot_classifier(), training_data=frame))
    assert payload["fields"][0] == {
        "label": "color",
        "required": True,
        "kind": "onehot-category",
        "options": [
            {"label": "red", "value": "red", "mappedTo": "color__red"},
            {"label": "blue", "value": "blue", "mappedTo": "color__blue"},
        ],
    }


def test_schema_keeps_the_separator_the_bundle_was_exported_with() -> None:
    frame = pd.DataFrame({"size": [10, 20], "color_red": [1, 0], "color_blue": [0, 1]})
    payload = _schema(
        serialize_bundle(
            make_positional_onehot_classifier(), training_data=frame, onehot_separator="_"
        )
    )
    assert payload["onehot_separator"] == "_"
    assert payload["fields"][1]["label"] == "color"
    assert [option["mappedTo"] for option in payload["fields"][1]["options"]] == [1, 2]


def test_schema_series_fields_come_with_mlform_columns() -> None:
    frame = pd.DataFrame({"age": [(1, 2), (3, 4)], "income": [20000, 45000]})
    field = _schema(serialize_bundle(make_classifier(), training_data=frame))["fields"][0]
    assert field["kind"] == "series"
    assert field["mappedTo"] == "age"
    assert [column["id"] for column in field["columns"]] == ["field1", "field2"]
