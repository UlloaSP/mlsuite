"""Run with: python -m unittest discover -s .github/tests -p test_secret_scan.py."""

import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).parents[1] / "scripts" / "scan-secrets.py"
SPEC = importlib.util.spec_from_file_location("secret_scan", SCRIPT)
scanner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(scanner)
TOKEN = "ghp_" + "1234567890abcdefghijklmnopqrstuvwxABCD"


class SecretScanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tools = tempfile.TemporaryDirectory(prefix="mlsuite-gitleaks-test-")
        cls.executable = scanner.install(Path(cls.tools.name))

    @classmethod
    def tearDownClass(cls):
        cls.tools.cleanup()

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="mlsuite-secret-test-")
        self.addCleanup(self.directory.cleanup)
        self.repo = Path(self.directory.name) / "repo"
        self.repo.mkdir()
        self.git("init", "--quiet")
        self.git("config", "user.name", "Secret scan test")
        self.git("config", "user.email", "secret-scan@example.invalid")
        self.git("config", "core.autocrlf", "false")
        self.write(".env", f"GITHUB_TOKEN={TOKEN}\n")
        self.before_floor = self.commit("Old local-only credential")
        self.git("rm", "--quiet", ".env")
        self.write(".gitignore", ".env\n")
        self.write("public.txt", "public configuration\n")
        self.floor = self.commit("Remove private configuration")
        self.addCleanup(patch.stopall)
        patch.object(scanner, "HISTORY_FLOOR", self.floor).start()

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.repo, capture_output=True,
                              check=True).stdout.decode().strip()

    def write(self, name, text):
        (self.repo / name).write_text(text, encoding="utf-8")

    def commit(self, message):
        self.git("add", "--all")
        self.git("commit", "--quiet", "-m", message)
        return self.git("rev-parse", "HEAD")

    def check(self, base="", head="HEAD"):
        with tempfile.TemporaryDirectory(prefix="mlsuite-secret-check-") as directory:
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                result = scanner.check(self.repo, base, head, Path(directory), self.executable)
            self.assertNotIn(TOKEN, output.getvalue())
            return result, output.getvalue()

    def test_clean_tree_ignores_local_env_and_pre_cleanup_history(self):
        local = f"GITHUB_TOKEN={TOKEN}\n"
        self.write(".env", local)
        digest = hashlib.sha256((self.repo / ".env").read_bytes()).digest()
        self.write("public.txt", "changed public configuration\n")
        head = self.commit("Public update")
        for base in ("", "0" * 40, self.before_floor, self.floor):
            with self.subTest(base=base):
                result, output = self.check(base)
                self.assertEqual(result, 0)
                self.assertIn(f"{self.floor}..{head}", output)
        self.assertEqual(hashlib.sha256((self.repo / ".env").read_bytes()).digest(), digest)

    def test_tree_finds_secret_even_when_range_empty_and_export_ignored(self):
        self.write("credential.txt", f"GITHUB_TOKEN={TOKEN}\n")
        self.write(".gitattributes", "credential.txt export-ignore\n")
        head = self.commit("Tracked credential")
        result, output = self.check(head)
        self.assertEqual(result, 1)
        self.assertIn("credential.txt", output)
        self.assertIn("github-pat", output)

    def test_new_history_finds_secret_removed_before_head(self):
        self.write("credential.txt", f"GITHUB_TOKEN={TOKEN}\n")
        leaked = self.commit("New credential")
        self.git("rm", "--quiet", "credential.txt")
        self.commit("Remove new credential")
        result, output = self.check(self.floor)
        self.assertEqual(result, 1)
        self.assertIn(leaked, output)
        self.assertIn("credential.txt", output)

    def test_repository_configuration_cannot_suppress_findings(self):
        self.write("credential.txt", f"GITHUB_TOKEN={TOKEN} # gitleaks:allow\n")
        self.write(".gitleaks.toml", "[allowlist]\npaths = ['.*']\n")
        self.write(".gitleaksignore", "credential.txt:github-pat:1\n")
        head = self.commit("Attempt suppression")
        self.assertEqual(self.check(head)[0], 1)

    def test_invalid_missing_and_pre_floor_head_fail_closed(self):
        for base, head in (("--all", "HEAD"), ("f" * 40, "HEAD"),
                           ("", "f" * 40), ("", self.before_floor)):
            with self.subTest(base=base, head=head), self.assertRaises(scanner.ScanError):
                self.check(base, head)
        with patch.object(scanner, "HISTORY_FLOOR", "f" * 40):
            with self.assertRaises(scanner.ScanError):
                self.check()

    def test_non_ancestor_push_base_stays_bounded(self):
        self.write("public.txt", "base branch\n")
        base = self.commit("Previous branch tip")
        self.git("checkout", "--quiet", "--detach", self.floor)
        self.write("public.txt", "replacement branch\n")
        head = self.commit("Replacement tip")
        result, output = self.check(base, head)
        self.assertEqual(result, 0)
        self.assertIn(f"{base}..{head}", output)

    def test_symlink_exports_target_text_without_reading_private_target(self):
        self.write(".env", f"GITHUB_TOKEN={TOKEN}\n")
        blob = subprocess.run(["git", "hash-object", "-w", "--stdin"], input=b".env",
                              cwd=self.repo, capture_output=True, check=True).stdout.decode().strip()
        self.git("update-index", "--add", "--cacheinfo", f"120000,{blob},env-link")
        self.git("commit", "--quiet", "-m", "Link to local config")
        self.assertEqual(self.check()[0], 0)

    def test_unsupported_tree_entry_fails_closed(self):
        self.git("update-index", "--add", "--cacheinfo", f"160000,{self.floor},submodule")
        self.git("commit", "--quiet", "-m", "Unsupported submodule")
        with self.assertRaisesRegex(scanner.ScanError, "unsupported Git entry"):
            self.check()

    def test_download_checksum_and_platform_validation(self):
        with patch.object(scanner.platform, "system", return_value="Linux"), \
             patch.object(scanner.platform, "machine", return_value="x86_64"), \
             patch.object(scanner.urllib.request, "urlopen", return_value=io.BytesIO(b"tampered")):
            with self.assertRaisesRegex(scanner.ScanError, "checksum mismatch"):
                scanner.install(Path(self.directory.name))
        for system, machine in (("Darwin", "x86_64"), ("Linux", "aarch64")):
            with self.subTest(system=system, machine=machine), \
                 patch.object(scanner.platform, "system", return_value=system), \
                 patch.object(scanner.platform, "machine", return_value=machine):
                with self.assertRaisesRegex(scanner.ScanError, "x64 only"):
                    scanner.install(Path(self.directory.name))

    def test_scanner_errors_and_inconsistent_reports_fail_closed(self):
        temporary = Path(self.directory.name)
        cases = ((2, None), (0, None), (10, []), (0, [{}]), (0, {}))
        for status, report in cases:
            with self.subTest(status=status, report=report):
                path = temporary / "dir.json"
                path.unlink(missing_ok=True)
                if report is not None:
                    path.write_text(json.dumps(report), encoding="utf-8")
                result = subprocess.CompletedProcess([], status, TOKEN.encode(), TOKEN.encode())
                with patch.object(scanner, "run", return_value=result):
                    with self.assertRaises(scanner.ScanError) as error:
                        scanner.scan(self.executable, "dir", self.repo, temporary)
                self.assertNotIn(TOKEN, str(error.exception))

    def test_main_redacts_unexpected_error_details(self):
        for error in (OSError(TOKEN), scanner.ScanError("Controlled failure")):
            with self.subTest(error=type(error).__name__), \
                 patch.object(scanner.sys, "argv", [str(SCRIPT)]), \
                 patch.object(scanner, "install", side_effect=error):
                output = io.StringIO()
                with contextlib.redirect_stderr(output):
                    self.assertEqual(scanner.main(), 2)
                self.assertNotIn(TOKEN, output.getvalue())


if __name__ == "__main__":
    unittest.main()
