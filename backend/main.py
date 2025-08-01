import joblib
import pandas as pd
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Form
from fastapi.middleware.cors import CORSMiddleware
from sklearn.base import ClassifierMixin, RegressorMixin, BaseEstimator
from mlschema import MLSchema
from mlschema.strategies import TextStrategy, NumberStrategy, CategoryStrategy, BooleanStrategy, DateStrategy

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:8443"],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)

@app.post("/build_schema")
async def build_schema(
    model_file: UploadFile = File(...),
    df_file: UploadFile = File(None)
):
    """
    Endpoint que recibe un modelo (.joblib) y opcionalmente un DataFrame (.pkl),
    valida, genera un DataFrame con columnas de características, registra estrategias
    en MLSchema y devuelve el esquema JSON.
    """
    # Validación y carga del modelo
    if not model_file.filename.endswith('.joblib'):
        raise HTTPException(400, "El archivo de modelo debe ser .joblib")
    with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as tmp:
        tmp.write(await model_file.read())
        model_path = tmp.name
    model = joblib.load(model_path)
    if not isinstance(model, BaseEstimator):
        raise HTTPException(400, "No es un estimador de sklearn.")
    if not (isinstance(model, ClassifierMixin) or isinstance(model, RegressorMixin)):
        raise HTTPException(400, "El modelo debe ser clasificador o regresor.")

    # Obtención de nombres de features
    if hasattr(model, 'feature_names_in_'):
        features = list(model.feature_names_in_)
    elif hasattr(model, 'get_feature_names_out'):
        features = list(model.get_feature_names_out())
    else:
        raise HTTPException(400, "No hay nombres de características en el modelo.")

    # DataFrame vacío
    # Crear un DataFrame con una fila de datos no nulos y columnas igual a los nombres de las features
    base_df = pd.DataFrame([[1]*len(features)], columns=features, dtype=object)
    data_df = base_df

    # Carga opcional de DataFrame
    if df_file:
        if not df_file.filename.endswith('.pkl'):
            raise HTTPException(400, "El archivo de datos debe ser .pkl")
        with tempfile.NamedTemporaryFile(suffix='.pkl', delete=False) as tmpdf:
            tmpdf.write(await df_file.read())
            df_path = tmpdf.name
        candidate = pd.read_pickle(df_path)
        if not isinstance(candidate, pd.DataFrame):
            raise HTTPException(400, "El archivo no contiene un DataFrame.")
        data_df = candidate

    # Construcción de esquema con MLSchema
    builder = MLSchema()
    builder.register(TextStrategy())
    builder.register(NumberStrategy())
    builder.register(CategoryStrategy())
    builder.register(BooleanStrategy())
    builder.register(DateStrategy())

    schema = builder.build(data_df)
    return schema


@app.post("/predict")
async def predict(
    model_file: UploadFile = File(...),
    data: str = Form(...)
):
    """
    Endpoint para realizar predicciones con un modelo sklearn (.joblib)
    y un solo registro en JSON (como campo de formulario). Devuelve las predicciones en JSON.
    Las features se ordenan alfabéticamente para garantizar consistencia.
    """
    import json
    # Validación y carga del modelo
    if not model_file.filename.endswith('.joblib'):
        raise HTTPException(400, "El modelo debe ser .joblib")
    with tempfile.NamedTemporaryFile(suffix='.joblib', delete=False) as tmpm:
        tmpm.write(await model_file.read())
        model_path = tmpm.name
    model = joblib.load(model_path)
    if not isinstance(model, BaseEstimator):
        raise HTTPException(400, "No es un estimador sklearn.")

    # Parsear JSON de datos
    try:
        record = json.loads(data)
        if not isinstance(record, dict):
            raise ValueError("El JSON debe ser un objeto/dict con comillas dobles válidas.")
    except Exception as e:
        raise HTTPException(400, f"Error al parsear JSON de datos: {e}")

    # Ordenar features alfabéticamente
    sorted_keys = sorted(record.keys())
    ordered_record = {k: record[k] for k in sorted_keys}

    # Crear DataFrame
    input_df = pd.DataFrame([ordered_record], columns=sorted_keys)
    if input_df.empty:
        raise HTTPException(400, "El registro está vacío o mal formado.")

    # Realizar predicción
    try:
        preds = model.predict(input_df)
    except Exception as e:
        raise HTTPException(500, f"Error en predicción: {e}")

    if isinstance(model, ClassifierMixin):
        output = {
            "outputs": [
                {
                    "type": "classifier",
                    "title": "Predicted class",
                    "mapping": model.classes_.tolist(),
                    "probabilities": model.predict_proba(input_df).tolist(),
                    "details": True,
                }
            ]
        }

    elif isinstance(model, RegressorMixin):
        output = {
            "outputs": [
                {
                    "type": "regressor",
                    "title": "Predicted value",
                    "values": preds.tolist(),
                }
            ]
        }
    
    print(output)
    return output



# Para ejecutar con HTTPS:
# uvicorn main:app --host localhost --port 8443 --ssl-certfile=./cert.pem --ssl-keyfile=./key.pem
