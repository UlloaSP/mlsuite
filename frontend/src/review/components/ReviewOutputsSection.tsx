import type { PredictionReportDescriptor } from "../../algorithms/models/questionnaire-feedback";
import {
  formatProbability,
  getSchemaAwareTargetValue,
  getTargetLabel,
  getTargetProbability,
} from "../../algorithms/models/target-utils";

type ReviewOutputsSectionProps = {
  targets: TargetDto[];
  reports: PredictionReportDescriptor[];
  schemaDefinition: unknown;
  predictionValue: unknown;
};

export type TargetDto = {
  id: string;
  order: number;
  value: unknown;
};

export function ReviewOutputsSection({
  targets,
  reports,
  schemaDefinition,
  predictionValue,
}: ReviewOutputsSectionProps) {
  return (
    <div className="divide-y divide-[var(--border-soft)]">
      {targets.map((target) => {
        const probability = getTargetProbability(target.value);
        return (
          <div key={target.id} className="grid gap-1 py-3 md:grid-cols-[180px_minmax(0,1fr)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {getTargetLabel(schemaDefinition, target.order)}
            </p>
            <div className="font-mono text-sm text-[var(--text-primary)]">
              {String(
                getSchemaAwareTargetValue(
                  target.value,
                  schemaDefinition,
                  target.order,
                  predictionValue,
                ) ?? "",
              )}
              {probability === null ? null : (
                <span className="ml-3 text-[var(--text-secondary)]">
                  {formatProbability(probability)}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {reports.map((report, index) => (
        <div key={report.reportId} className="grid gap-1 py-3 md:grid-cols-[180px_minmax(0,1fr)]">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Output {targets.length + index + 1}: {report.label}
          </p>
          {report.error ? (
            <p className="text-sm text-[var(--danger-text)]">{report.error}</p>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-6 text-[var(--text-primary)]">
              {report.content.length > 0 ? report.content.join("\n\n") : "No output content."}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
