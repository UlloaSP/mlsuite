"""Installing one environment: a managed CPython and exactly the lock's wheels for this platform.

Every file comes from the configured index and must carry a SHA-256 the lock (or, for mlbundle,
the allowlist) names; the URLs in a lock are never used, so an author cannot point the builder
at other files. Nothing is built from source, nothing outside the lock is resolved, and the
environment's interpreter is never started here: a package's code first runs in a worker, which
has no network. The environment appears under its key only once complete.
"""

import json
import os
import shutil
import subprocess
import sysconfig
import uuid
from datetime import UTC, datetime
from pathlib import Path

import mlbundle

from .. import environments
from ..config import PACKAGE_INDEX_URL, UV_BINARY, VENV_PYTHON
from ..policy import Allowlist

# uv output kept in a failure, enough to name the package that failed.
_ERROR_TAIL = 2000


class BuildFailed(Exception):
    """uv could not install the environment; trying again may succeed (an index outage)."""


def requirements(lock: mlbundle.EnvironmentLock, writer_version: str, allowed: Allowlist, platform: str) -> str:
    """Hash-pinned requirements for this platform: every locked wheel's digest may match."""
    lines = [f"mlbundle=={writer_version} --hash=sha256:{allowed.mlbundle[writer_version]}"]
    for package in lock.packages:
        if platform not in package.platforms:
            continue
        hashes = " ".join(f"--hash=sha256:{wheel.sha256}" for wheel in package.wheels)
        lines.append(f"{package.name}=={package.version} {hashes}")
    return "\n".join(lines) + "\n"


def _uv(*arguments: str, root: Path) -> None:
    env = {
        **os.environ,
        "UV_CACHE_DIR": str(root / ".cache"),
        "UV_PYTHON_INSTALL_DIR": str(root / ".python"),
        "UV_NO_CONFIG": "1",
    }
    result = subprocess.run([UV_BINARY, *arguments], capture_output=True, text=True, env=env, check=False)
    if result.returncode != 0:
        raise BuildFailed((result.stderr or result.stdout)[-_ERROR_TAIL:].strip())


def build(lock: mlbundle.EnvironmentLock, writer_version: str, allowed: Allowlist, root: Path) -> dict[str, object]:
    """Builds the environment unless it exists; returns what it holds."""
    key = environments.environment_key(lock, writer_version)
    target = environments.directory(key, root)
    if (target / environments.READY_FILE).is_file():
        return environments.read_ready(key, root)
    staging = root / ".staging" / f"{key}-{uuid.uuid4().hex}"
    staging.mkdir(parents=True)
    try:
        python = lock.python_version
        _uv("python", "install", "--no-bin", python, root=root)
        _uv("venv", "--quiet", "--relocatable", "--python-preference", "only-managed",
            "--python", python, str(staging / "venv"), root=root)
        requirements_file = staging / "requirements.txt"
        requirements_file.write_text(
            requirements(lock, writer_version, allowed, sysconfig.get_platform()), encoding="utf-8"
        )
        _uv("pip", "install", "--quiet", "--python", str(staging / "venv" / VENV_PYTHON),
            # --no-build: wheels only, never a source build.
            "--no-deps", "--require-hashes", "--no-build",
            "--index-url", PACKAGE_INDEX_URL, "-r", str(requirements_file), root=root)
        requirements_file.unlink()
        description = {
            **environments.describe(lock, writer_version),
            "builtAt": datetime.now(UTC).isoformat(),
        }
        (staging / environments.READY_FILE).write_text(json.dumps(description), encoding="utf-8")
        try:
            staging.rename(target)
        except OSError:
            if not (target / environments.READY_FILE).is_file():
                raise
        return environments.read_ready(key, root)
    finally:
        shutil.rmtree(staging, ignore_errors=True)


def remove(key: str, root: Path) -> None:
    """Removes a built environment; runs naming it afterwards are told to prepare it again."""
    target = environments.directory(key, root)
    if not target.exists():
        return
    # Out of the ready path at once, so no worker starts in it while it is deleted.
    doomed = root / ".staging" / f"{key}-removed-{uuid.uuid4().hex}"
    doomed.parent.mkdir(parents=True, exist_ok=True)
    target.rename(doomed)
    shutil.rmtree(doomed, ignore_errors=True)
