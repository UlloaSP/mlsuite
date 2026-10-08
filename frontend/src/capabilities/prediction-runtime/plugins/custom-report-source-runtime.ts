/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { defineReportKind, type DefinedReportKind } from "mlform/view";
import { compilePluginSource } from "@/capabilities/prediction-runtime/plugins/plugin-source-compiler";

// Catalog kinds have different config types; each definition validates its own Zod contract.
export type CustomReportKind = DefinedReportKind<any, unknown>;

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
  const probe = definition.definition.schema.safeParse({
    kind: definition.kind,
    label: "Preview report",
  });
  if (probe.success) {
    definition.presenter.describe(
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
