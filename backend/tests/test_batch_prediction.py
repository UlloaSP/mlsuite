"""Records of one artifact are predicted together, each answered exactly as if predicted alone."""

import asyncio
import json
import threading

import httpx
import mlbundle
import pytest
from fastapi.testclient import TestClient
from mlbundle.results import LoadedBundle

from mlsuite_backend.main import app
from mlsuite_backend.services import coalescing, row_prediction
from tests import helpers
from tests.helpers import make_classifier, make_tree, run_request, serialize_bundle, sha256_of

client = TestClient(app)
UNKNOWN = "0" * 64


def _records(upload, count: int) -> list[dict[str, object]]:
    bundle = mlbundle.load(upload[1].getvalue())
    named = bundle.manifest.features.origin.value == "model"
    return [
        {(name if named else position): (row * 7 + position * 3) % 50 for position, name in enumerate(bundle.manifest.features.names)}
        for row in range(count)
    ]


def _without_time(answer: dict[str, object]) -> list[dict[str, object]]:
    return [{key: value for key, value in report.items() if key != "execution_time"} for report in answer["reports"]]


def _alone(upload, record: dict[str, object]) -> dict[str, object]:
    response = client.post("/predict", **run_request(upload, data=json.dumps(record)))
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.parametrize(
    "factory",
    [
        "make_classifier",
        "make_onehot_classifier",
        "make_regressor",
        "make_tree",
        "make_positional_classifier",
        "make_xgboost_classifier",
        "make_multi_output_regressor",
        "make_multi_output_classifier",
    ],
)
def test_each_record_of_a_batch_is_answered_in_order_exactly_as_alone(factory: str) -> None:
    upload = serialize_bundle(getattr(helpers, factory)())
    records = _records(upload, 40)

    response = client.post("/predict/batch", **run_request(upload, data=json.dumps(records)))

    assert response.status_code == 200, response.text
    rows = response.json()["rows"]
    assert [_without_time(row) for row in rows] == [_without_time(_alone(upload, record)) for record in records]


def test_a_record_the_model_cannot_use_fails_alone() -> None:
    upload = serialize_bundle(make_classifier())
    records = [{"age": 40, "income": 50_000}, {"age": 41}, {"age": 42, "income": 52_000}]

    rows = client.post("/predict/batch", **run_request(upload, data=json.dumps(records))).json()["rows"]

    assert rows[1] == {"error": {"status": 400, "detail": "Missing features: \"income\"."}}
    assert _without_time(rows[0]) == _without_time(_alone(upload, records[0]))
    assert _without_time(rows[2]) == _without_time(_alone(upload, records[2]))


def test_a_record_that_breaks_the_model_fails_alone(monkeypatch) -> None:
    upload = serialize_bundle(make_tree())
    records = [{"age": 30 + age, "income": 40_000} for age in range(4)]
    alone = [_alone(upload, record) for record in records]
    predict_record = LoadedBundle.predict_record

    def together(*_args: object) -> object:
        raise RuntimeError("the vectorized call failed")

    def breaks_on_age_32(bundle: LoadedBundle, record: object) -> object:
        if record["age"] == 32:
            raise RuntimeError("model blew up")
        return predict_record(bundle, record)

    monkeypatch.setattr(row_prediction, "_predict_together", together)
    monkeypatch.setattr(LoadedBundle, "predict_record", breaks_on_age_32)

    rows = client.post("/predict/batch", **run_request(upload, data=json.dumps(records))).json()["rows"]

    assert rows[2] == {"error": {"status": 500, "detail": "Error during inference: model blew up"}}
    assert [_without_time(rows[index]) for index in (0, 1, 3)] == [_without_time(alone[index]) for index in (0, 1, 3)]


@pytest.mark.parametrize("data", ["{}", "[]", json.dumps([{}] * 1001), "not json"])
def test_a_batch_must_be_an_array_of_one_to_a_thousand_records(data: str) -> None:
    response = client.post("/predict/batch", **run_request(serialize_bundle(make_classifier()), data=data))

    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid JSON")


def test_a_batch_names_its_artifact_by_hash_like_a_run() -> None:
    response = client.post("/predict/batch", data={"artifact_sha256": UNKNOWN, "data": "[{}]"})

    assert response.status_code == 409


def test_single_records_arriving_while_the_thread_is_busy_are_predicted_in_one_call(monkeypatch) -> None:
    upload = serialize_bundle(make_tree())
    sha256 = sha256_of(upload)
    records = [{"age": 20 + age, "income": 30_000 + age * 9_000} for age in range(6)] + [{"age": 1}]
    alone = [_alone(upload, record) for record in records[:-1]]
    started, release = threading.Event(), threading.Event()
    calls = []
    predict_rows = coalescing.predict_rows

    def counted(bundle: object, batch: list[object]) -> object:
        calls.append(len(batch))
        if len(calls) == 1:
            started.set()
            release.wait(timeout=5)
        return predict_rows(bundle, batch)

    monkeypatch.setattr(coalescing, "predict_rows", counted)

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://runtime") as runtime:
            def send(record):
                return runtime.post("/predict", data={"artifact_sha256": sha256, "data": json.dumps(record)})

            first = asyncio.create_task(send(records[0]))
            while not started.is_set():
                await asyncio.sleep(0.01)
            joined = [asyncio.create_task(send(record)) for record in records[1:]]
            await asyncio.sleep(0.2)
            release.set()
            return [await first, *[await task for task in joined]]

    responses = asyncio.run(scenario())

    assert calls == [1, 6]
    assert [_without_time(response.json()) for response in responses[:-1]] == [_without_time(answer) for answer in alone]
    assert responses[-1].status_code == 400
    assert responses[-1].json()["detail"] == "Missing features: \"income\"."
