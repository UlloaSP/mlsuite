"""A model's first load in its environment: proves it runs there and reads its importances."""

import sys
from pathlib import Path

import pandas as pd
import pytest

from mlsuite_backend import environments
from mlsuite_backend.environments import Environment
from tests.client import client
from tests.helpers import (
    legacy_bundle,
    make_catboost_pipeline,
    make_classifier,
    make_onnx_classifier,
    make_xgboost_classifier,
    run_request,
    serialize_bundle,
)

FRAME = pd.DataFrame(
    {"age": [22, 35, 47, 52, 46, 56], "income": [20_000, 45_000, 80_000, 90_000, 70_000, 120_000]}
)


def _verify(upload):
    return client.post("/verify", **run_request(upload))


def test_verify_predicts_the_bundle_samples_and_reads_its_importances() -> None:
    response = _verify(serialize_bundle(make_xgboost_classifier(), training_data=FRAME, sample_rows=4))
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["samples"] == 4
    assert [item["feature"] for item in payload["featureImportances"]] == ["age", "income"]
    assert all(isinstance(item["importance"], float) for item in payload["featureImportances"])


def test_verify_names_pipeline_importances_by_transformed_feature() -> None:
    response = _verify(serialize_bundle(make_catboost_pipeline()))
    assert response.status_code == 200, response.text
    importances = response.json()["featureImportances"]
    assert [item["feature"] for item in importances] == ["age", "income"]
    assert sum(item["importance"] for item in importances) == pytest.approx(100.0)


def test_verify_has_no_importances_for_a_model_without_structure() -> None:
    frame = pd.DataFrame({"first": [2.0], "second": [1.0]})
    response = _verify(serialize_bundle(make_onnx_classifier(), training_data=frame))
    assert response.status_code == 200, response.text
    assert response.json()["featureImportances"] is None


def test_verify_runs_a_bundle_without_a_lock_in_the_legacy_environment() -> None:
    response = _verify(legacy_bundle("legacy-tree"))
    assert response.status_code == 200, response.text
    assert [item["feature"] for item in response.json()["featureImportances"]] == ["age", "income"]


def test_verify_refuses_an_environment_that_holds_more_than_the_lock(monkeypatch) -> None:
    # This interpreter holds every library, far more than a scikit-learn lock names.
    monkeypatch.setattr(
        environments, "resolve", lambda key, root=None: Environment(key, Path(sys.executable), checked=True)
    )

    response = _verify(serialize_bundle(make_classifier()))

    assert response.status_code == 422
    assert response.json()["detail"].startswith("The environment differs from the bundle's lock:")
