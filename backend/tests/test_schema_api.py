import pandas as pd
from fastapi.testclient import TestClient

from mlsuite_backend.main import app
from tests.helpers import make_classifier, make_onehot_classifier, serialize_joblib

client = TestClient(app)


def test_build_schema_accepts_custom_onehot_separator() -> None:
    frame = pd.DataFrame(
        {
            "color_red": [1, 0],
            "color_blue": [0, 1],
            "size": [10, 20],
        }
    )
    response = client.post(
        "/build_schema",
        files={
            "model_file": serialize_joblib(make_onehot_classifier(), "model.joblib"),
            "df_file": serialize_joblib(frame, "data.joblib"),
        },
        data={"onehot_separator": "_"},
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["fields"][0] == {
        "label": "color",
        "required": True,
        "kind": "onehot-category",
        "options": [
            {"label": "red", "value": "red", "mappedTo": "color_red"},
            {"label": "blue", "value": "blue", "mappedTo": "color_blue"},
        ],
    }


def test_build_schema_rejects_empty_onehot_separator() -> None:
    response = client.post(
        "/build_schema",
        files={
            "model_file": serialize_joblib(make_classifier(), "model.joblib"),
        },
        data={"onehot_separator": ""},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "One-hot separator cannot be empty."


def test_build_schema_emits_mlform_series_columns() -> None:
    frame = pd.DataFrame({"age": [(1, 2), (3, 4)], "income": [20000, 45000]})
    response = client.post(
        "/build_schema",
        files={
            "model_file": serialize_joblib(make_classifier(), "model.joblib"),
            "df_file": serialize_joblib(frame, "data.joblib"),
        },
    )
    assert response.status_code == 200
    field = response.json()["fields"][0]
    assert field["kind"] == "series"
    assert field["mappedTo"] == "age"
    assert "field1" not in field and "field2" not in field
    assert [column["id"] for column in field["columns"]] == ["field1", "field2"]
    assert [column["kind"] for column in field["columns"]] == ["number", "number"]
    assert all("mappedTo" not in column for column in field["columns"])
