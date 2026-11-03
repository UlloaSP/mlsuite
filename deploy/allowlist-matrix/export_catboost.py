"""Export CatBoost bundles: python export_catboost.py <env-name> <output>."""

from __future__ import annotations

import sys

import pandas as pd
from catboost import CatBoostClassifier, CatBoostRegressor

from common import Case, binary_target, multiclass_target, numeric_frame, regression_target, run

N, N_TEST, SAMPLES = 160, 7, 3
X, X_TEST = numeric_frame(0, N), numeric_frame(1, N_TEST)
CB = {"iterations": 30, "depth": 3, "verbose": False, "allow_writing_files": False,
      "random_seed": 0, "thread_count": 1}


def case(case_id, description, kind, factory, target):
    def build():
        y = target(X)
        model = factory().fit(X, y)
        kwargs = {"training_data": pd.concat([X, y], axis=1), "target_names": ["target"],
                  "sample_rows": SAMPLES}
        return model, kwargs, X_TEST

    return Case(case_id, description, kind, False, build, native_frame=True)


def cases() -> list[Case]:
    return [
        case("cb_clf_bin", "CatBoostClassifier Logloss binary string labels", "classifier",
             lambda: CatBoostClassifier(**CB), binary_target),
        case("cb_clf_mc", "CatBoostClassifier MultiClass 3 string labels", "classifier",
             lambda: CatBoostClassifier(loss_function="MultiClass", **CB), multiclass_target),
        case("cb_reg", "CatBoostRegressor RMSE", "regressor", lambda: CatBoostRegressor(**CB), regression_target),
        case("cb_reg_quantile", "CatBoostRegressor Quantile:alpha=0.7", "regressor",
             lambda: CatBoostRegressor(loss_function="Quantile:alpha=0.7", **CB), regression_target),
    ]


if __name__ == "__main__":
    run(sys.argv[1], cases())
