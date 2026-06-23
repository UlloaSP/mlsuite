/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig, SubmitRequest, Transport } from "mlform/runtime";
import { isRecord, type JsonRecord } from "../../mlform/shared";

type PreviewTarget = {
  key: string;
  target: string;
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

const safeId = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

const reportBaseId = (report: JsonRecord, index: number): string =>
  text(report.id) ?? text(report.label) ?? `report-${index + 1}`;

const mappedTargets = (mappedTo: unknown): PreviewTarget[] => {
  const direct = text(mappedTo);
  if (direct) return [{ key: "default", target: direct }];
  if (!isRecord(mappedTo)) return [];
  return Object.entries(mappedTo)
    .map(([key, value]) => {
      const target = text(value);
      return target ? { key, target } : null;
    })
    .filter((item: PreviewTarget | null): item is PreviewTarget => Boolean(item));
};

const expandReport = (report: JsonRecord, index: number): JsonRecord[] => {
  const targets = mappedTargets(report.mappedTo);
  if (targets.length <= 1) return [report];
  const baseId = reportBaseId(report, index);
  const label = text(report.label);
  return targets.map(({ key, target }) => ({
    ...report,
    id: `${baseId}-${safeId(key)}`,
    label: label ? `${label} ${key}` : `${baseId} ${key}`,
    mappedTo: target,
  }));
};

/**
 * expandSchemaPreviewReports: expands compact multi-target reports for preview rendering.
 *
 * Purpose: MLForm creates report frames from schema reports, so compact mappedTo records need
 * one runtime report per target before mounting.
 * @returns Schema with expanded reports when possible; otherwise the original value.
 * @throws Does not intentionally throw.
 */
export const expandSchemaPreviewReports = (schema: unknown): unknown => {
  if (!isRecord(schema) || !Array.isArray(schema.reports)) return schema;
  return {
    ...schema,
    reports: schema.reports.flatMap((report, index) =>
      isRecord(report) ? expandReport(report, index) : [report],
    ),
  };
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
