"""The builder installs exactly a lock the allowlist grants, from the trusted index, by hash."""

import base64
import json

import mlbundle
import pytest
from fastapi.testclient import TestClient

from mlsuite_backend import environments, policy
from mlsuite_backend.builder import app as builder_app
from mlsuite_backend.builder import install
from mlsuite_backend.builder.install import BuildFailed, requirements
from mlsuite_backend.config import VENV_PYTHON
from mlsuite_backend.environments import READY_FILE, environment_key
from mlsuite_backend.policy import parse_allowlist
from tests.helpers import make_classifier, serialize_bundle

DIGEST = "2" * 64


@pytest.fixture
def lock() -> mlbundle.EnvironmentLock:
    return mlbundle.inspect(serialize_bundle(make_classifier())[1].getvalue()).environment_lock


def _allowlist(lock: mlbundle.EnvironmentLock, skip: str = "") -> policy.Allowlist:
    packages = "".join(f'{p.name} = ["{p.version}"]\n' for p in lock.packages if p.name != skip)
    return parse_allowlist(
        f'python = ["{lock.python_version}"]\n[mlbundle]\n"0.3.0" = "{DIGEST}"\n[packages]\n{packages}'
    )


def _request(environment_lock: mlbundle.EnvironmentLock, /, **changes: str) -> dict[str, str]:
    return {
        "key": environment_key(environment_lock, "0.3.0"),
        "writerVersion": "0.3.0",
        "lock": base64.b64encode(environment_lock.to_bytes()).decode(),
        **changes,
    }


@pytest.fixture
def builder(tmp_path, monkeypatch, lock):
    calls: list[list[str]] = []

    def uv(*arguments: str, root) -> None:
        calls.append(list(arguments))
        if arguments[0] == "venv":
            python = environments.Path(arguments[-1]) / VENV_PYTHON
            python.parent.mkdir(parents=True)
            python.write_text("")

    monkeypatch.setattr(builder_app, "ENVIRONMENT_ROOT", tmp_path)
    monkeypatch.setattr(install, "_uv", uv)
    monkeypatch.setattr(policy, "allowlist", lambda: _allowlist(lock))
    return TestClient(builder_app.app), calls


def test_requirements_pin_every_package_of_this_platform_to_its_locked_wheels(lock) -> None:
    lines = requirements(lock, "0.3.0", _allowlist(lock), "linux-x86_64").splitlines()

    assert lines[0] == f"mlbundle==0.3.0 --hash=sha256:{DIGEST}"
    numpy = next(package for package in lock.packages if package.name == "numpy")
    assert f"numpy=={numpy.version} " + " ".join(f"--hash=sha256:{w.sha256}" for w in numpy.wheels) in lines
    assert len(lines) == 1 + sum("linux-x86_64" in package.platforms for package in lock.packages)


@pytest.mark.allowlist
def test_build_installs_from_the_index_by_hash_and_marks_the_environment_ready(builder, tmp_path, lock) -> None:
    client, calls = builder

    response = client.post("/environments", json=_request(lock))

    assert response.status_code == 200, response.text
    key = environment_key(lock, "0.3.0")
    ready = json.loads((tmp_path / key / READY_FILE).read_text())
    assert response.json() == ready
    assert ready["environmentId"] == lock.environment_id
    assert [call[0] for call in calls] == ["python", "venv", "pip"]
    install_call = calls[2]
    for flag in ("--no-deps", "--require-hashes", "--no-build", "--index-url"):
        assert flag in install_call
    assert not list((tmp_path / ".staging").iterdir())


@pytest.mark.allowlist
def test_a_built_environment_is_not_built_again(builder, lock) -> None:
    client, calls = builder
    assert client.post("/environments", json=_request(lock)).status_code == 200

    assert client.post("/environments", json=_request(lock)).status_code == 200
    assert len(calls) == 3


@pytest.mark.allowlist
def test_a_failed_install_leaves_nothing_and_is_answered_502(builder, tmp_path, lock, monkeypatch) -> None:
    client, _ = builder

    def failing(*arguments: str, root) -> None:
        raise BuildFailed("No solution found: numpy==9.9.9 is not on the index")

    monkeypatch.setattr(install, "_uv", failing)
    response = client.post("/environments", json=_request(lock))

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Could not install the environment: No solution found: numpy==9.9.9 is not on the index"
    )
    assert not (tmp_path / environment_key(lock, "0.3.0")).exists()
    assert not list((tmp_path / ".staging").iterdir())


@pytest.mark.allowlist
def test_a_lock_the_allowlist_does_not_grant_in_full_is_refused(builder, lock, monkeypatch) -> None:
    client, calls = builder
    monkeypatch.setattr(policy, "allowlist", lambda: _allowlist(lock, skip="scipy"))

    response = client.post("/environments", json=_request(lock))

    assert response.status_code == 422
    assert response.json()["detail"]["refused"] == [f"scipy=={lock.version('scipy')}"]
    assert calls == []


@pytest.mark.allowlist
@pytest.mark.parametrize(
    ("changes", "detail"),
    [
        ({"lock": "not base64!"}, "Invalid environment lock"),
        ({"lock": base64.b64encode(b"lock-version = 1").decode()}, "Invalid environment lock"),
        ({"key": "0" * 64}, "The key does not name this lock and mlbundle version"),
        ({"writerVersion": "0.3.1"}, "The key does not name this lock and mlbundle version"),
    ],
)
def test_a_request_that_does_not_describe_a_valid_lock_is_refused(builder, lock, changes, detail) -> None:
    client, calls = builder

    response = client.post("/environments", json=_request(lock, **changes))

    assert response.status_code == 422
    assert response.json()["detail"].startswith(detail)
    assert calls == []


@pytest.mark.allowlist
def test_removing_an_environment_deletes_it(builder, tmp_path, lock) -> None:
    client, _ = builder
    assert client.post("/environments", json=_request(lock)).status_code == 200
    key = environment_key(lock, "0.3.0")

    assert client.delete(f"/environments/{key}").status_code == 204
    assert not (tmp_path / key).exists()
    assert client.delete(f"/environments/{key}").status_code == 204


@pytest.mark.parametrize("key", ["legacy", "abc"])
def test_only_a_built_environment_can_be_removed(builder, key) -> None:
    client, _ = builder
    assert client.delete(f"/environments/{key}").status_code == 400
