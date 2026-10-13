import time

import mlbundle
from fastapi import UploadFile

from ..bundles import load_bundle
from ..utils.errors import bad_request, internal_runtime_error
from ..utils.records import parse_record_json


async def predict(model_upload: UploadFile, data: str) -> dict[str, object]:
    bundle = await load_bundle(model_upload)
    record = parse_record_json(data, "Invalid JSON")

    try:
        started = time.perf_counter()
        predictions = bundle.predict_record(record)
        execution_time = time.perf_counter() - started
    except mlbundle.PredictionInputError as exc:
        raise bad_request(str(exc)) from exc
    except Exception as exc:
        raise internal_runtime_error(f"Error during inference: {exc}") from exc

    # One answer per model output, named by the position the schema's report maps to.
    reports = []
    for prediction in predictions:
        report = {
            "kind": prediction.kind.value,
            "output": prediction.output,
            "execution_time": execution_time,
        }
        if prediction.labels is None:
            report["values"] = [prediction.value]
        else:
            report["mapping"] = prediction.labels
            report["probabilities"] = prediction.probabilities
            report["prediction"] = prediction.predicted_label
        reports.append(report)
    return {"reports": reports}
