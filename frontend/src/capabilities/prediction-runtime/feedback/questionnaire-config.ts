import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

export function questionnaireConfigError(schema: unknown): string | undefined {
  if (!isRecord(schema) || !Array.isArray(schema.reports)) return;
  for (const [index, report] of schema.reports.entries()) {
    if (!isRecord(report) || report.feedbackQuestionnaire == null) continue;
    const config = report.feedbackQuestionnaire;
    if (
      !isRecord(config) ||
      !Array.isArray(config.steps) ||
      config.steps.length === 0 ||
      config.steps.some(
        (step) =>
          !isRecord(step) ||
          typeof step.id !== "string" ||
          typeof step.title !== "string" ||
          !Array.isArray(step.fields) ||
          step.fields.length === 0 ||
          step.fields.some((field) => !isRecord(field) || typeof field.kind !== "string"),
      )
    ) {
      return `Report ${index + 1} has an invalid feedback questionnaire. Expected steps with id, title, and fields. Publish a corrected snapshot to enable feedback.`;
    }
  }
}
