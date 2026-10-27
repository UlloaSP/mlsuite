"""Runtime launcher."""

import os

import uvicorn

from .config import RUNTIME_WORKERS

# Longer than the API keeps an idle connection, so the API never reuses one the runtime closed.
KEEP_ALIVE_SECONDS = 65


def main() -> None:
    uvicorn.run(
        "mlsuite_backend.main:app",
        host=os.environ["PYTHON_HOST"],
        port=int(os.environ["PYTHON_PORT"]),
        workers=RUNTIME_WORKERS,
        timeout_keep_alive=KEEP_ALIVE_SECONDS,
    )


if __name__ == "__main__":
    main()
