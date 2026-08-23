import json

import pandas as pd

from ..model_adapters.features import FeatureMetadata
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


def get_expected_columns(
    features: FeatureMetadata, record: dict[str, object]
) -> list[str]:
    if features.generated:
        if len(record) != len(features.names):
            raise bad_request(
                f"Model expects {len(features.names)} features, record has {len(record)}."
            )
        return list(record.keys())
    return features.names


def build_prediction_dataframe(
    features: FeatureMetadata,
    record: dict[str, object],
) -> pd.DataFrame:
    expected_columns = get_expected_columns(features, record)
    missing = set(expected_columns) - set(record.keys())
    if missing:
        raise bad_request(f"Missing features: {missing}")
    return pd.DataFrame([record], columns=expected_columns)
