# AGENTS.md

Extends `../AGENTS.md`. Scope: `backend/**`.

- Stack: Py3.14+, FastAPI, `uv`.
- Run: `uv sync`; `uv run uvicorn mlsuite_backend.main:app --host 0.0.0.0 --port 8000 --reload`.
- Test: `uv run pytest tests/test_runtime_api.py`.
- Truth: preserve runtime execution-path + `api/` contract.
- Architecture: routers thin; services own load/schema/predict/explain; share parsing/coercion; keep model/prediction/explanation/feedback flows stable.
- No compat shims unless contract needs them.
- Verify narrow first; if blocked, report exact cmd + blocker.
- Split before 300 lines.
