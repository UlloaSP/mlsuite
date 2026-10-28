"""What a worker does for the runtime, each command on a bundle the runtime names by path and hash."""

import hashlib
from collections import OrderedDict
from dataclasses import replace
from pathlib import Path

import mlbundle

from .rows import predict_together


class CommandError(Exception):
    def __init__(self, status: int, detail: str) -> None:
        super().__init__(detail)
        self.status = status
        self.detail = detail


class LoadedBundles:
    """Bundles this worker loaded, by SHA-256, least recently used first, bounded by artifact size."""

    def __init__(self, max_bytes: int) -> None:
        self._max_bytes = max_bytes
        self._entries: OrderedDict[str, tuple[mlbundle.LoadedBundle, int]] = OrderedDict()
        self._bytes = 0

    def get(self, path: str, sha256: str) -> mlbundle.LoadedBundle:
        entry = self._entries.get(sha256)
        if entry is not None:
            self._entries.move_to_end(sha256)
            return entry[0]
        content = Path(path).read_bytes()
        if hashlib.sha256(content).hexdigest() != sha256:
            raise CommandError(400, "Artifact does not match its SHA-256")
        bundle = _load(content)
        self._entries[sha256] = (bundle, len(content))
        self._bytes += len(content)
        while self._bytes > self._max_bytes and len(self._entries) > 1:
            _, (_, evicted) = self._entries.popitem(last=False)
            self._bytes -= evicted
        return bundle


def _load(content: bytes) -> mlbundle.LoadedBundle:
    try:
        bundle = mlbundle.load(content)
    except mlbundle.MLBundleError as error:
        raise CommandError(400, f"Cannot load bundle: {error}") from error
    # Of the structure only the family, the importances and a decision tree are read; the
    # trees of an ensemble, like the samples, can outweigh the model in memory.
    structure = bundle.structure
    if structure is not None:
        kept = ("family", "feature_importances", "pipeline")
        if structure.get("family") == "decision_tree":
            kept += ("tree",)
        structure = {key: structure[key] for key in kept if key in structure}
    return replace(bundle, structure=structure, samples=None)


def feature_importances(bundle: mlbundle.LoadedBundle) -> list[dict[str, object]] | None:
    """Pair each importance with its feature; a model without readable structure has none."""
    structure = bundle.structure
    importances = None if structure is None else structure.get("feature_importances")
    if importances is None:
        return None
    # A pipeline's importances are those of its final estimator, over the transformed features.
    names = structure.get("pipeline", {}).get("features", {}).get("names") or bundle.feature_names
    return [
        {"feature": name, "importance": importance}
        for name, importance in zip(names, importances)
        if isinstance(importance, (int, float))
    ]


def metadata(bundle: mlbundle.LoadedBundle, filename: str) -> dict[str, object]:
    """What an upload holds, read by loading it: how bundles without a lock are inspected."""
    return {
        "fileName": filename,
        "type": bundle.kind.value,
        "specificType": bundle.class_name,
        "library": bundle.library.value,
        "features": list(bundle.feature_names),
        "featureSource": bundle.feature_origin.value,
        "schema": bundle.schema,
        "manifest": bundle.manifest.model_dump(mode="json", by_alias=True),
        "featureImportances": feature_importances(bundle),
    }


def verify(bundle: mlbundle.LoadedBundle, samples: list[dict], checked: bool) -> dict[str, object]:
    """Proves the environment matches the lock and the model predicts its own samples here.

    Samples are rows keyed by feature name (mlbundle's samples.json), so they reach the predictor
    as rows, the way a batch does; without samples one row of zeros does. Either way the model's
    native code runs here once, with every library it imports.
    """
    if checked:
        try:
            mlbundle.check_environment(bundle)
        except mlbundle.MLBundleError as error:
            raise CommandError(422, f"The environment differs from the bundle's lock: {error}") from error
    names = list(bundle.feature_names)
    # A sample keeps a missing value as null; the predictor takes it as NaN.
    rows = [
        [float("nan") if sample[name] is None else sample[name] for name in names] for sample in samples
    ] or [[0.0] * len(names)]
    try:
        predict_together(bundle, rows)
    except mlbundle.MissingOptionalDependencyError as error:
        raise CommandError(
            422, f"The bundle's lock lacks a package the model needs to predict (mlbundle: {error})"
        ) from error
    except Exception as error:  # noqa: BLE001 - any failure of the model here is the finding
        raise CommandError(422, f"The model cannot predict here: {type(error).__name__}: {error}") from error
    return {"featureImportances": feature_importances(bundle), "samples": len(samples)}


def explanation_input(bundle: mlbundle.LoadedBundle, record: object) -> dict[str, object]:
    """A decision tree and the row a record becomes: what an explanation reads, as data."""
    structure = bundle.structure or {}
    if structure.get("family") != "decision_tree" or "tree" not in structure:
        raise CommandError(400, f"crystal-tree requires a DecisionTree estimator, got {bundle.class_name}")
    try:
        row = bundle.row_from_record(record)
    except mlbundle.PredictionInputError as error:
        raise CommandError(400, str(error)) from error
    labels = bundle.class_labels
    return {
        "tree": structure["tree"],
        "row": list(row),
        "featureNames": list(bundle.feature_names),
        "classLabels": None if not labels else [str(label) for label in labels[0]],
    }
