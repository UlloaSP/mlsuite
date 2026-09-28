/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform/kit";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import type { AfterSubmitContext, SubmitErrorContext } from "mlform/runtime";
import { normalizeSchema, type ReportContext } from "mlform/schema";
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
  onRunningChange?: (running: boolean) => void;
};

const RESULTS_TAB = "results";

/** The tabs view MLForm attaches to its host element in tabs layout. */
type TabsHost = HTMLElement & { view?: { setActiveTab: (tabId: string) => void } };

/** Inputs in one tab, model results in the other (when the schema has reports). */
const tabsLayout = (fieldIds: string[], reportIds: string[]) => ({
  kind: "tabs" as const,
  tabs: [
    {
      id: "inputs",
      title: "Inputs",
      children: fieldIds.map((field) => ({ kind: "field" as const, field })),
    },
    ...(reportIds.length > 0
      ? [
          {
            id: RESULTS_TAB,
            title: "Results",
            children: reportIds.map((report) => ({ kind: "report" as const, report })),
          },
        ]
      : []),
  ],
});

/**
 * MLForm's tabs repeat each tab's title as a heading inside the panel ("Inputs"
 * under the "Inputs" tab). The kit exposes no option or part for it, so hide it
 * in the tabs element's shadow root. Skipped where stylesheets can't be built (jsdom).
 */
const hideTabTitles = (host: HTMLElement) => {
  const root = host.shadowRoot;
  if (
    !root ||
    typeof CSSStyleSheet === "undefined" ||
    !("replaceSync" in CSSStyleSheet.prototype)
  ) {
    return;
  }
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(".tab-header { display: none; }");
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  } catch {
    // Cosmetic only; the duplicate heading is harmless.
  }
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
    schemaRunDebug("mount.after-submit", {
      raw: next.raw,
      reportCount: Array.isArray(next.raw.reports) ? next.raw.reports.length : 0,
    });
    onRunningChange?.(false);
    onSubmit?.(isRecord(next.raw.inputData) ? next.raw.inputData : {}, next.raw, false);
  };
  const handleSubmitted = ({ result }: AfterSubmitContext) => {
    submitted = {
      raw: isRecord(result.raw) ? result.raw : { raw: result.raw },
      contexts: (result.reportContexts ?? {}) as Record<string, ReportContext>,
    };
    if (mounted && normalized.reports.length > 0) {
      (mounted.host as TabsHost).view?.setActiveTab(RESULTS_TAB);
    }
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
        schemaRunDebugError("mount.submit-error", error);
        onRunningChange?.(false);
        onSubmitError?.(error);
      },
    },
    layout: tabsLayout(
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
  hideTabTitles(form.host);
  const unsubscribe = form.form.subscribe(completeWhenSettled);
  return {
    form: form.form,
    host: form.host,
    updateTheme(nextTheme) {
      form.replaceDesignSystem(getPredictionDesignSystem(nextTheme));
    },
    unmount() {
      schemaRunDebug("mount.unmount");
      unsubscribe();
      form.unmount();
    },
  };
};
