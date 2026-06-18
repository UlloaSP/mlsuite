import { describe, expect, test } from "vite-plus/test";
import { createOutputFeedbackQuestionnaire } from "../src/algorithms/models/output-feedback-questionnaire";

describe("output feedback questionnaire", () => {
  test("uses category assessment for classifier", () => {
    const schema = createOutputFeedbackQuestionnaire(
      { kind: "classifier", labels: ["No", "Yes"] },
      { value: { prediction: 1 } },
      {},
    );

    expect(schema.steps[0]?.fields[0]).toMatchObject({
      id: "output-feedback-assessment",
      kind: "category",
      options: [
        { label: "No", value: "No" },
        { label: "Yes", value: "Yes" },
      ],
    });
  });

  test("uses number assessment for regressor even when labels exist", () => {
    const schema = createOutputFeedbackQuestionnaire(
      { kind: "regressor", labels: ["No", "Yes"] },
      { value: 12 },
      {},
    );

    expect(schema.steps[0]?.fields[0]).toMatchObject({
      id: "output-feedback-assessment",
      kind: "number",
    });
  });
});
