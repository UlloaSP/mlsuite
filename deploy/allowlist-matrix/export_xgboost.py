"""Export XGBoost and sklearn-prefix+XGBoost composite bundles: python export_xgboost.py <env-name> <output>."""

from __future__ import annotations

import sys

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier, XGBRegressor

from common import Case, binary_target, multiclass_target, numeric_frame, regression_target, run

N, N_TEST, SAMPLES = 160, 7, 3
X, X_TEST = numeric_frame(0, N), numeric_frame(1, N_TEST)
XGB = {"n_estimators": 20, "max_depth": 3, "n_jobs": 1, "random_state": 0}
BIN, MC = ["no", "yes"], ["cold", "hot", "mild"]  # sorted, matches np.unique encoding


def encode(series, labels):
    return series.map({label: i for i, label in enumerate(labels)}).astype("int64")


def classifier_case(case_id, description, labels, target, factory, *, bind=True, pipeline=False):
    def build():
        y_raw = target(X)
        model = factory().fit(X, encode(y_raw, labels))
        kwargs = {"training_data": pd.concat([X, y_raw], axis=1), "target_names": ["target"],
                  "sample_rows": SAMPLES}
        if bind:
            kwargs["class_labels"] = [labels]
        else:  # training frame target must not matter for schema; keep encoded ints
            kwargs["training_data"] = pd.concat([X, encode(y_raw, labels)], axis=1)
        return model, kwargs, X_TEST

    return Case(case_id, description, "classifier", pipeline, build, native_frame=True)


def regressor_case(case_id, description, factory, *, pipeline=False, target=regression_target):
    def build():
        y = target(X)
        model = factory().fit(X, y)
        kwargs = {"training_data": pd.concat([X, y], axis=1), "target_names": ["target"],
                  "sample_rows": SAMPLES}
        return model, kwargs, X_TEST

    return Case(case_id, description, "regressor", pipeline, build, native_frame=True)


def composite_ct_case():
    def build():
        rng = np.random.default_rng(10)
        train, test = numeric_frame(10, N, 3), numeric_frame(11, N_TEST, 3)
        for frame, r in ((train, rng), (test, np.random.default_rng(11))):
            frame["color"] = r.integers(0, 3, size=len(frame)).astype("int64")
        y = pd.Series(np.round(train["x0"] * 1.3 - train["color"] * 0.8 + train["x2"] ** 2, 6), name="target")
        prep = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), ["color"]),
                                  ("num", StandardScaler(), ["x0", "x1", "x2"])])
        model = make_pipeline(prep, XGBRegressor(**XGB)).fit(train, y)
        kwargs = {"training_data": pd.concat([train, y], axis=1), "target_names": ["target"],
                  "sample_rows": SAMPLES}
        return model, kwargs, test

    return Case("composite_ct_onehot_xgb_reg",
                "Pipeline(ColumnTransformer(OneHotEncoder on int-coded color + StandardScaler), XGBRegressor)",
                "regressor", True, build, native_frame=True)


def cases() -> list[Case]:
    positive = lambda frame: np.round(np.exp(regression_target(frame) / 8.0), 6)  # noqa: E731
    return [
        classifier_case("xgb_clf_bin", "XGBClassifier binary:logistic, class_labels bound [no, yes]",
                        BIN, binary_target, lambda: XGBClassifier(**XGB)),
        classifier_case("xgb_clf_mc", "XGBClassifier multi:softprob 3 classes, class_labels bound [cold, hot, mild]",
                        MC, multiclass_target, lambda: XGBClassifier(objective="multi:softprob", **XGB)),
        classifier_case("xgb_clf_bin_unbound", "XGBClassifier binary:logistic, no class_labels (encoded 0/1)",
                        BIN, binary_target, lambda: XGBClassifier(**XGB), bind=False),
        regressor_case("xgb_reg", "XGBRegressor reg:squarederror", lambda: XGBRegressor(**XGB)),
        regressor_case("xgb_reg_gamma", "XGBRegressor reg:gamma (positive target)",
                       lambda: XGBRegressor(objective="reg:gamma", **XGB), target=positive),
        classifier_case("composite_scaler_xgb_clf_bin", "Pipeline(StandardScaler, XGBClassifier) binary, class_labels bound",
                        BIN, binary_target, lambda: make_pipeline(StandardScaler(), XGBClassifier(**XGB)), pipeline=True),
        composite_ct_case(),
    ]


if __name__ == "__main__":
    run(sys.argv[1], cases())
