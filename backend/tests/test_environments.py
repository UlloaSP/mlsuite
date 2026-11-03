"""Which environment runs a model: the one built for its bundle's lock, named by key."""

import hashlib
import json

import mlbundle
import pytest

from mlsuite_backend import environments
from mlsuite_backend.config import VENV_PYTHON
from mlsuite_backend.environments import EnvironmentUnavailable, environment_key
from mlsuite_backend.environments import resolve as real_resolve  # bound before the tests replace it
from tests.client import client
from tests.helpers import make_classifier, run_request, serialize_bundle


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


@pytest.mark.parametrize("path", ["/predict", "/predict/batch", "/explain", "/verify"])
def test_a_run_in_an_environment_this_runtime_has_not_built_is_answered_424(path, monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(environments, "resolve", lambda key, root=None: real_resolve(key, tmp_path))
    upload = serialize_bundle(make_classifier())

    response = client.post(path, **run_request(upload, data="{}"))

    assert response.status_code == 424
    assert response.json()["detail"] == "The model's environment is not prepared on this runtime"


@pytest.mark.parametrize("value", ["abc", "legacy", "f" * 63])
def test_a_malformed_environment_is_refused(value: str) -> None:
    upload = serialize_bundle(make_classifier())
    response = client.post("/predict", **run_request(upload, data="{}", environment=value))

    assert response.status_code == 400
    assert response.json()["detail"] == "environment must be a lowercase hexadecimal SHA-256"

