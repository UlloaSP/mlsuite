#
# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Pablo Ulloa Santin
#

import joblib
import json
import time
import pandas as pd
import tempfile
import re
import math
from fastapi import FastAPI, UploadFile, Request, File, HTTPException, Body, Form
from fastapi.middleware.cors import CORSMiddleware
from sklearn.base import ClassifierMixin, RegressorMixin, BaseEstimator
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from mlschema import MLSchema
from mlschema.strategies import TextStrategy, NumberStrategy, CategoryStrategy, BooleanStrategy, DateStrategy
from crystal_tree import CrystalTree, Trace, Condition
from crystal_tree.crystal_tree import Dafacter, CrystalTreeContext
from xclingo import XclingoControl

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:8443"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

INTEGER_PATTERN = re.compile(r"^[+-]?\d+$")
FLOAT_PATTERN = re.compile(
    r"^[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?$"
)


def coerce_scalar(value):
    if not isinstance(value, str):
        return value

    stripped = value.strip()
    if stripped == "":
        return value

    lowered = stripped.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False

    if INTEGER_PATTERN.fullmatch(stripped):
        try:
            return int(stripped)
        except ValueError:
            return value

    if FLOAT_PATTERN.fullmatch(stripped):
        try:
            return float(stripped)
        except ValueError:
            return value

    return value


def coerce_record_values(record):
    return {key: coerce_scalar(value) for key, value in record.items()}


def format_tree_threshold(value):
    if isinstance(value, float):
        return f"{value:.6g}"
    return str(value)


def build_tree_path_explanation(model, instance_df, feature_names):
    tree = model.tree_
    instance = instance_df.iloc[0]
    node_indicator = model.decision_path(instance_df)
    leaf_id = model.apply(instance_df)[0]
    node_indexes = node_indicator.indices[
        node_indicator.indptr[0]:node_indicator.indptr[1]
    ]

    lines = ["Prediction path"]

    for node_id in node_indexes:
        if node_id == leaf_id:
            continue

        feature_index = tree.feature[node_id]
        if feature_index < 0:
            continue

        feature_name = feature_names[feature_index]
        threshold = tree.threshold[node_id]
        value = instance.iloc[feature_index]
        go_left = value <= threshold
        operator = "<=" if go_left else ">"
        lines.append(
            f"|- {feature_name} {operator} {format_tree_threshold(threshold)} "
            f"(value={value})"
        )

    if isinstance(model, DecisionTreeClassifier):
        predicted = model.predict(instance_df)[0]
        lines.append(f"\\- class = {predicted}")
    else:
        predicted = model.predict(instance_df)[0]
        lines.append(f"\\- value = {predicted}")

    return "\n".join(lines)


def build_feature_value_alias_program(feature_names):
    return "\n".join(
        f'value(I,{json.dumps(str(name))},V) :- value(I,{index},V).'
        for index, name in enumerate(feature_names)
    )


def build_threshold_compatibility_program(model, factor):
    thresholds = []
    multiplier = 10 ** factor

    for threshold in model.tree_.threshold:
        if threshold == -2 or math.isinf(threshold) or math.isnan(threshold):
            continue
        thresholds.append(int(threshold * multiplier))

    return "\n".join(
        f"thres({threshold})."
        for threshold in sorted(set(thresholds))
    )


def render_traces(traces):
    return "\n".join(trace.to_xclingo_code() for trace in traces)


def explain_with_feature_name_aliases(ct, instance_df, feature_names):
    if ct.factor is None:
        factor = ct.max_decimal_places(instance_df)
    else:
        factor = ct.factor

    ct.set_logic_tree(feature_names=feature_names, factor=factor)
    dafacter = Dafacter(instance_df, feature_names, factor=factor)
    alias_program = build_feature_value_alias_program(feature_names)
    threshold_program = build_threshold_compatibility_program(ct._dt, factor)

    control = XclingoControl(n_solutions=1, n_explanations=1)
    control.add("base", [], dafacter.as_program_string())
    control.add("base", [], alias_program)
    control.add("base", [], threshold_program)
    control.add("base", [], ct._logic_tree.get_paths())
    control.add("base", [], ct._logic_tree.extra)

    if ct.prediction_traces:
        control.add("base", [], render_traces(ct.prediction_traces))
    else:
        control.add("base", [], ct._logic_tree.prediction_traces)

    if ct.feature_traces:
        control.add("base", [], render_traces(ct.feature_traces))
    else:
        control.add("base", [], ct._logic_tree.feature_traces)

    control.ground([("base", [])], explainer_context=CrystalTreeContext(factor))
    return list(next(control.explain()))

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/metadata")
async def get_model_metadata(
    model_file: UploadFile = File(...)
):
    """
    Endpoint que recibe un modelo (.joblib) y devuelve metadatos del modelo,
    incluyendo tipo de modelo, clases (si es clasificador) y nombres de características.
    """
    if not model_file.filename.endswith('.joblib'):
        raise HTTPException(400, "File must be .joblib")
    
    with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as tmp:
        tmp.write(await model_file.read())
        model_path = tmp.name
    
    model = joblib.load(model_path)
    
    if not isinstance(model, BaseEstimator):
        raise HTTPException(400, "Not a sklearn estimator.")
    
    metadata = {
        "fileName": model_file.filename,
        "type": model._estimator_type,
        "specificType": model.__class__.__name__,
    }
    
    return metadata


