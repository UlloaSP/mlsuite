#!/usr/bin/env python3
"""Ensure development and production share one operational Compose model."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import re
import subprocess
import tempfile

from verify_release_images import APP_SERVICES, validate_release_config


ROOT = Path(__file__).resolve().parents[1]
OPS_COMPOSE_FILES = {
    "development": "/workspace/docker-compose.yml,/workspace/docker-compose.dev.yml",
    "production": (
        "/workspace/docker-compose.yml,/workspace/docker-compose.prod.yml,"
        "/workspace/docker-compose.release.yml"
    ),
}


IMAGE_DIGEST = re.compile(r"^.+:[^:/@]+@sha256:[0-9a-f]{64}$")


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
        "artifact-prune": "mlsuite-api",
        "db-migrate": "mlsuite-api",
        "spring-app": "mlsuite-api",
        "py-analyzer": "mlsuite-sklearn-backend",
        "runtime-builder": "mlsuite-sklearn-backend",
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
    assert "ARTIFACT_JOB=verify" in (ROOT / "scripts/smoke-restored-release.sh").read_text(), (
        "the restore rehearsal must check every model artifact against its hash"
    )
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
    rustfs_image = production["services"]["rustfs"]["image"]
    rc_image = production["services"]["rustfs-init"]["image"]
    assert IMAGE_DIGEST.fullmatch(rustfs_image), "object storage image must be pinned by digest"
    assert IMAGE_DIGEST.fullmatch(rc_image), "object storage client image must be pinned by digest"
    storage_test = ROOT / "api/src/test/java/dev/ulloasp/mlsuite/storage/S3ObjectStorageServiceTest.java"
    assert rustfs_image in storage_test.read_text(), (
        "the storage contract test must run against the Compose object storage image"
    )
    validate_release_config(production)
    published = {
        name: [(port.get("host_ip", ""), port["target"]) for port in service.get("ports", [])]
        for name, service in production["services"].items()
        if service.get("ports")
    }
    assert published == {"postgres": [("127.0.0.1", 5432)], "frontend": [("", 5173)]}, (
        "only the web app may be published publicly; PostgreSQL stays on loopback"
    )
    runtime_peers = {
        name for name, service in production["services"].items()
        if "runtime" in service.get("networks", {})
    }
    assert runtime_peers == {"py-analyzer", "spring-app"}, (
        "only the API may share a network with the runtime that parses uploaded models"
    )
    assert set(production["services"]["py-analyzer"]["networks"]) == {"runtime"}
    assert production["networks"]["runtime"].get("internal") is True, (
        "the runtime network must have no route to other networks or the internet"
    )
    build_peers = {
        name for name, service in production["services"].items()
        if "build" in service.get("networks", {})
    }
    assert build_peers == {"runtime-builder", "spring-app"}, (
        "only the API may ask the builder to install an environment"
    )
    assert production["networks"]["build"].get("internal") is True
    egress_peers = {
        name for name, service in production["services"].items()
        if "egress" in service.get("networks", {})
    }
    assert egress_peers == {"runtime-builder"}, "only the builder may download packages"
    environments = {
        name: volume.get("read_only", False)
        for name, service in production["services"].items()
        for volume in service.get("volumes", [])
        if volume.get("source") == "runtime_environments"
    }
    assert environments == {"py-analyzer": True, "runtime-builder": False}, (
        "the builder alone writes environments; the runtime runs models in them read-only"
    )
    for name, service in production["services"].items():
        options = service.get("logging", {}).get("options", {})
        assert options.get("max-size") and options.get("max-file"), (
            f"{name} must rotate its container logs"
        )
    assert "healthcheck" in production["services"]["py-analyzer"], "the runtime must report health"
    assert production["services"]["spring-app"]["depends_on"]["py-analyzer"]["condition"] == (
        "service_healthy"
    ), "the API must wait for a healthy runtime"
    assert "healthcheck" in production["services"]["runtime-builder"], "the builder must report health"
    script_pins = (ROOT / "scripts/lib.sh").read_text().splitlines()
    assert f"POSTGRES_IMAGE={postgres_image}" in script_pins, (
        "operational scripts must use the Compose PostgreSQL image"
    )
    assert f"RUSTFS_IMAGE={rustfs_image}" in script_pins, (
        "operational scripts must use the Compose object storage image"
    )
    assert f"RC_IMAGE={rc_image}" in script_pins, (
        "operational scripts must use the Compose object storage client image"
    )
    root_user = development["services"]["rustfs"]["environment"]["RUSTFS_ACCESS_KEY"]
    app_user = development["services"]["spring-app"]["environment"]["STORAGE_ACCESS_KEY"]
    assert root_user and app_user and root_user != app_user, (
        "RustFS root and application identities must be distinct"
    )
    provisioner = (ROOT / "deploy/rustfs/provision.sh").read_text()
    assert '"s3:' in provisioner and '"admin:' not in provisioner, (
        "RustFS application policy must contain only S3 actions"
    )
    assert 'arn:aws:s3:::%s' in provisioner, (
        "RustFS application policy must be restricted to the configured bucket"
    )
    print("Development and production Compose parity verified.")


if __name__ == "__main__":
    main()
