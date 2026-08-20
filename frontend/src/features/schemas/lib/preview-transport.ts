/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest, Transport } from "mlform/runtime";
import { normalizeSchemaId } from "mlform/schema";
import { prepareRuntimeReports } from "@/capabilities/mlform/runtime-report-targets";
import { isRecord, type JsonRecord } from "@/capabilities/mlform/shared";

type PreviewTarget = {
  key: string;
  target: string;
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const mappedTargets = (mappedTo: unknown): PreviewTarget[] => {
  const direct = text(mappedTo);
  if (direct) return [{ key: "default", target: direct }];
  if (!isRecord(mappedTo)) return [];
  const targets = Object.entries(mappedTo)
    .map(([key, value]) => {
      const target = text(value);
      return target ? { key, target } : null;
    })
    .filter((item: PreviewTarget | null): item is PreviewTarget => Boolean(item));
  return [...new Map(targets.map((item) => [item.target, item])).values()];
};

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
  return prepareRuntimeReports(schema, bindings).schema;
};

const fakeReport = (report: ReportConfig, mappedTo: string): JsonRecord | null => {
  const base = { id: report.id, kind: report.kind, mappedTo };
  if (report.kind === "classifier") {
    return {
      ...base,
      prediction: "preview",
      labels: ["preview", "alternative"],
      probabilities: [0.72, 0.28],
    };
  }
  if (report.kind === "regressor") return { ...base, value: 42, values: [42] };
  return null;
};

const fakeReports = (report: ReportConfig): JsonRecord[] =>
  mappedTargets(report.mappedTo)
    .map(({ target }) => fakeReport(report, target))
    .filter((item: JsonRecord | null): item is JsonRecord => Boolean(item));

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
