"""Shared harness: fit, export, inspect, load, predict records and cross-check natively.

Each exporter script defines cases and calls ``run(env_name, cases)``. Bundles and results go
under the output directory given as its second argument; export_corpus.py merges the results.
"""

from __future__ import annotations

import importlib.metadata as md
import json
import math
import platform
import sys
import traceback
import warnings
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

import numpy as np
import pandas as pd

import mlbundle

ROOT = Path(sys.argv[2])
warnings.filterwarnings("ignore")


@dataclass
class Case:
    id: str
    description: str
    kind: str  # classifier | regressor
    pipeline: bool
    # Returns (model, export_kwargs, X_test DataFrame). X_test columns are the
    # model's input features in training order; values may be str/NaN.
    build: Callable[[], tuple[Any, dict, pd.DataFrame]]
    # Optional native predictor: (model, X_test_row_frame) -> list of per-output dicts
    # {"probabilities": [...], "label_index": int} or {"value": float}.
    native: Callable[[Any, pd.DataFrame], list[dict]] | None = None
    # Whether the native model takes the DataFrame (name-based) or a numpy array.
    native_frame: bool | None = None
    notes: list[str] = field(default_factory=list)


def _err(stage: str, case: Case, exc: BaseException) -> dict:
    return {
        "id": case.id,
        "description": case.description,
        "kind": case.kind,
        "pipeline": case.pipeline,
        "stage": stage,
        "exception_type": f"{type(exc).__module__}.{type(exc).__qualname__}",
        "message": str(exc)[:4000],
        "traceback_tail": traceback.format_exc().splitlines()[-6:],
    }


def _json_value(value: Any) -> Any:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if isinstance(value, (np.floating,)):
        return None if np.isnan(value) else float(value)
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if value is pd.NA:
        return None
    return value


def _serialize(outputs) -> list[dict]:
    return [
        {
            "output": o.output,
            "kind": o.kind.value,
            "labels": list(o.labels) if o.labels is not None else None,
            "probabilities": list(o.probabilities) if o.probabilities is not None else None,
            "value": o.value,
            "predicted_label": o.predicted_label,
        }
        for o in outputs
    ]


def sklearn_native(model: Any, X: Any, kind: str) -> list[dict]:
    """Native outputs for sklearn-style estimators (incl. multi-output)."""
    if kind == "regressor":
        values = np.asarray(model.predict(X), dtype=float).reshape(1, -1)[0]
        return [{"value": float(v)} for v in values]
    proba = model.predict_proba(X)
    pred = np.asarray(model.predict(X)).reshape(1, -1)[0]
    classes = model.classes_
    if not isinstance(proba, list):
        proba, classes = [proba], [classes]
    out = []
    for i, (p, cls) in enumerate(zip(proba, classes)):
        index = [str(c) for c in list(cls)].index(str(pred[i]))
        out.append({"probabilities": [float(x) for x in p[0]], "label_index": index})
    return out


def _compare(expected: list[dict], native: list[dict]) -> dict:
    if len(expected) != len(native):
        return {"agree": False, "detail": f"output count {len(expected)} vs native {len(native)}"}
    max_diff, problems = 0.0, []
    for e, n in zip(expected, native):
        if "value" in n:
            diff = abs(e["value"] - n["value"])
            max_diff = max(max_diff, diff)
            if e["value"] != n["value"]:
                problems.append(f"output {e['output']}: value {e['value']!r} vs native {n['value']!r}")
            continue
        probs = e["probabilities"] or []
        if len(probs) != len(n["probabilities"]):
            problems.append(f"output {e['output']}: probability width differs")
            continue
        for a, b in zip(probs, n["probabilities"]):
            max_diff = max(max_diff, abs(a - b))
        if probs != n["probabilities"]:
            problems.append(f"output {e['output']}: probabilities differ")
        idx = n.get("label_index")
        native_label = None if idx is None else e["labels"][idx]
        if native_label != e["predicted_label"]:
            problems.append(
                f"output {e['output']}: predicted_label {e['predicted_label']!r} vs native {native_label!r}"
            )
    return {"agree": not problems, "max_abs_diff": max_diff, "problems": problems}


def _lock_info(lock) -> dict:
    return {
        "environment_id": lock.environment_id,
        "python_version": lock.python_version,
        "packages": [[p.name, p.version] for p in lock.packages],
        "platform_specific": {
            p.name: list(p.platforms) for p in lock.packages if len(p.platforms) != 3
        },
    }


def _native_input(case: Case, model: Any, row: pd.DataFrame):
    use_frame = case.native_frame
    if use_frame is None:
        use_frame = hasattr(model, "feature_names_in_")
    return row if use_frame else row.to_numpy(dtype=float)


