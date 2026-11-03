import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("check_env", ROOT / "deploy" / "check_env.py")
check_env = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(check_env)


class CheckEnvTest(unittest.TestCase):
    def test_required_variables_are_those_used_without_a_default(self):
        compose = """
        # ${COMMENTED} is documentation
        A: ${REQUIRED_ONE}
        B: ${HAS_DEFAULT:-1}
        C: http://${REQUIRED_TWO}:${HAS_EMPTY_DEFAULT:-}
        """
        self.assertEqual(check_env.required_variables([compose]), {"REQUIRED_ONE", "REQUIRED_TWO"})

    def test_every_required_variable_is_documented_in_the_example(self):
        texts = [(ROOT / name).read_text(encoding="utf-8") for name in check_env.COMPOSE_FILES]
        example = check_env.parse_env((ROOT / ".env.example").read_text(encoding="utf-8"))
        self.assertEqual(check_env.required_variables(texts) - set(example), set())

    def test_a_complete_file_passes(self):
        values = {"NAME": "value", "OPS_AGENT_TERMINAL_SERVICES": ""}
        self.assertEqual(check_env.problems(values, {"NAME", "OPS_AGENT_TERMINAL_SERVICES"}), [])

    def test_a_missing_or_empty_variable_is_named(self):
        self.assertEqual(
            check_env.problems({"EMPTY": ""}, {"EMPTY", "MISSING"}),
            ["EMPTY is empty", "MISSING is not set"],
        )

    def test_a_short_secret_is_refused_without_printing_it(self):
        found = check_env.problems({"OPS_AGENT_SHARED_SECRET": "short-value"}, set())
        self.assertEqual(found, ["OPS_AGENT_SHARED_SECRET must have at least 32 characters"])

    def test_a_backend_url_is_refused_because_release_images_lack_it(self):
        found = check_env.problems({"VITE_BACKEND_URL": "https://api.example.com"}, set())
        self.assertEqual(found, ["VITE_BACKEND_URL must be empty: release images are built without it"])

    def test_minio_is_refused_where_rustfs_replaced_it(self):
        found = check_env.problems(
            {"STORAGE_ENDPOINT": "http://minio:9000", "OPS_AGENT_MANAGED_SERVICES": "postgres, minio,spring-app"},
            set(),
        )
        self.assertEqual(found, [
            "STORAGE_ENDPOINT names minio, which RustFS replaced",
            "OPS_AGENT_MANAGED_SERVICES names minio, which RustFS replaced",
        ])

    def test_rustfs_and_an_external_endpoint_pass(self):
        values = {"STORAGE_ENDPOINT": "https://minio.example.com", "OPS_AGENT_MANAGED_SERVICES": "postgres,rustfs"}
        self.assertEqual(check_env.problems(values, set()), [])

    def test_values_keep_the_last_assignment_and_lose_their_quotes(self):
        text = '# comment\nA=1\nA=2\nB="quoted value"\nC=with=equals\n'
        self.assertEqual(check_env.parse_env(text), {"A": "2", "B": "quoted value", "C": "with=equals"})


if __name__ == "__main__":
    unittest.main()
