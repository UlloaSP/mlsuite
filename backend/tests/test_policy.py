"""The allowlist: exact Python and mlbundle, and a version range for every locked package."""

from types import SimpleNamespace

import mlbundle
import pytest

from mlsuite_backend import config, policy
from mlsuite_backend.policy import parse_allowlist
from tests.helpers import make_classifier, serialize_bundle

DIGEST = "1" * 64


def _lock() -> mlbundle.EnvironmentLock:
    return mlbundle.inspect(serialize_bundle(make_classifier())[1].getvalue()).environment_lock


def _granting(lock: mlbundle.EnvironmentLock, *, skip: str = "", python: str = "", ranges: dict | None = None) -> str:
    ranges = ranges or {}
    packages = "".join(
        f'{p.name} = "{ranges.get(p.name, f">={p.version}")}"\n' for p in lock.packages if p.name != skip
    )
    return (
        f'python = "{python or "==" + lock.python_version}"\n'
        f'[mlbundle]\n"0.3.0" = "{DIGEST}"\n'
        f"[packages]\n{packages}"
    )


def test_a_lock_inside_every_range_has_no_violations() -> None:
    lock = _lock()
    assert parse_allowlist(_granting(lock)).violations(lock, "0.3.0") == []


def test_python_mlbundle_and_unnamed_packages_are_refused_with_the_reason() -> None:
    lock = _lock()
    allowlist = parse_allowlist(_granting(lock, skip="numpy", python="==3.14.99"))

    assert allowlist.violations(lock, "0.3.9") == [
        f"python=={lock.python_version} (MLsuite installs ==3.14.99)",
        "mlbundle==0.3.9",
        f"numpy=={lock.version('numpy')} (not a package MLsuite installs)",
    ]


def test_a_version_outside_its_range_is_refused_with_the_range() -> None:
    lock = _lock()
    allowlist = parse_allowlist(_granting(lock, ranges={"scikit-learn": ">=0.1,<0.2"}))

    assert allowlist.violations(lock, "0.3.0") == [
        f"scikit-learn=={lock.version('scikit-learn')} (MLsuite installs <0.2,>=0.1)"
    ]


@pytest.mark.parametrize("version", ["2.6.0rc1", "2.6.0.dev3", "not-a-version"])
def test_pre_releases_and_unparsable_versions_are_refused_inside_any_range(version: str) -> None:
    allowlist = parse_allowlist(f'python = ">=3.14"\n[mlbundle]\n"0.3.0" = "{DIGEST}"\n[packages]\nnumpy = ">=2.0"\n')
    lock = SimpleNamespace(python_version="3.14.7", packages=[SimpleNamespace(name="numpy", version=version)])

    assert allowlist.violations(lock, "0.3.0") == [f"numpy=={version} (MLsuite installs >=2.0)"]


def test_a_python_inside_the_range_that_the_runtime_cannot_download_is_refused(monkeypatch) -> None:
    monkeypatch.setattr(policy, "python_installable", lambda version: version != "3.14.11")
    allowlist = parse_allowlist(f'python = ">=3.14,<3.15"\n[mlbundle]\n"0.3.0" = "{DIGEST}"\n[packages]\n')

    newest = SimpleNamespace(python_version="3.14.11", packages=[])
    assert allowlist.violations(newest, "0.3.0") == ["python==3.14.11 (the runtime cannot download it yet)"]
    assert allowlist.violations(SimpleNamespace(python_version="3.14.10", packages=[]), "0.3.0") == []


@pytest.mark.real_uv
def test_python_installable_asks_this_machine_s_uv() -> None:
    policy.python_installable.cache_clear()
    assert policy.python_installable("3.14.7")
    assert not policy.python_installable("3.14.999")


@pytest.mark.parametrize(
    "text",
    [
        '[mlbundle]\n"0.3.0" = "' + DIGEST + '"\n[packages]\n',
        'python = ["3.14.7"]\n[mlbundle]\n"0.3.0" = "' + DIGEST + '"\n[packages]\n',
        'python = ">=3.14"\n[mlbundle]\n"0.3.0" = "not-a-digest"\n[packages]\n',
        'python = ">=3.14"\n[mlbundle]\n"0.3.0" = "' + DIGEST + '"\n[packages]\nnumpy = ["2.5.4"]\n',
        'python = ">=3.14"\n[mlbundle]\n"0.3.0" = "' + DIGEST + '"\n[packages]\nnumpy = ""\n',
        'python = ">=3.14"\n[mlbundle]\n"0.3.0" = "' + DIGEST + '"\n[packages]\nnumpy = "about 2"\n',
    ],
)
def test_a_malformed_allowlist_is_refused(text: str) -> None:
    with pytest.raises(ValueError):
        parse_allowlist(text)


def test_the_repository_allowlist_parses_and_grants_the_released_mlbundle() -> None:
    allowlist = parse_allowlist(config.ALLOWLIST_PATH.read_text(encoding="utf-8"))
    assert "0.3.0" in allowlist.mlbundle
    assert all(version in allowlist.python for version in ("3.14.0", "3.14.9", "3.14.10"))
    assert "3.15.0" not in allowlist.python


@pytest.mark.parametrize(
    ("name", "version"),
    [
        # The versions the corpus validated stay granted.
        ("scikit-learn", "1.7.2"),
        ("scikit-learn", "1.9.1"),
        ("pandas", "3.1.0"),
        ("python-dateutil", "3.0.0"),
        # A bundle exported with a plain install a few patch or minor releases away is granted too.
        ("pandas", "3.0.6"),
        ("pydantic", "2.14.2"),
        ("pydantic-core", "2.50.2"),
        ("python-dateutil", "4.0.0"),
    ],
)
def test_the_repository_allowlist_grants_neighbouring_versions(name: str, version: str) -> None:
    allowlist = parse_allowlist(config.ALLOWLIST_PATH.read_text(encoding="utf-8"))
    assert version in allowlist.packages[name]


@pytest.mark.parametrize(("name", "version"), [("numpy", "3.0.0"), ("scikit-learn", "1.6.1"), ("pandas", "2.2.3")])
def test_the_repository_allowlist_holds_native_packages_to_their_validated_major_line(name: str, version: str) -> None:
    allowlist = parse_allowlist(config.ALLOWLIST_PATH.read_text(encoding="utf-8"))
    assert version not in allowlist.packages[name]
