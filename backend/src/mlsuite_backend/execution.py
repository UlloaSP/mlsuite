"""Model work runs on a bounded pool of threads, so the event loop keeps answering other requests."""

import asyncio
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from .config import RUNTIME_MAX_CONCURRENT

_pool = ThreadPoolExecutor(max_workers=RUNTIME_MAX_CONCURRENT, thread_name_prefix="model-work")


async def run_model_work[T](work: Callable[..., T], /, *args: object) -> T:
    """Run blocking work off the event loop; work beyond the pool's size waits its turn."""
    return await asyncio.get_running_loop().run_in_executor(_pool, partial(work, *args))
