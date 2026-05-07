import asyncio
from collections import deque
from types import SimpleNamespace

from fastapi.testclient import TestClient

from mlsuite_ops_agent.app import create_app
from mlsuite_ops_agent.compose import ComposeError


class FakeCompose:
    def __init__(self) -> None:
        self.action_calls: list[tuple[str, str]] = []

    def assert_managed(self, service_name: str) -> None:
        if service_name not in {"spring-app", "py-analyzer"}:
            raise ComposeError(f"Unknown managed service: {service_name}")

    async def action(self, service_name: str, action: str) -> None:
        self.assert_managed(service_name)
        self.action_calls.append((service_name, action))

    async def logs_snapshot(self, service_name: str, tail: int) -> list[str]:
        self.assert_managed(service_name)
        if tail < 0:
            raise ComposeError("bad tail")
        return [f"{service_name}:line-1", f"tail={tail}"]

    async def service_snapshot(self) -> list[dict[str, object]]:
        return [{"name": "spring-app", "status": "running", "ports": [], "terminalEnabled": True}]

    def compose_command(self, *_args: str) -> list[str]:
        return ["echo"]


class FakeTerminals:
    def __init__(self) -> None:
        self.sessions: dict[str, object] = {}
        self.closed: list[str] = []

    async def create(self, service_name: str, cols: int, rows: int):
        session = SimpleNamespace(session_id="term-1", service_name=service_name, cols=cols, rows=rows, queue=asyncio.Queue(), attached=False)
        self.sessions["term-1"] = session
        return session

    def get(self, session_id: str):
        return self.sessions.get(session_id)

    async def close(self, session_id: str) -> None:
        self.closed.append(session_id)

    async def write(self, session_id: str, data: str) -> None:
        self.sessions[session_id].last_write = data

    async def resize(self, session_id: str, cols: int, rows: int) -> None:
        self.sessions[session_id].cols = cols
        self.sessions[session_id].rows = rows

def auth_headers() -> dict[str, str]:
    return {"X-MLSuite-Ops-Secret": "mlsuite-dev-secret"}


def test_health() -> None:
    client = TestClient(create_app())
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_internal_routes_require_secret() -> None:
    client = TestClient(create_app())
    response = client.get("/internal/overview")
    assert response.status_code == 401


def test_action_logs_and_terminal_routes_work(monkeypatch) -> None:
    app = create_app()
    fake_compose = FakeCompose()
    fake_terminals = FakeTerminals()

    async def fake_start():
        app.state.agent.compose = fake_compose
        app.state.agent.terminals = fake_terminals
        app.state.agent.metrics.points = deque([
            SimpleNamespace(
                timestamp="2026-05-07T00:00:00+00:00",
                cpu_percent=1.0,
                ram_percent=2.0,
                disk_percent=3.0,
                vram_percent=None,
                vram_supported=False,
            )
        ], maxlen=10)
        app.state.agent._latest_services = await fake_compose.service_snapshot()

    async def fake_stop():
        return None

    monkeypatch.setattr(app.state.agent, "start", fake_start)
    monkeypatch.setattr(app.state.agent, "stop", fake_stop)
    with TestClient(app) as client:
        overview = client.get("/internal/overview", headers=auth_headers())
        assert overview.status_code == 200
        assert overview.json()["services"][0]["name"] == "spring-app"

        action = client.post(
            "/internal/services/spring-app/actions",
            headers=auth_headers(),
            json={"action": "RESTART"},
        )
        assert action.status_code == 200
        assert fake_compose.action_calls == [("spring-app", "RESTART")]

        bad_action = client.post(
            "/internal/services/nope/actions",
            headers=auth_headers(),
            json={"action": "STOP"},
        )
        assert bad_action.status_code == 400

        logs = client.get("/internal/services/spring-app/logs?tail=5", headers=auth_headers())
        assert logs.status_code == 200
        assert logs.json()["lines"][0] == "spring-app:line-1"

        created = client.post(
            "/internal/terminal/sessions",
            headers=auth_headers(),
            json={"serviceName": "spring-app", "cols": 90, "rows": 20},
        )
        assert created.status_code == 200
        assert created.json()["sessionId"] == "term-1"

        closed = client.delete("/internal/terminal/sessions/term-1", headers=auth_headers())
        assert closed.status_code == 200
        assert fake_terminals.closed == ["term-1"]
