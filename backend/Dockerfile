FROM cgr.dev/chainguard/python:latest-dev@sha256:c07959e43e3edece176d20c32428a53014379790169af4ea5de1dc47277eba75 AS build

USER root

WORKDIR /app

COPY pyproject.toml .
COPY uv.lock .

COPY src ./src

RUN uv sync --frozen --no-dev

# The builder installs environments with this uv, and only the CPython releases it can download
# are accepted: upgrading it is how a new patch release inside the allowlist's range becomes
# installable (0.13.6 adds CPython 3.14.10).
FROM ghcr.io/astral-sh/uv:0.13.6@sha256:af22a52f5eafef3d78e551599d405c02df61919d18028f0cea8eda93bc9986d0 AS uv

# Chainguard's free python:latest moved to 3.15, which the locked ML wheels do not support yet.
# Install 3.14 on wolfi-base instead so package upgrades still reach the runtime.
FROM cgr.dev/chainguard/wolfi-base:latest@sha256:360896efb0753a5701c48f860e17130c205eae5a264797aa3e7ea126ee2923a7 AS runtime
RUN apk upgrade --no-cache && apk add --no-cache python-3.14
COPY --from=uv /uv /usr/local/bin/uv
# A new named volume takes this directory's owner, so the builder can write it unprivileged.
RUN mkdir -p /var/lib/mlsuite/environments && chown 65532:65532 /var/lib/mlsuite/environments
# Created by root, before the switch: the runtime's user, and so every model, may write /tmp only.
WORKDIR /app

USER 65532
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/src ./src
COPY environment-allowlist.toml .

EXPOSE 8000

# The runtime by default; the builder runs this image with `-m mlsuite_backend.builder`.
ENTRYPOINT ["/app/.venv/bin/python", "-m"]
CMD ["mlsuite_backend"]
