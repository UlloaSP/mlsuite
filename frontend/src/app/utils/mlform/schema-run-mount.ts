/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform/kit";
import type { SubmitErrorContext } from "mlform/runtime";
import { createPredictionPrimitiveRegistry } from "./primitive-registry";
import { createSchemaRunRuntime } from "../../../algorithms/schema/runtime-assembly";
import { getPredictionDesignSystem } from "./headless-prediction";
import {
  type JsonRecord,
  type MountedPredictionForm,
  type PredictionTheme,
  isRecord,
} from "../../../algorithms/mlform/shared";
import type { CatalogFieldDefinition } from "../../../algorithms/plugin/custom-field-catalog";
import type { CatalogReportDefinition } from "../../../algorithms/plugin/custom-report-catalog";
import { schemaRunDebug, schemaRunDebugError } from "../../../algorithms/schema/run-debug";
import {
  buildSchemaRunRawFromSubmitResult,
  reportStatesFromSnapshot,
} from "../../../algorithms/mlform/schema-run-result-state";

type Options = {
  container: HTMLElement;
  schema: unknown;
  bindings: readonly {
    modelId: string;
    pluginPolicy?: JsonRecord | null;
  }[];
  theme: PredictionTheme;
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
  onSubmit?: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
  onSubmitError?: (error: unknown) => void;
};

type SubmitSuccessDetail = {
  result?: { raw?: unknown };
  pipelineResult?: {
    submitResult?: { raw?: unknown };
  };
};

const rawFromSubmitSuccess = (detail: SubmitSuccessDetail | undefined): JsonRecord => {
  schemaRunDebug("mount.submit-success.detail", detail);
  const result = detail?.pipelineResult?.submitResult ?? detail?.result;
  const raw = isRecord(result?.raw) ? result.raw : { raw: result?.raw };
  schemaRunDebug("mount.submit-success.raw", raw);
  return raw;
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
  schemaRunDebug("mount.start", {
    bindings: bindings.length,
    customFields: customFieldDefinitions.map((definition) => definition.kind),
    customReports: customReportDefinitions.map((definition) => definition.kind),
  });
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
      onSubmitError({ error }: SubmitErrorContext) {
        schemaRunDebugError("mount.submit-error", error);
        onSubmitError?.(error);
      },
    },
    layout: { kind: "split" },
    reportPane: "always",
    reportFetchMode: "all",
    labels: {
      form: "Schema Inputs",
      reports: "Model Results",
      submit: "Run Schema",
      validating: "Checking schema...",
      submitting: "Running models...",
    },
    designSystem: getPredictionDesignSystem(theme),
  });
  const handleSubmitSuccess = (event: Event) => {
    const raw = rawFromSubmitSuccess((event as CustomEvent<SubmitSuccessDetail>).detail);
    schemaRunDebug("mount.after-submit.before-normalize", {
      raw,
      reports: mounted.form.reports,
      reportStates: mounted.form.state.reportStates,
    });
    const next = buildSchemaRunRawFromSubmitResult(
      raw,
      mounted.form.reports,
      reportStatesFromSnapshot(mounted.form.state.reportStates),
      bindings,
    );
    schemaRunDebug("mount.after-submit", {
      raw: next.raw,
      reportCount: Array.isArray(next.raw.reports) ? next.raw.reports.length : 0,
      reportsPending: next.reportsPending,
    });
    onSubmit?.(
      isRecord(next.raw.inputData) ? next.raw.inputData : {},
      next.raw,
      next.reportsPending,
    );
  };
  mounted.host.addEventListener("mlf-submit-success", handleSubmitSuccess);
  return {
    form: mounted.form,
    host: mounted.host,
    updateTheme(nextTheme) {
      mounted.replaceDesignSystem(getPredictionDesignSystem(nextTheme));
    },
    unmount() {
      schemaRunDebug("mount.unmount");
      mounted.host.removeEventListener("mlf-submit-success", handleSubmitSuccess);
      mounted.unmount();
    },
  };
};
