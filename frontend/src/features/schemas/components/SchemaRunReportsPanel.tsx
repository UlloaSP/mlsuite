/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import type { PluginCatalogEntry } from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";
import { AppCopy } from "@/shared/ui/AppCopy";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import { SchemaRunReportRenderer } from "@/capabilities/prediction-runtime/reports/SchemaRunReportRenderer";
import type { PredictionResultDto, SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  version: SchemaVersionDto;
  /** Saved results, or a session's unsaved ones: the panel reads only what models returned. */
  results: Pick<PredictionResultDto, "modelId" | "modelInput" | "output">[];
  reportPlugins?: readonly PluginCatalogEntry[];
};

export function SchemaRunReportsPanel({ version, results, reportPlugins }: Props) {
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
              key={`${result.modelId}-${report.id}`}
              result={result}
              report={report}
              reportPlugins={reportPlugins}
            />
          ))}
        </div>
      ) : (
        <AppCopy>No outputs returned.</AppCopy>
      )}
    </div>
  );
}
