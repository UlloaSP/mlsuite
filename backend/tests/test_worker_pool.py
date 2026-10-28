"""Worker processes shared by every environment, at most RUNTIME_WORKERS in all."""

import asyncio
import sys
from pathlib import Path

import pytest

from mlsuite_backend.environments import Environment
from mlsuite_backend.workers import Worker, WorkerFailed, WorkerPool, _exit_reason
from tests.client import run_async


class FakeWorker:
    def __init__(self, environment: Environment, log: list[str]) -> None:
        self.environment = environment
        self.alive = True
        self._log = log
        log.append(f"start {environment.key}")

    async def stop(self) -> None:
        self.alive = False
        self._log.append(f"stop {self.environment.key}")


def _environment(key: str) -> Environment:
    return Environment(key, Path("python"), checked=False)


def _pool(size: int, log: list[str]) -> WorkerPool:
    async def start(environment: Environment) -> FakeWorker:
        return FakeWorker(environment, log)

    return WorkerPool(size, start)


def test_an_idle_worker_of_the_environment_is_reused() -> None:
    log: list[str] = []

    async def scenario():
        pool = _pool(2, log)
        async with pool.worker(_environment("a")) as first:
            pass
        async with pool.worker(_environment("a")) as second:
            return first is second

    assert run_async(scenario)
    assert log == ["start a"]


def test_a_busy_environment_takes_more_workers_up_to_the_bound() -> None:
    log: list[str] = []

    async def scenario():
        pool = _pool(2, log)
        async with pool.worker(_environment("a")), pool.worker(_environment("a")):
            pass

    run_async(scenario)
    assert log == ["start a", "start a"]


def test_at_the_bound_the_least_recently_used_idle_worker_makes_room() -> None:
    log: list[str] = []

    async def scenario():
        pool = _pool(2, log)
        async with pool.worker(_environment("a")):
            pass
        async with pool.worker(_environment("b")):
            pass
        async with pool.worker(_environment("c")):
            pass

    run_async(scenario)
    assert log == ["start a", "start b", "stop a", "start c"]


def test_at_the_bound_with_every_worker_busy_a_request_waits() -> None:
    log: list[str] = []

    async def scenario():
        pool = _pool(1, log)
        order = []

        async def use(key: str, hold: float) -> None:
            async with pool.worker(_environment(key)):
                order.append(key)
                await asyncio.sleep(hold)

        await asyncio.gather(use("a", 0.1), use("b", 0))
        return order

    assert run_async(scenario) == ["a", "b"]
    assert log == ["start a", "stop a", "start b"]


def test_a_worker_that_died_is_not_reused() -> None:
    log: list[str] = []

    async def scenario():
        pool = _pool(1, log)
        async with pool.worker(_environment("a")) as dead:
            dead.alive = False
        async with pool.worker(_environment("a")) as fresh:
            return dead is fresh

    assert not run_async(scenario)
    assert log == ["start a", "start a"]


def test_a_worker_that_cannot_start_frees_its_place() -> None:
    async def failing(_environment: Environment) -> FakeWorker:
        raise OSError("no interpreter")

    async def scenario():
        pool = WorkerPool(1, failing)
        for _ in range(2):
            with pytest.raises(OSError):
                async with pool.worker(_environment("a")):
                    pass

    run_async(scenario)


def test_a_real_worker_that_exits_fails_its_request_with_the_reason(tmp_path) -> None:
    async def scenario():
        worker = await Worker.start(Environment("a", Path(sys.executable), checked=False))
        worker.process.stdin.write(b"not json\n")
        await worker.process.stdin.drain()
        await worker.process.stdout.readline()  # the worker answers that line with an error
        worker.process.kill()
        await worker.process.wait()
        with pytest.raises(WorkerFailed):
            await worker.call({"op": "predict", "path": str(tmp_path), "sha256": "0" * 64})
        await worker.stop()

    run_async(scenario)


def test_an_exit_on_an_illegal_instruction_is_named() -> None:
    assert "CPU instructions" in _exit_reason(-4)
    assert _exit_reason(3) == "The model worker exited with status 3"
