"""The bounds a worker runs models within, set before any model library is imported.

The runtime passes them in the worker's environment. A model that reaches one fails with a clear
answer, and the worker then retires, so whatever the model left behind goes with it.
"""

import errno
import os

# The setting a self-hoster changes for each bound, and how a model that reaches it is told.
_BOUNDS = (
    ("RLIMIT_AS", "MLSUITE_WORKER_MEMORY_BYTES"),
    ("RLIMIT_NOFILE", "MLSUITE_WORKER_OPEN_FILES"),
    ("RLIMIT_NPROC", "MLSUITE_WORKER_PROCESSES"),
)
# A model past a bound cannot run here: the API marks it so, rather than retrying.
STATUS = 422


def apply(environ: dict[str, str] | os._Environ = os.environ) -> None:
    """Lowers this process's limits, soft and hard, so the model cannot raise them again."""
    if os.name != "posix":
        return
    import resource

    for limit, variable in _BOUNDS:
        value = environ.get(variable)
        if value:
            resource.setrlimit(getattr(resource, limit), (int(value), int(value)))


def breach(error: BaseException) -> str | None:
    """What reaching a bound means for the model, or None for any other failure."""
    if isinstance(error, MemoryError):
        return "The model needed more memory than a worker may use (RUNTIME_WORKER_MEMORY_MB)"
    if isinstance(error, OSError) and error.errno in (errno.EMFILE, errno.ENFILE):
        return "The model opened more files than a worker may (RUNTIME_WORKER_OPEN_FILES)"
    if (isinstance(error, OSError) and error.errno == errno.EAGAIN) or (
        isinstance(error, RuntimeError) and "can't start new thread" in str(error)
    ):
        return "The model started more processes or threads than a worker may (RUNTIME_WORKER_PROCESSES)"
    return None
