import json

from fastapi import HTTPException, UploadFile

from .. import artifacts
from ..utils.errors import bad_request
from ..utils.records import parse_record_json
from . import runs
from .coalescing import Coalescer

# The most records one batch may carry; the API sends far fewer.
MAX_BATCH_RECORDS = 1000

_coalescer = Coalescer()


def _raise_refusal(answer: dict[str, object]) -> dict[str, object]:
    error = answer.get("error")
    if isinstance(error, dict):
        raise HTTPException(status_code=error["status"], detail=error["detail"])
    return answer


async def predict(
    artifact_sha256: str, environment: str, model_upload: UploadFile | None, data: str
) -> dict[str, object]:
    runs.environment(environment)
    path = await artifacts.resolve(artifact_sha256, model_upload)
    record = parse_record_json(data, "Invalid JSON")
    return _raise_refusal(await _coalescer.predict(environment, path, artifact_sha256, record))


async def predict_batch(
    artifact_sha256: str, environment: str, model_upload: UploadFile | None, data: str
) -> dict[str, object]:
    """Each record's answer in order: its reports, or the error it alone got."""
    runs.environment(environment)
    path = await artifacts.resolve(artifact_sha256, model_upload)
    records = _parse_records(data)
    return {"rows": await runs.run(environment, "predict", path, artifact_sha256, records=records)}


def _parse_records(payload: str) -> list[object]:
    try:
        records = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise bad_request(f"Invalid JSON: {exc}") from exc
    if not isinstance(records, list) or not 1 <= len(records) <= MAX_BATCH_RECORDS:
        raise bad_request(f"Invalid JSON: expected an array of 1 to {MAX_BATCH_RECORDS} records")
    return records
