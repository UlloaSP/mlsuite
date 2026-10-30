import hashlib
import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("fetch_release", ROOT / "deploy" / "fetch_release.py")
fetch_release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(fetch_release)

COMMIT = "a" * 40
DIGEST = "sha256:" + "b" * 64
OWNER = "ghcr.io/ulloasp"


def manifest(commit=COMMIT):
    return {
        "schema_version": 1,
        "repository": fetch_release.REPOSITORY,
        "commit": commit,
        "release": f"build-{commit}",
        "platform": "linux/amd64",
        "images": {
            "api": f"{OWNER}/mlsuite-api@{DIGEST}",
            "backend": f"{OWNER}/mlsuite-sklearn-backend@{DIGEST}",
            "frontend": f"{OWNER}/mlsuite-frontend@{DIGEST}",
            "ops-agent": f"{OWNER}/mlsuite-ops-agent@{DIGEST}",
        },
    }


def published(data=None):
    content = json.dumps(manifest() if data is None else data).encode()
    checksum = f"{hashlib.sha256(content).hexdigest()}  release.json\n".encode()
    return lambda url: checksum if url.endswith(".sha256") else content


class ReleaseOverrideTest(unittest.TestCase):
    def test_the_override_pins_every_service_by_digest(self):
        override = fetch_release.release_override(COMMIT, published()).decode()
        for service in ("spring-app", "db-migrate", "py-analyzer", "runtime-builder", "frontend", "ops-agent"):
            self.assertIn(f"  {service}:\n", override)
        self.assertNotIn(":latest", override)
        self.assertEqual(override.count(f"@{DIGEST}"), 7)

    def test_an_unpublished_release_is_not_an_error(self):
        self.assertIsNone(fetch_release.release_override(COMMIT, lambda url: None))

    def test_a_manifest_that_misses_its_checksum_is_refused(self):
        tampered = lambda url: b"0" * 64 + b"  release.json\n" if url.endswith(".sha256") else b"{}"
        with self.assertRaisesRegex(ValueError, "checksum"):
            fetch_release.release_override(COMMIT, tampered)

    def test_a_release_of_another_commit_is_refused(self):
        with self.assertRaisesRegex(ValueError, "commit"):
            fetch_release.release_override(COMMIT, published(manifest("c" * 40)))

    def test_a_mutable_image_is_refused(self):
        data = manifest()
        data["images"]["api"] = f"{OWNER}/mlsuite-api:latest"
        with self.assertRaisesRegex(ValueError, "digest-pinned"):
            fetch_release.release_override(COMMIT, published(data))


class WaitForOverrideTest(unittest.TestCase):
    def test_it_waits_until_the_release_is_published(self):
        answers = [None, None]
        release = published()

        def fetch(url):
            return answers.pop() if answers else release(url)

        slept = []
        override = fetch_release.wait_for_override(COMMIT, 60, fetch, slept.append, lambda: 0)
        self.assertIn(b"services:", override)
        self.assertEqual(slept, [fetch_release.POLL_SECONDS])

    def test_a_release_never_published_stops_the_deployment(self):
        ticks = iter(range(0, 1000, 30))
        with self.assertRaisesRegex(ValueError, "not published"):
            fetch_release.wait_for_override(COMMIT, 60, lambda url: None, lambda seconds: None, lambda: next(ticks))


if __name__ == "__main__":
    unittest.main()
