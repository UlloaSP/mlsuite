"""A model worker: runs inside one environment, serving the runtime one request at a time.

The runtime starts it as `<environment>/bin/python -I <this file>`, so nothing outside the
environment and this package is importable, and it imports nothing but the standard library and
the environment's mlbundle: a built environment holds exactly its lock, which check_environment
verifies. Requests and answers are JSON lines on stdin and on the stdout the worker started with;
everything else the model libraries print goes to stderr, so it cannot corrupt an answer.
"""

import json
import os
import sys
from pathlib import Path

# -I leaves this file's directory off sys.path; the package is found next to it.
_SOURCE = str(Path(__file__).resolve().parents[1])
sys.path.insert(0, _SOURCE)

from mlsuite_worker.commands import (  # noqa: E402
    CommandError,
    LoadedBundles,
    explanation_input,
    metadata,
    verify,
)
from mlsuite_worker.rows import predict_rows  # noqa: E402

# Gone once imported: the runtime's own source (and its distribution metadata) must not count as
# installed in the environment check_environment compares with the lock.
sys.path.remove(_SOURCE)


def _handle(bundles: LoadedBundles, request: dict) -> object:
    import mlbundle

    bundle = bundles.get(request["path"], request["sha256"])
    match request["op"]:
        case "predict":
            return predict_rows(bundle, request["records"])
        case "verify":
            samples = mlbundle.inspect(request["path"]).samples or []
            return verify(bundle, list(samples), request["checked"])
        case "metadata":
            return metadata(bundle, request["filename"])
        case "explanation_input":
            return explanation_input(bundle, request["record"])
    raise CommandError(400, f"Unknown operation {request['op']!r}")


def main() -> None:
    answers = os.fdopen(os.dup(sys.stdout.fileno()), "w", encoding="utf-8")
    os.dup2(sys.stderr.fileno(), sys.stdout.fileno())
    sys.stdout = sys.stderr
    bundles = LoadedBundles(int(os.environ.get("MLSUITE_BUNDLE_CACHE_BYTES", "0")) or 512 * 1024 * 1024)
    for line in sys.stdin:
        try:
            answer = {"ok": True, "result": _handle(bundles, json.loads(line))}
        except CommandError as error:
            answer = {"ok": False, "status": error.status, "detail": error.detail}
        except Exception as error:  # noqa: BLE001 - one request's failure is its answer, not the worker's end
            answer = {"ok": False, "status": 500, "detail": f"{type(error).__name__}: {error}"}
        answers.write(json.dumps(answer) + "\n")
        answers.flush()


if __name__ == "__main__":
    main()
