/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { defineReportKind, type DefinedReportKind } from "mlform/kit";
import type { ReportConfig } from "mlform/runtime";
import { compilePluginSource } from "@/capabilities/prediction-runtime/plugins/plugin-source-compiler";

export type CustomReportKind = DefinedReportKind<ReportConfig, unknown>;

export const resolveCustomReportDefinition = (
  organizationId: number | string,
  source: string,
): Promise<CustomReportKind> =>
  compilePluginSource(organizationId, source, {
    plugin: "report",
    defineName: "defineReportKind",
    define: defineReportKind,
  }) as Promise<CustomReportKind>;

export const validateCustomReportSource = async (
  organizationId: number | string,
  source: string,
): Promise<CustomReportKind> => {
  const definition = await resolveCustomReportDefinition(organizationId, source);
  const probe = definition.schema.safeParse({ kind: definition.kind, label: "Preview report" });
  if (probe.success && definition.describe) {
    definition.describe(
      { ...probe.data, id: "preview-report", source: "preview-report" },
      {
        reportId: "preview-report",
        state: { payload: undefined, error: null, status: "ready" },
        payload: {},
        result: {
          inputs: [],
          displayValues: {},
          modelValues: {},
          reportStates: {},
          reportContexts: {},
          reports: [],
          meta: {},
          raw: {},
        },
      },
    );
  }
  return definition;
};
