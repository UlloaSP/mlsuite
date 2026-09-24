#!/usr/bin/env python3
"""Reject production Compose models that are not fully pinned by digest."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
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
DIGEST_IMAGE = re.compile(r"^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$")


def validate_release_config(config: dict) -> None:
    services = config.get("services", {})
    for name in APP_SERVICES:
        service = services.get(name, {})
        image = service.get("image", "")
        if not DIGEST_IMAGE.fullmatch(image):
            raise ValueError(f"{name} must use a GHCR image pinned by sha256 digest")
        if "build" in service:
            raise ValueError(f"{name} must not contain a production build context")
    api_images = {services[name]["image"] for name in (
        "db-migrate", "artifact-migrate", "spring-app"
    )}
    if len(api_images) != 1:
        raise ValueError("database, artifact and API services must use the same image digest")


def render(docker_bin: str, env_file: str, release_compose: str) -> dict:
    command = [
        docker_bin, "compose", "--env-file", env_file,
        "-f", "docker-compose.yml",
        "-f", "docker-compose.prod.yml",
        "-f", release_compose,
        "--profile", "operations",
        "config", "--format", "json",
    ]
    result = subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", default=".env")
    parser.add_argument("--release-compose", required=True)
    parser.add_argument("--docker-bin", default="docker")
    args = parser.parse_args()
    validate_release_config(render(args.docker_bin, args.env_file, args.release_compose))
    print("Production application images are pinned by digest.")


if __name__ == "__main__":
    main()
