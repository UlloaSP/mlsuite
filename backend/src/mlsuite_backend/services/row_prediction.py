"""Predict many records of one bundle, each answered on its own and exactly as if predicted alone.

Every record is checked against the bundle's schema alone, so a record the model cannot use is
refused (400) without failing the others. Tree models (a decision tree, a scikit-learn tree
ensemble, XGBoost, CatBoost) compute each row on its own, so their usable records are predicted
in one vectorized call, which is where batching pays off; should that call fail, they are
predicted one by one, so a record that breaks the model fails alone (500). Any other model is
predicted record by record: a matrix product sums in another order than a single row's, so a
linear model's batched answer can differ in its last digit, and a result must not depend on the
records it happened to run with.
"""

import time
from typing import cast

import mlbundle
from fastapi import HTTPException
from mlbundle.contract import ModelKind
from mlbundle.records import OutputPrediction, row_from_record

from ..utils.errors import bad_request, internal_runtime_error

type RowAnswer = dict[str, object] | HTTPException

# Structure families (mlbundle) whose rows are computed independently of each other.
_ROW_INDEPENDENT = frozenset({"decision_tree", "tree_ensemble", "xgboost", "catboost"})


def predict_rows(bundle: mlbundle.LoadedBundle, records: list[object]) -> list[RowAnswer]:
    answers: list[RowAnswer] = []
    usable: list[tuple[int, list[float]]] = []
    for index, record in enumerate(records):
        try:
            usable.append((index, row_from_record(bundle.manifest, bundle.schema, record)))
            answers.append({})
        except mlbundle.PredictionInputError as exc:
            answers.append(bad_request(str(exc)))
    if not usable:
        return answers
    started = time.perf_counter()
    predicted = None
    if (bundle.structure or {}).get("family") in _ROW_INDEPENDENT:
        try:
            predicted = _predict_together(bundle, [row for _, row in usable])
        except Exception:
            predicted = None
    if predicted is None:
        predicted = [_predict_alone(bundle, records[index]) for index, _ in usable]
    # The batch's time, shared by its records: what each one cost the runtime.
    execution_time = (time.perf_counter() - started) / len(usable)
    for (index, _), outputs in zip(usable, predicted, strict=True):
        answers[index] = outputs if isinstance(outputs, HTTPException) else _reports(outputs, execution_time)
    return answers


def _predict_alone(bundle: mlbundle.LoadedBundle, record: object) -> tuple[OutputPrediction, ...] | HTTPException:
    try:
        return bundle.predict_record(record)
    except mlbundle.PredictionInputError as exc:
        return bad_request(str(exc))
    except Exception as exc:
        return internal_runtime_error(f"Error during inference: {exc}")


def _input(bundle: mlbundle.LoadedBundle, rows: list[list[float]]) -> object:
    """The rows as the predictor takes them: as a frame when its selectors read names."""
    record_input = getattr(bundle.predictor, "record_input", None)
    if record_input is None:
        return rows
    sample = record_input(rows[0], bundle.manifest.features.names)
    if isinstance(sample, list):
        return rows
    return type(sample)(rows, columns=list(sample.columns))


def _predict_together(bundle: mlbundle.LoadedBundle, rows: list[list[float]]) -> list[tuple[OutputPrediction, ...]]:
    """mlbundle's predict_record for many rows: the same outputs, row by row."""
    manifest, schema, predictor = bundle.manifest, cast(dict, bundle.schema), bundle.predictor
    data = _input(bundle, rows)
    kind = manifest.model.kind
    single = manifest.model.n_outputs == 1
    if kind == ModelKind.CLASSIFIER:
        raw = predictor.predict_proba(data)
        decisions = predictor.predict_class_indices(data)
        outputs = [raw] if single else raw
        return [
            tuple(
                OutputPrediction(
                    output=report["mappedTo"],
                    kind=kind,
                    labels=tuple(report["labels"]),
                    probabilities=tuple(cast(list[list[float]], matrix)[row]),
                    value=None,
                    predicted_label=None
                    if decisions is None
                    else report["labels"][decisions[row][report["mappedTo"]]],
                )
                for report, matrix in zip(schema["reports"], outputs, strict=True)
            )
            for row in range(len(rows))
        ]
    values = predictor.predict(data)
    return [
        tuple(
            OutputPrediction(output=output, kind=kind, labels=None, probabilities=None, value=value, predicted_label=None)
            for output, value in enumerate(cast(list[float], [values[row]] if single else values[row]))
        )
        for row in range(len(rows))
    ]


def _reports(predictions: tuple[OutputPrediction, ...], execution_time: float) -> dict[str, object]:
    """One answer per model output, named by the position the schema's report maps to."""
    reports = []
    for prediction in predictions:
        report: dict[str, object] = {
            "kind": prediction.kind.value,
            "output": prediction.output,
            "execution_time": execution_time,
        }
        if prediction.labels is None:
            report["values"] = [prediction.value]
        else:
            report["mapping"] = prediction.labels
            report["probabilities"] = prediction.probabilities
            report["prediction"] = prediction.predicted_label
        reports.append(report)
    return {"reports": reports}
