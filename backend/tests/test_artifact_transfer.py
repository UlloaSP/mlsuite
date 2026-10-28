"""A run names its artifact by SHA-256; the bytes travel only when the runtime lacks them."""

import json
from io import BytesIO

import pytest

from mlsuite_backend import artifacts
from mlsuite_backend.artifact_store import ArtifactStore
from tests.client import client
from tests.helpers import make_regressor, make_tree, run_fields, run_request, serialize_bundle, sha256_of

RECORD = json.dumps({"rooms": 3, "area": 60})
UNKNOWN = "0" * 64


def test_a_run_by_hash_alone_uses_the_artifact_the_runtime_already_holds() -> None:
    upload = serialize_bundle(make_regressor())

    sent = client.post("/predict", **run_request(upload, data=RECORD))
    by_hash = client.post("/predict", data=run_fields(upload, data=RECORD))

    assert sent.status_code == 200
    assert by_hash.status_code == 200, by_hash.text
    assert by_hash.json()["reports"][0]["values"] == sent.json()["reports"][0]["values"]


def test_an_inspected_artifact_is_held_for_its_first_run() -> None:
    upload = serialize_bundle(make_regressor())
    assert client.post("/metadata", files={"model_file": upload}).status_code == 200

    response = client.post("/predict", data=run_fields(upload, data=RECORD))

    assert response.status_code == 200, response.text


@pytest.mark.parametrize("path", ["/predict", "/explain", "/verify"])
def test_a_run_by_an_unknown_hash_is_answered_409(path: str) -> None:
    upload = serialize_bundle(make_regressor())
    response = client.post(path, data=run_fields(upload, data=RECORD, artifact_sha256=UNKNOWN))

    assert response.status_code == 409
    assert response.json()["detail"] == "Artifact is not loaded; send it with its SHA-256"


def test_an_explanation_by_hash_alone_uses_the_held_artifact() -> None:
    upload = serialize_bundle(make_tree())
    record = json.dumps({"age": 40, "income": 55_000})
    assert client.post("/explain", **run_request(upload, data=record)).status_code == 200

    response = client.post("/explain", data=run_fields(upload, data=record))

    assert response.status_code == 200, response.text
    assert "income <= 57500.0" in response.json()["reports"][0]["explanation"]


def test_an_artifact_that_does_not_match_its_hash_is_refused_and_not_kept() -> None:
    upload = serialize_bundle(make_regressor())
    form = run_request(upload, data=RECORD)
    form["data"]["artifact_sha256"] = UNKNOWN

    refused = client.post("/predict", **form)
    by_hash = client.post("/predict", data=run_fields(upload, data=RECORD, artifact_sha256=UNKNOWN))

    assert refused.status_code == 400
    assert refused.json()["detail"] == "Artifact does not match its SHA-256"
    assert by_hash.status_code == 409


@pytest.mark.parametrize("value", ["abc", "A" * 64, "g" * 64])
def test_a_malformed_hash_is_refused(value: str) -> None:
    upload = serialize_bundle(make_regressor())
    response = client.post("/predict", data=run_fields(upload, data=RECORD, artifact_sha256=value))

    assert response.status_code == 400
    assert response.json()["detail"] == "artifact_sha256 must be a lowercase hexadecimal SHA-256"


def test_a_run_without_a_hash_or_an_environment_is_refused() -> None:
    upload = serialize_bundle(make_regressor())
    without_hash = client.post("/predict", files={"model_file": upload}, data={"environment": "legacy", "data": RECORD})
    without_environment = client.post("/predict", data={"artifact_sha256": sha256_of(upload), "data": RECORD})

    assert without_hash.status_code == 422
    assert without_environment.status_code == 422


def test_an_artifact_sent_for_a_run_must_be_a_bundle() -> None:
    upload = ("model.txt", BytesIO(b"nope"), "text/plain")
    response = client.post("/predict", files={"model_file": upload}, data={
        "artifact_sha256": sha256_of(upload), "environment": "legacy", "data": RECORD,
    })

    assert response.status_code == 400
    assert response.json()["detail"] == "File must be .mlbundle"


def test_a_damaged_kept_artifact_fails_its_run_instead_of_running_other_bytes(artifact_directory) -> None:
    # A fresh model, so no worker holds it loaded: the run reads the damaged file.
    upload = serialize_bundle(make_tree())
    sha256 = sha256_of(upload)
    assert client.post("/metadata", files={"model_file": upload}).status_code == 200
    (artifact_directory / f"{sha256}.mlbundle").write_bytes(b"not the artifact")

    response = client.post("/predict", data=run_fields(upload, data=json.dumps({"age": 1, "income": 2})))

    assert response.status_code == 400
    assert response.json()["detail"] == "Artifact does not match its SHA-256"


def test_a_run_whose_artifact_cannot_be_kept_on_disk_is_answered_507(monkeypatch, tmp_path) -> None:
    blocked = tmp_path / "a-file"
    blocked.write_text("not a directory")
    monkeypatch.setattr(artifacts, "store", ArtifactStore(blocked / "artifacts", 1024 * 1024))

    response = client.post("/predict", **run_request(serialize_bundle(make_regressor()), data=RECORD))

    assert response.status_code == 507
    assert response.json()["detail"] == "The runtime cannot keep the artifact on disk"
