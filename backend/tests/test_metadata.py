from io import BytesIO

import mlbundle
import pandas as pd
import pytest

from mlsuite_backend import policy
from mlsuite_backend.policy import parse_allowlist
from tests.client import client
from tests.helpers import (
    environment_of,
    legacy_bundle,
    make_onnx_classifier,
    make_positional_regressor,
    make_xgboost_classifier,
    serialize_bundle,
)


def test_metadata_describes_model_and_the_environment_it_needs() -> None:
    upload = serialize_bundle(make_xgboost_classifier(), "risk.mlbundle")
    response = client.post("/metadata", files={"model_file": upload})
    assert response.status_code == 200, response.text
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
    environment = payload.pop("environment")
    lock = mlbundle.EnvironmentLock.from_bytes(environment.pop("lock").encode())
    assert environment == {
        "key": environment_of(upload),
        "environmentId": lock.environment_id,
        "writerVersion": mlbundle.__version__,
        "pythonVersion": lock.python_version,
        "packages": [{"name": package.name, "version": package.version} for package in lock.packages],
    }
    assert {"xgboost", "scikit-learn"} <= {package["name"] for package in environment["packages"]}
    assert payload == {
        "fileName": "risk.mlbundle",
        "type": "classifier",
        "specificType": "XGBClassifier",
        "library": "xgboost",
        "features": ["age", "income"],
        "featureSource": "model",
        # Read once the model loads in its environment (see test_verify).
        "featureImportances": None,
    }


def test_metadata_names_the_features_of_a_model_without_names() -> None:
    response = client.post(
        "/metadata", files={"model_file": serialize_bundle(make_positional_regressor())}
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["features"] == ["feature_0", "feature_1"]
    assert payload["featureSource"] == "generated"


@pytest.mark.allowlist
def test_metadata_refuses_a_bundle_whose_environment_is_not_allowed(monkeypatch) -> None:
    frame = pd.DataFrame({"first": [2.0], "second": [1.0]})
    upload = serialize_bundle(make_onnx_classifier(), training_data=frame)
    lock = mlbundle.inspect(upload[1].getvalue()).environment_lock
    granted = [package for package in lock.packages if package.name != "onnxruntime"]
    allowlist = parse_allowlist(
        f'python = ["{lock.python_version}"]\n'
        f'[mlbundle]\n"{mlbundle.__version__}" = "{"0" * 64}"\n'
        "[packages]\n" + "".join(f'{package.name} = ["{package.version}"]\n' for package in granted)
    )
    monkeypatch.setattr(policy, "allowlist", lambda: allowlist)

    response = client.post("/metadata", files={"model_file": upload})

    assert response.status_code == 422
    assert response.json()["detail"] == {
        "message": "The bundle needs packages MLsuite does not install",
        "refused": [f"onnxruntime=={lock.version('onnxruntime')}"],
    }


def test_a_bundle_without_a_lock_is_read_in_the_legacy_environment() -> None:
    response = client.post("/metadata", files={"model_file": legacy_bundle("legacy-tree")})
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["environment"] == {"key": "legacy"}
    assert payload["manifest"]["writer_version"] == "0.2.1"
    assert payload["specificType"] == "DecisionTreeClassifier"
    assert [item["feature"] for item in payload["featureImportances"]] == ["age", "income"]


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
