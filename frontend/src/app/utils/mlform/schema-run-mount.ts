/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform/kit";
import { type AfterSubmitContext, type SubmitErrorContext } from "mlform/runtime";
import { createPredictionPrimitiveRegistry } from "./primitive-registry";
import { createSchemaRunRuntime } from "./schema-run-runtime";
import { getPredictionDesignSystem } from "./headless-prediction";
import { type JsonRecord, type MountedPredictionForm, type PredictionTheme, isRecord } from "./shared";
import type { CatalogFieldDefinition } from "./custom-field";
import type { CatalogReportDefinition } from "./custom-report";

type Options = {
  container: HTMLElement;
  schema: unknown;
  bindings: readonly {
    modelId: string;
    signatureId: string;
    inputMapping?: JsonRecord;
    outputMapping?: JsonRecord;
    pluginPolicy?: JsonRecord | null;
  }[];
  theme: PredictionTheme;
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
  onSubmit?: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
  onSubmitError?: (error: unknown) => void;
};

export const mountSchemaRunForm = ({
  container,
  schema,
  bindings,
  theme,
  customFieldDefinitions = [],
  customReportDefinitions = [],
  onSubmit,
  onSubmitError,
}: Options): MountedPredictionForm => {
  const runtime = createSchemaRunRuntime({
    schema,
    bindings,
    customFieldDefinitions,
    customReportDefinitions,
  });
  const mounted = mountForm(container, {
    schema: runtime.formSchema,
    registry: runtime.registry,
    descriptorRegistry: runtime.descriptorRegistry,
    primitiveRegistry: createPredictionPrimitiveRegistry(),
    transport: runtime.transport,
    hooks: {
      afterSubmit({ result }: AfterSubmitContext) {
        const raw = isRecord(result.raw) ? result.raw : { raw: result.raw };
        const reports = isRecord(raw.reports) ? raw.reports : {};
        const contexts = isRecord(raw.reportContextById) ? raw.reportContextById : {};
        const reportsPending = Object.keys(contexts).some((reportId) => !(reportId in reports));
        onSubmit?.(isRecord(raw.inputData) ? raw.inputData : {}, raw, reportsPending);
      },
      onSubmitError({ error }: SubmitErrorContext) {
        onSubmitError?.(error);
      },
    },
    layout: { kind: "split" },
    reportPane: "always",
    labels: {
      form: "Schema Inputs",
      reports: "Model Results",
      submit: "Run Schema",
      validating: "Checking schema...",
      submitting: "Running models...",
    },
    designSystem: getPredictionDesignSystem(theme),
  });
  return {
    form: mounted.form,
    host: mounted.host,
    updateTheme(nextTheme) {
      mounted.replaceDesignSystem(getPredictionDesignSystem(nextTheme));
    },
    unmount() {
      mounted.unmount();
    },
  };
};
