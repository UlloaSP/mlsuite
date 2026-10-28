"""Which environments MLsuite agrees to install: the reviewed allowlist.

Installing a bundle's lock runs code from every package it names, so a lock is accepted only when
its Python version, the mlbundle release that wrote it and every locked package (the whole set,
not just the model's libraries) appear in the allowlist with that exact version. The same check
runs when a bundle is uploaded and again before an environment is built.
"""

import re
import tomllib
from dataclasses import dataclass
from functools import cache
from pathlib import Path

import mlbundle

from .config import ALLOWLIST_PATH

_SHA256 = re.compile(r"[0-9a-f]{64}")


@dataclass(frozen=True)
class Allowlist:
    python: frozenset[str]
    # mlbundle release -> sha256 of its wheel, which the lock omits and the builder installs.
    mlbundle: dict[str, str]
    packages: dict[str, frozenset[str]]

    def violations(self, lock: mlbundle.EnvironmentLock, writer_version: str) -> list[str]:
        """What the lock needs that the allowlist does not grant, as name==version."""
        refused = []
        if lock.python_version not in self.python:
            refused.append(f"python=={lock.python_version}")
        if writer_version not in self.mlbundle:
            refused.append(f"mlbundle=={writer_version}")
        refused.extend(
            f"{package.name}=={package.version}"
            for package in lock.packages
            if package.version not in self.packages.get(package.name, frozenset())
        )
        return refused


def parse_allowlist(text: str) -> Allowlist:
    data = tomllib.loads(text)
    python = data.get("python")
    released = data.get("mlbundle")
    packages = data.get("packages")
    if not isinstance(python, list) or not all(isinstance(version, str) for version in python):
        raise ValueError("The allowlist's python must be a list of versions.")
    if not isinstance(released, dict) or not all(
        isinstance(digest, str) and _SHA256.fullmatch(digest) for digest in released.values()
    ):
        raise ValueError("The allowlist's mlbundle must map each release to its wheel's sha256.")
    if not isinstance(packages, dict) or not all(
        isinstance(versions, list) and all(isinstance(version, str) for version in versions)
        for versions in packages.values()
    ):
        raise ValueError("The allowlist's packages must map each name to a list of versions.")
    return Allowlist(
        python=frozenset(python),
        mlbundle=dict(released),
        packages={name: frozenset(versions) for name, versions in packages.items()},
    )


@cache
def allowlist() -> Allowlist:
    return parse_allowlist(Path(ALLOWLIST_PATH).read_text(encoding="utf-8"))
