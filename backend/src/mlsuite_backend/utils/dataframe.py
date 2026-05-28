import json

import pandas as pd

from .coercion import coerce_record_values
from .errors import bad_request


def parse_record_json(payload: str, error_prefix: str) -> dict[str, object]:
    try:
        record = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise bad_request(f"{error_prefix}: {exc}") from exc
    if not isinstance(record, dict):
        raise bad_request(f"{error_prefix}: JSON must be an object")
    return coerce_record_values(record)


def get_expected_columns(model: object, record: dict[str, object]) -> list[str]:
    if hasattr(model, "feature_names_in_"):
        return list(model.feature_names_in_)
    return list(record.keys())


def build_prediction_dataframe(
    model: object,
    record: dict[str, object],
    require_all_features: bool = False,
) -> pd.DataFrame:
    expected_columns = get_expected_columns(model, record)
    missing = set(expected_columns) - set(record.keys())
    if require_all_features and missing:
        raise bad_request(f"Missing features: {missing}")
    return pd.DataFrame([record], columns=expected_columns)
