"""Builder launcher."""

import os

import uvicorn


def main() -> None:
    uvicorn.run(
        "mlsuite_backend.builder.app:app",
        host=os.environ["RUNTIME_BUILDER_HOST"],
        port=int(os.environ["RUNTIME_BUILDER_PORT"]),
    )


if __name__ == "__main__":
    main()
