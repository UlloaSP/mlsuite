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
    "python": ["3.14.2", "3.14.10"],
    "mlbundle": {"0.3.9": "a", "0.3.10": "b"},
    "packages": {"numpy": ["2.5.4"], "scikit-learn": ["1.8.0", "1.9.1"]},
}


class EnvironmentsTest(unittest.TestCase):
    def test_every_allowlisted_scikit_learn_version_gets_an_environment(self):
        found = export_corpus.environments(ALLOWLIST)
        self.assertEqual(set(found), {"sk-1.8.0", "sk-1.9.1", "xgboost", "catboost", "onnx"})
        self.assertIn("scikit-learn==1.9.1", found["sk-1.9.1"][1])

    def test_the_newest_mlbundle_writes_the_corpus(self):
        requirement = export_corpus.environments(ALLOWLIST)["onnx"][1][0]
        self.assertEqual(requirement, "mlbundle[onnx,lock,schema]==0.3.10")

    def test_packages_with_one_version_are_held_to_it(self):
        self.assertEqual(export_corpus.constraints(ALLOWLIST), "numpy==2.5.4\n")

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
