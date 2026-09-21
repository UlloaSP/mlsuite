#!/usr/bin/env python3
"""Ensure development and production share one operational Compose model."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import subprocess


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


def render(override: str) -> dict:
    command = [
        "docker",
        "compose",
        "--env-file",
        ".env.example",
        "-f",
        "docker-compose.yml",
        "-f",
        override,
        "--profile",
        "operations",
        "config",
        "--format",
        "json",
    ]
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
    normalized["services"]["ops-agent"]["environment"].pop(
        "OPS_AGENT_COMPOSE_FILES",
    )
    return normalized


def main() -> None:
    development = render("docker-compose.dev.yml")
    production = render("docker-compose.prod.yml")
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
        assert production["services"][name].get("image"), f"production must pull {name}"
    assert normalize(development) == normalize(production), (
        "development and production Compose differ outside build/image selection"
    )
    print("Development and production Compose parity verified.")


if __name__ == "__main__":
    main()
