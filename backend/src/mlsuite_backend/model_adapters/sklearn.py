import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin, RegressorMixin

from .features import list_class_labels, list_feature_names


class SklearnAdapter:
    library = "sklearn"

    def supports(self, model: object) -> bool:
        return isinstance(model, BaseEstimator) and self.model_kind(model) in {
            "classifier",
            "regressor",
        }

    def model_kind(self, model: object) -> str:
        if isinstance(model, ClassifierMixin):
            return "classifier"
        if isinstance(model, RegressorMixin):
            return "regressor"
        return str(getattr(model, "_estimator_type", ""))

    def feature_names(self, model: object) -> list[str]:
        return list_feature_names(model)

    def class_labels(self, model: object) -> list[str]:
        return list_class_labels(model)

    def predict_classifier(
        self, model: object, frame: pd.DataFrame
    ) -> list[list[float]]:
        return model.predict_proba(frame).tolist()

    def predict_regressor(self, model: object, frame: pd.DataFrame) -> list[object]:
        return model.predict(frame).tolist()
