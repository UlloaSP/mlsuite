from dataclasses import dataclass
from typing import Protocol

import pandas as pd


class ModelAdapter(Protocol):
    library: str

    def supports(self, model: object) -> bool: ...

    def model_kind(self, model: object) -> str: ...

    def feature_names(self, model: object) -> list[str]: ...

    def class_labels(self, model: object) -> list[str]: ...

    def predict_classifier(self, model: object, frame: pd.DataFrame) -> list[list[float]]: ...

    def predict_regressor(self, model: object, frame: pd.DataFrame) -> list[object]: ...


@dataclass(frozen=True)
class RuntimeModel:
    model: object
    adapter: ModelAdapter

    @property
    def kind(self) -> str:
        return self.adapter.model_kind(self.model)

    @property
    def specific_type(self) -> str:
        return self.model.__class__.__name__

    def feature_names(self) -> list[str]:
        return self.adapter.feature_names(self.model)

    def class_labels(self) -> list[str]:
        return self.adapter.class_labels(self.model)

    def feature_metadata(self):
        from .features import feature_metadata

        return feature_metadata(self.model)

    def predict_classifier(self, frame: pd.DataFrame) -> list[list[float]]:
        return self.adapter.predict_classifier(self.model, frame)

    def predict_regressor(self, frame: pd.DataFrame) -> list[object]:
        return self.adapter.predict_regressor(self.model, frame)

