#!/usr/bin/env python3
"""Refuse an environment file the stack cannot run on, before anything is touched.

Compose reads an unset variable as empty and only warns, so a missing secret shows up minutes
later as a service that never becomes ready. What the stack requires is read from the Compose
files themselves: every variable they use without a default. Names are printed, values never.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
COMPOSE_FILES = ("docker-compose.yml", "docker-compose.prod.yml")
REQUIRED = re.compile(r"\$\{([A-Z][A-Z0-9_]*)\}")
MAY_BE_EMPTY = {"OPS_AGENT_TERMINAL_SERVICES"}
MINIMUM_LENGTH = {"OPS_AGENT_SHARED_SECRET": 32, "PREDICTION_ATTESTATION_SECRET": 32}


def required_variables(compose_texts: list[str]) -> set[str]:
    names: set[str] = set()
    for text in compose_texts:
        for line in text.splitlines():
            if not line.lstrip().startswith("#"):
                names.update(REQUIRED.findall(line))
    return names


def parse_env(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            name, value = line.split("=", 1)
            value = value.strip()
            quoted = len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'"
            values[name.strip()] = value[1:-1] if quoted else value
    return values


def problems(values: dict[str, str], required: set[str]) -> list[str]:
    found = []
    for name in sorted(required):
        if name not in values:
            found.append(f"{name} is not set")
        elif not values[name] and name not in MAY_BE_EMPTY:
            found.append(f"{name} is empty")
    for name, length in sorted(MINIMUM_LENGTH.items()):
        if 0 < len(values.get(name, "")) < length:
            found.append(f"{name} must have at least {length} characters")
    # RustFS replaced MinIO; an old .env would point the stack at a service that no longer exists.
    if urlsplit(values.get("STORAGE_ENDPOINT", "")).hostname == "minio":
        found.append("STORAGE_ENDPOINT names minio, which RustFS replaced")
    if "minio" in (service.strip() for service in values.get("OPS_AGENT_MANAGED_SERVICES", "").split(",")):
        found.append("OPS_AGENT_MANAGED_SERVICES names minio, which RustFS replaced")
    if values.get("VITE_BACKEND_URL"):
        found.append("VITE_BACKEND_URL must be empty: release images are built without it")
    return found


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    args = parser.parse_args()
    if not args.env_file.is_file():
        sys.exit(f"{args.env_file} does not exist")
    compose_texts = [(ROOT / name).read_text(encoding="utf-8") for name in COMPOSE_FILES]
    found = problems(parse_env(args.env_file.read_text(encoding="utf-8")), required_variables(compose_texts))
    if found:
        sys.exit(f"{args.env_file} cannot run this release:\n  " + "\n  ".join(found))


if __name__ == "__main__":
    main()
