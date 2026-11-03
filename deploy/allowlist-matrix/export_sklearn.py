"""Export the sklearn corpus in the current venv: python export_sklearn.py <env-name> <output>."""

from __future__ import annotations

import sys

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    ExtraTreesClassifier, ExtraTreesRegressor, GradientBoostingClassifier,
    GradientBoostingRegressor, HistGradientBoostingClassifier,
    HistGradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import (
    ElasticNet, Lasso, LinearRegression, LogisticRegression, Ridge, SGDClassifier,
    SGDRegressor,
)
from sklearn.multioutput import MultiOutputClassifier, MultiOutputRegressor
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import (
    MinMaxScaler, OneHotEncoder, OrdinalEncoder, PolynomialFeatures, StandardScaler,
)
from sklearn.svm import SVC, SVR
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

from common import (
    Case, binary_target, multiclass_target, numeric_frame, regression_target, run,
)

N, N_TEST, SAMPLES = 160, 7, 3
X, X_TEST = numeric_frame(0, N), numeric_frame(1, N_TEST)


def frame_case(case_id, description, kind, factory, target, *, numpy=False, pipeline=False):
    """Single-target model on the four numeric features."""

    def build():
        y = target(X)
        model = factory()
        model.fit(X.to_numpy() if numpy else X, y)
        kwargs = {"training_data": pd.concat([X, y], axis=1), "target_names": ["target"],
                  "sample_rows": SAMPLES}
        return model, kwargs, X_TEST

    suffix = " [numpy-trained, positional keys]" if numpy else ""
    return Case(case_id, description + suffix, kind, pipeline, build)


def int_labels(series):
    return series.map({"no": 0, "yes": 1, "cold": 0, "mild": 1, "hot": 2}).astype("int64")


def multi_output_case(case_id, description, kind, factory):
    def build():
        if kind == "classifier":
            y = pd.DataFrame({"y0": binary_target(X), "y1": multiclass_target(X)})
        else:
            y = pd.DataFrame({"y0": regression_target(X, 7), "y1": regression_target(X, 8, -0.5)})
        model = factory().fit(X, y)
        kwargs = {"training_data": pd.concat([X, y], axis=1), "target_names": ["y0", "y1"],
                  "sample_rows": SAMPLES}
        return model, kwargs, X_TEST

    return Case(case_id, description, kind, False, build)


COLORS, SIZES = ["red", "green", "blue"], ["S", "M", "L"]


def categorical_frame(seed, n, coded=False):
    """Numerics x0..x2 plus categoricals; coded=True stores int64 codes instead of strings."""
    rng = np.random.default_rng(seed)
    frame = numeric_frame(seed, n, 3)
    frame["color"] = rng.choice(COLORS, size=n)
    frame["size"] = rng.choice(SIZES, size=n)
    if coded:
        frame["color"] = frame["color"].map(COLORS.index).astype("int64")
        frame["size"] = frame["size"].map(SIZES.index).astype("int64")
    return frame


def categorical_target(frame):
    color, size = frame["color"], frame["size"]
    if color.dtype.kind == "i":
        color, size = color.map(dict(enumerate(COLORS))), size.map(dict(enumerate(SIZES)))
    score = frame["x0"] + color.map({"red": 1.5, "green": -1.0, "blue": 0.0}) \
        + size.map({"S": -0.7, "M": 0.0, "L": 0.9})
    return pd.Series(np.select([score < -1.0, score < 1.0], ["cold", "mild"], "hot"), name="target")


def column_transformer_case(case_id, description, final, encoder, coded=False):
    def build():
        train, test = categorical_frame(10, N, coded), categorical_frame(11, N_TEST, coded)
        y = categorical_target(train)
        prep = ColumnTransformer([
            ("cat", encoder(), ["color", "size"]),
            ("num", StandardScaler(), ["x0", "x1", "x2"]),
        ])
        model = make_pipeline(prep, final()).fit(train, y)
        kwargs = {"training_data": pd.concat([train, y], axis=1), "target_names": ["target"],
                  "sample_rows": SAMPLES}
        return model, kwargs, test

    return Case(case_id, description, "classifier", True, build)


