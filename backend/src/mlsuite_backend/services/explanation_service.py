import pandas as pd
from fastapi import UploadFile

from .. import artifacts
from ..execution import run_explanation
from ..utils.crystal_tree import build_tree_path_explanation, explain_tree, require_no_traces
from ..utils.errors import internal_runtime_error
from ..utils.records import parse_record_json
from . import runs


async def explain(
    artifact_sha256: str, environment: str, model_upload: UploadFile | None, data: str, traces: str
) -> dict[str, list[dict[str, str]]]:
    runs.environment(environment)
    path = await artifacts.resolve(artifact_sha256, model_upload)
    record = parse_record_json(data, "Invalid data JSON")
    require_no_traces(traces)
    tree = await runs.run(environment, "explanation_input", path, artifact_sha256, record=record)
    return await run_explanation(_explain, tree)


def _explain(source: dict[str, object]) -> dict[str, list[dict[str, str]]]:
    tree, row, names = source["tree"], source["row"], source["featureNames"]
    frame = pd.DataFrame([row], columns=names)
    try:
        trees = explain_tree(tree, frame)
    except Exception as exc:  # pragma: no cover - third-party runtime failure path
        raise internal_runtime_error(f"crystal-tree explain error: {exc}") from exc
    if not trees:
        trees = [build_tree_path_explanation(tree, row, names, source["classLabels"])]
    return {"reports": [{"kind": "Crystal Tree", "explanation": "\n\n".join(trees)}]}
