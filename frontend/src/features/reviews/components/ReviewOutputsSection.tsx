import { useMemo } from "react";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppButton } from "@/shared/ui/AppButton";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import { SchemaRunReportRenderer } from "@/capabilities/prediction-runtime/reports/SchemaRunReportRenderer";
import { useSchemaPluginCatalog } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import type {
  ReviewPredictionResultDto,
  ReviewSchemaVersionDto,
} from "@/features/reviews/api/review-types";

export function ReviewOutputsSection({
  version,
  results,
}: {
  version: ReviewSchemaVersionDto;
  results: ReviewPredictionResultDto[];
}) {
  const catalog = useSchemaPluginCatalog(version.formSchema, useCurrentOrganizationId() ?? "none");
  const reports = useMemo(
    () =>
      results.flatMap((result) =>
        getSchemaResultReports(version, result).map((report) => ({ result, report })),
      ),
    [results, version],
  );
  if (catalog.status === "loading") return <AppCopy>Loading report renderers...</AppCopy>;
  if (catalog.status === "error")
    return (
      <div role="alert">
        <AppCopy>Report renderers unavailable. {catalog.error}</AppCopy>
        <AppButton onClick={() => void catalog.retry()}>Retry report renderers</AppButton>
      </div>
    );
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {reports.length === 0 ? (
        <AppCopy>No outputs returned.</AppCopy>
      ) : (
        reports.map(({ result, report }) => (
          <SchemaRunReportRenderer
            key={`${result.id}-${report.id}`}
            result={result}
            report={report}
            customReportDefinitions={catalog.data.reportDefinitions}
          />
        ))
      )}
    </div>
  );
}
