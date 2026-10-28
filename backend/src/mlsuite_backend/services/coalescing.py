"""Concurrent single-record predictions of one artifact run together.

A prediction waits for a worker of its environment anyway; the records of the same artifact that
arrive while it waits join it, and the worker predicts them in one call (see mlsuite_worker.rows).
Nothing waits to be joined: a record that finds a worker free runs at once, alone. Each record
still gets its own answer, and a record the model refuses fails alone.
"""

import asyncio
from dataclasses import dataclass, field
from pathlib import Path

from . import runs

# The most records predicted in one call; more start the next batch.
MAX_COALESCED = 64

type RowAnswer = dict[str, object]


@dataclass
class _Batch:
    records: list[object] = field(default_factory=list)
    answers: list[asyncio.Future[RowAnswer]] = field(default_factory=list)
    taken: bool = False


class Coalescer:
    def __init__(self, max_records: int = MAX_COALESCED) -> None:
        self._max_records = max_records
        self._open: dict[tuple[str, str], _Batch] = {}

    async def predict(self, environment: str, path: Path, sha256: str, record: object) -> RowAnswer:
        key = (environment, sha256)
        answer: asyncio.Future[RowAnswer] = asyncio.get_running_loop().create_future()
        batch = self._open.get(key)
        starts = batch is None or batch.taken or len(batch.records) >= self._max_records
        if starts:
            batch = self._open[key] = _Batch()
        batch.records.append(record)
        batch.answers.append(answer)
        if starts:
            asyncio.get_running_loop().create_task(self._run(key, path, batch))
        return await answer

    async def _run(self, key: tuple[str, str], path: Path, batch: _Batch) -> None:
        environment, sha256 = key
        try:
            async with runs.worker(environment) as worker:
                # The worker is free: the batch closes to newcomers and runs what it gathered.
                batch.taken = True
                if self._open.get(key) is batch:
                    del self._open[key]
                answers = await runs.call(worker, "predict", path, sha256, records=list(batch.records))
        except BaseException as error:  # noqa: BLE001 - every waiting caller gets the failure
            if self._open.get(key) is batch:
                del self._open[key]
            for waiting in batch.answers:
                if not waiting.done():
                    waiting.set_exception(error)
            return
        for waiting, answer in zip(batch.answers, answers, strict=True):
            if not waiting.done():
                waiting.set_result(answer)
