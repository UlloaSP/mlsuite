"""The builder's index client: one release's JSON, nothing for an unknown release, or an outage."""

import io
import json
import urllib.error
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest

from mlsuite_backend.builder import releases


def _answer(monkeypatch, outcome: object) -> list[str]:
    asked: list[str] = []

    def urlopen(url: str, timeout: float):
        asked.append(url)
        if isinstance(outcome, BaseException):
            raise outcome
        return io.BytesIO(json.dumps(outcome).encode())

    monkeypatch.setattr(releases.urllib.request, "urlopen", urlopen)
    return asked


def test_a_release_is_read_from_the_metadata_url(monkeypatch) -> None:
    asked = _answer(monkeypatch, {"urls": [], "vulnerabilities": []})

    assert releases.fetch_release("scikit-learn", "1.9.1") == {"urls": [], "vulnerabilities": []}
    assert asked == [f"{releases.PACKAGE_METADATA_URL}/scikit-learn/1.9.1/json"]


def test_a_release_the_index_does_not_have_is_none(monkeypatch) -> None:
    _answer(monkeypatch, urllib.error.HTTPError("url", 404, "Not Found", {}, None))

    assert releases.fetch_release("numpy", "9.9.9") is None


def test_vulnerabilities_are_named_once_and_only_the_first_few_are_listed() -> None:
    wheel = SimpleNamespace(sha256="a" * 64)
    lock = SimpleNamespace(packages=[SimpleNamespace(name="pillow", version="9.0.0", platforms=["linux-x86_64"], wheels=[wheel])])
    cves = [f"CVE-2022-{number}" for number in range(1, 8)]
    release = {
        "urls": [{"digests": {"sha256": "a" * 64}, "upload_time_iso_8601": "2022-01-02T00:00:00Z", "yanked": False}],
        # Two advisories often name the same CVE.
        "vulnerabilities": [{"id": f"GHSA-{cve}", "aliases": [cve], "withdrawn": None} for cve in [*cves, cves[0]]],
    }

    found = releases.problems(lock, "linux-x86_64", datetime.now(UTC), timedelta(days=14), lambda *_: release)

    assert found == [f"pillow==9.0.0 (known vulnerabilities: {', '.join(cves[:5])} and 2 more)"]


@pytest.mark.parametrize(
    "outcome",
    [
        urllib.error.HTTPError("url", 503, "Service Unavailable", {}, None),
        urllib.error.URLError("name resolution failed"),
        TimeoutError("timed out"),
    ],
)
def test_an_index_that_cannot_answer_is_unavailable(monkeypatch, outcome: BaseException) -> None:
    _answer(monkeypatch, outcome)

    with pytest.raises(releases.IndexUnavailable, match="numpy==2.5.4"):
        releases.fetch_release("numpy", "2.5.4")
