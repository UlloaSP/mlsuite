from io import BytesIO

import mlbundle
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from mlsuite_backend.main import app
from tests.helpers import (
    make_catboost_pipeline,
    make_onnx_classifier,
    make_positional_regressor,
    make_xgboost_classifier,
    serialize_bundle,
)

client = TestClient(app)


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
    assert manifest["writer_version"] == mlbundle.__version__
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
