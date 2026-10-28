"""One client for every test, entered once: the runtime's worker processes belong to its event loop."""

from fastapi.testclient import TestClient

from mlsuite_backend.main import app

client = TestClient(app)
client.__enter__()


def run_async(scenario):
    """Runs a coroutine function on the runtime's own event loop."""
    return client.portal.call(scenario)
