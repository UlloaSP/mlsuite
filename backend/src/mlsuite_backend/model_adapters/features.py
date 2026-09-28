from dataclasses import dataclass
from typing import Iterable

import pandas as pd

from ..utils.errors import bad_request


@dataclass(frozen=True)
class FeatureMetadata:
    names: list[str]
    source: str

    @property
    def generated(self) -> bool:
        return self.source == "generated"


@dataclass(frozen=True)
class FeatureFit:
    """How a dataframe lines up with model features; compatible when reason is None."""

    mode: str
    missing: list[str]
    extra: list[str]
    reason: str | None

    @property
    def compatible(self) -> bool:
        return self.reason is None


def feature_metadata(model: object) -> FeatureMetadata:
    names = _explicit_feature_names(model)
    if names:
        return FeatureMetadata(names=names, source="model")
    count = getattr(model, "n_features_in_", None)
    if isinstance(count, int) and count > 0:
        names = [f"feature_{index}" for index in range(1, count + 1)]
        return FeatureMetadata(names=names, source="generated")
    raise bad_request("No feature names found in the model.")


def fit_dataframe(features: FeatureMetadata, dataframe: pd.DataFrame) -> FeatureFit:
    """Positional models match by column count; named models need every feature column."""
    width = len(dataframe.columns)
    if features.generated:
        expected = len(features.names)
        reason = None if width == expected else f"model expects {expected} columns, dataframe has {width}"
        return FeatureFit(mode="count", missing=[], extra=[], reason=reason)
    columns = {str(column) for column in dataframe.columns}
    required = set(features.names)
    missing = sorted(required - columns)
    return FeatureFit(
        mode="columns",
        missing=missing,
        extra=sorted(columns - required),
        reason="missing required columns" if missing else None,
    )


def _explicit_feature_names(model: object) -> list[str]:
    names = getattr(model, "feature_names_in_", None)
    if names is not None:
        return [str(item) for item in names]
    if hasattr(model, "get_feature_names_out"):
        return [str(item) for item in model.get_feature_names_out()]
    booster_names = _booster_feature_names(model)
    if booster_names:
        return booster_names
    return []


def list_class_labels(model: object) -> list[str]:
    classes = getattr(model, "classes_", None)
    if classes is None:
        raise bad_request("Classifier does not expose class labels.")
    return [str(item) for item in classes]


def _booster_feature_names(model: object) -> list[str]:
    get_booster = getattr(model, "get_booster", None)
    if not callable(get_booster):
        return []
    booster = get_booster()
    names = getattr(booster, "feature_names", None)
    if not isinstance(names, Iterable):
        return []
    return [str(item) for item in names if item is not None]
