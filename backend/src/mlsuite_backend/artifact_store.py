"""Artifacts on disk under their SHA-256, which the runtime's workers load.

The runtime keeps each artifact it received here, so a later run naming it by hash needs no
transfer: the API sends each artifact once. Workers hash the bytes again when they load them, so a
damaged file fails its request, never runs another model. Files are kept while they total at most
the bound, least recently used out first.
"""

import contextlib
import logging
import os
import threading
import time
from pathlib import Path

_log = logging.getLogger(__name__)
_SUFFIX = ".mlbundle"
# A partial file this old was left by a worker that stopped while writing it.
_ABANDONED_SECONDS = 600


class ArtifactStore:
    def __init__(self, directory: Path, max_bytes: int) -> None:
        self._directory = directory
        self._max_bytes = max_bytes

    def held(self, sha256: str) -> Path | None:
        """Where the bytes kept for sha256 are, marked as just used; None when none are kept."""
        path = self._path(sha256)
        return path if self._touch(path) else None

    def keep(self, sha256: str, content: bytes) -> Path | None:
        """Keeps bytes whose SHA-256 is sha256; None when they cannot be written."""
        path = self._path(sha256)
        if self._touch(path):
            return path
        partial = path.with_name(f"{sha256}.{os.getpid()}.{threading.get_ident()}.partial")
        try:
            self._directory.mkdir(parents=True, exist_ok=True)
            partial.write_bytes(content)
            # Atomic: another worker reads the whole file or none of it.
            os.replace(partial, path)
        except OSError as error:
            # When the directory cannot exist, POSIX refuses even to look for the partial (ENOTDIR).
            with contextlib.suppress(OSError):
                partial.unlink(missing_ok=True)
            _log.warning("Could not keep artifact %s on disk: %s", sha256, error)
            return None
        self._evict(keep=path)
        return path

    def _path(self, sha256: str) -> Path:
        return self._directory / f"{sha256}{_SUFFIX}"

    @staticmethod
    def _touch(path: Path) -> bool:
        try:
            os.utime(path)
            return True
        except OSError:
            return False

    def _evict(self, keep: Path) -> None:
        kept = []
        now = time.time()
        for path in self._directory.iterdir():
            try:
                stat = path.stat()
            except OSError:
                continue
            if path.suffix == ".partial" and now - stat.st_mtime > _ABANDONED_SECONDS:
                path.unlink(missing_ok=True)
            elif path.suffix == _SUFFIX:
                kept.append((stat.st_mtime, stat.st_size, path))
        total = sum(size for _, size, _ in kept)
        for _, size, path in sorted(kept):
            if total <= self._max_bytes:
                break
            if path != keep:
                path.unlink(missing_ok=True)
                total -= size
