import json
from io import BytesIO

import joblib
import pandas as pd
from fastapi.testclient import TestClient

from mlsuite_backend.main import app
from tests.helpers import (
    make_classifier,
    make_no_feature_classifier,
    make_regressor,
    make_tree,
    make_tree_with_unused_tail_feature,
    make_xgboost_classifier,
    make_xgboost_regressor,
    serialize_joblib,
)

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_metadata_success() -> None:
    response = client.post("/metadata", files={"model_file": serialize_joblib(make_classifier(), "model.joblib")})
    payload = response.json()
    assert response.status_code == 200
    assert payload["fileName"] == "model.joblib"
    assert payload["type"] == "classifier"


def test_metadata_supports_xgboost_classifier() -> None:
    response = client.post(
        "/metadata",
        files={"model_file": serialize_joblib(make_xgboost_classifier(), "model.joblib")},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["type"] == "classifier"
    assert payload["specificType"] == "XGBClassifier"


def test_metadata_rejects_non_joblib() -> None:
    response = client.post("/metadata", files={"model_file": ("model.txt", BytesIO(b"nope"), "text/plain")})
    assert response.status_code == 400
    assert response.json()["detail"] == "File must be .joblib"


def test_metadata_rejects_non_estimator() -> None:
    response = client.post("/metadata", files={"model_file": serialize_joblib({"bad": "payload"}, "model.joblib")})
    assert response.status_code == 400
    assert response.json()["detail"] == "Model must be a supported classifier or regressor."


def test_build_schema_success_with_optional_dataframe() -> None:
    frame = pd.DataFrame({"age": [30, 32], "income": [50_000, 51_000]})
    response = client.post(
        "/build_schema",
        files={
            "model_file": serialize_joblib(make_classifier(), "model.joblib"),
            "df_file": serialize_joblib(frame, "data.joblib"),
        },
    )
    payload = response.json()
    assert response.status_code == 200
    assert isinstance(payload["explanations"], list)
    assert payload["reports"][0]["kind"] == "classifier"


def test_build_schema_supports_xgboost_regressor() -> None:
    frame = pd.DataFrame({"rooms": [2, 3], "area": [45, 60]})
    response = client.post(
        "/build_schema",
        files={
            "model_file": serialize_joblib(make_xgboost_regressor(), "model.joblib"),
            "df_file": serialize_joblib(frame, "data.joblib"),
        },
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["reports"][0]["kind"] == "regressor"


def test_build_schema_rejects_non_joblib_model() -> None:
    response = client.post("/build_schema", files={"model_file": ("model.txt", BytesIO(b"nope"), "text/plain")})
    assert response.status_code == 400
    assert response.json()["detail"] == "File must be .joblib"


def test_build_schema_rejects_missing_feature_names() -> None:
    response = client.post(
        "/build_schema",
        files={"model_file": serialize_joblib(make_no_feature_classifier(), "model.joblib")},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "No feature names found in the model."


def test_build_schema_rejects_missing_dataframe_columns() -> None:
    frame = pd.DataFrame({"age": [30, 32]})
    response = client.post(
        "/build_schema",
        files={
            "model_file": serialize_joblib(make_classifier(), "model.joblib"),
            "df_file": serialize_joblib(frame, "data.joblib"),
        },
    )
    assert response.status_code == 400
    assert "required columns" in response.json()["detail"]


def test_predict_classifier_success() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_joblib(make_classifier(), "model.joblib")},
        data={"data": json.dumps({"age": "40", "income": "55000"})},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["outputs"][0]["type"] == "classifier"
    assert payload["outputs"][0]["showClassProbabilities"] is True
    assert "execution_time" in payload["outputs"][0]


def test_predict_xgboost_classifier_success() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_joblib(make_xgboost_classifier(), "model.joblib")},
        data={"data": json.dumps({"age": 40, "income": 55_000})},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["outputs"][0]["type"] == "classifier"
    assert payload["outputs"][0]["mapping"] == ["0", "1"]
    assert payload["outputs"][0]["probabilities"]


def test_predict_regressor_success() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_joblib(make_regressor(), "model.joblib")},
        data={"data": json.dumps({"rooms": 3, "area": 60})},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["outputs"][0]["type"] == "regressor"
    assert isinstance(payload["outputs"][0]["values"], list)


def test_predict_xgboost_regressor_success() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_joblib(make_xgboost_regressor(), "model.joblib")},
        data={"data": json.dumps({"rooms": 3, "area": 60})},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["outputs"][0]["type"] == "regressor"
    assert isinstance(payload["outputs"][0]["values"], list)


def test_predict_rejects_invalid_json() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_joblib(make_classifier(), "model.joblib")},
        data={"data": "{oops"},
    )
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid JSON:")


def test_predict_rejects_non_estimator() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_joblib({"bad": "payload"}, "model.joblib")},
        data={"data": json.dumps({"age": 1})},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Model must be a supported classifier or regressor."


def test_explain_success() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_joblib(make_tree(), "model.joblib")},
        data={"data": json.dumps({"age": 40, "income": 55_000}), "traces": "[]"},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["explanations"]


def test_explain_success_when_tree_does_not_use_tail_features() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_joblib(make_tree_with_unused_tail_feature(), "model.joblib")},
        data={"data": json.dumps({"age": 40, "income": 55_000, "unused": 7}), "traces": "[]"},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["explanations"]


def test_explain_rejects_non_tree_model() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_joblib(make_classifier(), "model.joblib")},
        data={"data": json.dumps({"age": 40, "income": 55_000}), "traces": "[]"},
    )
    assert response.status_code == 400
    assert "DecisionTree estimator" in response.json()["detail"]


def test_explain_rejects_invalid_traces_json() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_joblib(make_tree(), "model.joblib")},
        data={"data": json.dumps({"age": 40, "income": 55_000}), "traces": "{bad"},
    )
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid traces JSON:")


def test_explain_rejects_missing_features() -> None:
    response = client.post(
        "/explain",
        files={"model_file": serialize_joblib(make_tree(), "model.joblib")},
        data={"data": json.dumps({"age": 40}), "traces": "[]"},
    )
    assert response.status_code == 400
    assert "Missing features" in response.json()["detail"]


def test_explain_falls_back_when_crystal_tree_returns_none(monkeypatch) -> None:
    import mlsuite_backend.services.explanation_service as explanation_service

    monkeypatch.setattr(
        explanation_service,
        "explain_with_feature_name_aliases",
        lambda *_args, **_kwargs: [],
    )
    response = client.post(
        "/explain",
        files={"model_file": serialize_joblib(make_tree(), "model.joblib")},
        data={"data": json.dumps({"age": 40, "income": 55_000}), "traces": "[]"},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["explanations"][0].startswith("Prediction path")
