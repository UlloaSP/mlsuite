# Backend - MLSuite

API FastAPI para manejo de modelos de machine learning.

## Instalación

```bash
uv sync
```

## Desarrollo

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

- **GET /health** - Verifica el estado del servicio
- **POST /metadata** - Extrae metadatos de un modelo sklearn
- **POST /build_schema** - Genera esquema MLSchema
- **POST /predict** - Realiza predicciones con el modelo
