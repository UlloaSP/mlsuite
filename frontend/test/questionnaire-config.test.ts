import { expect, test } from "vite-plus/test";
import { questionnaireConfigError } from "@/capabilities/prediction-runtime/feedback/questionnaire-config";
import { validateMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";

const schema = (feedbackQuestionnaire?: unknown) => ({
  fields: [],
  reports: [{ kind: "classifier", mappedTo: "predicted", feedbackQuestionnaire }],
});
test("accepts absent or step-shaped questionnaires preserving optional fields", () => {
  expect(questionnaireConfigError(schema())).toBeUndefined();
  const config = {
    steps: [
      {
        id: "review",
        title: "Review",
        fields: [
          { id: "quality", kind: "text", required: true },
          { id: "note", kind: "text", required: false },
        ],
      },
    ],
  };
  expect(questionnaireConfigError(schema(config))).toBeUndefined();
  expect(config.steps[0]?.fields[1]?.required).toBe(false);
});
test.each([
  { fields: [{ kind: "text" }] },
  { steps: null },
  { steps: [] },
  { steps: [{ id: "review", title: "Review", fields: [] }] },
  { steps: [{ id: "review", title: "Review", fields: null }] },
  { steps: [{ id: "review", title: "Review", fields: [null] }] },
])("rejects malformed questionnaire %j in product schema validation", (config) => {
  expect(questionnaireConfigError(schema(config))).toContain("invalid feedback questionnaire");
  const result = validateMlformSchema(schema(config));
  expect(result.success).toBe(false);
  expect(
    result.issues.some((issue) => issue.message.includes("invalid feedback questionnaire")),
  ).toBe(true);
});
