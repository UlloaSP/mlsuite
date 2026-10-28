"""The worker's own code, run in this process: its bundle cache, row answers and checks."""

import hashlib
import math

import mlbundle
import pytest
from mlbundle.results import LoadedBundle

from mlsuite_worker import commands, rows
from mlsuite_worker.commands import CommandError, LoadedBundles, explanation_input, verify
from tests.helpers import make_classifier, make_regressor, make_tree, serialize_bundle


def _saved(tmp_path, model, **export) -> tuple[str, str]:
    content = serialize_bundle(model, **export)[1].getvalue()
    path = tmp_path / f"{hashlib.sha256(content).hexdigest()}.mlbundle"
    path.write_bytes(content)
    return str(path), hashlib.sha256(content).hexdigest()


def test_loaded_bundles_are_bounded_by_artifact_size_least_recently_used_first(tmp_path, monkeypatch) -> None:
    loads = []
    monkeypatch.setattr(commands, "_load", lambda content: loads.append(content) or object())
    held = LoadedBundles(max_bytes=10)
    files = {}
    for name in ("a", "b", "c"):
        content = name.encode() * 4
        path = tmp_path / name
        path.write_bytes(content)
        files[name] = (str(path), hashlib.sha256(content).hexdigest())

    first = held.get(*files["a"])
    held.get(*files["b"])
    assert held.get(*files["a"]) is first
    held.get(*files["c"])
    held.get(*files["b"])

    assert len(loads) == 4  # b was evicted, so loaded again; a was not.


def test_a_bundle_whose_bytes_do_not_match_its_hash_is_refused(tmp_path) -> None:
    path, _ = _saved(tmp_path, make_regressor())

    with pytest.raises(CommandError) as refused:
        LoadedBundles(1024 * 1024).get(path, "0" * 64)

    assert (refused.value.status, refused.value.detail) == (400, "Artifact does not match its SHA-256")


def test_a_record_that_breaks_the_model_fails_alone(tmp_path, monkeypatch) -> None:
    bundle = LoadedBundles(1024 * 1024).get(*_saved(tmp_path, make_tree()))
    records = [{"age": 30 + age, "income": 40_000} for age in range(4)]
    alone = [rows.predict_rows(bundle, [record])[0] for record in records]
    predict_record = LoadedBundle.predict_record

    def together(*_args: object) -> object:
        raise RuntimeError("the vectorized call failed")

    def breaks_on_age_32(self: LoadedBundle, record: dict) -> object:
        if record["age"] == 32:
            raise RuntimeError("model blew up")
        return predict_record(self, record)

    monkeypatch.setattr(rows, "predict_together", together)
    monkeypatch.setattr(LoadedBundle, "predict_record", breaks_on_age_32)
    answers = rows.predict_rows(bundle, records)

    assert answers[2] == {"error": {"status": 500, "detail": "Error during inference: model blew up"}}
    without_time = [[{k: v for k, v in r.items() if k != "execution_time"} for r in a["reports"]] for a in answers[:2]]
    assert without_time == [[{k: v for k, v in r.items() if k != "execution_time"} for r in a["reports"]] for a in alone[:2]]


def test_verify_predicts_the_samples_as_rows_by_feature_name(tmp_path, monkeypatch) -> None:
    bundle = LoadedBundles(1024 * 1024).get(*_saved(tmp_path, make_classifier()))
    predicted = []
    monkeypatch.setattr(commands, "predict_together", lambda _bundle, rows: predicted.append(rows))

    verify(bundle, [{"income": 50_000, "age": 40}, {"income": None, "age": 41}], checked=False)
    verify(bundle, [], checked=False)

    assert predicted[0][0] == [40, 50_000]
    assert predicted[0][1][0] == 41 and math.isnan(predicted[0][1][1])
    assert predicted[1] == [[0.0, 0.0]]


def test_verify_fails_when_the_model_cannot_predict_here(tmp_path, monkeypatch) -> None:
    bundle = LoadedBundles(1024 * 1024).get(*_saved(tmp_path, make_classifier()))

    def broken(*_args: object) -> None:
        raise RuntimeError("illegal state")

    monkeypatch.setattr(commands, "predict_together", broken)
    with pytest.raises(CommandError) as refused:
        verify(bundle, [], checked=False)

    assert (refused.value.status, refused.value.detail) == (422, "The model cannot predict here: RuntimeError: illegal state")


def test_verify_names_a_package_the_lock_lacks(tmp_path, monkeypatch) -> None:
    bundle = LoadedBundles(1024 * 1024).get(*_saved(tmp_path, make_classifier()))

    def without_pandas(*_args: object) -> None:
        raise mlbundle.MissingOptionalDependencyError("Install this feature with pip install pandas.")

    monkeypatch.setattr(commands, "predict_together", without_pandas)
    with pytest.raises(CommandError) as refused:
        verify(bundle, [], checked=False)

    assert refused.value.detail.startswith("The bundle's lock lacks a package the model needs to predict")


def test_verify_checks_the_environment_against_the_lock(tmp_path) -> None:
    bundle = LoadedBundles(1024 * 1024).get(*_saved(tmp_path, make_classifier()))

    with pytest.raises(CommandError) as refused:
        verify(bundle, [], checked=True)

    assert refused.value.status == 422
    assert isinstance(refused.value.__cause__, mlbundle.EnvironmentMismatchError)


def test_an_explanation_reads_a_decision_tree_as_data(tmp_path) -> None:
    tree = make_tree()
    bundle = LoadedBundles(1024 * 1024).get(*_saved(tmp_path, tree))

    source = explanation_input(bundle, {"age": 40, "income": 55_000})

    assert source["tree"]["children_left"] == tree.tree_.children_left.tolist()
    assert source["tree"]["threshold"] == tree.tree_.threshold.tolist()
    assert source["row"] == [40.0, 55_000.0]
    assert source["featureNames"] == ["age", "income"]
    assert source["classLabels"] == ["0", "1"]
