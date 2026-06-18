import time

from fastapi import UploadFile

from ..model_adapters import load_runtime_model_from_upload
from ..utils.dataframe import build_prediction_dataframe, parse_record_json
from ..utils.errors import internal_runtime_error


async def predict(model_upload: UploadFile, data: str) -> dict[str, object]:
    runtime = await load_runtime_model_from_upload(model_upload)
    record = parse_record_json(data, "Invalid JSON")
    frame = build_prediction_dataframe(runtime.model, record)

    if runtime.kind != "classifier" and runtime.kind != "regressor":
        raise internal_runtime_error(f"Unsupported model kind: {runtime.kind}")

    if runtime.kind == "classifier":
        try:
            started = time.perf_counter()
            probabilities = runtime.predict_classifier(frame)
            execution_time = time.perf_counter() - started
        except Exception as exc:
            raise internal_runtime_error(f"Error during inference: {exc}") from exc
        return {
            "reports": [
                {
                    "kind": "classifier",
                    "execution_time": execution_time,
                    "label": "Predicted class",
                    "mapping": runtime.class_labels(),
                    "probabilities": probabilities,
                    "showClassProbabilities": True,
                }
            ]
        }
    if runtime.kind == "regressor":
        try:
            started = time.perf_counter()
            predictions = runtime.predict_regressor(frame)
            execution_time = time.perf_counter() - started
        except Exception as exc:
            raise internal_runtime_error(f"Error during inference: {exc}") from exc

        return {
            "reports": [
                {
                    "kind": "regressor",
                    "execution_time": execution_time,
                    "label": "Predicted value",
                    "values": predictions,
                }
            ]
        }
