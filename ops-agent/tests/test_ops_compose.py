import asyncio
from unittest.mock import AsyncMock

import pytest

from mlsuite_ops_agent.compose import ComposeError, ComposeGateway
from mlsuite_ops_agent.config import Settings


def test_snapshot_distinguishes_stopped_container_from_missing(monkeypatch):
    gateway = ComposeGateway(Settings(managed_services=("py-analyzer", "spring-app")))

    async def run(*args):
        if args == ("ps", "--all", "--format", "json"):
            return '{"Service":"py-analyzer","Name":"py-analyzer","State":"exited"}'
        return ""

    monkeypatch.setattr(gateway, "run", run)
    services = {item["name"]: item for item in asyncio.run(gateway.service_snapshot())}
    assert services["py-analyzer"]["status"] == "exited"
    assert services["py-analyzer"]["containerName"] == "py-analyzer"
    assert services["py-analyzer"]["cpuPercent"] is None
    assert services["spring-app"]["status"] == "missing"


@pytest.mark.parametrize("action,command", [
    ("START", ("up", "-d", "--no-deps", "py-analyzer")),
    ("STOP", ("stop", "py-analyzer")),
    ("RESTART", ("restart", "py-analyzer")),
])
def test_actions_only_target_requested_service(monkeypatch, action, command):
    gateway = ComposeGateway(Settings(managed_services=("py-analyzer",)))
    run = AsyncMock(return_value="")
    monkeypatch.setattr(gateway, "run", run)
    asyncio.run(gateway.action("py-analyzer", action))
    run.assert_awaited_once_with(*command)


@pytest.mark.parametrize("service,action", [("other", "START"), ("py-analyzer", "DELETE")])
def test_invalid_actions_do_not_execute(monkeypatch, service, action):
    gateway = ComposeGateway(Settings(managed_services=("py-analyzer",)))
    run = AsyncMock()
    monkeypatch.setattr(gateway, "run", run)
    with pytest.raises(ComposeError):
        asyncio.run(gateway.action(service, action))
    run.assert_not_awaited()


def test_failed_command_remains_an_error(monkeypatch):
    gateway = ComposeGateway(Settings(managed_services=("py-analyzer",)))
    monkeypatch.setattr(gateway, "run", AsyncMock(side_effect=ComposeError("Docker unavailable")))
    with pytest.raises(ComposeError, match="Docker unavailable"):
        asyncio.run(gateway.action("py-analyzer", "START"))