@app.post("/build_schema")
async def build_schema(
    model_file: UploadFile = File(...),
    df_file: UploadFile = File(None),
):
    """
    Endpoint que recibe un modelo (.joblib) y opcionalmente un DataFrame (.pkl),
    valida, genera un DataFrame con columnas de características, registra estrategias
    en MLSchema y devuelve el esquema JSON.
    """
    # Validación y carga del modelo
    if not model_file.filename.endswith('.joblib'):
        raise HTTPException(400, "Model file must be .joblib")
    with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as tmp:
        tmp.write(await model_file.read())
        model_path = tmp.name
    model = joblib.load(model_path)
    if not isinstance(model, BaseEstimator):
        raise HTTPException(400, "Not a sklearn estimator.")
    if not (isinstance(model, ClassifierMixin) or isinstance(model, RegressorMixin)):
        raise HTTPException(400, "Model must be a classifier or regressor.")

    # Obtención de nombres de features
    if hasattr(model, 'feature_names_in_'):
        features = list(model.feature_names_in_)
    elif hasattr(model, 'get_feature_names_out'):
        features = list(model.get_feature_names_out())
    else:
        raise HTTPException(400, "No feature names found in the model.")

    # DataFrame vacío
    # Crear un DataFrame con una fila de datos no nulos y columnas igual a los nombres de las features
    base_df = pd.DataFrame([[1]*len(features)], columns=features, dtype=object)
    data_df = base_df

    # Carga opcional de DataFrame
    if df_file is not None:
        if not df_file.filename.endswith('.joblib'):
            raise HTTPException(400, "Data file must be .joblib")
        with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as tmpdf:
            tmpdf.write(await df_file.read())
            df_path = tmpdf.name
        candidate = joblib.load(df_path)
        if not isinstance(candidate, pd.DataFrame):
            raise HTTPException(400, "File does not contain a DataFrame.")
        if candidate.empty:
            raise HTTPException(400, "DataFrame is empty.")
        # Alinear columnas si es necesario
        missing_cols = set(features) - set(candidate.columns)
        if missing_cols:
            raise HTTPException(400, f"DataFrame does not contain all required columns: {missing_cols}")
        # Reordenar columnas para que coincidan con las features
        data_df = candidate[features]

    # Construcción de esquema con MLSchema
    builder = MLSchema()
    builder.register(TextStrategy())
    builder.register(NumberStrategy())
    builder.register(CategoryStrategy())
    builder.register(BooleanStrategy())
    builder.register(DateStrategy())

    schema = builder.build(data_df)

    if isinstance(model, ClassifierMixin):
        schema["reports"] = [{
            "kind": "classifier",
            "label": "Predicted class",
            "labels": [str(c) for c in model.classes_],
            "details": False,
        }]
    elif isinstance(model, RegressorMixin):
        schema["reports"] = [{
            "kind": "regressor",
            "label": "Predicted value",
        }]

    return schema

