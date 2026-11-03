"""How often the agent samples: fast while a dashboard watches, as slow as alerts allow otherwise."""

import asyncio
from dataclasses import replace
from datetime import UTC, datetime, timedelta

from mlsuite_ops_agent.config import SETTINGS
from mlsuite_ops_agent.metrics import MetricsBuffer, collect_metrics
from mlsuite_ops_agent.state import AgentState

SETTINGS_UNDER_TEST = replace(
    SETTINGS,
    sample_interval_seconds=1,
    service_interval_seconds=5,
    idle_interval_seconds=15,
    retention_minutes=60,
)
SERVICES = [{"name": "spring-app", "cpuPercent": 10.0}]


def _state() -> AgentState:
    state = AgentState(SETTINGS_UNDER_TEST)
    state._latest_services = SERVICES
    state.metrics.append(collect_metrics(SERVICES))
    return state


def test_without_a_dashboard_the_agent_samples_at_the_alerts_cadence() -> None:
    state = _state()

    assert state.sample_interval() == 15
    assert state.service_interval() == 15


def test_a_dashboard_gets_the_fast_cadence_and_a_truthful_interval_until_it_leaves() -> None:
    async def scenario() -> None:
        state = _state()
        client = await state.register_client(object())
        snapshot = client.queue.get_nowait()

        assert (state.sample_interval(), state.service_interval()) == (1, 5)
        assert snapshot["payload"]["history"]["sampleIntervalSeconds"] == 1

        await state.unregister_client(client)
        assert (state.sample_interval(), state.service_interval()) == (15, 15)
        assert (await state.snapshot())["history"]["sampleIntervalSeconds"] == 15

    asyncio.run(scenario())


def test_the_first_dashboard_ends_a_slow_wait_at_once() -> None:
    async def scenario() -> float:
        state = _state()
        loop = asyncio.get_running_loop()
        started = loop.time()
        waiting = asyncio.create_task(state._pause(15))
        await asyncio.sleep(0.05)
        await state.register_client(object())
        await asyncio.wait_for(waiting, timeout=2)
        return loop.time() - started

    assert asyncio.run(scenario()) < 2


def test_the_history_keeps_the_retention_window_whatever_the_cadence() -> None:
    buffer = MetricsBuffer(SETTINGS_UNDER_TEST)
    now = datetime.now(UTC)
    for minutes_ago in (90, 61, 30, 0):
        buffer.append({"timestamp": (now - timedelta(minutes=minutes_ago)).isoformat()})

    assert [point["timestamp"] for point in buffer.points] == [
        (now - timedelta(minutes=minutes)).isoformat() for minutes in (30, 0)
    ]
