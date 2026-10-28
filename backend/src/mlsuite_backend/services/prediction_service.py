import json

from fastapi import HTTPException, UploadFile

from ..bundles import resolve_bundle
from ..execution import run_model_work
from ..utils.errors import bad_request
from ..utils.records import parse_record_json
from .coalescing import Coalescer
from .row_prediction import predict_rows

# The most records one batch may carry; the API sends far fewer.
MAX_BATCH_RECORDS = 1000

_coalescer = Coalescer()


async def predict(artifact_sha256: str, model_upload: UploadFile | None, data: str) -> dict[str, object]:
    bundle = await resolve_bundle(artifact_sha256, model_upload)
    record = parse_record_json(data, "Invalid JSON")
    answer = await _coalescer.predict(artifact_sha256, bundle, record)
    if isinstance(answer, HTTPException):
        raise answer
    return answer


async def predict_batch(artifact_sha256: str, model_upload: UploadFile | None, data: str) -> dict[str, object]:
    """Each record's answer in order: its reports, or the error it alone got."""
    bundle = await resolve_bundle(artifact_sha256, model_upload)
    records = _parse_records(data)
    answers = await run_model_work(predict_rows, bundle, records)
    return {
        "rows": [
            {"error": {"status": answer.status_code, "detail": answer.detail}}
            if isinstance(answer, HTTPException)
            else answer
            for answer in answers
        ]
    }


def _parse_records(payload: str) -> list[object]:
    try:
        records = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise bad_request(f"Invalid JSON: {exc}") from exc
    if not isinstance(records, list) or not 1 <= len(records) <= MAX_BATCH_RECORDS:
        raise bad_request(f"Invalid JSON: expected an array of 1 to {MAX_BATCH_RECORDS} records")
    return records