@app.post("/predict")
async def predict(
    model_file: UploadFile = File(..., media_type="application/octet-stream"),
    data: str = Form(...),
):
    """
    Recibe un multipart con:
      - model_file: fichero .joblib
      - data: JSON plano con un único registro
    Devuelve la predicción en formato dict.
    """
    # 1. Persistir y cargar el modelo
    # Si no hay filename, asumimos que es un .joblib
    filename = getattr(model_file, "filename", None)
    if filename is not None and not filename.endswith(".joblib"):
        raise HTTPException(400, "Model must be a .joblib file")

    with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as tmp:
        # Leer los bytes del archivo
        content = await model_file.read()
        tmp.write(content)
        model_path = tmp.name

    model = joblib.load(model_path)
    if not isinstance(model, BaseEstimator):
        raise HTTPException(400, "File does not contain a valid estimator")

    # 2. Parsear el JSON recibido como string
    try:
        record = json.loads(data)
        if not isinstance(record, dict):
            raise ValueError("JSON must be an object (dict) with features")
        record = coerce_record_values(record)
    except Exception as exc:
        raise HTTPException(400, f"Invalid JSON: {exc}")

    # 3. Preparar DataFrame (columnas ordenadas alfabéticamente)
    # Ordenar las columnas según el orden esperado por el modelo, si está disponible
    if hasattr(model, "feature_names_in_"):
        expected_columns = list(model.feature_names_in_)
    else:
        expected_columns = sorted(record.keys())
    df = pd.DataFrame([record], columns=expected_columns)

    # 4. Realizar la predicción
    predict_time = 0.0
    try:
        start = time.perf_counter()
        preds = model.predict(df)
        predict_time = time.perf_counter() - start
    except Exception as exc:
        raise HTTPException(500, f"Error during inference: {exc}")

    # 5. Formatear la salida según el tipo de modelo
    if isinstance(model, ClassifierMixin):
        output = {
            "outputs": [{
                "type": "classifier",
                "execution_time": predict_time,  # Placeholder for execution time
                "title": "Predicted class",
                "mapping": [str(c) for c in model.classes_],
                "probabilities": model.predict_proba(df).tolist(),
                "details": False,
            }]
        }
    elif isinstance(model, RegressorMixin):
        output = {
            "outputs": [{
                "type": "regressor",
                "execution_time": predict_time,  # Placeholder for execution time
                "title": "Predicted value",
                "values": preds.tolist(),
            }]
        }
    else:
        output = {"predictions": preds.tolist()}
    return output



@app.post("/explain")
async def explain(
    model_file: UploadFile = File(..., media_type="application/octet-stream"),
    data: str = Form(...),
    traces: str = Form(default="[]"),
):
    """
    Receives model bytes (multipart), a JSON instance dict and optional traces.
    Called exclusively by the api/ layer, which resolves the model from DB/MinIO.
    """
    # 1. Load model
    filename = getattr(model_file, "filename", None)
    if filename is not None and not filename.endswith(".joblib"):
        raise HTTPException(400, "Model must be a .joblib file")

    with tempfile.NamedTemporaryFile(suffix=".joblib", delete=False) as tmp:
        tmp.write(await model_file.read())
        model_path = tmp.name

    model = joblib.load(model_path)
    if not isinstance(model, BaseEstimator):
        raise HTTPException(400, "File does not contain a valid estimator")
    if not isinstance(model, (DecisionTreeClassifier, DecisionTreeRegressor)):
        raise HTTPException(400, f"crystal-tree requires a DecisionTree estimator, got {model.__class__.__name__}")

    # 2. Parse instance
    try:
        record = json.loads(data)
        if not isinstance(record, dict):
            raise ValueError("JSON must be an object")
        record = coerce_record_values(record)
    except Exception as exc:
        raise HTTPException(400, f"Invalid data JSON: {exc}")

    # 3. Parse traces
    try:
        traces_raw = json.loads(traces)
        if not isinstance(traces_raw, list):
            raise ValueError("traces must be a JSON array")
    except Exception as exc:
        raise HTTPException(400, f"Invalid traces JSON: {exc}")

    # 4. Build DataFrame
    if hasattr(model, "feature_names_in_"):
        expected_columns = list(model.feature_names_in_)
    else:
        expected_columns = sorted(record.keys())

    missing = set(expected_columns) - set(record.keys())
    if missing:
        raise HTTPException(400, f"Missing features: {missing}")

    instance_df = pd.DataFrame([record], columns=expected_columns)

    # 5. CrystalTree + optional traces
    ct = CrystalTree(model)
    for t in traces_raw:
        conditions = [Condition(c["operator"], c["value"]) for c in t.get("conditions", [])]
        ct.add_trace(Trace(
            t["text"],
            t["feature"],
            conditions=conditions,
            target_class=t.get("targetClass"),
        ))

    # 6. Explain
    try:
        explanations = explain_with_feature_name_aliases(ct, instance_df, expected_columns)
    except Exception as exc:
        raise HTTPException(500, f"crystal-tree explain error: {exc}")

    explanation_trees = [e.ascii_tree() for e in explanations if e is not None]
    explanation_trees = [tree for tree in explanation_trees if tree.strip()]

    if not explanation_trees:
        explanation_trees = [
            build_tree_path_explanation(model, instance_df, expected_columns)
        ]

    return {
        "explanations": explanation_trees,
    }


# Para ejecutar con HTTPS:
# uvicorn main:app --host localhost --port 8443 --ssl-certfile=./cert.pem --ssl-keyfile=./key.pem
