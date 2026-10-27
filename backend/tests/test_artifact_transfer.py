"""A run names its artifact by SHA-256; the bytes travel only when the runtime lacks them."""

import asyncio
import json
import threading
from io import BytesIO

import httpx
import mlbundle
import pytest
from fastapi.testclient import TestClient

from mlsuite_backend import bundles
from mlsuite_backend.main import app
from tests.helpers import make_regressor, make_tree, run_request, serialize_bundle, sha256_of

client = TestClient(app)
RECORD = json.dumps({"rooms": 3, "area": 60})
UNKNOWN = "0" * 64


def test_a_run_by_hash_alone_uses_the_bundle_the_runtime_already_verified(monkeypatch) -> None:
    loads = []
    load = mlbundle.load
    monkeypatch.setattr(mlbundle, "load", lambda content: loads.append(content) or load(content))
    upload = serialize_bundle(make_regressor())

    sent = client.post("/predict", **run_request(upload, data=RECORD))
    by_hash = client.post("/predict", data={"artifact_sha256": sha256_of(upload), "data": RECORD})

    assert sent.status_code == 200
    assert by_hash.status_code == 200, by_hash.text
    assert by_hash.json()["reports"][0]["values"] == sent.json()["reports"][0]["values"]
    assert len(loads) == 1


def test_an_inspected_artifact_is_held_for_its_first_run() -> None:
    upload = serialize_bundle(make_regressor())
    assert client.post("/metadata", files={"model_file": upload}).status_code == 200

    response = client.post("/predict", data={"artifact_sha256": sha256_of(upload), "data": RECORD})

    assert response.status_code == 200, response.text


def test_a_run_by_hash_while_its_artifact_is_verified_waits_for_it_instead_of_409(monkeypatch) -> None:
    release = threading.Event()
    verify = bundles._verify

    def slow_verify(content: bytes) -> mlbundle.LoadedBundle:
        release.wait(timeout=5)
        return verify(content)

    monkeypatch.setattr(bundles, "_verify", slow_verify)
    upload = serialize_bundle(make_regressor())
    sha256 = sha256_of(upload)

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://runtime") as client:
            sending = asyncio.create_task(client.post("/predict", **run_request(upload, data=RECORD)))
            while bundles._loaded.verifying(sha256) is None:
                await asyncio.sleep(0.01)
            by_hash = asyncio.create_task(
                client.post("/predict", data={"artifact_sha256": sha256, "data": RECORD})
            )
            await asyncio.sleep(0.2)
            waited = not by_hash.done()
            release.set()
            return waited, await sending, await by_hash

    waited, sending, by_hash = asyncio.run(scenario())

    assert waited
    assert sending.status_code == 200
    assert by_hash.status_code == 200, by_hash.text


@pytest.mark.parametrize("path", ["/predict", "/explain"])
def test_a_run_by_an_unknown_hash_is_answered_409(path: str) -> None:
    response = client.post(path, data={"artifact_sha256": UNKNOWN, "data": RECORD})

    assert response.status_code == 409
    assert response.json()["detail"] == "Artifact is not loaded; send it with its SHA-256"


def test_an_explanation_by_hash_alone_uses_the_held_bundle() -> None:
    upload = serialize_bundle(make_tree())
    record = json.dumps({"age": 40, "income": 55_000})
    assert client.post("/explain", **run_request(upload, data=record)).status_code == 200

    response = client.post("/explain", data={"artifact_sha256": sha256_of(upload), "data": record})

    assert response.status_code == 200, response.text
    assert "income <= 57500.0" in response.json()["reports"][0]["explanation"]


def test_an_artifact_that_does_not_match_its_hash_is_refused_and_not_kept() -> None:
    upload = serialize_bundle(make_regressor())
    form = run_request(upload, data=RECORD)
    form["data"]["artifact_sha256"] = UNKNOWN

    refused = client.post("/predict", **form)
    by_hash = client.post("/predict", data={"artifact_sha256": UNKNOWN, "data": RECORD})

    assert refused.status_code == 400
    assert refused.json()["detail"] == "Artifact does not match its SHA-256"
    assert by_hash.status_code == 409


@pytest.mark.parametrize("value", ["abc", "A" * 64, "g" * 64])
def test_a_malformed_hash_is_refused(value: str) -> None:
    response = client.post("/predict", data={"artifact_sha256": value, "data": RECORD})

    assert response.status_code == 400
    assert response.json()["detail"] == "artifact_sha256 must be a lowercase hexadecimal SHA-256"


def test_a_run_without_a_hash_is_refused() -> None:
    upload = serialize_bundle(make_regressor())
    response = client.post("/predict", files={"model_file": upload}, data={"data": RECORD})

    assert response.status_code == 422


def test_an_artifact_sent_for_a_run_must_be_a_bundle() -> None:
    upload = ("model.txt", BytesIO(b"nope"), "text/plain")
    response = client.post("/predict", **run_request(upload, data=RECORD))

    assert response.status_code == 400
    assert response.json()["detail"] == "File must be .mlbundle"
