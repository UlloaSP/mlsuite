"""Which environments MLsuite agrees to install: the reviewed allowlist.

A bundle's lock pins the exact Python and distributions its model was trained with, and an
environment always holds exactly that lock. The allowlist decides which locks MLsuite agrees to
install at all: the Python version must be inside the allowlist's range and one the runtime's uv
can download, the mlbundle release that wrote the bundle must be named exactly, and every locked
package (the whole set, not just the model's libraries) must be a package the allowlist names, at
a version inside its range. A package it does not name, a pre-release or a version outside the
range is refused. The same check runs when a bundle is uploaded and again before an environment
is built; the builder then checks each release on the index (see builder.releases) before
installing anything.
"""

import json
import re
import subprocess
import tomllib
from dataclasses import dataclass
from functools import cache
from pathlib import Path

import mlbundle
from packaging.specifiers import InvalidSpecifier, SpecifierSet
from packaging.version import InvalidVersion, Version

from .config import ALLOWLIST_PATH, UV_BINARY

_SHA256 = re.compile(r"[0-9a-f]{64}")


@cache
def python_installable(version: str) -> bool:
    """Whether the runtime's uv can download this CPython, as the builder will ask it to."""
    try:
        result = subprocess.run(
            [UV_BINARY, "python", "list", version, "--only-downloads", "--all-versions", "--output-format", "json"],
            capture_output=True, text=True, check=True, timeout=30,
        )
        return any(download.get("version") == version for download in json.loads(result.stdout))
    except (OSError, subprocess.SubprocessError, ValueError):
        return False


@dataclass(frozen=True)
class Allowlist:
    # The CPython releases MLsuite installs, as a PEP 440 range; uv decides which exist.
    python: SpecifierSet
    # mlbundle release -> sha256 of its wheel, which the lock omits and the builder installs.
    mlbundle: dict[str, str]
    # Package name -> the versions MLsuite installs, as a PEP 440 range.
    packages: dict[str, SpecifierSet]

    def violations(self, lock: mlbundle.EnvironmentLock, writer_version: str) -> list[str]:
        """What the lock needs that the allowlist does not grant, each with the reason."""
        refused = []
        if not _within(lock.python_version, self.python):
            refused.append(f"python=={lock.python_version} (MLsuite installs {self.python})")
        elif not python_installable(lock.python_version):
            refused.append(f"python=={lock.python_version} (the runtime cannot download it yet)")
        if writer_version not in self.mlbundle:
            refused.append(f"mlbundle=={writer_version}")
        for package in lock.packages:
            allowed = self.packages.get(package.name)
            if allowed is None:
                refused.append(f"{package.name}=={package.version} (not a package MLsuite installs)")
            elif not _within(package.version, allowed):
                refused.append(f"{package.name}=={package.version} (MLsuite installs {allowed})")
        return refused


def _within(version: str, allowed: SpecifierSet) -> bool:
    try:
        parsed = Version(version)
    except InvalidVersion:
        return False
    # Pre-releases are never installed, whatever the range says.
    return not parsed.is_prerelease and allowed.contains(parsed, prereleases=False)


def _range(name: str, text: object) -> SpecifierSet:
    if not isinstance(text, str) or not text.strip():
        raise ValueError(f"The allowlist's {name} must be a non-empty version range such as \">=1.2,<2\".")
    try:
        return SpecifierSet(text)
    except InvalidSpecifier as error:
        raise ValueError(f"The allowlist's {name} range is invalid: {error}") from None


def parse_allowlist(text: str) -> Allowlist:
    data = tomllib.loads(text)
    python = data.get("python")
    released = data.get("mlbundle")
    packages = data.get("packages")
    if not isinstance(released, dict) or not all(
        isinstance(digest, str) and _SHA256.fullmatch(digest) for digest in released.values()
    ):
        raise ValueError("The allowlist's mlbundle must map each release to its wheel's sha256.")
    if not isinstance(packages, dict):
        raise ValueError("The allowlist's packages must map each name to a version range.")
    return Allowlist(
        python=_range("python", python),
        mlbundle=dict(released),
        packages={name: _range(name, versions) for name, versions in packages.items()},
    )


@cache
def allowlist() -> Allowlist:
    return parse_allowlist(Path(ALLOWLIST_PATH).read_text(encoding="utf-8"))
