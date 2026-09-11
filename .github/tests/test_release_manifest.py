"""Release contract checks, without GitHub or registry access."""

import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "release_manifest.py"
sys.path.insert(0, str(SCRIPT.parent))
import release_manifest as release


REPOSITORY = "Example/MLSuite"
COMMIT = "a" * 40
TAG = "build-" + COMMIT
DIGEST = "sha256:" + "b" * 64


def records():
    return [{"service": service, "image": f"ghcr.io/example/{image}",
             "digest": DIGEST, "commit": COMMIT}
            for service, image in release.IMAGES.items()]


def manifest():
    return release.build_manifest(records(), REPOSITORY, COMMIT, TAG)


class ReleaseManifestTest(unittest.TestCase):
    def test_complete_release_is_canonical_and_maps_compose_services(self):
        data = manifest()
        self.assertIs(release.validate_manifest(data, REPOSITORY, COMMIT, TAG), data)
        self.assertEqual(data["platform"], "linux/amd64")
        self.assertEqual(data["schema_version"], 1)
        self.assertEqual(set(data["images"]), {"api", "backend", "frontend", "ops-agent"})
        reversed_data = release.build_manifest(reversed(records()), REPOSITORY, COMMIT, TAG)
        self.assertEqual(release.canonical_json(data), release.canonical_json(reversed_data))
        with tempfile.TemporaryDirectory() as temporary:
            release.write_assets(data, temporary)
            output = Path(temporary)
            self.assertEqual({p.name for p in output.iterdir()},
                             {"release.json", "release.json.sha256", "docker-compose.release.yml"})
            content = (output / "release.json").read_bytes()
            self.assertEqual(json.loads(content), data)
            checksum = (output / "release.json.sha256").read_text()
            self.assertEqual(checksum, hashlib.sha256(content).hexdigest() + "  release.json\n")
            compose = (output / "docker-compose.release.yml").read_text()
            for service in ("spring-app", "py-analyzer", "frontend", "ops-agent"):
                self.assertIn(f"  {service}:\n", compose)
            for image in data["images"].values():
                self.assertIn(f"    image: {image}\n", compose)
            self.assertEqual(compose.count("    platform: linux/amd64\n"), 4)
            self.assertNotIn("latest", compose)

    def test_invalid_identity(self):
        cases = [
            ("bad", COMMIT, TAG), ("owner/name/extra", COMMIT, TAG),
            ("owner/..", COMMIT, TAG), (None, COMMIT, TAG),
            (REPOSITORY, "short", TAG), (REPOSITORY, "G" * 40, TAG),
            (REPOSITORY, None, TAG), (REPOSITORY, COMMIT, "bad/tag"),
            (REPOSITORY, COMMIT, "bad..tag"), (REPOSITORY, COMMIT, "v1.lock"),
            (REPOSITORY, COMMIT, "v1."), (REPOSITORY, COMMIT, None),
        ]
        for identity in cases:
            with self.subTest(identity=identity), self.assertRaises(ValueError):
                release.build_manifest(records(), *identity)

    def test_missing_duplicate_and_unknown_services(self):
        for invalid in (records()[:-1], records() + [records()[0]],
                        records() + [{**records()[0], "service": "postgres"}]):
            with self.subTest(records=invalid), self.assertRaises(ValueError):
                release.build_manifest(invalid, REPOSITORY, COMMIT, TAG)

    def test_invalid_record_fields_and_types(self):
        mutations = [
            None, [], {}, {**records()[0], "extra": True},
            {key: value for key, value in records()[0].items() if key != "image"},
            {**records()[0], "service": []},
            {**records()[0], "commit": "c" * 40},
            {**records()[0], "image": "ghcr.io/other/mlsuite-api"},
            {**records()[0], "image": "ghcr.io/example/mlsuite-api:latest"},
            {**records()[0], "image": "ghcr.io/example/mlsuite-frontend"},
            {**records()[0], "digest": "sha256:short"},
            {**records()[0], "digest": "sha256:" + "z" * 64},
            {**records()[0], "digest": "sha512:" + "b" * 64},
            {**records()[0], "digest": None},
        ]
        for invalid in mutations:
            with self.subTest(record=invalid), self.assertRaises(ValueError):
                release.build_manifest([invalid] + records()[1:], REPOSITORY, COMMIT, TAG)

    def test_rejects_invalid_published_manifests(self):
        cases = [None, [], {}, {**manifest(), "extra": True}]
        for field, invalid in (("schema_version", 2), ("schema_version", True),
                               ("repository", "other/mlsuite"), ("commit", "c" * 40),
                               ("release", "v2"), ("platform", "linux/arm64"),
                               ("images", []), ("images", {})):
            cases.append({**manifest(), field: invalid})
        for image in (None, "ghcr.io/example/mlsuite-api:latest",
                      "ghcr.io/other/mlsuite-api@" + DIGEST,
                      "ghcr.io/example/mlsuite-api@sha256:short"):
            data = manifest()
            data["images"]["api"] = image
            cases.append(data)
        data = manifest()
        data["images"]["postgres"] = "postgres@" + DIGEST
        cases.append(data)
        for invalid in cases:
            with self.subTest(manifest=invalid), self.assertRaises(ValueError):
                release.validate_manifest(invalid, REPOSITORY, COMMIT, TAG)

    def test_invalid_assets_are_rejected_before_output_creation(self):
        data = manifest()
        data["platform"] = "linux/arm64"
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "release"
            with self.assertRaises(ValueError):
                release.write_assets(data, output)
            self.assertFalse(output.exists())

    def cli(self, input_dir, output_dir):
        return [str(SCRIPT), "--input", str(input_dir), "--output", str(output_dir),
                "--repository", REPOSITORY, "--commit", COMMIT, "--release", TAG]

    def test_cli_reads_nested_artifacts(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for record in records():
                path = root / "input" / record["service"] / "image.json"
                path.parent.mkdir(parents=True)
                path.write_text(json.dumps(record), encoding="utf-8")
            result = subprocess.run([sys.executable] + self.cli(root / "input", root / "output"),
                                    capture_output=True, text=True, check=False)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads((root / "output" / "release.json").read_bytes()), manifest())

    def test_cli_reports_missing_directory_and_invalid_json(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for exists in (False, True):
                if exists:
                    (root / "input").mkdir()
                    (root / "input" / "bad.json").write_text("{broken", encoding="utf-8")
                with self.subTest(exists=exists):
                    result = subprocess.run(
                        [sys.executable] + self.cli(root / "input", root / "output"),
                        capture_output=True, text=True, check=False)
                    self.assertEqual(result.returncode, 2)
                    self.assertIn("error:", result.stderr)
                    self.assertFalse((root / "output").exists())

    def test_cli_reports_filesystem_errors(self):
        with tempfile.TemporaryDirectory() as temporary:
            arguments = self.cli(temporary, Path(temporary) / "output")
            with patch.object(sys, "argv", arguments), patch.object(
                    release.Path, "rglob", side_effect=OSError("cannot read records")), \
                    patch("sys.stderr", new_callable=io.StringIO) as errors:
                with self.assertRaises(SystemExit) as error:
                    release.main()
            self.assertEqual(error.exception.code, 2)
            self.assertIn("cannot read records", errors.getvalue())


if __name__ == "__main__":
    unittest.main()
