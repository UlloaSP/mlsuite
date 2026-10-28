"""Runtime launcher: one asynchronous process that runs models in its worker processes."""

import os

import uvicorn

# Longer than the API keeps an idle connection, so the API never reuses one the runtime closed.
KEEP_ALIVE_SECONDS = 65


def main() -> None:
    uvicorn.run(
        "mlsuite_backend.main:app",
        host=os.environ["PYTHON_HOST"],
        port=int(os.environ["PYTHON_PORT"]),
        timeout_keep_alive=KEEP_ALIVE_SECONDS,
    )


if __name__ == "__main__":
    main()
