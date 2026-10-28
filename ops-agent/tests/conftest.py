from dataclasses import replace

import pytest

from mlsuite_ops_agent import app as app_module

SHARED_SECRET = "test-ops-secret"


@pytest.fixture(autouse=True)
def shared_secret(monkeypatch):
    """Every app under test is configured with a secret unless a test removes it."""
    monkeypatch.setattr(app_module, "SETTINGS", replace(app_module.SETTINGS, shared_secret=SHARED_SECRET))
