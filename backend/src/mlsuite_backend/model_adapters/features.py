from dataclasses import dataclass
from typing import Iterable

from ..utils.errors import bad_request


@dataclass(frozen=True)
class FeatureMetadata:
    names: list[str]
    source: str

    @property
    def generated(self) -> bool:
        return self.source == "generated"


def feature_names_from_count(count: int) -> list[str]:
    return [f"feature_{index}" for index in range(1, count + 1)]


def feature_metadata(model: object) -> FeatureMetadata:
    names = _explicit_feature_names(model)
    if names:
        return FeatureMetadata(names=names, source="model")
    count = getattr(model, "n_features_in_", None)
    if isinstance(count, int) and count > 0:
        return FeatureMetadata(names=feature_names_from_count(count), source="generated")
    raise bad_request("No feature names found in the model.")


def list_feature_names(model: object) -> list[str]:
    return feature_metadata(model).names


def _explicit_feature_names(model: object) -> list[str]:
    if hasattr(model, "feature_names_in_"):
        return [str(item) for item in getattr(model, "feature_names_in_")]
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

