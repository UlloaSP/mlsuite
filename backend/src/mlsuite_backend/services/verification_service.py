"""A model's first load in its environment: what makes an uploaded model runnable.

The worker loads the bundle (mlbundle verifies its claims and state there), proves a built
environment holds exactly the bundle's lock, and predicts the samples the bundle carries, so a
model that cannot run here (another library version's state, a wheel needing CPU instructions
this host lacks) fails before anyone predicts with it.
"""

from fastapi import UploadFile

from .. import artifacts
from . import runs


async def verify(artifact_sha256: str, environment: str, model_upload: UploadFile | None) -> dict[str, object]:
    checked = runs.environment(environment).checked
    path = await artifacts.resolve(artifact_sha256, model_upload)
    return await runs.run(environment, "verify", path, artifact_sha256, checked=checked)
