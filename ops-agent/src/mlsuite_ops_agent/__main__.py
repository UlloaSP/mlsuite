"""Entrypoint for `python -m mlsuite_ops_agent`."""

import uvicorn

from .app import MissingSharedSecretError, create_app
from .config import SETTINGS


def main() -> None:
    try:
        app = create_app()
    except MissingSharedSecretError as error:
        raise SystemExit(f"ops-agent: {error}") from None
    uvicorn.run(app, host=SETTINGS.host, port=SETTINGS.port)


if __name__ == "__main__":
    main()
