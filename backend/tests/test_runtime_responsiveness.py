"""Model work runs on a bounded pool of threads, so the event loop keeps answering."""

import asyncio
import json
import threading
import time

import httpx
import pytest
from fastapi.testclient import TestClient

import mlsuite_backend.services.prediction_service as prediction_service
from mlsuite_backend import config, execution
from mlsuite_backend.main import app
from tests.helpers import make_regressor, serialize_bundle

RECORD = json.dumps({"rooms": 3, "area": 60})


def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_answers_while_a_prediction_is_running(monkeypatch) -> None:
    started, release = threading.Event(), threading.Event()

    def slow_predict(_bundle: object, _record: object) -> dict[str, object]:
        started.set()
        release.wait(timeout=5)
        return {"reports": []}

    monkeypatch.setattr(prediction_service, "_predict", slow_predict)
    form = {"files": {"model_file": serialize_bundle(make_regressor())}, "data": {"data": RECORD}}

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://runtime") as client:
            prediction = asyncio.create_task(client.post("/predict", **form))
            while not started.is_set():
                await asyncio.sleep(0.01)
            began = time.perf_counter()
            health = await client.get("/health")
            waited = time.perf_counter() - began
            prediction_was_running = not prediction.done()
            release.set()
            return health, waited, prediction_was_running, await prediction

    health, waited, prediction_was_running, prediction = asyncio.run(scenario())

    assert health.status_code == 200
    assert waited < 1
    assert prediction_was_running
    assert prediction.status_code == 200


def test_model_work_runs_on_at_most_the_configured_number_of_threads() -> None:
    lock = threading.Lock()
    running = peak = 0

    def work() -> None:
        nonlocal running, peak
        with lock:
            running += 1
            peak = max(peak, running)
        time.sleep(0.2)
        with lock:
            running -= 1

    async def scenario() -> None:
        jobs = (execution.run_model_work(work) for _ in range(config.RUNTIME_MAX_CONCURRENT * 2))
        await asyncio.gather(*jobs)

    asyncio.run(scenario())

    assert peak == config.RUNTIME_MAX_CONCURRENT


@pytest.mark.parametrize("value", ["0", "-2"])
def test_a_bound_below_one_is_refused(monkeypatch, value: str) -> None:
    monkeypatch.setenv("RUNTIME_MAX_CONCURRENT", value)

    with pytest.raises(ValueError, match="RUNTIME_MAX_CONCURRENT must be at least 1"):
        config._positive_int("RUNTIME_MAX_CONCURRENT", 8)


def test_an_unset_bound_takes_its_default(monkeypatch) -> None:
    monkeypatch.delenv("RUNTIME_BUNDLE_CACHE_MB", raising=False)

    assert config._positive_int("RUNTIME_BUNDLE_CACHE_MB", 512) == 512
