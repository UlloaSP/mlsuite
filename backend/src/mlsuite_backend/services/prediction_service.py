import time

from fastapi import HTTPException, UploadFile

from ..model_adapters import load_runtime_model_from_upload
from ..utils.dataframe import build_prediction_dataframe, parse_record_json
from ..utils.errors import internal_runtime_error


async def predict(model_upload: UploadFile, data: str) -> dict[str, object]:
    runtime = await load_runtime_model_from_upload(model_upload)
    record = parse_record_json(data, "Invalid JSON")
    frame = build_prediction_dataframe(runtime.feature_metadata(), record)

    try:
        started = time.perf_counter()
        output = runtime.predict(frame)
        execution_time = time.perf_counter() - started
    except HTTPException:
        raise
    except Exception as exc:
        raise internal_runtime_error(f"Error during inference: {exc}") from exc

    if runtime.kind == "classifier":
        report = {
            "kind": "classifier",
            "execution_time": execution_time,
            "label": "Predicted class",
            "mapping": runtime.class_labels(),
            "probabilities": output,
            "showClassProbabilities": True,
        }
    else:
        report = {
            "kind": "regressor",
            "execution_time": execution_time,
            "label": "Predicted value",
            "values": output,
        }
    return {"reports": [report]}
