FROM cgr.dev/chainguard/python:latest-dev@sha256:c07959e43e3edece176d20c32428a53014379790169af4ea5de1dc47277eba75 AS build

USER root

WORKDIR /app

COPY pyproject.toml .
COPY uv.lock .

COPY src ./src

RUN uv sync --frozen --no-dev

FROM cgr.dev/chainguard/python:latest@sha256:3f411b4aac1ed9cd6c9dec1486f92a8898737d9d6f95488dd727ca7d6f5254ee

WORKDIR /app
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/src ./src

EXPOSE 8000

ENTRYPOINT ["/app/.venv/bin/python", "-m", "mlsuite_backend"]
