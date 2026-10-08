import type { FeedbackStatusDisplay } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";
import { schemaFeedbackStatus } from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import {
  buildSchemaFeedbackSteps,
  type SchemaFeedbackStep,
} from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { questionnaireConfigError } from "@/capabilities/prediction-runtime/feedback/questionnaire-config";
import {
  formatFeedbackValue,
  getEffectiveFeedbackValues,
  getQuestionnaireFieldDescriptors,
} from "@/capabilities/prediction-runtime/feedback/questionnaire-feedback";
import { getFormattedReportContent } from "@/capabilities/prediction-runtime/feedback/report-feedback-utils";
import {
  formatDisplayValue,
  getSchemaInputColumns,
} from "@/capabilities/prediction-runtime/data/input-display";
import {
  getSchemaResultReports,
  type SchemaDisplayReport,
} from "@/capabilities/prediction-runtime/data/report-display";
import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { toExecutableSchemaVersion } from "@/capabilities/prediction-runtime/mlform/executable-schema";
import { reportTargetForBinding } from "@/capabilities/prediction-runtime/mlform/schema-run-report-mapping";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import type {
  InferenceTableDto,
  InferenceTableRunDto,
  PredictionResultDto,
  PredictionResultFeedbackDto,
  PredictionRunCatalogItemDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";

export type InferenceColumnGroup = "inputs" | "outputs" | "feedback";

/**
 * A column one inference contributes: an input field, a report output, or one reviewer's
 * answer to one feedback question. Ids start with the schema, so equally named fields of
 * different schemas never share a column.
 */
export type InferenceDataColumn = {
  id: string;
  group: InferenceColumnGroup;
  label: string;
  schemaId: number;
  schemaName: string;
};

export type InferenceTableRow = {
  item: PredictionRunCatalogItemDto;
  feedbackStatus: FeedbackStatusDisplay;
  /** Values by data column id; a column the run lacks has no entry. */
  values: ReadonlyMap<string, unknown>;
  columns: readonly InferenceDataColumn[];
  /** Lowercased text of everything the row shows, for search. */
  searchText: string;
};

type PreparedVersion = { source: SchemaVersionDto; executable?: SchemaVersionDto };

const GROUP_ORDER: Record<InferenceColumnGroup, number> = { inputs: 0, outputs: 1, feedback: 2 };

const groupBy = <T>(items: readonly T[], key: (item: T) => number): Map<number, T[]> => {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const id = key(item);
    groups.set(id, [...(groups.get(id) ?? []), item]);
  }
  return groups;
};

const prepareVersion = (source: SchemaVersionDto): PreparedVersion => {
  try {
    return { source, executable: toExecutableSchemaVersion(source) };
  } catch {
    // A malformed snapshot still shows its inputs; outputs and feedback need the executable form.
    return { source };
  }
};

const isFilled = (value: unknown): boolean =>
  value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "");

/** A built-in report's predicted label, or a custom report's text. */
const reportValue = (report: SchemaDisplayReport): unknown => {
  if (isBuiltinReportKind(report.kind)) return report.payload?.prediction ?? report.payload?.value;
  const content = getFormattedReportContent(report.payload).join(" · ");
  return content || undefined;
};

/** A member by address or name; feedback with no user was given by a visitor of the public page. */
const reviewerLabel = (item: PredictionResultFeedbackDto) =>
  item.userEmail || item.userName || (item.userId == null ? "Visitor" : `user-${item.userId}`);

export const formatInferenceCell = (value: unknown): string =>
  isFilled(value) ? formatDisplayValue(value) : "";

type ColumnSink = (
  column: Omit<InferenceDataColumn, "schemaId" | "schemaName">,
  value: unknown,
) => void;

/** Each reviewer's answer to each question, one column per report, question and reviewer. */
const addFeedbackAnswers = (
  steps: readonly SchemaFeedbackStep[],
  feedback: readonly PredictionResultFeedbackDto[],
  prefix: string,
  versionLabel: string,
  add: ColumnSink,
) => {
  const stepByKey = new Map(steps.map((step) => [`${step.type}:${step.order}`, step]));
  const answers = new Map<string, { label: string; values: Set<string> }>();
  for (const item of feedback) {
    const step = stepByKey.get(`${item.type}:${item.order}`);
    if (!step) continue;
    const values = getEffectiveFeedbackValues(item, step.schema);
    for (const field of getQuestionnaireFieldDescriptors(step.schema)) {
      if (!isFilled(values[field.id])) continue;
      const id = `${prefix}feedback:${step.type}:${step.order}:${field.id}:${item.userId}`;
      const entry = answers.get(id) ?? {
        label: `${step.title} · ${versionLabel} · ${field.label} · ${reviewerLabel(item)}`,
        values: new Set<string>(),
      };
      entry.values.add(formatFeedbackValue(values[field.id], field));
      answers.set(id, entry);
    }
  }
  // A reviewer who answered differently for each model of a combined report has no single answer.
  for (const [id, { label, values }] of answers) {
    add({ id, group: "feedback", label }, values.size === 1 ? [...values][0] : "Mixed");
  }
};

