FROM cgr.dev/chainguard/python:latest-dev@sha256:c07959e43e3edece176d20c32428a53014379790169af4ea5de1dc47277eba75 AS build

USER root

WORKDIR /app

COPY pyproject.toml .
COPY uv.lock .

COPY src ./src

RUN uv sync --frozen --no-dev

# The frozen environment for bundles written before locks (mlbundle 0.2.1); models with a lock
# run in environments the builder installs at runtime.
COPY legacy/pyproject.toml legacy/uv.lock ./legacy/
RUN UV_PROJECT_ENVIRONMENT=/opt/mlsuite/legacy uv sync --frozen --no-dev --directory legacy

# The builder installs environments with this uv; it knows the CPython releases the allowlist names.
FROM ghcr.io/astral-sh/uv:0.13.5@sha256:32a7bb39b496babbd997b0a39a4d66c126bdaf5661b302bf6f06abda8deca6ff AS uv

# Chainguard's free python:latest moved to 3.15, which the locked ML wheels do not support yet.
# Install 3.14 on wolfi-base instead so package upgrades still reach the runtime.
FROM cgr.dev/chainguard/wolfi-base:latest@sha256:360896efb0753a5701c48f860e17130c205eae5a264797aa3e7ea126ee2923a7 AS runtime
RUN apk upgrade --no-cache && apk add --no-cache python-3.14
COPY --from=uv /uv /usr/local/bin/uv
# A new named volume takes this directory's owner, so the builder can write it unprivileged.
RUN mkdir -p /var/lib/mlsuite/environments && chown 65532:65532 /var/lib/mlsuite/environments

USER 65532
WORKDIR /app
COPY --from=build /app/.venv ./.venv
COPY --from=build /opt/mlsuite/legacy /opt/mlsuite/legacy
COPY --from=build /app/src ./src
COPY environment-allowlist.toml .

EXPOSE 8000

# The runtime by default; the builder runs this image with `-m mlsuite_backend.builder`.
ENTRYPOINT ["/app/.venv/bin/python", "-m"]
CMD ["mlsuite_backend"]
