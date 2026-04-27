import time

from fastapi import UploadFile
from sklearn.base import ClassifierMixin, RegressorMixin

from .model_service import load_estimator_from_upload
from ..utils.dataframe import build_prediction_dataframe, parse_record_json
from ..utils.errors import internal_runtime_error


async def predict(model_upload: UploadFile, data: str) -> dict[str, object]:
    model = await load_estimator_from_upload(model_upload)
    record = parse_record_json(data, "Invalid JSON")
    frame = build_prediction_dataframe(model, record)

    if isinstance(model, ClassifierMixin):
        try:
            started = time.perf_counter()
            probabilities = model.predict_proba(frame)
            execution_time = time.perf_counter() - started
        except Exception as exc:  # pragma: no cover - sklearn runtime failure path
            raise internal_runtime_error(f"Error during inference: {exc}") from exc
        return {
            "outputs": [{
                "type": "classifier",
                "execution_time": execution_time,
                "title": "Predicted class",
                "mapping": [str(item) for item in model.classes_],
                "probabilities": probabilities.tolist(),
                "details": False,
            }]
        }

    try:
        started = time.perf_counter()
        predictions = model.predict(frame)
        execution_time = time.perf_counter() - started
    except Exception as exc:  # pragma: no cover - sklearn runtime failure path
        raise internal_runtime_error(f"Error during inference: {exc}") from exc

    if isinstance(model, RegressorMixin):
        return {
            "outputs": [{
                "type": "regressor",
                "execution_time": execution_time,
                "title": "Predicted value",
                "values": predictions.tolist(),
            }]
        }
    return {"predictions": predictions.tolist()}
