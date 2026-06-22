from io import BytesIO

import pandas as pd
from fastapi.testclient import TestClient

from mlsuite_backend.main import app
from tests.helpers import (
    make_classifier,
    make_positional_classifier,
    make_regressor,
    make_xgboost_classifier,
    serialize_joblib,
)

client = TestClient(app)


def test_inspect_artifact_identifies_model() -> None:
    response = client.post(
        "/inspect_artifact",
        files={
            "artifact_file": serialize_joblib(make_xgboost_classifier(), "model.joblib")
        },
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["kind"] == "model"
    assert payload["type"] == "classifier"
    assert payload["specificType"] == "XGBClassifier"
    assert payload["library"] == "xgboost"


def test_inspect_artifact_identifies_dataframe() -> None:
    frame = pd.DataFrame({"age": [30, 32], "income": [50_000, 51_000]})
    response = client.post(
        "/inspect_artifact",
        files={"artifact_file": serialize_joblib(frame, "features.joblib")},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["kind"] == "dataframe"
    assert payload["rows"] == 2
    assert payload["columns"] == ["age", "income"]


def test_inspect_artifact_rejects_non_joblib() -> None:
    response = client.post(
        "/inspect_artifact",
        files={"artifact_file": ("artifact.txt", BytesIO(b"nope"), "text/plain")},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "File must be .joblib"


def test_inspect_artifact_rejects_unsupported_joblib() -> None:
    response = client.post(
        "/inspect_artifact",
        files={
            "artifact_file": serialize_joblib({"bad": "payload"}, "artifact.joblib")
        },
    )
    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Artifact must be a supported model or pandas DataFrame."
    )


def test_match_artifacts_assigns_one_dataframe_to_multiple_models() -> None:
    frame = pd.DataFrame(
        {
            "age": [30, 32],
            "income": [50_000, 51_000],
            "rooms": [2, 3],
            "area": [45, 60],
            "ignored": ["x", "y"],
        }
    )
    response = client.post(
        "/match_artifacts",
        files=[
            ("model_files", serialize_joblib(make_classifier(), "classifier.joblib")),
            ("model_files", serialize_joblib(make_regressor(), "regressor.joblib")),
            ("dataframe_files", serialize_joblib(frame, "shared.joblib")),
        ],
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["models"][0]["autoDataframeIndex"] == 0
    assert payload["models"][1]["autoDataframeIndex"] == 0
    assert payload["models"][0]["matches"][0]["extra"]
    assert payload["models"][1]["matches"][0]["compatible"] is True


def test_match_artifacts_reports_missing_columns() -> None:
    frame = pd.DataFrame({"age": [30, 32]})
    response = client.post(
        "/match_artifacts",
        files=[
            ("model_files", serialize_joblib(make_classifier(), "classifier.joblib")),
            ("dataframe_files", serialize_joblib(frame, "partial.joblib")),
        ],
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["models"][0]["autoDataframeIndex"] is None
    assert payload["models"][0]["matches"][0]["compatible"] is False
    assert payload["models"][0]["matches"][0]["missing"] == ["income"]


def test_match_artifacts_assigns_positional_model_by_dataframe_width() -> None:
    frame = pd.DataFrame({"height": [1.7, 1.8], "weight": [70, 80]})
    response = client.post(
        "/match_artifacts",
        files=[
            (
                "model_files",
                serialize_joblib(make_positional_classifier(), "model.joblib"),
            ),
            ("dataframe_files", serialize_joblib(frame, "measurements.joblib")),
        ],
    )
    payload = response.json()
    match = payload["models"][0]["matches"][0]
    assert response.status_code == 200
    assert payload["models"][0]["featureSource"] == "generated"
    assert payload["models"][0]["autoDataframeIndex"] == 0
    assert match["compatible"] is True
    assert match["mode"] == "count"


def test_match_artifacts_keeps_positional_count_match_when_smoke_fails() -> None:
    frame = pd.DataFrame({"height": ["bad", "values"], "weight": ["still", "width-ok"]})
    response = client.post(
        "/match_artifacts",
        files=[
            (
                "model_files",
                serialize_joblib(make_positional_classifier(), "model.joblib"),
            ),
            ("dataframe_files", serialize_joblib(frame, "measurements.joblib")),
        ],
    )
    payload = response.json()
    match = payload["models"][0]["matches"][0]
    assert response.status_code == 200
    assert payload["models"][0]["autoDataframeIndex"] == 0
    assert match["compatible"] is True
    assert match["smokePassed"] is False
    assert match["smokeReason"].startswith("predict smoke failed:")


def test_match_artifacts_rejects_positional_width_mismatch() -> None:
    frame = pd.DataFrame({"only_one": [1, 2]})
    response = client.post(
        "/match_artifacts",
        files=[
            (
                "model_files",
                serialize_joblib(make_positional_classifier(), "model.joblib"),
            ),
            ("dataframe_files", serialize_joblib(frame, "partial.joblib")),
        ],
    )
    payload = response.json()
    match = payload["models"][0]["matches"][0]
    assert response.status_code == 200
    assert payload["models"][0]["autoDataframeIndex"] is None
    assert match["compatible"] is False
    assert match["reason"] == "model expects 2 columns, dataframe has 1"


def test_match_artifacts_rejects_non_dataframe_upload() -> None:
    response = client.post(
        "/match_artifacts",
        files=[
            ("model_files", serialize_joblib(make_classifier(), "classifier.joblib")),
            ("dataframe_files", serialize_joblib({"bad": "payload"}, "bad.joblib")),
        ],
    )
    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Dataframe files must contain pandas DataFrame objects."
    )
