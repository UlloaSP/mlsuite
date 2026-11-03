"""What the package index says about each locked release, checked before anything is installed.

The allowlist bounds which versions MLsuite installs; the index knows what the allowlist cannot:
when the locked files were published, whether the release was yanked and whether it has a known
vulnerability. A release younger than PACKAGE_MIN_AGE_DAYS, yanked or vulnerable is refused, and
so is one whose locked files the index does not serve. An index that cannot be asked fails the
build, to be tried again: nothing is installed unchecked.
"""

import json
import urllib.error
import urllib.request
from collections.abc import Callable
from datetime import datetime, timedelta
from urllib.parse import quote

import mlbundle

from ..config import PACKAGE_METADATA_URL

# How long one release's metadata may take to arrive.
_TIMEOUT_SECONDS = 15

type Release = dict[str, object]
type Fetch = Callable[[str, str], Release | None]


class IndexUnavailable(Exception):
    """The index could not be asked; trying again may succeed."""


def fetch_release(name: str, version: str) -> Release | None:
    """The index's JSON for one release, or None when it has no such release."""
    url = f"{PACKAGE_METADATA_URL}/{quote(name)}/{quote(version)}/json"
    try:
        with urllib.request.urlopen(url, timeout=_TIMEOUT_SECONDS) as response:  # noqa: S310 - configured https index
            return json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise IndexUnavailable(f"The package index answered {error.code} for {name}=={version}") from error
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        raise IndexUnavailable(f"The package index could not be read for {name}=={version}: {error}") from error


def _published(file: dict) -> datetime:
    return datetime.fromisoformat(str(file["upload_time_iso_8601"]).replace("Z", "+00:00"))


def _vulnerabilities(release: Release) -> list[str]:
    """The release's known vulnerabilities, by CVE when it has one, each named once."""
    found = set()
    for vulnerability in release.get("vulnerabilities") or []:
        if vulnerability.get("withdrawn"):
            continue
        aliases = [alias for alias in vulnerability.get("aliases") or [] if str(alias).startswith("CVE-")]
        found.add(str(aliases[0] if aliases else vulnerability.get("id")))
    return sorted(found)


# A release can carry dozens; the first few name the problem.
_LISTED_VULNERABILITIES = 5


def _listed(vulnerable: list[str]) -> str:
    shown = ", ".join(vulnerable[:_LISTED_VULNERABILITIES])
    rest = len(vulnerable) - _LISTED_VULNERABILITIES
    return f"{shown} and {rest} more" if rest > 0 else shown


def problems(
    lock: mlbundle.EnvironmentLock,
    platform: str,
    now: datetime,
    min_age: timedelta,
    fetch: Fetch | None = None,
) -> list[str]:
    """Each locked release of this platform the index does not vouch for, with the reason."""
    fetch = fetch or fetch_release
    found = []
    for package in lock.packages:
        if platform not in package.platforms:
            continue
        label = f"{package.name}=={package.version}"
        release = fetch(package.name, package.version)
        if release is None:
            found.append(f"{label} (not on the package index)")
            continue
        digests = {wheel.sha256 for wheel in package.wheels}
        files = [file for file in release.get("urls") or [] if file.get("digests", {}).get("sha256") in digests]
        if not files:
            found.append(f"{label} (the package index does not serve its locked files)")
            continue
        if any(file.get("yanked") for file in files):
            found.append(f"{label} (yanked from the package index)")
        published = min(_published(file) for file in files)
        if now - published < min_age:
            found.append(
                f"{label} (published {published.date().isoformat()}; installed from "
                f"{(published + min_age).date().isoformat()})"
            )
        vulnerable = _vulnerabilities(release)
        if vulnerable:
            found.append(f"{label} (known vulnerabilities: {_listed(vulnerable)})")
    return found
