# MLSchema 0.2.0 Backend Contract Fix

## Goal
- [x] Keep `mlschema==0.2.0` in backend.
- [x] Use `infer_schema(df)` for field generation.
- [x] Return runtime API shape `{ fields, reports }`.
- [x] Recreate classifier/regressor reports from runtime model metadata.
- [x] Verify backend tests, line cap, graph update.

## Plan
- [x] Restore backend-owned report builder.
- [x] Wrap inferred fields into `{ fields, reports }`.
- [x] Update router annotation and tests.
- [x] Run focused and full backend tests.
- [x] Update graph and review notes.

## Review
- `mlschema==0.2.0` remains locked; old `MLSchema()` facade and strategy registration removed.
- `/build_schema` again returns `{ fields, reports }`.
- `fields` comes from `infer_schema(data_frame)`.
- `reports` is backend-created from runtime model metadata: classifier labels/probabilities or regressor value.
- Generated fallback dataframe no longer forces `dtype=object`, so inferred positional fields stay `number`.
- Verification passed:
  - `uv run pytest tests/test_runtime_api.py` -> 25 passed.
  - `uv run pytest` -> 35 passed, 2 existing sklearn warnings.
  - backend Python line cap -> no files over 300 lines.
  - `git diff --check` -> passed with CRLF warnings only.
  - `graphify update .` -> 7365 nodes, 14362 edges, 362 communities.
