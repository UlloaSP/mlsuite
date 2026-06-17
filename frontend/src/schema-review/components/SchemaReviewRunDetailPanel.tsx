import { useMemo, useState } from "react";
import { AppEmptyState } from "../../app/components";
import { isBuiltinReportKind } from "../../app/utils/mlform/builtin-registry";
import { ReviewAccordionSection } from "../../review/components/ReviewAccordionSection";
import { ReviewInputsSection } from "../../review/components/ReviewInputsSection";
import { ReviewOutputsSection, type TargetDto } from "../../review/components/ReviewOutputsSection";
import { getFormattedReportContent } from "../../models/report-feedback-utils";
import {
  getSchemaResultReports,
  getVisibleSchemaInputRecord,
  mergeSchemaRunInputs,
} from "../../schemas/schema-run-display";
import type { SchemaVersionDto } from "../../schemas/types";
import { useSchemaReviewRun } from "../hooks";
import { SchemaReviewCombinedFeedbackForm } from "./SchemaReviewCombinedFeedbackForm";

type Props = {
  token: string;
  runToken: string;
  version: SchemaVersionDto;
  onReviewChanged: () => Promise<unknown> | unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const displayTargetValue = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;
  const probabilities = Array.isArray(payload.probabilities) ? payload.probabilities : [];
  const labels = Array.isArray(payload.labels) ? payload.labels : [];
  const inferredIndex = probabilities.indexOf(Math.max(...probabilities));
  const prediction = payload.prediction ?? payload.value ?? labels[inferredIndex] ?? payload;
  const index = labels.findIndex((label) => String(label) === String(prediction));
  const probability = index >= 0 ? probabilities[index] : undefined;
  return typeof probability === "number" ? { value: prediction, probability } : prediction;
};

export function SchemaReviewRunDetailPanel({ token, runToken, version, onReviewChanged }: Props) {
  const detail = useSchemaReviewRun(token, runToken);
  const [outputsOpen, setOutputsOpen] = useState(false);
  const [inputsOpen, setInputsOpen] = useState(false);
  const visibleInputs = useMemo(
    () =>
      detail.data
        ? getVisibleSchemaInputRecord(
            version.formSchema,
            mergeSchemaRunInputs(detail.data.run.inputData, detail.data.run.results),
          )
        : {},
    [detail.data, version.formSchema],
  );
  const feedbackReports = useMemo(
    () =>
      detail.data
        ? detail.data.run.results.flatMap((result) =>
            getSchemaResultReports(version, result).map((report) => ({
              order: report.order,
              reportId: report.id,
              label: report.label,
              content: getFormattedReportContent(report.payload),
              error: null,
            })),
          )
        : [],
    [detail.data, version],
  );
  const outputTargets = useMemo<TargetDto[]>(
    () =>
      detail.data
        ? detail.data.run.results.flatMap((result) =>
            getSchemaResultReports(version, result)
              .filter((report) => isBuiltinReportKind(report.kind))
              .map((report) => ({
                id: `${result.id}-${report.id}`,
                predictionId: result.runId,
                order: report.order,
                value: displayTargetValue(report.payload),
                createdAt: result.createdAt,
              })),
          )
        : [],
    [detail.data, version],
  );
  const reportEntries = useMemo(
    () =>
      feedbackReports.filter(
        (report) => !outputTargets.some((target) => target.order === report.order),
      ),
    [feedbackReports, outputTargets],
  );

  if (detail.isLoading)
    return <p className="text-sm text-[var(--text-secondary)]">Loading inference</p>;
  if (detail.error || !detail.data) {
    return (
      <AppEmptyState
        title="Inference unavailable"
        description="This run cannot be opened from this review link."
      />
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
          Selected inference
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          {detail.data.run.name}
        </h2>
      </div>
      <SchemaReviewCombinedFeedbackForm
        token={token}
        run={detail.data.run}
        version={version}
        feedback={detail.data.feedback}
        onSaved={async () => {
          await detail.refetch();
          await onReviewChanged();
        }}
      />
      <ReviewAccordionSection
        title="Outputs"
        open={outputsOpen}
        onToggle={() => setOutputsOpen((current) => !current)}
      >
        <ReviewOutputsSection
          targets={outputTargets}
          reports={reportEntries}
          schemaDefinition={version.formSchema}
          predictionValue={detail.data.run.results[0]?.output ?? {}}
        />
      </ReviewAccordionSection>
      <ReviewAccordionSection
        title="Inputs"
        open={inputsOpen}
        onToggle={() => setInputsOpen((current) => !current)}
      >
        <ReviewInputsSection inputs={visibleInputs} />
      </ReviewAccordionSection>
    </div>
  );
}
