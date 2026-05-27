from typing import Iterable

from ..utils.errors import bad_request


def list_feature_names(model: object) -> list[str]:
    if hasattr(model, "feature_names_in_"):
        return [str(item) for item in getattr(model, "feature_names_in_")]
    if hasattr(model, "get_feature_names_out"):
        return [str(item) for item in model.get_feature_names_out()]
    booster_names = _booster_feature_names(model)
    if booster_names:
        return booster_names
    raise bad_request("No feature names found in the model.")


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

