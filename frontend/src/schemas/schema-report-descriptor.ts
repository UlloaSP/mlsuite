/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReportDescriptorContext } from "mlform/primitives";
import type { ReportConfig } from "mlform/runtime";
import type { CatalogReportDefinition } from "../app/utils/mlform/custom-report";

export const describeSchemaCustomReport = (
  customReport: CatalogReportDefinition,
  config: ReportConfig,
  context: ReportDescriptorContext,
) =>
  customReport.definition.presenter.describe(config as never, context) ??
  customReport.definition.describe?.(config as never, context) ??
  null;
