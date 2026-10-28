"""Model work runs on a bounded pool of threads, so the event loop keeps answering."""

import asyncio
import json
import threading
import time

import httpx
import pytest
from fastapi.testclient import TestClient

import mlsuite_backend.services.coalescing as coalescing
from mlsuite_backend import __main__ as launcher
from mlsuite_backend import bundles, config, execution
from mlsuite_backend.main import app
from tests.helpers import make_regressor, make_tree, run_request, serialize_bundle, sha256_of

RECORD = json.dumps({"rooms": 3, "area": 60})


def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_answers_while_a_prediction_is_running(monkeypatch) -> None:
    started, release = threading.Event(), threading.Event()

    def slow_predict(_bundle: object, records: list[object]) -> list[dict[str, object]]:
        started.set()
        release.wait(timeout=5)
        return [{"reports": []} for _ in records]

    monkeypatch.setattr(coalescing, "predict_rows", slow_predict)
    form = run_request(serialize_bundle(make_regressor()), data=RECORD)

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


def test_a_prediction_does_not_wait_for_a_bundle_being_loaded(monkeypatch) -> None:
    release = threading.Event()
    verify = bundles._verify

    def slow_verify(content: bytes) -> object:
        release.wait(timeout=5)
        return verify(content)

    loaded = serialize_bundle(make_regressor())
    assert TestClient(app).post("/predict", **run_request(loaded, data=RECORD)).status_code == 200
    monkeypatch.setattr(bundles, "_verify", slow_verify)
    loading = serialize_bundle(make_tree())

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://runtime") as client:
            inspection = asyncio.create_task(client.post("/metadata", files={"model_file": loading}))
            while bundles._loaded.verifying(sha256_of(loading)) is None:
                await asyncio.sleep(0.01)
            prediction = await client.post(
                "/predict", data={"artifact_sha256": sha256_of(loaded), "data": RECORD}
            )
            still_loading = not inspection.done()
            release.set()
            return prediction, still_loading, await inspection

    prediction, still_loading, inspection = asyncio.run(scenario())

    assert prediction.status_code == 200, prediction.text
    assert still_loading
    assert inspection.status_code == 200


def test_the_runtime_serves_in_the_configured_worker_processes(monkeypatch) -> None:
    started = {}
    monkeypatch.setattr(launcher.uvicorn, "run", lambda app, **options: started.update(app=app, **options))
    monkeypatch.setenv("PYTHON_HOST", "0.0.0.0")
    monkeypatch.setenv("PYTHON_PORT", "8000")

    launcher.main()

    assert started["app"] == "mlsuite_backend.main:app"
    assert started["workers"] == config.RUNTIME_WORKERS
    assert started["timeout_keep_alive"] > 60