def imputer_case():
    def build():
        train = X.copy()
        rng = np.random.default_rng(3)
        mask = rng.random(train.shape) < 0.12
        y = binary_target(X)  # target from complete data
        train = train.mask(mask)
        test = X_TEST.copy()
        test.iloc[0, 1] = np.nan
        test.iloc[2, 3] = np.nan
        test.iloc[4, 0] = np.nan
        model = make_pipeline(SimpleImputer(strategy="median"), LogisticRegression(max_iter=1000))
        model.fit(train, y)
        kwargs = {"training_data": pd.concat([train, y], axis=1), "target_names": ["target"],
                  "sample_rows": SAMPLES}
        return model, kwargs, test

    return Case("pipe_imputer_logreg_bin",
                "Pipeline(SimpleImputer(median), LogisticRegression) binary, NaNs in training and test",
                "classifier", True, build)


def cases() -> list[Case]:
    rs = {"random_state": 0}
    out = []
    classifiers = [
        ("logreg", "LogisticRegression", lambda: LogisticRegression(max_iter=1000), False),
        ("sgd_clf", "SGDClassifier(loss=log_loss)", lambda: SGDClassifier(loss="log_loss", **rs), False),
        ("dtree_clf", "DecisionTreeClassifier(max_depth=5)", lambda: DecisionTreeClassifier(max_depth=5, **rs), False),
        ("rf_clf", "RandomForestClassifier(n_estimators=15)", lambda: RandomForestClassifier(n_estimators=15, max_depth=6, **rs), False),
        ("et_clf", "ExtraTreesClassifier(n_estimators=15)", lambda: ExtraTreesClassifier(n_estimators=15, max_depth=6, **rs), False),
        ("gb_clf", "GradientBoostingClassifier(n_estimators=20)", lambda: GradientBoostingClassifier(n_estimators=20, max_depth=3, **rs), False),
        ("hgb_clf", "HistGradientBoostingClassifier(max_iter=20)", lambda: HistGradientBoostingClassifier(max_iter=20, **rs), False),
        ("knn_clf", "KNeighborsClassifier(n_neighbors=5) default algorithm", lambda: KNeighborsClassifier(n_neighbors=5), True),
        ("knn_brute_clf", "KNeighborsClassifier(n_neighbors=5, algorithm=brute)", lambda: KNeighborsClassifier(n_neighbors=5, algorithm="brute"), True),
        ("svc", "SVC(probability=True)", lambda: SVC(probability=True, **rs), False),
        ("gnb", "GaussianNB", GaussianNB, True),
        ("mlp_clf", "MLPClassifier(hidden=(8,), max_iter=600)", lambda: MLPClassifier(hidden_layer_sizes=(8,), max_iter=600, **rs), False),
    ]
    for key, desc, factory, numpy in classifiers:
        # numpy-trained cases use integer labels to vary label types.
        for task, target in (("bin", binary_target), ("mc", multiclass_target)):
            tgt = (lambda t: (lambda frame: int_labels(t(frame))))(target) if numpy else target
            label_desc = "int labels" if numpy else "string labels"
            out.append(frame_case(f"{key}_{task}", f"{desc} {'binary' if task == 'bin' else 'multiclass(3)'} {label_desc}",
                                  "classifier", factory, tgt, numpy=numpy))
    regressors = [
        ("linreg", "LinearRegression", LinearRegression, True),
        ("ridge", "Ridge(alpha=1.0)", lambda: Ridge(alpha=1.0), True),
        ("lasso", "Lasso(alpha=0.05)", lambda: Lasso(alpha=0.05), False),
        ("enet", "ElasticNet(alpha=0.05, l1_ratio=0.5)", lambda: ElasticNet(alpha=0.05, l1_ratio=0.5), False),
        ("sgd_reg", "SGDRegressor", lambda: SGDRegressor(**rs), False),
        ("dtree_reg", "DecisionTreeRegressor(max_depth=5)", lambda: DecisionTreeRegressor(max_depth=5, **rs), False),
        ("rf_reg", "RandomForestRegressor(n_estimators=15)", lambda: RandomForestRegressor(n_estimators=15, max_depth=6, **rs), False),
        ("et_reg", "ExtraTreesRegressor(n_estimators=15)", lambda: ExtraTreesRegressor(n_estimators=15, max_depth=6, **rs), False),
        ("gb_reg", "GradientBoostingRegressor(n_estimators=20)", lambda: GradientBoostingRegressor(n_estimators=20, max_depth=3, **rs), False),
        ("hgb_reg", "HistGradientBoostingRegressor(max_iter=20)", lambda: HistGradientBoostingRegressor(max_iter=20, **rs), False),
        ("knn_reg", "KNeighborsRegressor(n_neighbors=5) default algorithm", lambda: KNeighborsRegressor(n_neighbors=5), True),
        ("knn_brute_reg", "KNeighborsRegressor(n_neighbors=5, algorithm=brute)", lambda: KNeighborsRegressor(n_neighbors=5, algorithm="brute"), True),
        ("svr", "SVR(C=2.0)", lambda: SVR(C=2.0), True),
        ("mlp_reg", "MLPRegressor(hidden=(8,), max_iter=800)", lambda: MLPRegressor(hidden_layer_sizes=(8,), max_iter=800, **rs), False),
    ]
    for key, desc, factory, numpy in regressors:
        out.append(frame_case(key, desc, "regressor", factory, regression_target, numpy=numpy))
    out += [
        multi_output_case("multiout_clf_logreg", "MultiOutputClassifier(LogisticRegression), outputs binary+multiclass",
                          "classifier", lambda: MultiOutputClassifier(LogisticRegression(max_iter=1000))),
        multi_output_case("multiout_clf_rf_native", "RandomForestClassifier native 2-output (binary+multiclass)",
                          "classifier", lambda: RandomForestClassifier(n_estimators=10, max_depth=5, random_state=0)),
        multi_output_case("multiout_reg_gb", "MultiOutputRegressor(GradientBoostingRegressor), 2 outputs",
                          "regressor", lambda: MultiOutputRegressor(GradientBoostingRegressor(n_estimators=15, random_state=0))),
        multi_output_case("multiout_reg_linreg_native", "LinearRegression native 2-output",
                          "regressor", LinearRegression),
        frame_case("pipe_scaler_logreg_mc", "Pipeline(StandardScaler, LogisticRegression) multiclass(3)", "classifier",
                   lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)), multiclass_target, pipeline=True),
        column_transformer_case("pipe_ct_onehot_rf_mc",
                                "Pipeline(ColumnTransformer(OneHotEncoder on str color/size + StandardScaler on x0..x2), RandomForestClassifier) multiclass(3)",
                                lambda: RandomForestClassifier(n_estimators=15, max_depth=6, random_state=0),
                                lambda: OneHotEncoder(handle_unknown="ignore")),
        column_transformer_case("pipe_ct_onehot_intcat_rf_mc",
                                "Pipeline(ColumnTransformer(OneHotEncoder on int-coded color/size + StandardScaler on x0..x2), RandomForestClassifier) multiclass(3)",
                                lambda: RandomForestClassifier(n_estimators=15, max_depth=6, random_state=0),
                                lambda: OneHotEncoder(handle_unknown="ignore"), coded=True),
        imputer_case(),
        frame_case("pipe_poly_ridge", "Pipeline(PolynomialFeatures(2), Ridge)", "regressor",
                   lambda: make_pipeline(PolynomialFeatures(2), Ridge(alpha=0.5)), regression_target, pipeline=True),
        frame_case("pipe_minmax_svc_bin", "Pipeline(MinMaxScaler, SVC(probability=True)) binary int labels", "classifier",
                   lambda: make_pipeline(MinMaxScaler(), SVC(probability=True, random_state=0)),
                   lambda frame: int_labels(binary_target(frame)), numpy=True, pipeline=True),
        column_transformer_case("pipe_ct_ordinal_hgb_mc",
                                "Pipeline(ColumnTransformer(OrdinalEncoder on str color/size + StandardScaler), HistGradientBoostingClassifier) multiclass(3)",
                                lambda: HistGradientBoostingClassifier(max_iter=20, random_state=0),
                                OrdinalEncoder),
    ]
    return out


if __name__ == "__main__":
    run(sys.argv[1], cases())
