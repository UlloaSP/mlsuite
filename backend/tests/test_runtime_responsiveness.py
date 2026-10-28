"""The runtime keeps answering while models run: model work happens in worker processes."""

import asyncio
import json
import time

import httpx
import pytest

from mlsuite_backend import __main__ as launcher
from mlsuite_backend import config
from mlsuite_backend.main import app
from mlsuite_backend.services import runs
from tests.client import client, run_async
from tests.helpers import make_regressor, run_request, serialize_bundle

RECORD = json.dumps({"rooms": 3, "area": 60})


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_answers_while_a_prediction_is_running(monkeypatch) -> None:
    form = run_request(serialize_bundle(make_regressor()), data=RECORD)
    call = runs.call

    async def scenario():
        started, release = asyncio.Event(), asyncio.Event()

        async def slow(worker, op, path, sha256, **fields):
            started.set()
            await release.wait()
            return await call(worker, op, path, sha256, **fields)

        monkeypatch.setattr(runs, "call", slow)
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://runtime") as runtime:
            prediction = asyncio.create_task(runtime.post("/predict", **form))
            await started.wait()
            began = time.perf_counter()
            health = await runtime.get("/health")
            waited = time.perf_counter() - began
            prediction_was_running = not prediction.done()
            release.set()
            return health, waited, prediction_was_running, await prediction

    health, waited, prediction_was_running, prediction = run_async(scenario)

    assert health.status_code == 200
    assert waited < 1
    assert prediction_was_running
    assert prediction.status_code == 200


@pytest.mark.parametrize("value", ["0", "-1"])
def test_a_bound_below_one_is_refused(monkeypatch, value: str) -> None:
    monkeypatch.setenv("RUNTIME_WORKERS", value)
    with pytest.raises(ValueError, match="RUNTIME_WORKERS must be at least 1"):
        config._positive_int("RUNTIME_WORKERS", 2)


def test_an_unset_bound_takes_its_default(monkeypatch) -> None:
    monkeypatch.delenv("RUNTIME_WORKERS", raising=False)
    assert config._positive_int("RUNTIME_WORKERS", 2) == 2


def test_the_runtime_serves_in_one_process_that_runs_models_in_workers(monkeypatch) -> None:
    started = {}
    monkeypatch.setenv("PYTHON_HOST", "127.0.0.1")
    monkeypatch.setenv("PYTHON_PORT", "8000")
    monkeypatch.setattr(launcher.uvicorn, "run", lambda app, **options: started.update(app=app, **options))

    launcher.main()

    assert started["app"] == "mlsuite_backend.main:app"
    assert "workers" not in started
