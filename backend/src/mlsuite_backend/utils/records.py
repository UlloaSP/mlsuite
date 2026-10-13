import json

from .errors import bad_request


def parse_record_json(payload: str, error_prefix: str) -> dict[str, object]:
    try:
        record = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise bad_request(f"{error_prefix}: {exc}") from exc
    if not isinstance(record, dict):
        raise bad_request(f"{error_prefix}: JSON must be an object")
    return record
