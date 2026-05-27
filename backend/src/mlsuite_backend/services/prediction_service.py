import time

from fastapi import UploadFile

from ..model_adapters import load_runtime_model_from_upload
from ..utils.dataframe import build_prediction_dataframe, parse_record_json
from ..utils.errors import internal_runtime_error


async def predict(model_upload: UploadFile, data: str) -> dict[str, object]:
    runtime = await load_runtime_model_from_upload(model_upload)
    record = parse_record_json(data, "Invalid JSON")
    frame = build_prediction_dataframe(runtime.model, record)

    if runtime.kind == "classifier":
        try:
            started = time.perf_counter()
            probabilities = runtime.predict_classifier(frame)
            execution_time = time.perf_counter() - started
        except Exception as exc:  # pragma: no cover - model runtime failure path
            raise internal_runtime_error(f"Error during inference: {exc}") from exc
        return {
            "outputs": [{
                "type": "classifier",
                "execution_time": execution_time,
                "title": "Predicted class",
                "mapping": runtime.class_labels(),
                "probabilities": probabilities,
                "showClassProbabilities": True,
            }]
        }

    try:
        started = time.perf_counter()
        predictions = runtime.predict_regressor(frame)
        execution_time = time.perf_counter() - started
    except Exception as exc:  # pragma: no cover - model runtime failure path
        raise internal_runtime_error(f"Error during inference: {exc}") from exc

    if runtime.kind == "regressor":
        return {
            "outputs": [{
                "type": "regressor",
                "execution_time": execution_time,
                "title": "Predicted value",
                "values": predictions,
            }]
        }
    return {"predictions": predictions}
