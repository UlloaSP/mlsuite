"""Publication lifecycle tests; no credentials, registry writes or GitHub mutations."""

import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import release_publish as publisher
from release_manifest import IMAGES, build_manifest, write_assets


class CommandTests(unittest.TestCase):
    def test_success_preserves_binary_input_and_output(self):
        payload = b"release input\x00\xff\n"
        result = publisher.command(sys.executable, "-c",
            "import sys; sys.stdout.buffer.write(sys.stdin.buffer.read())", data=payload)
        self.assertEqual(result, payload)

    def test_nonzero_exit_preserves_stderr_error(self):
        with self.assertRaisesRegex(RuntimeError, "^Registry unavailable$"):
            publisher.command(sys.executable, "-c",
                "import sys; sys.stderr.write('Registry unavailable\\n'); sys.exit(7)")

    def test_timeout_becomes_controlled_failure_without_arguments_or_output(self):
        script = "import time; print('private-output', flush=True); time.sleep(10)"
        with self.assertRaises(RuntimeError) as caught:
            publisher.command(sys.executable, "-c", script, "private-argument", timeout=0.1)
        self.assertEqual(str(caught.exception), f"Command timed out after 0.1s: {sys.executable}")
        self.assertIsInstance(caught.exception.__cause__, subprocess.TimeoutExpired)

    def test_missing_executable_preserves_os_error(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(FileNotFoundError):
                publisher.command(str(Path(directory) / "missing-command"))


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name) / "assets"
        self.repository = "UlloaSP/mlsuite"
        self.commit = "a" * 40
        self.tag = publisher.release_name(self.commit)
        self.records = [{"service": service, "image": f"ghcr.io/ulloasp/{image}",
                         "digest": "sha256:" + str(index) * 64, "commit": self.commit}
                        for index, (service, image) in enumerate(IMAGES.items(), 1)]
        self.manifest = build_manifest(self.records, self.repository, self.commit, self.tag)
        write_assets(self.manifest, self.directory)
        self.remote = None
        self.blobs = {}
        self.tag_commit = None
        self.main_commit = self.commit
        self.fail_upload = False
        self.api_mock = patch.object(publisher, "api", side_effect=self.api).start()
        self.command_mock = patch.object(publisher, "command", side_effect=self.command).start()
        self.addCleanup(patch.stopall)

    def api(self, path, method="GET", body=None, binary=False, missing_ok=False):
        prefix = f"repos/{self.repository}/"
        self.assertTrue(path.startswith(prefix))
        path = path[len(prefix):]
        if path.startswith("releases?per_page"):
            return [] if self.remote is None else [copy.deepcopy(self.remote)]
        if path == "git/ref/heads/main":
            return {"object": {"sha": self.main_commit, "type": "commit"}}
        if path == "git/ref/tags/" + self.tag:
            return None if self.tag_commit is None else {
                "object": {"sha": self.tag_commit, "type": "commit"}}
        if path.startswith("releases/assets/"):
            return self.blobs[int(path.rsplit("/", 1)[1])]
        if path == "releases" and method == "POST":
            self.remote = dict(body, id=1, assets=[], immutable=False)
            return copy.deepcopy(self.remote)
        if path == "releases/1":
            if method == "PATCH":
                self.remote.update(body, immutable=True)
                self.tag_commit = self.commit
            return copy.deepcopy(self.remote)
        self.fail(f"Unexpected API call: {method} {path}")

    def command(self, *args, data=None):
        if args[:3] == ("gh", "release", "upload"):
            if self.fail_upload:
                raise RuntimeError("Upload failed")
            self.remote["assets"] = []
            for index, name in enumerate(sorted(publisher.ASSETS), 1):
                raw = (self.directory / name).read_bytes()
                self.blobs[index] = raw
                self.remote["assets"].append({"id": index, "name": name,
                    "digest": "sha256:" + hashlib.sha256(raw).hexdigest()})
        elif args[:4] != ("docker", "buildx", "imagetools", "inspect"):
            self.fail(f"Unexpected command: {args}")
        return b""

    def publish(self):
        publisher.publish(self.repository, self.commit, self.directory)

    def prepare(self):
        return publisher.prepare(self.repository, self.commit, "refs/heads/main")

    def test_complete_release_is_verified_before_publication_and_reused(self):
        self.assertFalse(self.prepare())
        self.publish()
        self.assertTrue(self.remote["immutable"])
        self.assertFalse(self.remote["draft"])
        calls = self.api_mock.call_args_list
        publish_index = next(i for i, call in enumerate(calls) if len(call.args) > 1
                             and call.args[1] == "PATCH")
        self.assertTrue(any("releases/assets/" in call.args[0]
                            for call in calls[:publish_index]))
        self.command_mock.reset_mock()
        self.main_commit = "b" * 40
        self.assertTrue(self.prepare())
        self.publish()
        self.assertFalse(any(call.args[:3] == ("gh", "release", "upload")
                             for call in self.command_mock.call_args_list))

    def test_wrong_ref_superseded_main_and_invalid_identity_fail(self):
        for ref in ("refs/heads/develop", "refs/tags/v0.1.0", "refs/heads/feature"):
            with self.subTest(ref=ref), self.assertRaises(ValueError):
                publisher.prepare(self.repository, self.commit, ref)
        self.main_commit = "b" * 40
        with self.assertRaisesRegex(ValueError, "superseded"):
            self.prepare()
        for repository, commit in (("../bad", self.commit), (self.repository, "short")):
            with self.subTest(repository=repository), self.assertRaises(ValueError):
                publisher.prepare(repository, commit, "refs/heads/main")

    def test_wrong_existing_tag_and_draft_target_fail(self):
        self.tag_commit = "b" * 40
        with self.assertRaisesRegex(ValueError, "different commit"):
            self.publish()
        self.tag_commit = None
        self.remote = {"id": 1, "tag_name": self.tag, "draft": True,
                       "target_commitish": "b" * 40, "assets": []}
        with self.assertRaisesRegex(ValueError, "Draft release targets"):
            self.publish()
        with self.assertRaisesRegex(ValueError, "Draft release targets"):
            self.prepare()

    def test_failed_upload_leaves_draft_and_retry_finishes_it(self):
        self.fail_upload = True
        with self.assertRaisesRegex(RuntimeError, "Upload failed"):
            self.publish()
        self.assertTrue(self.remote["draft"])
        self.assertFalse(self.remote["immutable"])
        self.fail_upload = False
        self.assertFalse(self.prepare())
        self.publish()
        self.assertFalse(self.remote["draft"])

    def test_missing_registry_image_never_creates_release(self):
        self.command_mock.side_effect = RuntimeError("Registry unavailable")
        with self.assertRaisesRegex(RuntimeError, "Registry unavailable"):
            self.publish()
        self.assertIsNone(self.remote)

    def test_published_mutable_release_is_rejected(self):
        self.publish()
        self.remote["immutable"] = False
        with self.assertRaisesRegex(ValueError, "not immutable"):
            self.prepare()

    def test_missing_assets_or_bad_remote_checksums_fail(self):
        self.publish()
        original = copy.deepcopy(self.remote)
        self.remote["assets"].pop()
        with self.assertRaisesRegex(ValueError, "incomplete"):
            self.prepare()
        self.remote = original
        self.remote["assets"][0]["digest"] = "sha256:" + "0" * 64
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            self.prepare()

    def test_immutable_manifest_cannot_be_replaced(self):
        self.publish()
        self.records[0]["digest"] = "sha256:" + "f" * 64
        changed = build_manifest(self.records, self.repository, self.commit, self.tag)
        write_assets(changed, self.directory)
        with self.assertRaisesRegex(ValueError, "cannot be replaced"):
            self.publish()

    def test_local_corruption_fails_before_any_github_calls(self):
        for name in publisher.ASSETS:
            with self.subTest(name=name):
                write_assets(self.manifest, self.directory)
                (self.directory / name).write_bytes(b"{}")
                with self.assertRaises(ValueError):
                    self.publish()
        self.api_mock.assert_not_called()

    def test_download_requires_verified_release_and_empty_destination(self):
        destination = Path(self.temp.name) / "download"
        with self.assertRaisesRegex(ValueError, "does not exist"):
            publisher.download(self.repository, self.commit, destination)
        self.publish()
        publisher.download(self.repository, self.commit, destination)
        self.assertEqual((destination / "release.json").read_bytes(),
                         (self.directory / "release.json").read_bytes())
        with self.assertRaisesRegex(ValueError, "empty"):
            publisher.download(self.repository, self.commit, destination)

    def test_unexpected_draft_assets_are_preserved_and_block_publication(self):
        self.remote = {"id": 1, "tag_name": self.tag, "draft": True,
                       "target_commitish": self.commit, "assets": [{"name": "manual.txt"}]}
        with self.assertRaisesRegex(ValueError, "unexpected assets"):
            self.publish()
        self.assertTrue(self.remote["draft"])


if __name__ == "__main__":
    unittest.main()
