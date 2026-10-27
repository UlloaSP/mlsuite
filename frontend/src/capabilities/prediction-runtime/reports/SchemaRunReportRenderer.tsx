/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPanel } from "@/shared/ui/AppPanel";
import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import type { SchemaDisplayReport } from "@/capabilities/prediction-runtime/data/report-display";
import type { PluginCatalogEntry } from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";
import type { PredictionResultDto } from "@/shared/api/openapi.gen";
import { SandboxedReport } from "./SandboxedReport";
import { SchemaRunReportCard } from "./SchemaRunReportCard";

type RenderedResult = Pick<PredictionResultDto, "modelId" | "modelInput" | "output">;

type Props = {
  result: RenderedResult;
  report: SchemaDisplayReport;
  /** The report plugins of the organization whose schema the result belongs to. */
  reportPlugins?: readonly PluginCatalogEntry[];
};

/** A saved report: a built-in kind as a card, a plugin kind drawn by its plugin in the sandbox. */
export function SchemaRunReportRenderer({ result, report, reportPlugins = [] }: Props) {
  const plugin = reportPlugins.find((entry) => entry.kind === report.kind);
  if (plugin) return <SandboxedReport result={result} report={report} plugin={plugin} />;
  if (!isBuiltinReportKind(report.kind)) {
    return (
      <AppPanel>
        <AppCopy>Custom report kind unavailable.</AppCopy>
      </AppPanel>
    );
  }
  return (
    <SchemaRunReportCard
      label={report.label}
      kind={report.kind}
      payload={report.payload}
      labels={report.labels}
    />
  );
}
