/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { AppCopy } from "@/shared/ui/AppCopy";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import type { PredictionResultDto } from "@/features/schemas/api/prediction-types";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { SchemaRunReportRenderer } from "@/capabilities/prediction-runtime/reports/SchemaRunReportRenderer";

type Props = {
  version: SchemaVersionDto;
  results: PredictionResultDto[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

const EMPTY_CUSTOM_REPORT_DEFINITIONS: readonly CatalogReportDefinition[] = [];

export function SchemaRunReportsPanel({
  version,
  results,
  customReportDefinitions = EMPTY_CUSTOM_REPORT_DEFINITIONS,
}: Props) {
  const reports = useMemo(
    () =>
      results.flatMap((result) =>
        getSchemaResultReports(version, result).map((report) => ({ result, report })),
      ),
    [results, version],
  );

  return (
    <div>
      {reports.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {reports.map(({ result, report }) => (
            <SchemaRunReportRenderer
              key={`${result.id}-${report.id}`}
              result={result}
              report={report}
              customReportDefinitions={customReportDefinitions}
            />
          ))}
        </div>
      ) : (
        <AppCopy>No outputs returned.</AppCopy>
      )}
    </div>
  );
}
