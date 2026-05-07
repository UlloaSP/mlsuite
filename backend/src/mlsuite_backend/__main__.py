"""Runtime launcher."""

import os

import uvicorn


def main() -> None:
    kwargs: dict[str, object] = {
        "host": os.environ["PYTHON_HOST"],
        "port": int(os.environ["PYTHON_PORT"]),
    }
    if os.environ.get("PYTHON_SSL_ENABLED", "").lower() == "true":
        kwargs["ssl_keyfile"] = os.environ["PYTHON_SSL_KEYFILE"]
        kwargs["ssl_certfile"] = os.environ["PYTHON_SSL_CERTFILE"]
    uvicorn.run("mlsuite_backend.main:app", **kwargs)


if __name__ == "__main__":
    main()
