/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import type { PrimitiveSubmitResult } from "mlform/primitives";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPanel } from "@/shared/ui/AppPanel";
import { getBackendBaseUrl } from "@/shared/config/runtime";
import { isBuiltinReportKind } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { reportTargetForBinding } from "@/capabilities/prediction-runtime/mlform/schema-run-report-mapping";
import type { SchemaDisplayReport } from "@/capabilities/prediction-runtime/data/report-display";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { describeSchemaCustomReport } from "@/capabilities/prediction-runtime/reports/report-descriptor";
import { SchemaPrimitiveReport } from "./SchemaPrimitiveReport";
import type { PredictionResultDto } from "@/shared/api/openapi.gen";
import { SchemaRunReportCard } from "./SchemaRunReportCard";

type RenderedResult = Pick<PredictionResultDto, "modelId" | "modelInput" | "output">;

type Props = {
  result: RenderedResult;
  report: SchemaDisplayReport;
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

const EMPTY_CUSTOM_REPORTS: readonly CatalogReportDefinition[] = [];

const customReportByKind = (
  kind: string,
  definitions: readonly CatalogReportDefinition[] = [],
): CatalogReportDefinition | undefined =>
  definitions.find((definition) => definition.kind === kind);

const resultPayload = (
  report: SchemaDisplayReport,
  result: RenderedResult,
): PrimitiveSubmitResult => {
  const state = { payload: report.payload, error: null, status: "ready" as const };
  const outputMeta = isRecord(result.output.meta) ? result.output.meta : {};
  const meta = {
    backendUrl: getBackendBaseUrl(),
    backendFieldValues: result.modelInput,
    schemaRun: true,
    modelId: result.modelId,
    ...outputMeta,
  };
  const target = reportTargetForBinding(report.config, { modelId: result.modelId }) ?? report.id;
  return {
    inputs: [],
    displayValues: {},
    modelValues: result.modelInput,
    reports: [
      {
        backend: String(result.modelId),
        mappedTo: target,
        status: "ready",
        payload: report.payload,
      },
    ],
    reportContexts: {
      [report.id]: {
        reportId: report.id,
        kind: report.kind,
        label: report.label,
        mappedTo: report.config.mappedTo,
        target,
        targetKey: String(target),
        backend: String(result.modelId),
        displayValues: {},
        modelValues: result.modelInput,
        reports: [],
        meta,
        raw: result.output,
      },
    },
    reportStates: { [report.id]: state },
    meta,
    raw: result.output,
  };
};

export function SchemaRunReportRenderer({
  result,
  report,
  customReportDefinitions = EMPTY_CUSTOM_REPORTS,
}: Props) {
  const registry = useMemo(() => createBuiltinPrimitiveRegistry(), []);
  const customReport = customReportByKind(report.kind, customReportDefinitions);
  if (!customReport) {
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

  const normalizedConfig = { ...report.config, id: report.id };
  const lastResult = resultPayload(report, result);
  const descriptor = describeSchemaCustomReport(customReport, normalizedConfig, {
    reportId: report.id,
    state: { payload: report.payload, error: null, status: "ready" },
    payload: report.payload,
    result: lastResult,
  });

  return (
    <AppPanel>
      {descriptor ? (
        <SchemaPrimitiveReport
          descriptor={descriptor}
          registry={registry}
          reportId={report.id}
          kind={report.kind}
          label={report.label}
          payload={report.payload}
          lastResult={lastResult}
          config={normalizedConfig}
        />
      ) : (
        <AppCopy>No renderable report content returned.</AppCopy>
      )}
    </AppPanel>
  );
}
