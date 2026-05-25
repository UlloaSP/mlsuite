import type { PredictionReportDescriptor } from "../../models/questionnaire-feedback";

type ReviewReportsSectionProps = {
  reports: PredictionReportDescriptor[];
};

export function ReviewReportsSection({ reports }: ReviewReportsSectionProps) {
  if (reports.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No reports.</p>;
  }

  return (
    <div className="space-y-5">
      {reports.map((report) => (
        <div key={report.reportId} className="space-y-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{report.label}</p>
          {report.error ? (
            <p className="text-sm text-[var(--danger-text)]">{report.error}</p>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-6 text-[var(--text-primary)]">
              {report.content.join("\n\n")}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
