"""A worker runs its model within bounds: memory, open files, processes. A model past one fails
alone with a clear answer, its worker retires, and the runtime goes on serving."""

import os
import subprocess
import sys
from pathlib import Path

import pytest

from mlsuite_backend import config
from mlsuite_backend.environments import Environment
from mlsuite_backend.workers import Worker, WorkerError, WorkerPool
from mlsuite_worker import limits
from tests.client import client, run_async

posix = pytest.mark.skipif(os.name != "posix", reason="resource limits are POSIX")
# Root ignores the process limit, and the runtime never runs as root.
unprivileged = pytest.mark.skipif(os.name != "posix" or os.geteuid() == 0, reason="needs a non-root POSIX user")
_SOURCE = str(Path(limits.__file__).resolve().parents[1])
_MB = 1024 * 1024


def _environment() -> Environment:
    return Environment("limits", Path(sys.executable), checked=False)


def _limits(pid: int) -> dict[str, tuple[str, str]]:
    found = {}
    for line in Path(f"/proc/{pid}/limits").read_text().splitlines()[1:]:
        name, soft, hard = line[:26].strip(), *line[26:].split()[:2]
        found[name] = (soft, hard)
    return found


def _breach_in_a_bounded_process(bounds: dict[str, str], code: str) -> str:
    """Runs `code` in a process bounded as a worker bounds itself; prints what the breach says."""
    program = (
        "from mlsuite_worker import limits\n"
        f"limits.apply({bounds!r})\n"
        "try:\n"
        + "".join(f"    {line}\n" for line in code.splitlines())
        + "    print('within bounds')\n"
        "except BaseException as error:\n"
        "    print(limits.breach(error))\n"
    )
    result = subprocess.run([sys.executable, "-I", "-c", f"import sys; sys.path.insert(0, {_SOURCE!r})\n{program}"],
                            capture_output=True, text=True, timeout=60, check=False)
    return result.stdout.strip() or result.stderr


@posix
def test_the_runtime_starts_each_worker_within_its_configured_bounds(monkeypatch) -> None:
    monkeypatch.setattr(config, "WORKER_MEMORY_BYTES", 3000 * _MB)
    monkeypatch.setattr(config, "WORKER_OPEN_FILES", 200)
    monkeypatch.setattr(config, "WORKER_PROCESSES", 300)

    async def scenario():
        worker = await Worker.start(_environment())
        try:
            with pytest.raises(WorkerError):  # an answer: the worker is up and has bounded itself
                await worker.call({"op": "unknown"})
            return _limits(worker.process.pid), os.getpgid(worker.process.pid) == worker.process.pid
        finally:
            await worker.stop()

    bounds, own_group = run_async(scenario)
    assert bounds["Max address space"] == (str(3000 * _MB), str(3000 * _MB))
    assert bounds["Max open files"] == ("200", "200")
    assert bounds["Max processes"] == ("300", "300")
    assert own_group


@posix
def test_a_model_past_the_memory_bound_fails_with_a_clear_reason() -> None:
    said = _breach_in_a_bounded_process({"MLSUITE_WORKER_MEMORY_BYTES": str(512 * _MB)},
                                        "hoard = bytearray(1024 * 1024 * 1024)")
    assert said == "The model needed more memory than a worker may use (RUNTIME_WORKER_MEMORY_MB)"


def test_a_native_library_that_cannot_be_mapped_is_the_memory_bound() -> None:
    # What loading scikit-learn's native libraries says under the bound on the real runtime.
    error = ImportError("libgfortran-040039e1-0352e75f.so.5.0.0: failed to map segment from shared object")

    assert limits.breach(error) == "The model needed more memory than a worker may use (RUNTIME_WORKER_MEMORY_MB)"
    assert limits.breach(ImportError("No module named 'xgboost'")) is None


@posix
def test_a_model_past_the_open_files_bound_fails_with_a_clear_reason() -> None:
    said = _breach_in_a_bounded_process({"MLSUITE_WORKER_OPEN_FILES": "32"},
                                        "held = [open('/dev/null') for _ in range(64)]")
    assert said == "The model opened more files than a worker may (RUNTIME_WORKER_OPEN_FILES)"


@unprivileged
def test_a_model_past_the_process_bound_fails_with_a_clear_reason() -> None:
    # The kernel counts every process and thread of the user; leave room for a few more.
    mine = sum(1 for task in Path("/proc").glob("[0-9]*/task/[0-9]*") if task.stat().st_uid == os.getuid())
    said = _breach_in_a_bounded_process(
        {"MLSUITE_WORKER_PROCESSES": str(mine + 5)},
        "import os, time\n"
        "children = []\n"
        "try:\n"
        "    for _ in range(50):\n"
        "        pid = os.fork()\n"
        "        if pid == 0:\n"
        "            time.sleep(30)\n"
        "            os._exit(0)\n"
        "        children.append(pid)\n"
        "finally:\n"
        "    for pid in children:\n"
        "        os.kill(pid, 9)",
    )
    assert said == "The model started more processes or threads than a worker may (RUNTIME_WORKER_PROCESSES)"


@posix
def test_a_worker_past_a_bound_answers_retires_and_the_runtime_goes_on(monkeypatch) -> None:
    # A line that fits while it is read, but not once it is parsed into a list of numbers.
    line_bytes = 40 * _MB

    async def measure() -> int:
        worker = await Worker.start(_environment())
        try:
            with pytest.raises(WorkerError):
                await worker.call({"op": "unknown"})
            status = Path(f"/proc/{worker.process.pid}/status").read_text()
            return int(next(row for row in status.splitlines() if row.startswith("VmPeak")).split()[1]) * 1024
        finally:
            await worker.stop()

    monkeypatch.setattr(config, "WORKER_MEMORY_BYTES", run_async(measure) + 4 * line_bytes)
    pool = WorkerPool(1)

    async def scenario():
        async with pool.worker(_environment()) as worker:
            with pytest.raises(WorkerError) as breached:
                await worker.call({"op": "predict", "records": [0] * (line_bytes // 2)})
            # Gone by the time its answer is raised, so the pool never hands it out again.
            retired = not worker.alive and worker.process.returncode == 0
        async with pool.worker(_environment()) as fresh:
            with pytest.raises(WorkerError) as answered:
                await fresh.call({"op": "unknown"})
            replaced = fresh is not worker
        await pool.close()
        return breached.value, retired, answered.value, replaced

    breached, retired, answered, replaced = run_async(scenario)
    assert (breached.status, breached.detail) == (
        422, "The model needed more memory than a worker may use (RUNTIME_WORKER_MEMORY_MB)")
    assert retired and replaced
    assert answered.status == 500
    assert client.get("/health").status_code == 200
