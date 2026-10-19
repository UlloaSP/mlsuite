import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

// MLForm's runtime id rule. A step id prefixes the ids of its unnamed fields, so it follows it too.
const RUNTIME_ID = /^(?!__proto__$|constructor$|prototype$)\S+$/u;

const isRuntimeId = (value: unknown): boolean =>
  typeof value === "string" && RUNTIME_ID.test(value);

const isValidField = (field: unknown): boolean =>
  isRecord(field) &&
  typeof field.kind === "string" &&
  (field.id === undefined || isRuntimeId(field.id));

const isValidStep = (step: unknown): boolean =>
  isRecord(step) &&
  isRuntimeId(step.id) &&
  typeof step.title === "string" &&
  Array.isArray(step.fields) &&
  step.fields.length > 0 &&
  step.fields.every(isValidField);

export function questionnaireConfigError(schema: unknown): string | undefined {
  if (!isRecord(schema) || !Array.isArray(schema.reports)) return;
  for (const [index, report] of schema.reports.entries()) {
    if (!isRecord(report) || report.feedbackQuestionnaire == null) continue;
    const config = report.feedbackQuestionnaire;
    if (
      !isRecord(config) ||
      !Array.isArray(config.steps) ||
      config.steps.length === 0 ||
      !config.steps.every(isValidStep)
    ) {
      return `Report ${index + 1} has an invalid feedback questionnaire. Expected steps with id, title, and fields, with ids that contain no spaces. Publish a corrected snapshot to enable feedback.`;
    }
  }
}
