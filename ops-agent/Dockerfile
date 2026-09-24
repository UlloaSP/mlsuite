FROM python:3.14-alpine@sha256:9e9fde4d32eedce0b661d9ab91e826b62dddf28e928c230ec55f1866cac66b01 AS build

RUN python -m pip install --no-cache-dir uv==0.12.17

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY src ./src

RUN uv sync --frozen --no-dev

FROM python:3.14-alpine@sha256:9e9fde4d32eedce0b661d9ab91e826b62dddf28e928c230ec55f1866cac66b01

RUN apk add --no-cache docker-cli docker-cli-compose

WORKDIR /app
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/src ./src

EXPOSE 8091

CMD [".venv/bin/python", "-m", "mlsuite_ops_agent"]
