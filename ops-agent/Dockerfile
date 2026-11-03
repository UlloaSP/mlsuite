# The uv the backend's image pins: one uv for every Python image the project builds.
FROM ghcr.io/astral-sh/uv:0.13.6@sha256:af22a52f5eafef3d78e551599d405c02df61919d18028f0cea8eda93bc9986d0 AS uv

FROM python:3.14-alpine@sha256:9e9fde4d32eedce0b661d9ab91e826b62dddf28e928c230ec55f1866cac66b01 AS build

COPY --from=uv /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY src ./src

RUN uv sync --frozen --no-dev

FROM python:3.14-alpine@sha256:9e9fde4d32eedce0b661d9ab91e826b62dddf28e928c230ec55f1866cac66b01 AS runtime

RUN python -m pip uninstall -y pip
RUN apk upgrade --no-cache && apk add --no-cache 'docker-cli>=29.8.2-r0' docker-cli-compose

WORKDIR /app
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/src ./src

EXPOSE 8091

CMD [".venv/bin/python", "-m", "mlsuite_ops_agent"]
