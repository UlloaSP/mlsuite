"""Verified artifacts on disk, shared by the runtime's worker processes.

A worker that verified an artifact keeps its bytes here under their SHA-256, so another worker
asked to run it loads it from disk instead of answering 409 and having the API send it again:
the API sends each artifact once, whichever worker it reaches. Bytes are hashed again when read,
so a damaged file is a miss, never another model. Files are kept while they total at most the
bound, least recently used out first. Failing to write one only costs a later transfer.
"""

import contextlib
import hashlib
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

    def has(self, sha256: str) -> bool:
        """Whether bytes are kept for sha256: one stat, cheap enough for the event loop."""
        return self._path(sha256).is_file()

    def read(self, sha256: str) -> bytes | None:
        """The verified bytes kept for sha256, or None."""
        path = self._path(sha256)
        try:
            content = path.read_bytes()
        except OSError:
            return None
        if hashlib.sha256(content).hexdigest() != sha256:
            path.unlink(missing_ok=True)
            return None
        self._touch(path)
        return content

    def keep(self, sha256: str, content: bytes) -> None:
        """Keeps bytes already verified against sha256, for every worker."""
        path = self._path(sha256)
        if self._touch(path):
            return
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
            return
        self._evict(keep=path)

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
