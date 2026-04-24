# AGENTS.md

This file extends `../AGENTS.md`.
Read root first, then this file for work inside `backend/`.
If this file conflicts with root, this file wins for `backend/`.

## Scope
- Applies to all files under `backend/`.
- Covers Python ML runtime and execution-path integration.

## Stack And Tools
- Python 3.14+.
- FastAPI runtime.
- `uv` for environment and command execution.
- Runtime dependencies are defined in `pyproject.toml`.

## Tooling Commands
- Use `uv sync` to install backend dependencies.
- Use `uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload` for local runtime work.
- Prefer `uv` commands over ad hoc package-manager or interpreter alternatives in this subtree.
- Prefer narrow runtime verification relevant to touched endpoints or flows.
- If no test harness exists or verification cannot run, report exact command attempted and exact blocker.

## Architecture Rules
- Preserve ML execution-path correctness.
- Runtime behavior must stay aligned with API contract.
- Keep model, prediction, explanation, and feedback flows stable unless task explicitly changes them.
- Do not add compatibility shims for removed behavior unless contract explicitly requires them.
- Keep runtime logic clear enough that execution-path ownership is obvious.

## File Size Rule
- `main.py` is already beyond or near repo line-limit expectations.
- Any further non-trivial edit to runtime logic must split code into smaller modules before growing it.
