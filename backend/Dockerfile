FROM cgr.dev/chainguard/python:latest-dev@sha256:e55c66e1405ff03cf60c56c8c11bba46a272796ace158cd913dad5998caaf58a AS build

USER root

WORKDIR /app

COPY pyproject.toml .
COPY uv.lock .

COPY src ./src

RUN uv sync --frozen --no-dev

FROM cgr.dev/chainguard/python:latest@sha256:f23c2b7cd3d6b18aed6ad6e1099d79668ff62ba49078e81bb558e5a1c7581fd8

WORKDIR /app
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/src ./src

EXPOSE 8000

ENTRYPOINT ["/app/.venv/bin/python", "-m", "mlsuite_backend"]
