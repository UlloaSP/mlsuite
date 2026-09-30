import asyncio

import pytest
from fastapi.testclient import TestClient

from mlsuite_ops_agent import startup
from mlsuite_ops_agent.app import create_app
from mlsuite_ops_agent.compose import ComposeError
from mlsuite_ops_agent.startup import StartupStatus, startup_state


@pytest.mark.parametrize(
    ("row", "expected"),
    [
        (None, "waiting"),
        ({"State": "created"}, "created"),
        ({"State": "running", "Health": "starting"}, "checking"),
        ({"State": "running", "Health": "healthy"}, "healthy"),
        ({"State": "running", "Health": ""}, "running"),
        ({"State": "running", "Health": "unhealthy"}, "unhealthy"),
        ({"State": "restarting"}, "restarting"),
        ({"State": "exited", "ExitCode": 0}, "completed"),
        ({"State": "exited", "ExitCode": 1}, "exited"),
        ({"State": "dead"}, "exited"),
        ({"State": "paused"}, "starting"),
    ],
)
def test_startup_state_maps_compose_rows(row, expected):
    assert startup_state(row) == expected


class FakeCompose:
    def __init__(self) -> None:
        self.calls: list[tuple[str, ...]] = []

    async def run(self, *args: str) -> str:
        self.calls.append(args)
        if args == ("config", "--services"):
            return "spring-app\npostgres\ndb-migrate\n"
        return "\n".join(
            [
                '{"Service":"postgres","State":"running","Health":"healthy"}',
                '{"Service":"db-migrate","State":"exited","ExitCode":0}',
            ]
        )


def test_states_follow_alphabetical_service_order_and_mark_missing_as_waiting():
    status = StartupStatus(FakeCompose())

    assert asyncio.run(status.states()) == ["completed", "healthy", "waiting"]


def test_states_are_cached_between_requests(monkeypatch):
    compose = FakeCompose()
    status = StartupStatus(compose)
    monkeypatch.setattr(startup, "CACHE_SECONDS", 60)

    async def read_twice():
        await status.states()
        await status.states()

    asyncio.run(read_twice())
    assert compose.calls.count(("ps", "--all", "--format", "json")) == 1
    assert compose.calls.count(("config", "--services")) == 1


def test_startup_route_is_public_and_returns_only_states(monkeypatch):
    app = create_app()

    async def states():
        return ["healthy", "waiting"]

    monkeypatch.setattr(app.state.startup, "states", states)
    response = TestClient(app).get("/startup/services")

    assert response.status_code == 200
    assert response.json() == {"services": [{"state": "healthy"}, {"state": "waiting"}]}


def test_startup_route_hides_compose_errors(monkeypatch):
    app = create_app()

    async def states():
        raise ComposeError("docker: permission denied on /var/run/docker.sock")

    monkeypatch.setattr(app.state.startup, "states", states)
    response = TestClient(app).get("/startup/services")

    assert response.status_code == 503
    assert "docker" not in response.text
