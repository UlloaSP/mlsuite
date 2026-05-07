"""Entrypoint for `python -m mlsuite_ops_agent`."""

import uvicorn

from .config import SETTINGS


def main() -> None:
    uvicorn.run(
        "mlsuite_ops_agent.app:create_app",
        factory=True,
        host=SETTINGS.host,
        port=SETTINGS.port,
    )


if __name__ == "__main__":
    main()
