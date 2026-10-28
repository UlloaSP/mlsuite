"""Which environment runs a model: built ones by key, the frozen legacy one for bundles without a lock."""

import hashlib
import json

import mlbundle
import pytest

from mlsuite_backend import environments
from mlsuite_backend.config import LEGACY_PYTHON, VENV_PYTHON
from mlsuite_backend.environments import LEGACY, EnvironmentUnavailable, environment_key
from mlsuite_backend.environments import resolve as real_resolve  # bound before the tests replace it
from tests.client import client
from tests.helpers import legacy_bundle, make_classifier, run_fields, run_request, serialize_bundle

TREE_RECORD = json.dumps({"age": 40, "income": 55_000})


def test_an_environment_key_is_the_lock_and_the_mlbundle_that_wrote_the_bundle() -> None:
    lock = mlbundle.inspect(serialize_bundle(make_classifier())[1].getvalue()).environment_lock

    key = environment_key(lock, "0.3.0")

    assert key == hashlib.sha256(f"{lock.environment_id}\n0.3.0".encode()).hexdigest()
    assert key != environment_key(lock, "0.3.1")


def test_a_built_environment_resolves_to_its_interpreter_once_ready(tmp_path) -> None:
    key = "a" * 64
    with pytest.raises(EnvironmentUnavailable):
        real_resolve(key, tmp_path)
    (tmp_path / key).mkdir()
    (tmp_path / key / environments.READY_FILE).write_text("{}")

    resolved = real_resolve(key, tmp_path)

    assert resolved.python == tmp_path / key / "venv" / VENV_PYTHON
    assert resolved.checked
    assert real_resolve(LEGACY, tmp_path).python == LEGACY_PYTHON
    assert not real_resolve(LEGACY, tmp_path).checked


@pytest.mark.parametrize("path", ["/predict", "/predict/batch", "/explain", "/verify"])
def test_a_run_in_an_environment_this_runtime_has_not_built_is_answered_424(path, monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(environments, "resolve", lambda key, root=None: real_resolve(key, tmp_path))
    upload = serialize_bundle(make_classifier())

    response = client.post(path, **run_request(upload, data="{}"))

    assert response.status_code == 424
    assert response.json()["detail"] == "The model's environment is not prepared on this runtime"


@pytest.mark.parametrize("value", ["abc", "LEGACY", "f" * 63])
def test_a_malformed_environment_is_refused(value: str) -> None:
    upload = serialize_bundle(make_classifier())
    response = client.post("/predict", **run_request(upload, data="{}", environment=value))

    assert response.status_code == 400
    assert response.json()["detail"] == "environment must be a lowercase hexadecimal SHA-256 or legacy"


def test_a_bundle_without_a_lock_predicts_in_the_legacy_environment() -> None:
    upload = legacy_bundle("legacy-classifier")
    record = json.dumps({"age": 40, "income": 55_000})

    sent = client.post("/predict", **run_request(upload, data=record))
    by_hash = client.post("/predict", data=run_fields(upload, data=record))

    assert sent.status_code == 200, sent.text
    assert sent.json()["reports"][0]["mapping"] == ["0", "1"]
    assert by_hash.json()["reports"][0]["probabilities"] == sent.json()["reports"][0]["probabilities"]


def test_a_bundle_without_a_lock_is_explained_from_its_tree() -> None:
    response = client.post("/explain", **run_request(legacy_bundle("legacy-tree"), data=TREE_RECORD))

    assert response.status_code == 200, response.text
    assert "income <= 57500.0" in response.json()["reports"][0]["explanation"]
