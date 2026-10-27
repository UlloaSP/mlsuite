"""Concurrent single-record predictions of one artifact run together.

A prediction waits for a model-work thread anyway; the records of the same artifact that arrive
while it waits join it, and the thread predicts them in one call (see row_prediction). Nothing
waits to be joined: a record that finds the thread free runs at once, alone. Each record still
gets its own answer, and a record the model refuses fails alone.
"""

import asyncio
import threading
from dataclasses import dataclass, field

import mlbundle

from ..execution import run_model_work
from .row_prediction import RowAnswer, predict_rows

# The most records predicted in one call; more start the next batch.
MAX_COALESCED = 64


@dataclass
class _Batch:
    records: list[object] = field(default_factory=list)
    answers: list[asyncio.Future[RowAnswer]] = field(default_factory=list)
    taken: bool = False


class Coalescer:
    def __init__(self, max_records: int = MAX_COALESCED) -> None:
        self._max_records = max_records
        self._open: dict[str, _Batch] = {}
        self._lock = threading.Lock()

    async def predict(self, key: str, bundle: mlbundle.LoadedBundle, record: object) -> RowAnswer:
        answer: asyncio.Future[RowAnswer] = asyncio.get_running_loop().create_future()
        with self._lock:
            batch = self._open.get(key)
            starts = batch is None or batch.taken or len(batch.records) >= self._max_records
            if starts:
                batch = self._open[key] = _Batch()
            batch.records.append(record)
            batch.answers.append(answer)
        if starts:
            asyncio.get_running_loop().create_task(self._run(key, bundle, batch))
        return await answer

    async def _run(self, key: str, bundle: mlbundle.LoadedBundle, batch: _Batch) -> None:
        try:
            answers = await run_model_work(self._predict, key, bundle, batch)
        except BaseException as error:  # noqa: BLE001 - every waiting caller gets the failure
            for waiting in batch.answers:
                if not waiting.done():
                    waiting.set_exception(error)
            return
        for waiting, answer in zip(batch.answers, answers, strict=True):
            if not waiting.done():
                waiting.set_result(answer)

    def _predict(self, key: str, bundle: mlbundle.LoadedBundle, batch: _Batch) -> list[RowAnswer]:
        """On the thread: closes the batch to newcomers, then predicts what it gathered."""
        with self._lock:
            batch.taken = True
            if self._open.get(key) is batch:
                del self._open[key]
            records = list(batch.records)
        return predict_rows(bundle, records)
