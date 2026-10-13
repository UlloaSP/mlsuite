import mlbundle
from fastapi import UploadFile

from ..bundles import load_bundle


def _feature_importances(bundle: mlbundle.LoadedBundle) -> list[dict[str, object]] | None:
    """Pair each importance with its feature; a model without readable structure has none."""
    structure = bundle.structure
    importances = None if structure is None else structure["feature_importances"]
    if importances is None:
        return None
    # A pipeline's importances are those of its final estimator, over the transformed features.
    names = structure.get("pipeline", {}).get("features", {}).get("names") or bundle.feature_names
    return [
        {"feature": name, "importance": importance}
        for name, importance in zip(names, importances)
        if isinstance(importance, (int, float))
    ]


async def read_metadata(upload: UploadFile) -> dict[str, object]:
    bundle = await load_bundle(upload)
    return {
        "fileName": upload.filename or "",
        "type": bundle.kind.value,
        "specificType": bundle.class_name,
        "library": bundle.library.value,
        "features": list(bundle.feature_names),
        "featureSource": bundle.feature_origin.value,
        "schema": bundle.schema,
        "manifest": bundle.manifest.model_dump(mode="json", by_alias=True),
        "featureImportances": _feature_importances(bundle),
    }
