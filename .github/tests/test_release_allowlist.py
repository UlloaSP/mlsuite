import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
MATRIX = ROOT / "deploy" / "allowlist-matrix"


def load(name):
    spec = importlib.util.spec_from_file_location(name, MATRIX / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


export_corpus = load("export_corpus")
driver = load("driver")

ALLOWLIST = {
    "python": ">=3.14.0,<3.15",
    "mlbundle": {"0.3.9": "a", "0.3.10": "b"},
    "packages": {"numpy": ">=2.0,<3", "scikit-learn": ">=1.7.2,<2"},
}


class EnvironmentsTest(unittest.TestCase):
    def test_scikit_learn_gets_an_environment_at_each_end_of_its_range(self):
        found = export_corpus.environments(ALLOWLIST)
        self.assertEqual(set(found), {"sk-1.7.2", "sk-newest", "xgboost", "catboost", "onnx"})
        self.assertIn("scikit-learn==1.7.2", found["sk-1.7.2"][1])
        self.assertIn("scikit-learn>=1.7.2,<2", found["sk-newest"][1])

    def test_the_newest_mlbundle_writes_the_corpus(self):
        requirement = export_corpus.environments(ALLOWLIST)["onnx"][1][0]
        self.assertEqual(requirement, "mlbundle[onnx,lock,schema]==0.3.10")

    def test_every_package_is_held_to_its_range(self):
        self.assertEqual(export_corpus.constraints(ALLOWLIST), "numpy>=2.0,<3\nscikit-learn>=1.7.2,<2\n")

    def test_a_range_without_a_lower_bound_is_refused(self):
        with self.assertRaises(ValueError):
            export_corpus.lower_bound("<2")

    def test_the_repository_allowlist_gives_scikit_learn_both_ends(self):
        allowlist = export_corpus.tomllib.loads(export_corpus.ALLOWLIST.read_text(encoding="utf-8"))
        self.assertTrue({"sk-newest", f"sk-{export_corpus.lower_bound(allowlist['packages']['scikit-learn'])}"}
                        <= set(export_corpus.environments(allowlist)))

    def test_every_environment_has_its_exporter(self):
        for script, _ in export_corpus.environments(ALLOWLIST).values():
            self.assertTrue((MATRIX / script).is_file(), script)


def classifier(probabilities, label="yes", labels=("no", "yes")):
    return {"output": "target", "kind": "classifier", "mapping": list(labels), "prediction": label,
            "probabilities": probabilities}


def expected(probabilities, label="yes", labels=("no", "yes")):
    return {"output": "target", "kind": "classifier", "labels": list(labels), "predicted_label": label,
            "probabilities": probabilities}


class CompareTest(unittest.TestCase):
    def test_identical_numbers_are_exact(self):
        self.assertEqual(driver.compare([classifier([0.25, 0.75])], [expected([0.25, 0.75])], 1e-14), (None, True))

    def test_the_last_digits_may_differ(self):
        near = 0.75 * (1 + 4e-16)
        self.assertEqual(driver.compare([classifier([0.25, near])], [expected([0.25, 0.75])], 1e-14), (None, False))

    def test_a_real_difference_is_a_problem(self):
        problem, _ = driver.compare([classifier([0.25, 0.7501])], [expected([0.25, 0.75])], 1e-14)
        self.assertIn("numbers", problem)

    def test_another_label_is_a_problem_however_close_the_numbers(self):
        problem, _ = driver.compare([classifier([0.5, 0.5], "no")], [expected([0.5, 0.5], "yes")], 1e-14)
        self.assertIn("prediction", problem)

    def test_another_set_of_outputs_is_a_problem(self):
        problem, _ = driver.compare([], [expected([1.0])], 1e-14)
        self.assertIn("0 reports", problem)

    def test_regressors_compare_their_value(self):
        report = {"output": "y", "kind": "regressor", "values": [1.5]}
        want = {"output": "y", "kind": "regressor", "value": 1.5}
        self.assertEqual(driver.compare([report], [want], 1e-14), (None, True))


if __name__ == "__main__":
    unittest.main()
