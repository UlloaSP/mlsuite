import io
from pathlib import Path

import joblib
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier, XGBRegressor


class NoFeatureClassifier(ClassifierMixin, BaseEstimator):
    classes_ = [0, 1]

    def fit(self, *_args, **_kwargs) -> "NoFeatureClassifier":
        return self

    def predict(self, values: pd.DataFrame) -> list[int]:
        return [0] * len(values)


def serialize_joblib(value: object, filename: str) -> tuple[str, io.BytesIO, str]:
    path = Path(filename)
    buffer = io.BytesIO()
    joblib.dump(value, buffer)
    buffer.seek(0)
    return (path.name, buffer, "application/octet-stream")


def make_classifier() -> LogisticRegression:
    features = pd.DataFrame(
        {
            "age": [22, 35, 47, 52, 46, 56],
            "income": [20_000, 45_000, 80_000, 90_000, 70_000, 120_000],
        }
    )
    labels = [0, 0, 1, 1, 1, 1]
    return LogisticRegression().fit(features, labels)


def make_regressor() -> LinearRegression:
    features = pd.DataFrame(
        {
            "rooms": [1, 2, 3, 4],
            "area": [30, 45, 60, 90],
        }
    )
    labels = [100_000, 160_000, 220_000, 340_000]
    return LinearRegression().fit(features, labels)


def make_tree() -> DecisionTreeClassifier:
    features = pd.DataFrame(
        {
            "age": [22, 35, 47, 52, 46, 56],
            "income": [20_000, 45_000, 80_000, 90_000, 70_000, 120_000],
        }
    )
    labels = [0, 0, 1, 1, 1, 1]
    return DecisionTreeClassifier(random_state=0, max_depth=3).fit(features, labels)


def make_tree_with_unused_tail_feature() -> DecisionTreeClassifier:
    features = pd.DataFrame(
        {
            "age": [22, 35, 47, 52, 46, 56],
            "income": [20_000, 45_000, 80_000, 90_000, 70_000, 120_000],
            "unused": [7, 7, 7, 7, 7, 7],
        }
    )
    labels = [0, 0, 1, 1, 1, 1]
    return DecisionTreeClassifier(random_state=0, max_depth=1).fit(features, labels)


def make_no_feature_classifier() -> NoFeatureClassifier:
    return NoFeatureClassifier().fit()


def make_positional_classifier() -> LogisticRegression:
    features = [
        [22, 20_000],
        [35, 45_000],
        [47, 80_000],
        [52, 90_000],
        [46, 70_000],
        [56, 120_000],
    ]
    labels = [0, 0, 1, 1, 1, 1]
    return LogisticRegression().fit(features, labels)


def make_positional_regressor() -> LinearRegression:
    features = [[1, 30], [2, 45], [3, 60], [4, 90]]
    labels = [100_000, 160_000, 220_000, 340_000]
    return LinearRegression().fit(features, labels)


def make_xgboost_classifier() -> XGBClassifier:
    features = pd.DataFrame(
        {
            "age": [22, 35, 47, 52, 46, 56],
            "income": [20_000, 45_000, 80_000, 90_000, 70_000, 120_000],
        }
    )
    labels = [0, 0, 1, 1, 1, 1]
    return XGBClassifier(n_estimators=3, max_depth=2, eval_metric="logloss").fit(
        features, labels
    )


def make_xgboost_regressor() -> XGBRegressor:
    features = pd.DataFrame(
        {
            "rooms": [1, 2, 3, 4],
            "area": [30, 45, 60, 90],
        }
    )
    labels = [100_000, 160_000, 220_000, 340_000]
    return XGBRegressor(n_estimators=3, max_depth=2).fit(features, labels)
