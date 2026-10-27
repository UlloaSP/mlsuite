/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform/kit";
import { connectStoredStatusConditions } from "./stored-status-conditions";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import type { AfterSubmitContext, FormState, SubmitErrorContext, Transport } from "mlform/runtime";
import { normalizeSchema } from "mlform/schema";
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
  type PredictionPayloadField,
  type PredictionTheme,
  isRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";
import type {
  CatalogFieldDefinition,
  CatalogReportDefinition,
} from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import {
  reportStatesFromSnapshot,
  schemaRunReportsPending,
} from "@/capabilities/prediction-runtime/mlform/schema-run-result-state";

type RunResultCallback = (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;

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
  /** Runs the form's values against its models, given the fields the schema normalized to. */
  transport: (fields: readonly PredictionPayloadField[]) => Transport;
  /** The run, once every report it asked for has settled. */
  onSubmit?: RunResultCallback;
  /** The last run, each time its result or a report's state changes. */
  onResultUpdate?: RunResultCallback;
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
  transport,
  onSubmit,
  onResultUpdate,
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
  let submitted: JsonRecord | null = null;
  const completeWhenSettled = () => {
    if (!mounted || !submitted) return;
    const reportStates = reportStatesFromSnapshot(mounted.form.state.reportStates);
    if (schemaRunReportsPending(mounted.form.reports, reportStates)) return;
    const raw = submitted;
    submitted = null;
    onRunningChange?.(false);
    onSubmit?.(isRecord(raw.inputData) ? raw.inputData : {}, raw, false);
  };
  const handleSubmitted = async ({ result }: AfterSubmitContext) => {
    submitted = isRecord(result.raw) ? result.raw : { raw: result.raw };
    if (mounted && normalized.reports.length > 0) await showRunResults(mounted.host);
    completeWhenSettled();
  };
  mounted = mountForm(container, {
    schema: runtime.formSchema,
    registry: runtime.registry,
    descriptorRegistry: runtime.descriptorRegistry,
    primitiveRegistry: createBuiltinPrimitiveRegistry(),
    transport: transport(runtime.normalizedFields),
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
  let reported: Pick<FormState, "lastResult" | "reportStates"> | null = null;
  const reportUpdate = (state: FormState) => {
    const { lastResult, reportStates } = state;
    if (!lastResult || !onResultUpdate) return;
    if (reported?.lastResult === lastResult && reported.reportStates === reportStates) return;
    reported = { lastResult, reportStates };
    const raw = isRecord(lastResult.raw) ? lastResult.raw : { raw: lastResult.raw };
    onResultUpdate(
      isRecord(raw.inputData) ? raw.inputData : {},
      raw,
      schemaRunReportsPending(form.form.reports, reportStatesFromSnapshot(reportStates)),
    );
  };
  const unsubscribe = form.form.subscribe((state) => {
    completeWhenSettled();
    reportUpdate(state);
  });
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
