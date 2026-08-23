/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown, ChevronUp } from "lucide-react";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/custom-report-catalog";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import { schemaRunDebug } from "@/capabilities/prediction-runtime/mlform/run-debug";
import type { PredictionResultDto } from "@/features/schemas/api/prediction-types";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { SchemaRunReportRenderer } from "./SchemaRunReportRenderer";

type Props = {
  version: SchemaVersionDto;
  results: PredictionResultDto[];
  open?: boolean;
  onToggle?: () => void;
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

const EMPTY_CUSTOM_REPORT_DEFINITIONS: readonly CatalogReportDefinition[] = [];

export function SchemaRunReportsPanel({
  version,
  results,
  open = true,
  onToggle,
  customReportDefinitions = EMPTY_CUSTOM_REPORT_DEFINITIONS,
}: Props) {
  const reports = results.flatMap((result) =>
    getSchemaResultReports(version, result).map((report) => ({ result, report })),
  );
  schemaRunDebug("reports-panel.render", {
    versionId: version.id,
    results,
    reports,
    customKinds: customReportDefinitions.map((definition) => definition.kind),
  });
  return (
    <AppPanel className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <AppSectionTitle>Outputs</AppSectionTitle>
          <AppCopy>Model predictions and plugin reports.</AppCopy>
        </div>
        {onToggle ? open ? <ChevronUp size={18} /> : <ChevronDown size={18} /> : null}
      </button>
      {open ? (
        reports.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {reports.map(({ result, report }) => (
              <SchemaRunReportRenderer
                key={`${result.id}-${report.id}`}
                version={version}
                result={result}
                report={report}
                customReportDefinitions={customReportDefinitions}
              />
            ))}
          </div>
        ) : (
          <AppCopy>No outputs returned.</AppCopy>
        )
      ) : null}
    </AppPanel>
  );
}
