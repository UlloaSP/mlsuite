"""Records of one artifact are predicted together, each answered exactly as if predicted alone."""

import asyncio
import contextlib
import json
import sys
from pathlib import Path

import httpx
import mlbundle
import pytest

from mlsuite_backend.config import RUNTIME_WORKERS
from mlsuite_backend.environments import Environment
from mlsuite_backend.main import app
from mlsuite_backend.services import runs
from tests import helpers
from tests.client import client, run_async
from tests.helpers import make_classifier, make_tree, run_fields, run_request, serialize_bundle

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


@pytest.mark.parametrize("data", ["{}", "[]", json.dumps([{}] * 1001), "not json"])
def test_a_batch_must_be_an_array_of_one_to_a_thousand_records(data: str) -> None:
    response = client.post("/predict/batch", **run_request(serialize_bundle(make_classifier()), data=data))

    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid JSON")


def test_a_batch_names_its_artifact_by_hash_like_a_run() -> None:
    upload = serialize_bundle(make_classifier())
    response = client.post("/predict/batch", data=run_fields(upload, data="[{}]", artifact_sha256=UNKNOWN))
    assert response.status_code == 409


def test_single_records_arriving_while_a_worker_is_busy_are_predicted_in_one_call(monkeypatch) -> None:
    upload = serialize_bundle(make_tree())
    records = [{"age": 20 + age, "income": 30_000 + age * 9_000} for age in range(6)] + [{"age": 1}]
    alone = [_alone(upload, record) for record in records[:-1]]
    form = run_fields(upload)
    calls = []
    call = runs.call

    async def scenario():
        started, release = asyncio.Event(), asyncio.Event()

        async def counted(worker, op, path, sha256, **fields):
            calls.append(len(fields["records"]))
            if len(calls) == 1:
                started.set()
                await release.wait()
            return await call(worker, op, path, sha256, **fields)

        monkeypatch.setattr(runs, "call", counted)
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://runtime") as runtime:
            def send(record):
                return runtime.post("/predict", data={**form, "data": json.dumps(record)})

            # Every worker taken, so the records wait for the one predicting the first.
            async with contextlib.AsyncExitStack() as held:
                for _ in range(RUNTIME_WORKERS - 1):
                    await held.enter_async_context(runs.pool.worker(Environment("busy", Path(sys.executable), False)))
                first = asyncio.create_task(send(records[0]))
                await started.wait()
                joined = [asyncio.create_task(send(record)) for record in records[1:]]
                await asyncio.sleep(0.2)
                release.set()
                return [await first, *[await task for task in joined]]

    responses = run_async(scenario)

    assert calls == [1, 6]
    assert [_without_time(response.json()) for response in responses[:-1]] == [_without_time(answer) for answer in alone]
    assert responses[-1].status_code == 400
    assert responses[-1].json()["detail"] == "Missing features: \"income\"."
