"""Runtime launcher."""

import os

import uvicorn


def main() -> None:
    kwargs: dict[str, object] = {
        "host": os.environ["PYTHON_HOST"],
        "port": int(os.environ["PYTHON_PORT"]),
    }
    uvicorn.run("mlsuite_backend.main:app", **kwargs)


if __name__ == "__main__":
    main()
