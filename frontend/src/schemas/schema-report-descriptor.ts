/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportDescriptorContext } from "mlform/primitives";
import type { ReportConfig } from "mlform/runtime";
import type { CatalogReportDefinition } from "../plugin/mlform/custom-report";
import { schemaRunDebug, schemaRunDebugError } from "../app/utils/mlform/schema-run-debug";

export const describeSchemaCustomReport = (
  customReport: CatalogReportDefinition,
  config: ReportConfig,
  context: ReportDescriptorContext,
) => {
  schemaRunDebug("descriptor.describe.start", {
    kind: customReport.kind,
    reportId: config.id,
  });
  try {
    const descriptor =
      customReport.definition.presenter.describe(config as never, context) ??
      customReport.definition.describe?.(config as never, context) ??
      null;
    schemaRunDebug("descriptor.describe.done", {
      kind: customReport.kind,
      reportId: config.id,
      hasDescriptor: Boolean(descriptor),
    });
    return descriptor;
  } catch (error) {
    schemaRunDebugError("descriptor.describe.error", error, {
      kind: customReport.kind,
      reportId: config.id,
    });
    throw error;
  }
};
