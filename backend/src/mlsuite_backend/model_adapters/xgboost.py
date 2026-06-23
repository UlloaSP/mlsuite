import pandas as pd
from xgboost import XGBClassifier, XGBRegressor

from .features import list_class_labels, list_feature_names


class XGBoostAdapter:
    library = "xgboost"

    def supports(self, model: object) -> bool:
        return isinstance(model, (XGBClassifier, XGBRegressor))

    def model_kind(self, model: object) -> str:
        if isinstance(model, XGBClassifier):
            return "classifier"
        if isinstance(model, XGBRegressor):
            return "regressor"
        return ""

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
