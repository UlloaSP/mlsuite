/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform/kit";
import { connectStoredStatusConditions } from "./stored-status-conditions";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import type { AfterSubmitContext, SubmitErrorContext } from "mlform/runtime";
import { normalizeSchema, type ReportContext } from "mlform/schema";
import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import { getPredictionDesignSystem } from "./headless-prediction";
import {
  hideRunTabTitles,
  runTabsLayout,
  showRunResults,
} from "@/capabilities/prediction-runtime/mlform/run-tabs-layout";
import {
  type JsonRecord,
  type MountedPredictionForm,
  type PredictionTheme,
  isRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";
import type {
  CatalogFieldDefinition,
  CatalogReportDefinition,
} from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import {
  buildSchemaRunRawFromSubmitResult,
  reportStatesFromSnapshot,
} from "@/capabilities/prediction-runtime/mlform/schema-run-result-state";

type Options = {
  container: HTMLElement;
  schema: unknown;
  bindings: readonly {
    modelId: number;
    modelName?: string;
    pluginPolicy?: JsonRecord | null;
  }[];
  theme: PredictionTheme;
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
  onSubmit?: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
  onSubmitError?: (error: unknown) => void;
  onRunningChange?: (running: boolean) => void;
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
  onRunningChange,
}: Options): MountedPredictionForm => {
  const runtime = createSchemaRunRuntime({
    schema,
    bindings,
    customFieldDefinitions,
    customReportDefinitions,
  });
  // Layout references use the ids MLForm gives fields and reports once normalized.
  const normalized = normalizeSchema(runtime.formSchema, runtime.registry);
  let mounted: ReturnType<typeof mountForm> | undefined;
  // The submitted result waits here while "all" report fetching finishes; the run
  // completes once every report has settled, as the split layout's success event did.
  let submitted: { raw: JsonRecord; contexts: Record<string, ReportContext> } | null = null;
  const completeWhenSettled = () => {
    if (!mounted || !submitted) return;
    const next = buildSchemaRunRawFromSubmitResult(
      submitted.raw,
      mounted.form.reports,
      reportStatesFromSnapshot(mounted.form.state.reportStates),
      bindings,
      submitted.contexts,
    );
    if (next.reportsPending) return;
    submitted = null;
    onRunningChange?.(false);
    onSubmit?.(isRecord(next.raw.inputData) ? next.raw.inputData : {}, next.raw, false);
  };
  const handleSubmitted = async ({ result }: AfterSubmitContext) => {
    submitted = {
      raw: isRecord(result.raw) ? result.raw : { raw: result.raw },
      contexts: (result.reportContexts ?? {}) as Record<string, ReportContext>,
    };
    if (mounted && normalized.reports.length > 0) await showRunResults(mounted.host);
    completeWhenSettled();
  };
  mounted = mountForm(container, {
    schema: runtime.formSchema,
    registry: runtime.registry,
    descriptorRegistry: runtime.descriptorRegistry,
    primitiveRegistry: createBuiltinPrimitiveRegistry(),
    transport: runtime.transport,
    hooks: {
      beforeSubmit() {
        onRunningChange?.(true);
      },
      afterSubmit: handleSubmitted,
      onSubmitError({ error }: SubmitErrorContext) {
        submitted = null;
        onRunningChange?.(false);
        onSubmitError?.(error);
      },
    },
    layout: runTabsLayout(
      normalized.fields.map((field) => field.id),
      normalized.reports.map((report) => report.id),
    ),
    reportFetchMode: "all",
    labels: {
      submit: "Run schema",
      validating: "Checking schema…",
      submitting: "Running models…",
    },
    designSystem: getPredictionDesignSystem(theme),
  });
  const form = mounted;
  connectStoredStatusConditions(form.form);
  hideRunTabTitles(form.host);
  const unsubscribe = form.form.subscribe(completeWhenSettled);
  return {
    form: form.form,
    host: form.host,
    updateTheme(nextTheme) {
      form.replaceDesignSystem(getPredictionDesignSystem(nextTheme));
    },
    unmount() {
      unsubscribe();
      form.unmount();
    },
  };
};
