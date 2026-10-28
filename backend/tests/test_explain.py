import json


from tests.client import client
from tests.helpers import (
    make_classifier,
    make_decimal_tree,
    make_tree,
    make_tree_with_unused_tail_feature,
    run_request,
    serialize_bundle,
)



def _explain(model: object, record: dict[str, object], traces: str = "[]"):
    upload = serialize_bundle(model)
    return client.post("/explain", **run_request(upload, data=json.dumps(record), traces=traces))


def test_explain_success() -> None:
    response = _explain(make_tree(), {"age": 40, "income": 55_000})
    assert response.status_code == 200
    assert response.json()["reports"][0]["explanation"] == (
        "  *\n  |__Predicted class 0 for instance 0 (100 probability)\n  |  |__income <= 57500.0\n"
    )


def test_explain_keeps_decimal_inputs_exact() -> None:
    response = _explain(make_decimal_tree(), {"ratio": 0.19})
    assert response.status_code == 200
    explanation = response.json()["reports"][0]["explanation"]
    assert "Predicted class 0" in explanation
    assert "ratio <= 0.19" in explanation


def test_explain_success_when_tree_does_not_use_tail_features() -> None:
    record = {"age": 40, "income": 55_000, "unused": 7}
    response = _explain(make_tree_with_unused_tail_feature(), record)
    assert response.status_code == 200
    assert "income <= 57500.0" in response.json()["reports"][0]["explanation"]


def test_explain_rejects_non_tree_model() -> None:
    response = _explain(make_classifier(), {"age": 40, "income": 55_000})
    assert response.status_code == 400
    assert "DecisionTree estimator" in response.json()["detail"]


def test_explain_rejects_invalid_traces_json() -> None:
    response = _explain(make_tree(), {"age": 40, "income": 55_000}, traces="{bad")
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid traces JSON:")


def test_explain_rejects_invalid_trace_shape() -> None:
    traces = json.dumps([{"text": "old", "conditions": [{"value": 1}]}])
    response = _explain(make_tree(), {"age": 40, "income": 55_000}, traces=traces)
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid traces JSON:")


def test_explain_rejects_custom_traces() -> None:
    traces = json.dumps([{"text": "Predicted %_class", "feature": "prediction"}])
    response = _explain(make_tree(), {"age": 40, "income": 55_000}, traces=traces)
    assert response.status_code == 400
    assert response.json()["detail"] == "Custom traces are not supported by crystal-tree 0.3"


def test_explain_rejects_missing_features() -> None:
    response = _explain(make_tree(), {"age": 40})
    assert response.status_code == 400
    assert "Missing features" in response.json()["detail"]


def test_explain_falls_back_when_crystal_tree_returns_none(monkeypatch) -> None:
    import mlsuite_backend.services.explanation_service as explanation_service

    monkeypatch.setattr(explanation_service, "explain_tree", lambda *_args, **_kwargs: [])
    response = _explain(make_tree(), {"age": 40, "income": 55_000})
    assert response.status_code == 200
    assert response.json()["reports"][0]["explanation"].startswith("Prediction path")
