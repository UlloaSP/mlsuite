import joblib
import json
import time
import pandas as pd
import tempfile
from fastapi import FastAPI, UploadFile, Request, File, HTTPException, Body, Form
from fastapi.middleware.cors import CORSMiddleware
from sklearn.base import ClassifierMixin, RegressorMixin, BaseEstimator
from mlschema import MLSchema
from mlschema.strategies import TextStrategy, NumberStrategy, CategoryStrategy, BooleanStrategy, DateStrategy

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:8443", "http://localhost:8443"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

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
    
        schema["outputs"] = [{
            "type": "classifier",  # Placeholder for execution time
            "title": "Predicted class",
            "mapping": [str(c) for c in model.classes_],
            "details": False,
        }]
    
    elif isinstance(model, RegressorMixin):
        schema["outputs"] = [{
                "type": "regressor",
                "title": "Predicted value",
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



# Para ejecutar con HTTPS:
# uvicorn main:app --host localhost --port 8443 --ssl-certfile=./cert.pem --ssl-keyfile=./key.pem