def run_case(env: str, case: Case, out_dir: Path) -> tuple[dict | None, dict | None]:
    try:
        model, kwargs, X_test = case.build()
    except Exception as exc:
        return None, _err("fit", case, exc)
    path = out_dir / f"{case.id}.mlbundle"
    try:
        mlbundle.export(model, path, overwrite=True, **kwargs)
    except Exception as exc:
        return None, _err("export", case, exc)
    try:
        view = mlbundle.inspect(path)
        bundle = mlbundle.load(path)
    except Exception as exc:
        return None, _err("load", case, exc)

    manifest = view.manifest
    origin = manifest.features.origin.value if hasattr(manifest.features.origin, "value") else str(manifest.features.origin)
    names = list(manifest.features.names)
    tests, notes, disagreements = [], list(case.notes), []
    for i in range(len(X_test)):
        row = X_test.iloc[[i]]
        values = [_json_value(row[c].iloc[0]) for c in row.columns]  # keep per-column dtype
        if origin == "model":
            record = dict(zip(names, values))
        else:
            record = {str(j): v for j, v in enumerate(values)}
        record = json.loads(json.dumps(record))  # exactly what is stored
        try:
            expected = _serialize(bundle.predict_record(record))
        except Exception as exc:
            return None, _err("predict", case, exc) | {"record": record, "path": str(path)}
        try:
            native_in = _native_input(case, bundle.native_model, row)
            native = (case.native or (lambda m, x: sklearn_native(m, x, case.kind)))(model, native_in)
            check = _compare(expected, native)
        except Exception as exc:
            check = {"agree": False, "problems": [f"native cross-check raised {type(exc).__name__}: {exc}"]}
        if not check["agree"]:
            disagreements.append({"record_index": i, **check})
        tests.append({"record": record, "expected": expected, "native_agrees": check["agree"],
                      "max_abs_diff": check.get("max_abs_diff")})

    lock = view.environment_lock
    lock_names = {p.name for p in lock.packages}
    entry = {
        "id": f"{env}/{case.id}",
        "path": path.relative_to(ROOT).as_posix(),
        "env": env,
        "description": case.description,
        "kind": case.kind,
        "manifest_kind": bundle.kind.value if hasattr(bundle.kind, "value") else str(bundle.kind),
        "pipeline": case.pipeline,
        "library": bundle.library.value if hasattr(bundle.library, "value") else str(bundle.library),
        "class_name": bundle.class_name,
        "python_version": platform.python_version(),
        "library_versions": library_versions(),
        "writer_version": manifest.writer_version,
        "feature_origin": origin,
        "feature_names": names,
        "class_labels": [list(c) for c in bundle.class_labels] if bundle.class_labels else None,
        "members": [m.value for m in view.members],
        "pandas_in_lock": "pandas" in lock_names,
        "environment_lock": _lock_info(lock),
        "tests": tests,
        "native_disagreements": disagreements,
        "notes": notes,
    }
    return entry, None


LIBS = ["mlbundle", "scikit-learn", "skops", "numpy", "scipy", "pandas", "pydantic",
        "mlschema", "xgboost", "catboost", "onnx", "onnxruntime", "uv"]


def library_versions() -> dict:
    out = {}
    for name in LIBS:
        try:
            out[name] = md.version(name)
        except md.PackageNotFoundError:
            pass
    return out


def run(env: str, cases: list[Case]) -> None:
    out_dir = ROOT / "bundles" / env
    out_dir.mkdir(parents=True, exist_ok=True)
    bundles, failures = [], []
    for case in cases:
        entry, failure = run_case(env, case, out_dir)
        if entry:
            bundles.append(entry)
            flag = "" if not entry["native_disagreements"] else "  (NATIVE DISAGREES)"
            print(f"OK    {case.id}{flag}", flush=True)
        else:
            failures.append(failure)
            print(f"FAIL  {case.id} [{failure['stage']}] {failure['exception_type']}: "
                  f"{failure['message'][:200]}", flush=True)
    result = {
        "env": env,
        "python": sys.version,
        "python_version": platform.python_version(),
        "library_versions": library_versions(),
        "bundles": bundles,
        "failures": failures,
    }
    (ROOT / "results").mkdir(exist_ok=True)
    (ROOT / "results" / f"{env}.json").write_text(json.dumps(result, indent=1), encoding="utf-8")
    print(f"{env}: {len(bundles)} exported, {len(failures)} failed", flush=True)


# ---------------------------------------------------------------- synthetic data

def numeric_frame(seed: int, n: int, k: int = 4) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    data = rng.normal(0.0, 2.5, size=(n, k)) - 0.75
    return pd.DataFrame(np.round(data, 4), columns=[f"x{i}" for i in range(k)])


def binary_target(X: pd.DataFrame) -> pd.Series:
    score = 0.9 * X["x0"] - 0.6 * X["x1"] + 0.3 * X["x2"] * X["x3"] + 0.2
    return pd.Series(np.where(score > 0, "yes", "no"), name="target")


def multiclass_target(X: pd.DataFrame) -> pd.Series:
    score = X["x0"] + 0.5 * X["x1"] - 0.4 * X["x3"]
    return pd.Series(np.select([score < -1.5, score < 0.8], ["cold", "mild"], "hot"), name="target")


def regression_target(X: pd.DataFrame, seed: int = 7, scale: float = 1.0) -> pd.Series:
    rng = np.random.default_rng(seed)
    y = 1.7 * X["x0"] - 2.3 * X["x1"] + 0.5 * X["x2"] ** 2 - 0.8 * X["x3"] + rng.normal(0, 0.3, len(X))
    return pd.Series(np.round(scale * y, 6), name="target")
