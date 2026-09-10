const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function questionnaireConfigError(schema: unknown): string | undefined {
  if (!record(schema) || !Array.isArray(schema.reports)) return;
  for (const [index, report] of schema.reports.entries()) {
    if (!record(report) || report.feedbackQuestionnaire == null) continue;
    const config = report.feedbackQuestionnaire;
    if (
      !record(config) ||
      !Array.isArray(config.steps) ||
      config.steps.length === 0 ||
      config.steps.some(
        (step) =>
          !record(step) ||
          typeof step.id !== "string" ||
          typeof step.title !== "string" ||
          !Array.isArray(step.fields) ||
          step.fields.length === 0 ||
          step.fields.some((field) => !record(field) || typeof field.kind !== "string"),
      )
    ) {
      return `Report ${index + 1} has an invalid feedback questionnaire. Expected steps with id, title, and fields. Publish a corrected snapshot to enable feedback.`;
    }
  }
}
