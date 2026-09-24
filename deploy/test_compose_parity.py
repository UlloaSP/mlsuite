#!/usr/bin/env python3
"""Ensure development and production share one operational Compose model."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import re
import subprocess
import tempfile

from verify_release_images import validate_release_config


ROOT = Path(__file__).resolve().parents[1]
APP_SERVICES = {
    "ops-agent",
    "py-analyzer",
    "db-migrate",
    "artifact-migrate",
    "spring-app",
    "frontend",
}
OPS_COMPOSE_FILES = {
    "development": "/workspace/docker-compose.yml,/workspace/docker-compose.dev.yml",
    "production": (
        "/workspace/docker-compose.yml,/workspace/docker-compose.prod.yml,"
        "/workspace/docker-compose.release.yml"
    ),
}


IMAGE_DIGEST = re.compile(r"^ghcr\.io/.+@sha256:[0-9a-f]{64}$")


def render(*overrides: str) -> dict:
    command = [
        "docker",
        "compose",
        "--env-file",
        ".env.example",
        "-f",
        "docker-compose.yml",
        "--profile",
        "operations",
        "config",
        "--format",
        "json",
    ]
    for override in overrides:
        command[command.index("--profile"):command.index("--profile")] = ["-f", override]
    result = subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def normalize(config: dict) -> dict:
    normalized = deepcopy(config)
    for key in tuple(normalized):
        if key.startswith("x-"):
            normalized.pop(key)
    for name in APP_SERVICES:
        service = normalized["services"][name]
        service.pop("build", None)
        service.pop("image", None)
        service.pop("platform", None)
    normalized["services"]["ops-agent"]["environment"].pop(
        "OPS_AGENT_COMPOSE_FILES",
    )
    return normalized


def main() -> None:
    development = render("docker-compose.dev.yml")
    digest = "sha256:" + "a" * 64
    image_names = {
        "artifact-migrate": "mlsuite-api",
        "db-migrate": "mlsuite-api",
        "spring-app": "mlsuite-api",
        "py-analyzer": "mlsuite-sklearn-backend",
        "frontend": "mlsuite-frontend",
        "ops-agent": "mlsuite-ops-agent",
    }
    release = "services:\n" + "\n".join(
        f"  {name}:\n    image: ghcr.io/example/{image_names[name]}@{digest}\n"
        "    platform: linux/amd64"
        for name in sorted(APP_SERVICES)
    ) + "\n"
    with tempfile.NamedTemporaryFile("w", suffix=".yml", delete=False) as handle:
        handle.write(release)
        release_path = handle.name
    try:
        production = render("docker-compose.prod.yml", release_path)
    finally:
        Path(release_path).unlink(missing_ok=True)
    assert (
        development["services"]["ops-agent"]["environment"]["OPS_AGENT_COMPOSE_FILES"]
        == OPS_COMPOSE_FILES["development"]
    ), "development ops-agent must manage the development Compose model"
    assert (
        production["services"]["ops-agent"]["environment"]["OPS_AGENT_COMPOSE_FILES"]
        == OPS_COMPOSE_FILES["production"]
    ), "production ops-agent must preserve the digest-pinned release model"
    for name in APP_SERVICES:
        assert "build" in development["services"][name], f"development must build {name}"
        assert "build" not in production["services"][name], f"production must not build {name}"
    assert normalize(development) == normalize(production), (
        "development and production Compose differ outside build/image selection"
    )
    # The persistent pg_data volume on develop uses PostgreSQL 18. A major-version
    # change requires an explicit data migration, not an image substitution.
    postgres_image = production["services"]["postgres"]["image"]
    assert postgres_image.startswith("postgres:18."), (
        "the persistent PostgreSQL volume must stay on major version 18"
    )
    assert production["services"]["db-provision"]["image"] == postgres_image, (
        "database provisioner must use the server's PostgreSQL version"
    )
    for name in APP_SERVICES:
        image = production["services"][name].get("image", "")
        assert IMAGE_DIGEST.fullmatch(image), f"production release must pin {name} by digest"
        assert "build" not in production["services"][name], f"production must not build {name}"
    validate_release_config(production)
    root_user = development["services"]["minio"]["environment"]["MINIO_ROOT_USER"]
    app_user = development["services"]["spring-app"]["environment"]["STORAGE_ACCESS_KEY"]
    assert root_user and app_user and root_user != app_user, (
        "MinIO root and application identities must be distinct"
    )
    provisioner = (ROOT / "deploy/minio/provision.sh").read_text()
    assert '"s3:' in provisioner and '"admin:' not in provisioner, (
        "MinIO application policy must contain only S3 actions"
    )
    assert 'arn:aws:s3:::%s' in provisioner, (
        "MinIO application policy must be restricted to the configured bucket"
    )
    print("Development and production Compose parity verified.")


if __name__ == "__main__":
    main()
