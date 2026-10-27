/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform/kit";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import { defineMLFormPlugin } from "mlform/view";
import { createMlSuiteRegistry } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { getPredictionDesignSystem } from "@/capabilities/prediction-runtime/mlform/headless-prediction";
import {
  createSchemaPreviewTransport,
  prepareSchemaPreviewReports,
} from "@/capabilities/prediction-runtime/mlform/preview-transport";
import { toMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";
import type { PredictionTheme } from "@/capabilities/prediction-runtime/mlform/shared";
import { connectStoredStatusConditions } from "@/capabilities/prediction-runtime/mlform/stored-status-conditions";
import type { PredictionCatalogDefinitions } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";

type Options = {
  container: HTMLElement;
  /** A schema being edited, whose reports have no model to answer them yet. */
  schema: unknown;
  plugins: PredictionCatalogDefinitions;
  theme: PredictionTheme;
};

/**
 * Mounts a schema's form as its editor previews it: inputs and results side by side, run
 * against local stand-in results. An invalid schema throws with its first issue.
 */
export const mountSchemaPreviewForm = ({ container, schema, plugins, theme }: Options) => {
  const mounted = mountForm(container, {
    schema: toMlformSchema(prepareSchemaPreviewReports(schema), {
      customFieldDefinitions: plugins.fieldDefinitions,
      customReportDefinitions: plugins.reportDefinitions,
    }),
    registry: createMlSuiteRegistry(),
    plugins: [
      defineMLFormPlugin({
        fields: plugins.fieldDefinitions.map((item) => item.definition),
        reports: plugins.reportDefinitions.map((item) => item.definition),
      }),
    ],
    primitiveRegistry: createBuiltinPrimitiveRegistry(),
    transport: createSchemaPreviewTransport(),
    layout: { kind: "split" },
    reportPane: "always",
    reportFetchMode: "none",
    labels: {
      form: "Schema inputs",
      reports: "Preview results",
      submit: "Run preview",
      validating: "Checking schema…",
      submitting: "Rendering preview…",
    },
    designSystem: getPredictionDesignSystem(theme),
  });
  connectStoredStatusConditions(mounted.form);
  return {
    updateTheme: (next: PredictionTheme) =>
      mounted.replaceDesignSystem(getPredictionDesignSystem(next)),
    unmount: () => mounted.unmount(),
  };
};
