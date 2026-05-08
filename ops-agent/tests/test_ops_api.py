import asyncio
from collections import deque
from types import SimpleNamespace

from fastapi.testclient import TestClient

from mlsuite_ops_agent.app import create_app
from mlsuite_ops_agent.compose import ComposeError, ComposeGateway
from mlsuite_ops_agent.config import Settings
from mlsuite_ops_agent.metrics import collect_metrics
from mlsuite_ops_agent.terminal import TerminalManager


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
                disk_read_bytes=3,
                disk_write_bytes=4,
                network_rx_bytes=5,
                network_tx_bytes=6,
                services=[],
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


def test_stream_socket_sends_service_status_fields(monkeypatch) -> None:
    app = create_app()

    async def fake_start():
        app.state.agent.metrics.points = deque([
            SimpleNamespace(
                timestamp="2026-05-07T00:00:00+00:00",
                cpu_percent=1.0,
                ram_percent=2.0,
                disk_read_bytes=3,
                disk_write_bytes=4,
                network_rx_bytes=5,
                network_tx_bytes=6,
                services=[],
            )
        ], maxlen=10)
        app.state.agent._latest_services = [
            {
                "name": "spring-app",
                "containerName": "spring-app",
                "status": "running",
                "health": "healthy",
                "uptime": "1m",
                "cpuPercent": 0.5,
                "memoryBytes": 1024,
                "memoryLimitBytes": 2048,
                "diskReadBytes": 10,
                "diskWriteBytes": 20,
                "networkRxBytes": 30,
                "networkTxBytes": 40,
                "ports": ["8443:8443/tcp"],
                "terminalEnabled": True,
            }
        ]

    async def fake_stop():
        return None

    monkeypatch.setattr(app.state.agent, "start", fake_start)
    monkeypatch.setattr(app.state.agent, "stop", fake_stop)
    with TestClient(app) as client:
        with client.websocket_connect("/internal/stream", headers=auth_headers()) as websocket:
            message = websocket.receive_json()

    service = message["payload"]["services"][0]
    assert message["type"] == "overview.snapshot"
    assert message["payload"]["aggregate"]["cpu"]["percent"] == 1.0
    assert message["payload"]["aggregate"]["networkTx"]["bytes"] == 6
    assert message["payload"]["history"]["points"][0]["services"] == []
    assert "host" not in message["payload"]
    assert service["status"] == "running"
    assert service["health"] == "healthy"
    assert service["containerName"] == "spring-app"
    assert service["cpuPercent"] == 0.5
    assert service["memoryBytes"] == 1024
    assert service["memoryLimitBytes"] == 2048
    assert service["diskReadBytes"] == 10
    assert service["networkTxBytes"] == 40
    assert service["ports"] == ["8443:8443/tcp"]


def test_service_snapshot_treats_running_without_healthcheck_as_healthy_and_shell_disabled(monkeypatch) -> None:
    gateway = ComposeGateway(Settings(
        managed_services=("spring-app",),
        terminal_services=(),
    ))

    async def fake_run(*args: str) -> str:
        if args == ("ps", "--format", "json"):
            return (
                '{"Service":"spring-app","Name":"spring-app","State":"running",'
                '"Health":"","RunningFor":"1m","Publishers":[]}'
            )
        if args == ("ps", "--services"):
            return "spring-app\n"
        if args[:3] == ("stats", "--no-stream", "--format"):
            return (
                '{"Name":"spring-app","CPUPerc":"0.5%","MemUsage":"1MiB / 2MiB",'
                '"BlockIO":"3MB / 4MB","NetIO":"5kB / 6kB"}'
            )
        return ""

    monkeypatch.setattr(gateway, "run", fake_run)

    service = asyncio.run(gateway.service_snapshot())[0]

    assert service["status"] == "running"
    assert service["health"] is None
    assert service["terminalEnabled"] is False
    assert service["memoryBytes"] == 1024 * 1024
    assert service["memoryLimitBytes"] == 2 * 1024 * 1024
    assert service["diskReadBytes"] == 3_000_000
    assert service["networkTxBytes"] == 6000


def test_metrics_are_summed_from_services() -> None:
    snapshot = collect_metrics([
        {"name": "spring-app", "cpuPercent": 1.25, "memoryBytes": 1024, "memoryLimitBytes": 4096, "diskReadBytes": 10, "diskWriteBytes": 20, "networkRxBytes": 30, "networkTxBytes": 40},
        {"name": "frontend", "cpuPercent": 2.75, "memoryBytes": 1024, "memoryLimitBytes": 4096, "diskReadBytes": 1, "diskWriteBytes": 2, "networkRxBytes": 3, "networkTxBytes": 4},
        {"cpuPercent": None, "memoryBytes": None, "memoryLimitBytes": None},
    ])

    assert snapshot.cpu_percent == 4.0
    assert snapshot.ram_percent == 25.0
    assert snapshot.disk_read_bytes == 11
    assert snapshot.network_tx_bytes == 44
    assert snapshot.services[0].name == "spring-app"
    assert snapshot.services[0].cpu_percent == 1.25
    assert snapshot.services[0].ram_percent == 25.0
    assert snapshot.services[0].disk_write_bytes == 20


def test_terminal_creation_requires_shell_whitelist() -> None:
    gateway = ComposeGateway(Settings(
        managed_services=("spring-app",),
        terminal_services=(),
    ))

    try:
        gateway.assert_terminal_enabled("spring-app")
    except ComposeError as error:
        assert "Shell disabled" in str(error)
    else:
        raise AssertionError("Expected shell whitelist failure")


def test_terminal_creation_uses_pty_backed_compose_exec(monkeypatch) -> None:
    gateway = ComposeGateway(Settings(
        managed_services=("spring-app",),
        terminal_services=("spring-app",),
    ))
    manager = TerminalManager(gateway, max_sessions=1, idle_minutes=15)
    captured: dict[str, object] = {}

    async def fake_create_pty_process(command: list[str], cols: int, rows: int):
        captured["command"] = command
        captured["cols"] = cols
        captured["rows"] = rows

        async def wait() -> int:
            return 0

        return SimpleNamespace(returncode=0, wait=wait), 99

    async def fake_pump_output(_session) -> None:
        return None

    monkeypatch.setattr(manager, "_create_pty_process", fake_create_pty_process)
    monkeypatch.setattr(manager, "_pump_output", fake_pump_output)

    session = asyncio.run(manager.create("spring-app", 100, 24))

    command = captured["command"]
    assert session.pty_fd == 99
    assert captured["cols"] == 100
    assert captured["rows"] == 24
    assert "exec" in command
    assert "-T" not in command
    assert "spring-app" in command


def test_stats_are_collected_one_service_at_a_time(monkeypatch) -> None:
    gateway = ComposeGateway(Settings(managed_services=("spring-app", "frontend")))
    calls: list[tuple[str, ...]] = []

    async def fake_run(*args: str) -> str:
        calls.append(args)
        if args == ("ps", "--services"):
            return "spring-app\nfrontend\n"
        return f'{{"Name":"{args[-1]}","CPUPerc":"1.0%","MemUsage":"1MiB / 2MiB"}}'

    monkeypatch.setattr(gateway, "run", fake_run)

    output = asyncio.run(gateway._docker_stats())

    assert output.count("CPUPerc") == 2
    assert ("stats", "--no-stream", "--format", "json", "spring-app") in calls
    assert ("stats", "--no-stream", "--format", "json", "frontend") in calls
