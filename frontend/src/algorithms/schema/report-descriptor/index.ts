/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportDescriptorContext } from "mlform/primitives";
import type { ReportConfig } from "mlform/runtime";
import type { CatalogReportDefinition } from "../../plugin/custom-report-catalog";
import {
  schemaRunDebug,
  schemaRunDebugError,
} from "../run-debug";

/**
 * describeSchemaCustomReport: performs the exported transformation for this algorithm.
 *
 * Purpose: describes schema custom report payloads with plugin presenters.
 * @param customReport - Input consumed by describeSchemaCustomReport; uses the describes schema custom report payloads with plugin presenters contract.
 * @param config - Input consumed by describeSchemaCustomReport; uses the describes schema custom report payloads with plugin presenters contract.
 * @param context - Input consumed by describeSchemaCustomReport; uses the describes schema custom report payloads with plugin presenters contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
