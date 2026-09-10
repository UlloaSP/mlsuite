/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest, Transport } from "mlform/runtime";
import type { ReportResult } from "mlform/schema";
import { normalizeSchemaId } from "mlform/schema";
import { mappedRoutes } from "@/capabilities/prediction-runtime/mlform/mapped-to";
import { prepareRuntimeReports } from "@/capabilities/prediction-runtime/mlform/runtime-report-targets";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

/**
 * prepareSchemaPreviewReports: prepares preview reports with runtime-safe identities.
 *
 * Purpose: makes preview and real inference use the same multi-model report expansion and
 * duplicate-target rules.
 * @returns Schema with expanded reports when possible; otherwise the original value.
 * @throws Does not intentionally throw.
 */
export const prepareSchemaPreviewReports = (schema: unknown): unknown => {
  if (!isRecord(schema) || !Array.isArray(schema.reports)) return schema;
  const keys = [
    ...new Set(
      schema.reports.flatMap((report) =>
        isRecord(report) && isRecord(report.mappedTo) ? Object.keys(report.mappedTo) : [],
      ),
    ),
  ];
  const bindings = keys.map((key, index) => ({
    modelId: `preview-${index + 1}-${normalizeSchemaId(key)}`,
    modelName: key,
  }));
  return prepareRuntimeReports(schema, bindings);
};

const fakeReport = (
  report: ReportConfig,
  backend: string,
  mappedTo: string,
): ReportResult | null => {
  if (report.kind === "classifier") {
    return {
      backend,
      mappedTo,
      status: "ready",
      payload: {
        prediction: "preview",
        labels: ["preview", "alternative"],
        probabilities: [0.72, 0.28],
      },
    };
  }
  if (report.kind === "regressor") {
    return { backend, mappedTo, status: "ready", payload: { value: 42, values: [42] } };
  }
  return null;
};

const fakeReports = (report: ReportConfig): ReportResult[] =>
  mappedRoutes(report.mappedTo)
    .map(({ backend, mappedTo }) => fakeReport(report, backend, String(mappedTo)))
    .filter((item: ReportResult | null): item is ReportResult => Boolean(item));

/**
 * createSchemaPreviewTransport: creates a local MLForm transport for editor previews.
 *
 * Purpose: renders schema forms and built-in report panes without calling analyzer models.
 * @returns Local transport; never performs network calls.
 * @throws Does not intentionally throw.
 * @remarks Custom report payloads are not faked because plugin payload schemas are arbitrary.
 */
export const createSchemaPreviewTransport = (): Transport => ({
  async submit(request: SubmitRequest) {
    const reports = request.reports.flatMap(fakeReports);
    return {
      reports,
      meta: { preview: true },
      raw: {
        preview: true,
        inputData: request.displayValues ?? {},
        modelInputData: request.modelValues ?? {},
        reports,
      },
    };
  },
});
