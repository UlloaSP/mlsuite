import json

from fastapi.testclient import TestClient

from mlsuite_backend.main import app
from tests.helpers import make_classifier, run_request, serialize_bundle

client = TestClient(app)


def test_predict_accepts_all_model_features() -> None:
    upload = serialize_bundle(make_classifier())
    response = client.post(
        "/predict", **run_request(upload, data=json.dumps({"age": 40, "income": 55_000}))
    )

    assert response.status_code == 200


def test_predict_rejects_missing_model_features() -> None:
    upload = serialize_bundle(make_classifier())
    response = client.post("/predict", **run_request(upload, data=json.dumps({"age": 40})))

    assert response.status_code == 400
    assert "Missing features" in response.json()["detail"]
