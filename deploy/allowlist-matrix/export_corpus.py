#!/usr/bin/env python3
"""Export the bundle corpus that proves the allowlist: python export_corpus.py OUTPUT.

Each scikit-learn version the allowlist grants gets an environment, and so does each other model
library, so a version added there is covered without touching this harness. Every other package
is held to its allowlisted version: a model trained on anything newer would be refused on upload.
Models that mlbundle refuses to export are recorded as failures, not errors: the corpus states
what can be uploaded at all.
"""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import tomllib


HERE = Path(__file__).resolve().parent
ALLOWLIST = HERE.parents[1] / "backend" / "environment-allowlist.toml"


def version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split("."))


def environments(allowlist: dict) -> dict[str, tuple[str, list[str]]]:
    """The exporter and the requirements of each environment."""
    packages = allowlist["packages"]
    found = {
        f"sk-{version}": ("export_sklearn.py", ["sklearn"], [f"scikit-learn=={version}"])
        for version in packages["scikit-learn"]
    }
    for library in ("xgboost", "catboost", "onnx"):
        found[library] = (f"export_{library}.py", [library, "sklearn"] if library == "xgboost" else [library], [])
    mlbundle = max(allowlist["mlbundle"], key=version_key)
    return {
        name: (script, [f"mlbundle[{','.join([*extras, 'lock', 'schema'])}]=={mlbundle}", *pins])
        for name, (script, extras, pins) in found.items()
    }


def constraints(allowlist: dict) -> str:
    """Pins for every package with one allowlisted version; environments pin the others."""
    pins = [f"{name}=={versions[0]}" for name, versions in allowlist["packages"].items() if len(versions) == 1]
    return "\n".join(pins) + "\n"


def export(name: str, script: str, requirements: list[str], python: str, pins: Path, output: Path, work: Path) -> None:
    environment = work / name
    subprocess.run(["uv", "venv", "--quiet", "--python", python, str(environment)], check=True)
    interpreter = environment / "bin" / "python"
    subprocess.run(["uv", "pip", "install", "--quiet", "--python", str(interpreter),
                    "--constraint", str(pins), *requirements], check=True)
    subprocess.run([str(interpreter), str(HERE / script), name, str(output)], check=True)


def merge(output: Path, names: list[str]) -> dict:
    results = [json.loads((output / "results" / f"{name}.json").read_text(encoding="utf-8")) for name in names]
    return {
        "bundles": [bundle for result in results for bundle in result["bundles"]],
        "failures": [failure | {"id": f"{result['env']}/{failure['id']}"}
                     for result in results for failure in result["failures"]],
    }


def main() -> None:
    output = Path(sys.argv[1]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    allowlist = tomllib.loads(ALLOWLIST.read_text(encoding="utf-8"))
    python = max(allowlist["python"], key=version_key)
    found = environments(allowlist)
    with tempfile.TemporaryDirectory() as directory:
        work = Path(directory)
        pins = work / "constraints.txt"
        pins.write_text(constraints(allowlist), encoding="utf-8")
        for name, (script, requirements) in found.items():
            export(name, script, requirements, python, pins, output, work)
    corpus = merge(output, list(found))
    (output / "corpus.json").write_text(json.dumps(corpus, indent=1), encoding="utf-8")
    print(f"{len(corpus['bundles'])} bundles, {len(corpus['failures'])} models mlbundle refused")


if __name__ == "__main__":
    main()
