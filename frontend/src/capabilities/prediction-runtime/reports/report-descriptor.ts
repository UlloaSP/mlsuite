/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportDescriptorContext } from "mlform/primitives";
import type { ReportConfig } from "mlform/runtime";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";

export const describeSchemaCustomReport = (
  customReport: CatalogReportDefinition,
  config: ReportConfig,
  context: ReportDescriptorContext,
) =>
  customReport.definition.presenter.describe(config as never, context) ??
  customReport.definition.describe?.(config as never, context) ??
  null;
