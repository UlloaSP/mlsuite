/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportConfig } from "mlform/runtime";
import {
  mappingLabels,
  toPublicReportPayload,
} from "@/capabilities/prediction-runtime/data/report-normalization";
import type { SchemaDisplayReport } from "@/capabilities/prediction-runtime/data/report-display";
import { isRecord, type JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import type { PublicBookmarkDto, PublicRunDto } from "@/shared/api/openapi.gen";

/** One report of a kept public run, ready to render as a workspace run's result is rendered. */
export type PublicRunDisplayReport = {
  key: string;
  report: SchemaDisplayReport;
  /** The run's answer in the shape a stored result has, which the renderer reads. */
  result: { modelId: number; modelInput: JsonRecord; output: JsonRecord };
  /** What the runtime returned for the report, as the feedback questionnaire reads it. */
  payload: JsonRecord;
};

const reportsOf = (schema: unknown): ReportConfig[] =>
  isRecord(schema) && Array.isArray(schema.reports)
    ? (schema.reports.filter(isRecord) as ReportConfig[])
    : [];

/**
 * A public form expands each stored report once per model and keys the copies `out0`, `out1`,
 * ... in order; a run answers under those keys. Nothing here names a model: the renderer is
 * given a stand-in id, which it only echoes in metadata.
 */
export const publicRunDisplayReports = (
  formSchema: PublicBookmarkDto["formSchema"],
  run: Pick<PublicRunDto, "reports">,
): PublicRunDisplayReport[] =>
  reportsOf(formSchema).flatMap((config, order): PublicRunDisplayReport[] => {
    const key = String(config.mappedTo);
    const answer = run.reports.find((report) => report.key === key);
    if (!answer || !isRecord(answer.payload)) return [];
    const payload = answer.payload;
    const normalized = toPublicReportPayload(config, payload);
    if (!normalized) return [];
    const kind = typeof config.kind === "string" ? config.kind : "report";
    const labels = mappingLabels((config as JsonRecord).labels) ?? mappingLabels(payload.mapping);
    return [
      {
        key,
        report: {
          id: key,
          order,
          label: typeof config.label === "string" ? config.label : key,
          kind,
          config,
          labels,
          payload: normalized,
        },
        result: { modelId: 0, modelInput: {}, output: { reports: [payload] } },
        payload,
      },
    ];
  });
