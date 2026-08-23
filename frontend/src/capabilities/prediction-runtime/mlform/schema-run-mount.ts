/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform/kit";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import type { PrimitiveSubmitSuccessDetail } from "mlform/primitives";
import type { SubmitErrorContext } from "mlform/runtime";
import type { ReportContext } from "mlform/schema";
import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import { getPredictionDesignSystem } from "./headless-prediction";
import {
  type JsonRecord,
  type MountedPredictionForm,
  type PredictionTheme,
  isRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";
import type { CatalogFieldDefinition } from "@/capabilities/prediction-runtime/plugins/custom-field-catalog";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/custom-report-catalog";
import {
  schemaRunDebug,
  schemaRunDebugError,
} from "@/capabilities/prediction-runtime/mlform/run-debug";
import {
  buildSchemaRunRawFromSubmitResult,
  mergeReportFetchResults,
  reportStatesFromSnapshot,
} from "@/capabilities/prediction-runtime/mlform/schema-run-result-state";

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

const rawFromSubmitSuccess = (detail: PrimitiveSubmitSuccessDetail | undefined): JsonRecord => {
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
    primitiveRegistry: createBuiltinPrimitiveRegistry(),
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
    const detail = (event as CustomEvent<PrimitiveSubmitSuccessDetail>).detail;
    const submitResult = detail?.pipelineResult?.submitResult ?? detail?.result;
    const raw = rawFromSubmitSuccess(detail);
    const reportStates = mergeReportFetchResults(
      reportStatesFromSnapshot(mounted.form.state.reportStates),
      detail?.pipelineResult?.reportFetchResults,
    );
    schemaRunDebug("mount.after-submit.before-normalize", {
      raw,
      reports: mounted.form.reports,
      reportStates,
    });
    const next = buildSchemaRunRawFromSubmitResult(
      raw,
      mounted.form.reports,
      reportStates,
      bindings,
      (submitResult?.reportContexts ?? {}) as Record<string, ReportContext>,
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
