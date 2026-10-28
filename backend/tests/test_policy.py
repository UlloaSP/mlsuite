"""The allowlist: exact versions of Python, mlbundle and every locked package."""

import mlbundle
import pytest

from mlsuite_backend import config
from mlsuite_backend.policy import parse_allowlist
from tests.helpers import make_classifier, serialize_bundle

DIGEST = "1" * 64


def _lock() -> mlbundle.EnvironmentLock:
    return mlbundle.inspect(serialize_bundle(make_classifier())[1].getvalue()).environment_lock


def _granting(lock: mlbundle.EnvironmentLock, *, skip: str = "", python: str = "") -> str:
    packages = "".join(f'{p.name} = ["{p.version}", "0.0.1"]\n' for p in lock.packages if p.name != skip)
    return (
        f'python = ["{python or lock.python_version}"]\n'
        f'[mlbundle]\n"0.3.0" = "{DIGEST}"\n'
        f"[packages]\n{packages}"
    )


def test_a_lock_granted_in_full_has_no_violations() -> None:
    lock = _lock()
    assert parse_allowlist(_granting(lock)).violations(lock, "0.3.0") == []


def test_every_ungranted_version_is_named() -> None:
    lock = _lock()
    allowlist = parse_allowlist(_granting(lock, skip="numpy", python="3.14.99"))

    assert allowlist.violations(lock, "0.3.9") == [
        f"python=={lock.python_version}",
        "mlbundle==0.3.9",
        f"numpy=={lock.version('numpy')}",
    ]


def test_another_version_of_a_granted_package_is_refused() -> None:
    lock = _lock()
    text = _granting(lock).replace(f'scikit-learn = ["{lock.version("scikit-learn")}", ', 'scikit-learn = [')

    assert parse_allowlist(text).violations(lock, "0.3.0") == [f"scikit-learn=={lock.version('scikit-learn')}"]


@pytest.mark.parametrize(
    "text",
    [
        '[mlbundle]\n"0.3.0" = "' + DIGEST + '"\n[packages]\n',
        'python = ["3.14.7"]\n[mlbundle]\n"0.3.0" = "not-a-digest"\n[packages]\n',
        'python = ["3.14.7"]\n[mlbundle]\n"0.3.0" = "' + DIGEST + '"\n[packages]\nnumpy = "2.5.4"\n',
    ],
)
def test_a_malformed_allowlist_is_refused(text: str) -> None:
    with pytest.raises(ValueError):
        parse_allowlist(text)


def test_the_repository_allowlist_parses_and_grants_the_released_mlbundle() -> None:
    allowlist = parse_allowlist(config.ALLOWLIST_PATH.read_text(encoding="utf-8"))
    assert "0.3.0" in allowlist.mlbundle
    assert all(version.startswith("3.14.") for version in allowlist.python)