const buildRow = (
  run: InferenceTableRunDto,
  version: PreparedVersion | undefined,
  results: readonly PredictionResultDto[],
  feedback: readonly PredictionResultFeedbackDto[],
): InferenceTableRow => {
  const item = run.summary;
  const prefix = `${item.schemaId}:`;
  const values = new Map<string, unknown>();
  const columns: InferenceDataColumn[] = [];
  const add: ColumnSink = (column, value) => {
    columns.push({ ...column, schemaId: item.schemaId, schemaName: item.schemaName });
    if (isFilled(value)) values.set(column.id, value);
  };
  if (version) {
    for (const input of getSchemaInputColumns(version.source.formSchema, run.inputData)) {
      add({ id: `${prefix}input:${input.key}`, group: "inputs", label: input.label }, input.value);
    }
  }
  const executable = version?.executable;
  if (executable) {
    for (const result of results) {
      for (const report of getSchemaResultReports(executable, result)) {
        const binding = executable.bindings.find((item) => item.modelId === result.modelId);
        const target = reportTargetForBinding(report.config, binding);
        const id = `${prefix}output:${result.modelId}:${target}`;
        const models = executable.bindings.filter((binding) =>
          reportTargetForBinding(report.config, binding),
        );
        const label =
          models.length > 1 ? `${report.label} · Model ${result.modelId}` : report.label;
        add({ id, group: "outputs", label }, reportValue(report));
      }
    }
  }
  let feedbackStatus: FeedbackStatusDisplay = "ERROR";
  if (executable && !questionnaireConfigError(executable.formSchema)) {
    try {
      const steps = buildSchemaFeedbackSteps(executable, results, feedback);
      feedbackStatus = schemaFeedbackStatus(steps);
      // Feedback order identifies a report within its persisted snapshot, not across versions.
      addFeedbackAnswers(
        steps,
        feedback,
        `${prefix}${item.schemaVersionId}:`,
        snapshotLabel(item.schemaVersionName, item.schemaVersion),
        add,
      );
    } catch {
      feedbackStatus = "ERROR";
    }
  }
  const searchText = [
    item.name,
    item.schemaName,
    item.bookmarkName ?? "",
    item.createdByName ?? "",
    item.createdByEmail ?? "",
    item.origin === "PUBLIC" ? "visitor public page" : "workspace",
    String(item.id),
    ...[...values.values()].map(formatInferenceCell),
  ]
    .join(" ")
    .toLowerCase();
  return { item, feedbackStatus, values, columns, searchText };
};

/** Joins the table payload into one row per inference, in the API's newest-first order. */
export const buildInferenceTableRows = (table: InferenceTableDto): InferenceTableRow[] => {
  const versions = new Map(table.versions.map((version) => [version.id, prepareVersion(version)]));
  const resultsByRun = groupBy(table.results, (result) => result.runId);
  const feedbackByResult = groupBy(table.feedback, (item) => item.resultId);
  return table.runs.map((run) => {
    const results = resultsByRun.get(run.summary.id) ?? [];
    const feedback = results.flatMap((result) => feedbackByResult.get(result.id) ?? []);
    return buildRow(run, versions.get(run.summary.schemaVersionId), results, feedback);
  });
};

/**
 * The data columns of a set of rows: per schema, its inputs, outputs, then feedback. Rows are
 * newest first, so the newest schema leads and a field whose label changed shows its newest label.
 */
export const inferenceDataColumns = (rows: readonly InferenceTableRow[]): InferenceDataColumn[] => {
  const columns = new Map<string, InferenceDataColumn>();
  const schemaOrder = new Map<number, number>();
  for (const row of rows) {
    if (!schemaOrder.has(row.item.schemaId)) schemaOrder.set(row.item.schemaId, schemaOrder.size);
    for (const column of row.columns) if (!columns.has(column.id)) columns.set(column.id, column);
  }
  return [...columns.values()].sort(
    (a, b) =>
      schemaOrder.get(a.schemaId)! - schemaOrder.get(b.schemaId)! ||
      GROUP_ORDER[a.group] - GROUP_ORDER[b.group],
  );
};
