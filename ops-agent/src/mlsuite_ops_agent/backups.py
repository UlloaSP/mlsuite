"""The outcome of the host's last local backup, as scripts/create-local-backup.sh records it."""

from __future__ import annotations

from pathlib import Path, PurePosixPath

# Compose mounts the checkout here, read-only. A backup root outside the checkout is not visible.
WORKSPACE = Path("/workspace")
_REQUIRED = ("backup.manifest", "recovery.scope")


def backup_root(configured: str, workspace: Path = WORKSPACE) -> Path | None:
    """LOCAL_BACKUP_ROOT as the agent sees it; None when it lies outside the checkout."""
    # A path on the Linux host, whatever the agent runs on.
    return None if PurePosixPath(configured).is_absolute() else workspace / configured


def backup_failing(root: Path | None) -> bool | None:
    """Whether the last backup attempt failed or its backup is gone.

    A host that never attempted one has nothing failing: backups run before each deployment, so
    their age says nothing about a failure. None means the agent cannot tell.
    """
    if root is None:
        return None
    try:
        attempt = root / "last-attempt"
        if not attempt.exists():
            return False
        fields = dict(line.split("=", 1) for line in attempt.read_text().splitlines() if "=" in line)
        if fields.get("result") != "succeeded":
            return True
        name = fields.get("backup", "")
        if not name.startswith("production-") or "/" in name:
            return True
        backup = root / name
        return not all((backup / file).is_file() and (backup / file).stat().st_size > 0 for file in _REQUIRED)
    except OSError:
        return None
