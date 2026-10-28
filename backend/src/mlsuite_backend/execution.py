"""Work the runtime does itself runs off the event loop, so it keeps answering (/health among them).

Models run in worker processes; here only inspecting an upload and composing an explanation run,
each on a thread of its own so neither waits behind the other.
"""

import asyncio
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from functools import partial

_inspections = ThreadPoolExecutor(max_workers=1, thread_name_prefix="bundle-inspection")
_explanations = ThreadPoolExecutor(max_workers=1, thread_name_prefix="explanation")


async def run_inspection[T](work: Callable[..., T], /, *args: object) -> T:
    return await asyncio.get_running_loop().run_in_executor(_inspections, partial(work, *args))


async def run_explanation[T](work: Callable[..., T], /, *args: object) -> T:
    return await asyncio.get_running_loop().run_in_executor(_explanations, partial(work, *args))
