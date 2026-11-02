#!/usr/bin/env python3
"""Write the digest-pinned Compose override of one commit's published release.

Publication runs on GitHub after the push that starts a deployment, so a release may be waited
for. A release that is never published stops the deployment: the commit failed its tests or its
image scans. The override is derived here from the checksummed manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".github" / "scripts"))
from release_manifest import compose_override, validate_manifest  # noqa: E402


REPOSITORY = "UlloaSP/mlsuite"
POLL_SECONDS = 30


def download(url: str) -> bytes | None:
    """The file at url, or None while it is not published."""
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def release_override(commit: str, fetch=download) -> bytes | None:
    """The override of the commit's release, or None while it is not published."""
    release = f"build-{commit}"
    base = f"https://github.com/{REPOSITORY}/releases/download/{release}"
    content, checksum = fetch(f"{base}/release.json"), fetch(f"{base}/release.json.sha256")
    if content is None or checksum is None:
        return None
    if checksum.decode("ascii").split()[0] != hashlib.sha256(content).hexdigest():
        raise ValueError("release.json does not match its checksum")
    return compose_override(validate_manifest(json.loads(content), REPOSITORY, commit, release))


def wait_for_override(commit: str, wait_seconds: float, fetch=download, sleep=time.sleep, now=time.monotonic) -> bytes:
    deadline = now() + wait_seconds
    while True:
        override = release_override(commit, fetch)
        if override is not None:
            return override
        if now() >= deadline:
            raise ValueError(f"The release of {commit} is not published")
        sleep(POLL_SECONDS)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--wait-minutes", type=float, default=0)
    args = parser.parse_args()
    try:
        override = wait_for_override(args.commit, args.wait_minutes * 60)
    except (OSError, ValueError) as error:
        sys.exit(str(error))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(override)


if __name__ == "__main__":
    main()
