/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown, ChevronUp } from "lucide-react";
import type { CatalogReportDefinition } from "../../plugin/mlform/custom-report";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import { getSchemaResultReports } from "../schema-run-display";
import type { PredictionResultDto, SchemaVersionDto } from "../types";
import { SchemaRunReportRenderer } from "./SchemaRunReportRenderer";

type Props = {
  version: SchemaVersionDto;
  results: PredictionResultDto[];
  open?: boolean;
  onToggle?: () => void;
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

export function SchemaRunReportsPanel({
  version,
  results,
  open = true,
  onToggle,
  customReportDefinitions = [],
}: Props) {
  const reports = results.flatMap((result) =>
    getSchemaResultReports(version, result).map((report) => ({ result, report })),
  );
  return (
    <AppPanel className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <AppSectionTitle>Reports</AppSectionTitle>
          <AppCopy>Predicted outputs and generated reports returned by selected models.</AppCopy>
        </div>
        {onToggle ? open ? <ChevronUp size={18} /> : <ChevronDown size={18} /> : null}
      </button>
      {open ? (
        reports.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {reports.map(({ result, report }, index) => (
              <SchemaRunReportRenderer
                key={`${report.id}-${index}`}
                version={version}
                result={result}
                report={report}
                customReportDefinitions={customReportDefinitions}
              />
            ))}
          </div>
        ) : (
          <AppCopy>No reports returned.</AppCopy>
        )
      ) : null}
    </AppPanel>
  );
}
