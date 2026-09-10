import json

from fastapi.testclient import TestClient

from mlsuite_backend.main import app
from tests.helpers import make_classifier, make_positional_classifier, serialize_joblib

client = TestClient(app)


def test_predict_accepts_all_model_features() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_joblib(make_classifier(), "model.joblib")},
        data={"data": json.dumps({"age": 40, "income": 55_000})},
    )

    assert response.status_code == 200


def test_predict_rejects_missing_model_features() -> None:
    response = client.post(
        "/predict",
        files={"model_file": serialize_joblib(make_classifier(), "model.joblib")},
        data={"data": json.dumps({"age": 40})},
    )

    assert response.status_code == 400
    assert "Missing features" in response.json()["detail"]


def test_predict_rejects_wrong_positional_feature_count() -> None:
    response = client.post(
        "/predict",
        files={
            "model_file": serialize_joblib(make_positional_classifier(), "model.joblib")
        },
        data={"data": json.dumps({"0": 40})},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Model expects 2 features, record has 1."
