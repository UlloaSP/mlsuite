"""The last local backup's outcome, read from what scripts/create-local-backup.sh records."""

from dataclasses import replace
from pathlib import Path

from fastapi.testclient import TestClient

from mlsuite_ops_agent import app as app_module
from mlsuite_ops_agent.backups import backup_failing, backup_root
from conftest import SHARED_SECRET


def _attempt(root: Path, result: str, backup: str = "") -> None:
    root.mkdir(exist_ok=True)
    (root / "last-attempt").write_text(f"result={result}\nfinished_epoch=1790000000\nbackup={backup}\n")


def _backup(root: Path, name: str) -> None:
    (root / name).mkdir(parents=True)
    for file in ("backup.manifest", "recovery.scope"):
        (root / name / file).write_text("content\n")


def test_a_host_that_never_attempted_a_backup_has_nothing_failing(tmp_path) -> None:
    assert backup_failing(tmp_path / "backups") is False
    # Backups taken before attempts were recorded are not a failure either.
    _backup(tmp_path / "backups", "production-20260101T000000Z-1")
    assert backup_failing(tmp_path / "backups") is False


def test_a_successful_attempt_whose_backup_is_there_is_not_failing(tmp_path) -> None:
    root = tmp_path / "backups"
    _backup(root, "production-20260101T000000Z-1")
    _attempt(root, "succeeded", "production-20260101T000000Z-1")
    assert backup_failing(root) is False


def test_a_failed_attempt_is_failing_until_a_later_one_succeeds(tmp_path) -> None:
    root = tmp_path / "backups"
    _backup(root, "production-20260101T000000Z-1")
    _attempt(root, "failed")
    assert backup_failing(root) is True
    _backup(root, "production-20260102T000000Z-2")
    _attempt(root, "succeeded", "production-20260102T000000Z-2")
    assert backup_failing(root) is False


def test_a_last_backup_that_is_gone_or_incomplete_is_failing(tmp_path) -> None:
    root = tmp_path / "backups"
    _attempt(root, "succeeded", "production-20260101T000000Z-1")
    assert backup_failing(root) is True
    _backup(root, "production-20260101T000000Z-1")
    (root / "production-20260101T000000Z-1" / "backup.manifest").write_text("")
    assert backup_failing(root) is True
    _attempt(root, "succeeded", "../elsewhere")
    assert backup_failing(root) is True


def test_a_backup_root_outside_the_checkout_cannot_be_read(tmp_path) -> None:
    assert backup_root("/srv/backups", tmp_path) is None
    assert backup_failing(None) is None
    assert backup_root("backups", tmp_path) == tmp_path / "backups"


def test_the_agent_reports_the_last_backup_to_the_api(monkeypatch, tmp_path) -> None:
    _attempt(tmp_path / "backups", "failed")
    monkeypatch.setattr(app_module, "backup_root", lambda configured: tmp_path / configured)
    monkeypatch.setattr(app_module, "SETTINGS", replace(app_module.SETTINGS, backup_root="backups"))

    with TestClient(app_module.create_app()) as client:
        assert client.get("/internal/backup").status_code == 401
        response = client.get("/internal/backup", headers={"X-MLSuite-Ops-Secret": SHARED_SECRET})

    assert response.json() == {"failing": True}
