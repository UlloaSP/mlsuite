"""Model work runs off the event loop, so it keeps answering other requests (/health among them).

Predictions and explanations run on a bounded pool of threads. Loading a bundle (verifying sent
bytes, inspecting an upload) can take seconds, so it has a thread of its own and never makes a
prediction wait behind it.
"""

import asyncio
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from .config import RUNTIME_MAX_CONCURRENT

_runs = ThreadPoolExecutor(max_workers=RUNTIME_MAX_CONCURRENT, thread_name_prefix="model-work")
_loads = ThreadPoolExecutor(max_workers=1, thread_name_prefix="bundle-load")


async def run_model_work[T](work: Callable[..., T], /, *args: object) -> T:
    """Run a prediction or explanation; work beyond the pool's size waits its turn."""
    return await asyncio.get_running_loop().run_in_executor(_runs, partial(work, *args))


async def run_load_work[T](work: Callable[..., T], /, *args: object) -> T:
    """Load or verify a bundle; loads wait for each other, never for predictions."""
    return await asyncio.get_running_loop().run_in_executor(_loads, partial(work, *args))
