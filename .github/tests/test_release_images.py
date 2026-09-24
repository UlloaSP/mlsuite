import copy
import sys
from pathlib import Path
import unittest


sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "deploy"))
from verify_release_images import validate_release_config  # noqa: E402


class ReleaseImageValidationTest(unittest.TestCase):

    def setUp(self):
        digest = "sha256:" + "a" * 64
        api = f"ghcr.io/example/mlsuite-api@{digest}"
        self.config = {"services": {
            "artifact-migrate": {"image": api},
            "db-migrate": {"image": api},
            "spring-app": {"image": api},
            "frontend": {"image": f"ghcr.io/example/frontend@{digest}"},
            "ops-agent": {"image": f"ghcr.io/example/ops-agent@{digest}"},
            "py-analyzer": {"image": f"ghcr.io/example/backend@{digest}"},
        }}

    def test_accepts_complete_digest_pinned_release(self):
        validate_release_config(self.config)

    def test_rejects_mutable_tag(self):
        config = copy.deepcopy(self.config)
        config["services"]["frontend"]["image"] = "ghcr.io/example/frontend:latest"
        with self.assertRaisesRegex(ValueError, "frontend"):
            validate_release_config(config)

    def test_rejects_different_api_migration_digest(self):
        config = copy.deepcopy(self.config)
        config["services"]["db-migrate"]["image"] = (
            "ghcr.io/example/mlsuite-api@sha256:" + "b" * 64
        )
        with self.assertRaisesRegex(ValueError, "same image digest"):
            validate_release_config(config)


if __name__ == "__main__":
    unittest.main()
