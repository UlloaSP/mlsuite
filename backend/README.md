# Backend - MLSuite

Runtime FastAPI para metadata, schema, predict y explain.

## Install

```bash
uv sync --extra dev
```

## Run

```bash
uv run uvicorn mlsuite_backend.main:app --host 0.0.0.0 --port 8000 --reload
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
