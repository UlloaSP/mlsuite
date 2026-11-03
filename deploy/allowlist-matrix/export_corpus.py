#!/usr/bin/env python3
"""Export the bundle corpus that proves the allowlist: python export_corpus.py OUTPUT.

scikit-learn gets an environment at each end of its allowlisted range (the lower bound and the
newest release inside it), and each other model library gets one, so a widened range is covered
without touching this harness. Every package is held to its allowlisted range, so the resolver
picks the newest release MLsuite would install. Models that mlbundle refuses to export are
recorded as failures, not errors: the corpus states what can be uploaded at all.
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
# The builder's default RUNTIME_PACKAGE_MIN_AGE_DAYS.
MIN_AGE_DAYS = 14


def version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split("."))


def lower_bound(allowed: str) -> str:
    """The version a range starts at: its ">=" clause, which every package range has."""
    for clause in allowed.split(","):
        if clause.strip().startswith(">="):
            return clause.strip()[2:].strip()
    raise ValueError(f"The range {allowed!r} has no lower bound")


def environments(allowlist: dict) -> dict[str, tuple[str, list[str]]]:
    """The exporter and the requirements of each environment."""
    sklearn = allowlist["packages"]["scikit-learn"]
    found = {
        f"sk-{lower_bound(sklearn)}": ("export_sklearn.py", ["sklearn"], [f"scikit-learn=={lower_bound(sklearn)}"]),
        "sk-newest": ("export_sklearn.py", ["sklearn"], [f"scikit-learn{sklearn}"]),
    }
    for library in ("xgboost", "catboost", "onnx"):
        found[library] = (f"export_{library}.py", [library, "sklearn"] if library == "xgboost" else [library], [])
    mlbundle = max(allowlist["mlbundle"], key=version_key)
    return {
        name: (script, [f"mlbundle[{','.join([*extras, 'lock', 'schema'])}]=={mlbundle}", *pins])
        for name, (script, extras, pins) in found.items()
    }


def constraints(allowlist: dict) -> str:
    """Every package's allowlisted range, so nothing MLsuite would refuse is installed."""
    return "".join(f"{name}{allowed}\n" for name, allowed in allowlist["packages"].items())


def export(name: str, script: str, requirements: list[str], python: str, pins: Path, output: Path, work: Path) -> None:
    environment = work / name
    subprocess.run(["uv", "venv", "--quiet", "--python", python, str(environment)], check=True)
    interpreter = environment / "bin" / "python"
    subprocess.run(["uv", "pip", "install", "--quiet", "--python", str(interpreter),
                    # The builder installs no release younger than this; neither does the corpus.
                    "--exclude-newer", f"{MIN_AGE_DAYS} days",
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
