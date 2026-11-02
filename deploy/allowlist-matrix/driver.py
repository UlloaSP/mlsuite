"""Runs the corpus against the runtime and the builder, as the API would: python driver.py CORPUS.

Each bundle is inspected, its environment built, the model verified there, and every recorded
test case predicted alone and as one batch, then compared with what the model predicted where it
was trained. Labels must match exactly and numbers up to the last digits: the same libraries take
their sums in another order on a CPU without AVX.
"""

from __future__ import annotations

import base64
import hashlib
import json
import math
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

RUNTIME = "http://py-analyzer:8000"
BUILDER = "http://runtime-builder:8001"
BUILD_TIMEOUT_SECONDS = 1800
RUN_TIMEOUT_SECONDS = 600
FLOAT64_TOLERANCE = 1e-14
# ONNX models compute in float32.
FLOAT32_TOLERANCE = 2e-6


def post(url: str, body: bytes, content_type: str, timeout: float) -> tuple[int, str]:
    request = urllib.request.Request(url, data=body, headers={"Content-Type": content_type})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()


def post_form(url: str, fields: dict[str, str], timeout: float = RUN_TIMEOUT_SECONDS) -> tuple[int, str]:
    return post(url, urllib.parse.urlencode(fields).encode(), "application/x-www-form-urlencoded", timeout)


def post_json(url: str, payload: dict, timeout: float) -> tuple[int, str]:
    return post(url, json.dumps(payload).encode(), "application/json", timeout)


def post_file(url: str, content: bytes) -> tuple[int, str]:
    boundary = uuid.uuid4().hex
    head = (f'--{boundary}\r\nContent-Disposition: form-data; name="model_file"; filename="model.mlbundle"\r\n'
            "Content-Type: application/octet-stream\r\n\r\n").encode()
    return post(url, head + content + f"\r\n--{boundary}--\r\n".encode(),
                f"multipart/form-data; boundary={boundary}", RUN_TIMEOUT_SECONDS)


def close(actual: list[float], expected: list[float], tolerance: float) -> bool:
    return len(actual) == len(expected) and all(
        math.isclose(a, e, rel_tol=tolerance, abs_tol=0.0) for a, e in zip(actual, expected))


def compare(reports: list[dict], expected: list[dict], tolerance: float) -> tuple[str | None, bool]:
    """The first difference that matters, if any, and whether every number matched exactly."""
    if len(reports) != len(expected):
        return f"{len(reports)} reports for {len(expected)} outputs", False
    exact = True
    for report, want in zip(reports, expected):
        if report["output"] != want["output"] or report["kind"] != want["kind"]:
            return f"output {report['output']}/{report['kind']} != {want['output']}/{want['kind']}", False
        if want["kind"] == "classifier":
            if report["mapping"] != want["labels"]:
                return f"labels {report['mapping']} != {want['labels']}", False
            if report["prediction"] != want["predicted_label"]:
                return f"prediction {report['prediction']} != {want['predicted_label']}", False
            actual, wanted = report["probabilities"], want["probabilities"]
        else:
            actual, wanted = report["values"], [want["value"]]
        if not close(actual, wanted, tolerance):
            return f"numbers {actual} != {wanted}", False
        exact = exact and actual == wanted
    return None, exact


def check(bundle: dict, corpus: Path) -> tuple[str | None, bool]:
    """The first problem with one bundle, if any, and whether it reproduced exactly."""
    content = (corpus / bundle["path"]).read_bytes()
    status, text = post_file(f"{RUNTIME}/metadata", content)
    if status != 200:
        return f"metadata answered {status}: {text[:500]}", False
    environment = json.loads(text)["environment"]
    key = environment["key"]
    status, text = post_json(f"{BUILDER}/environments", {
        "key": key, "writerVersion": environment["writerVersion"],
        "lock": base64.b64encode(environment["lock"].encode()).decode()}, BUILD_TIMEOUT_SECONDS)
    if status != 200:
        return f"build answered {status}: {text[:500]}", False
    form = {"artifact_sha256": hashlib.sha256(content).hexdigest(), "environment": key}
    status, text = post_form(f"{RUNTIME}/verify", form)
    if status != 200:
        return f"verify answered {status}: {text[:500]}", False
    tolerance = FLOAT32_TOLERANCE if bundle["library"] == "onnx" else FLOAT64_TOLERANCE
    exact = True
    cases = bundle["tests"]
    for case in cases:
        status, text = post_form(f"{RUNTIME}/predict", {**form, "data": json.dumps(case["record"])})
        if status != 200:
            return f"predict answered {status}: {text[:500]}", False
        problem, same = compare(json.loads(text)["reports"], case["expected"], tolerance)
        if problem:
            return problem, False
        exact = exact and same
    status, text = post_form(f"{RUNTIME}/predict/batch",
                             {**form, "data": json.dumps([case["record"] for case in cases])})
    if status != 200:
        return f"batch answered {status}: {text[:500]}", False
    for row, case in zip(json.loads(text)["rows"], cases):
        if row.get("error"):
            return f"batch row: {row['error']}", False
        problem, same = compare(row["reports"], case["expected"], tolerance)
        if problem:
            return f"batch {problem}", False
        exact = exact and same
    return None, exact


def main() -> None:
    corpus = Path(sys.argv[1])
    bundles = json.loads((corpus / "corpus.json").read_text(encoding="utf-8"))["bundles"]
    failed = exact = 0
    for bundle in bundles:
        started = time.perf_counter()
        try:
            problem, same = check(bundle, corpus)
        except OSError as error:
            problem, same = f"{type(error).__name__}: {error}", False
        exact += same
        failed += problem is not None
        print("FAIL" if problem else "OK  " if same else "NEAR", bundle["id"],
              f"{time.perf_counter() - started:.1f}s", problem or "", flush=True)
    near = len(bundles) - exact - failed
    print(f"{len(bundles)} bundles: {exact} exact, {near} within the last digits, {failed} failed")
    sys.exit(1 if failed or not bundles else 0)


if __name__ == "__main__":
    main()
