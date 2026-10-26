FROM cgr.dev/chainguard/python:latest-dev@sha256:c07959e43e3edece176d20c32428a53014379790169af4ea5de1dc47277eba75 AS build

USER root

WORKDIR /app

COPY pyproject.toml .
COPY uv.lock .

COPY src ./src

RUN uv sync --frozen --no-dev

# Chainguard's free python:latest moved to 3.15, which the locked ML wheels do not support yet.
# Install 3.14 on wolfi-base instead so package upgrades still reach the runtime.
FROM cgr.dev/chainguard/wolfi-base:latest@sha256:360896efb0753a5701c48f860e17130c205eae5a264797aa3e7ea126ee2923a7 AS runtime
RUN apk upgrade --no-cache && apk add --no-cache python-3.14

USER 65532
WORKDIR /app
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/src ./src

EXPOSE 8000

ENTRYPOINT ["/app/.venv/bin/python", "-m", "mlsuite_backend"]
