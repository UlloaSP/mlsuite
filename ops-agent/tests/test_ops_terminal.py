import asyncio
from types import SimpleNamespace

from mlsuite_ops_agent.compose import ComposeGateway
from mlsuite_ops_agent.config import Settings
from mlsuite_ops_agent.terminal import TerminalManager


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


def test_stats_are_collected_in_one_project_wide_call(monkeypatch) -> None:
    gateway = ComposeGateway(Settings(managed_services=("spring-app", "frontend")))
    calls: list[tuple[str, ...]] = []

    async def fake_run(*args: str) -> str:
        calls.append(args)
        if args == ("ps", "--all", "--format", "json"):
            return (
                '{"Service":"spring-app","Name":"mlsuite-spring-app-1","State":"running"}\n'
                '{"Service":"frontend","Name":"mlsuite-frontend-1","State":"running"}'
            )
        return (
            '{"Name":"mlsuite-spring-app-1","CPUPerc":"1.0%","MemUsage":"1MiB / 2MiB"}\n'
            '{"Name":"mlsuite-frontend-1","CPUPerc":"2.0%","MemUsage":"1MiB / 4MiB"}'
        )

    monkeypatch.setattr(gateway, "run", fake_run)

    services = {row["name"]: row for row in asyncio.run(gateway.service_snapshot())}

    assert calls == [("ps", "--all", "--format", "json"), ("stats", "--no-stream", "--format", "json")]
    assert services["spring-app"]["cpuPercent"] == 1.0
    assert services["frontend"]["cpuPercent"] == 2.0
    assert services["frontend"]["memoryLimitBytes"] == 4 * 1024 * 1024
