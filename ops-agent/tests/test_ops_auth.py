from dataclasses import replace
import hmac

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from mlsuite_ops_agent import __main__ as entrypoint
from mlsuite_ops_agent import app as app_module
from mlsuite_ops_agent.app import MissingSharedSecretError, create_app

from conftest import SHARED_SECRET


def without_secret(monkeypatch) -> None:
    monkeypatch.setattr(app_module, "SETTINGS", replace(app_module.SETTINGS, shared_secret=""))


def test_app_refuses_to_start_without_a_secret(monkeypatch) -> None:
    without_secret(monkeypatch)

    with pytest.raises(MissingSharedSecretError, match="OPS_AGENT_SHARED_SECRET must be set"):
        create_app()


def test_entrypoint_exits_with_a_clear_error_without_a_secret(monkeypatch) -> None:
    without_secret(monkeypatch)
    monkeypatch.setattr(entrypoint.uvicorn, "run", lambda *_args, **_kwargs: pytest.fail("must not serve"))

    with pytest.raises(SystemExit, match="ops-agent: OPS_AGENT_SHARED_SECRET must be set"):
        entrypoint.main()


@pytest.mark.parametrize("headers", [{}, {"X-MLSuite-Ops-Secret": ""}, {"X-MLSuite-Ops-Secret": SHARED_SECRET + "x"}])
def test_internal_routes_reject_a_missing_or_wrong_secret(headers) -> None:
    response = TestClient(create_app()).get("/internal/overview", headers=headers)

    assert response.status_code == 401


def test_sockets_reject_a_wrong_secret() -> None:
    client = TestClient(create_app())

    with pytest.raises(WebSocketDisconnect) as closed:
        with client.websocket_connect("/internal/stream", headers={"X-MLSuite-Ops-Secret": "wrong"}):
            pass
    assert closed.value.code == 4401


def test_secrets_are_compared_in_constant_time(monkeypatch) -> None:
    compared: list[tuple[bytes, bytes]] = []
    original = hmac.compare_digest

    def compare_digest(provided, expected):
        compared.append((provided, expected))
        return original(provided, expected)

    monkeypatch.setattr(app_module.hmac, "compare_digest", compare_digest)
    client = TestClient(create_app())
    client.get("/internal/overview", headers={"X-MLSuite-Ops-Secret": "wrong"})
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/internal/stream", headers={"X-MLSuite-Ops-Secret": "also-wrong"}):
            pass

    assert compared == [(b"wrong", SHARED_SECRET.encode()), (b"also-wrong", SHARED_SECRET.encode())]
