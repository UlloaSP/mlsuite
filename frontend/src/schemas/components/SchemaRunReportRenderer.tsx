/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import type { PrimitiveSubmitResult } from "mlform/primitives";
import type { CatalogReportDefinition } from "../../algorithms/plugin/custom-report-catalog";
import { AppCopy, AppPanel } from "../../app/components";
import { getBackendBaseUrl } from "../../app/config/runtimeConfig";
import { createPredictionPrimitiveRegistry } from "../../app/utils/mlform/primitive-registry";
import { isBuiltinReportKind } from "../../algorithms/mlform/builtin-registry";
import { patchSchemaReportContext } from "../../algorithms/schema/report-plugin-context";
import type { SchemaDisplayReport } from "../../algorithms/schema/report-display";
import type { PredictionResultDto, SchemaVersionDto } from "../../api/schemas/dtos";
import { isRecord } from "../../algorithms/mlform/shared";
import { describeSchemaCustomReport } from "../../algorithms/schema/report-descriptor";
import { SchemaPrimitiveReport } from "./SchemaPrimitiveReport";
import { SchemaRunReportCard } from "./SchemaRunReportCard";
import { schemaRunDebug } from "../../algorithms/schema/run-debug";

type Props = {
  version: SchemaVersionDto;
  result: PredictionResultDto;
  report: SchemaDisplayReport;
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

const EMPTY_CUSTOM_REPORTS: readonly CatalogReportDefinition[] = [];

const customReportByKind = (
  kind: string,
  definitions: readonly CatalogReportDefinition[] = [],
): CatalogReportDefinition | undefined =>
  definitions.find((definition) => definition.kind === kind);

const customReportKinds = (definitions: readonly CatalogReportDefinition[] = []): string[] =>
  definitions.map((definition) => definition.kind);

const resultPayload = (
  report: SchemaDisplayReport,
  result: PredictionResultDto,
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
  const outputContext = isRecord(result.output.reportContextById)
    ? result.output.reportContextById
    : {};
  const reportContextById = {
    ...outputContext,
    [report.id]: isRecord(outputContext[report.id])
      ? outputContext[report.id]
      : {
          modelId: result.modelId,
          modelInput: result.modelInput,
          meta,
          raw: result.output,
        },
  };
  return {
    values: {},
    fieldValues: {},
    serializedValues: {},
    serializedFieldValues: {},
    reports: [
      {
        id: report.id,
        kind: report.kind,
        mappedTo: report.config.mappedTo,
        payload: report.payload,
      },
    ],
    reportStates: { [report.id]: state },
    meta: { ...meta, reportContextById },
    raw: { ...result.output, reportContextById },
  };
};

export function SchemaRunReportRenderer({
  result,
  report,
  customReportDefinitions = EMPTY_CUSTOM_REPORTS,
}: Props) {
  const registry = useMemo(() => createPredictionPrimitiveRegistry(), []);
  const customReport = customReportByKind(report.kind, customReportDefinitions);
  schemaRunDebug("renderer.start", {
    result,
    report,
    reportId: report.id,
    kind: report.kind,
    modelId: result.modelId,
    hasPayload: report.payload !== undefined,
    customDefinition: Boolean(customReport),
    availableKinds: customReportKinds(customReportDefinitions),
  });
  if (!customReport) {
    if (!isBuiltinReportKind(report.kind)) {
      schemaRunDebug("renderer.custom-unavailable", { reportId: report.id, kind: report.kind });
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

  const config = report.config;
  schemaRunDebug("renderer.config", {
    reportId: report.id,
    config,
    payload: report.payload,
    hasConfig: true,
  });
  const normalizedConfig = { ...config, id: report.id };
  const lastResult = resultPayload(report, result);
  const state = { payload: report.payload, error: null, status: "ready" };
  const context = patchSchemaReportContext({
    reportId: report.id,
    state,
    payload: report.payload,
    result: lastResult,
  });
  const patchedLastResult = isRecord(context.result)
    ? (context.result as unknown as PrimitiveSubmitResult)
    : lastResult;
  const descriptor = describeSchemaCustomReport(customReport, normalizedConfig, context);
  schemaRunDebug("renderer.descriptor", {
    reportId: report.id,
    lastResult,
    context,
    patchedLastResult,
    descriptor,
    hasDescriptor: Boolean(descriptor),
    descriptorType: isRecord(descriptor) ? descriptor.type : typeof descriptor,
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
          lastResult={patchedLastResult}
          config={normalizedConfig}
        />
      ) : (
        <AppCopy>No renderable report content returned.</AppCopy>
      )}
    </AppPanel>
  );
}
