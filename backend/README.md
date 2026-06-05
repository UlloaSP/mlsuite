# Backend - MLSuite

Runtime FastAPI para metadata, schema, predict y explain.

## Install

```bash
uv sync --extra dev
```

## Run

```bash
PYTHON_HOST=0.0.0.0 PYTHON_PORT=8000 CORS_ALLOW_ORIGINS=http://localhost:8080 uv run python -m mlsuite_backend
```

## Test

```bash
uv run pytest tests/test_runtime_api.py
```

## Endpoints

- `GET /health`
- `POST /metadata`
- `POST /build_schema`
- `POST /predict`
- `POST /explain`
