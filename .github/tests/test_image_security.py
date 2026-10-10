"""Keep the image gate mandatory and identical before and during publication."""

from pathlib import Path
import re
import unittest


GITHUB = Path(__file__).resolve().parents[1]
SERVICES = {"frontend", "api", "backend", "ops-agent"}


def job(workflow, name):
    source = (GITHUB / "workflows" / workflow).read_text(encoding="utf-8")
    return re.search(rf"(?ms)^  {name}:\n(.*?)(?=^  \S|\Z)", source).group(1)


class ImageSecurityContractTest(unittest.TestCase):
    def test_ci_cannot_succeed_without_every_image_scan(self):
        required = job("ci.yml", "required")
        dependencies = re.search(r"needs: \[([^]]+)\]", required).group(1)
        self.assertIn("image-security", {item.strip() for item in dependencies.split(",")})
        self.assertIn('all(.[]; .result == "success")', required)
        security = job("ci.yml", "image-security")
        services = re.search(r"service: \[([^]]+)\]", security).group(1)
        self.assertEqual(SERVICES, {item.strip() for item in services.split(",")})
        self.assertNotRegex(security, r"(?m)^\s+(?:if|continue-on-error):")

    def test_pr_images_are_built_locally_without_registry_credentials(self):
        security = job("ci.yml", "image-security")
        self.assertIn("context: ./${{ matrix.service }}", security)
        self.assertIn("file: ./${{ matrix.service }}/Dockerfile", security)
        self.assertIn("load: true", security)
        self.assertIn("push: false", security)
        self.assertNotIn("secrets.", security)
        self.assertNotIn("docker/login-action", security)

    def test_ci_and_publication_use_the_same_gate_with_distinct_reports(self):
        security = job("ci.yml", "image-security")
        publication = job("publish-ghcr.yml", "build")
        for body in (security, publication):
            self.assertIn("uses: ./.github/actions/scan-image", body)
        self.assertIn("report-name: ci-vulnerability-report-${{ matrix.service }}", security)
        self.assertIn("report-name: vulnerability-report-${{ matrix.service }}", publication)
        self.assertIn("image-ref: ${{ steps.image.outputs.name }}@${{ steps.build.outputs.digest }}", publication)

    def test_policy_blocks_unfixed_findings_and_scanner_failure_and_retains_report(self):
        policy = (GITHUB / "actions" / "scan-image" / "action.yml").read_text(encoding="utf-8")
        self.assertIn("severity: HIGH,CRITICAL", policy)
        self.assertIn("ignore-unfixed: false", policy)
        self.assertIn("exit-code: '1'", policy)
        self.assertNotIn("continue-on-error:", policy)
        self.assertIn("if: always()", policy)
        self.assertIn("path: trivy-results.json", policy)
        self.assertIn("retention-days: 30", policy)
        self.assertIn("if-no-files-found: error", policy)


if __name__ == "__main__":
    unittest.main()
