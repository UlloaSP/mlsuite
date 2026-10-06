/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlRegistryPack } from "mlform/builtins";
import { mountForm } from "mlform/kit";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import type { ReportConfig, SubmitErrorContext, SubmitRequest, Transport } from "mlform/runtime";
import { normalizeSchema, validateSchema, type ReportResult } from "mlform/schema";
import { toAnalyzerReportPayload } from "@/capabilities/prediction-runtime/data/report-normalization";
import { withResolvedDisplayKeys } from "@/capabilities/prediction-runtime/mlform/display-key";
import { getPredictionDesignSystem } from "@/capabilities/prediction-runtime/mlform/headless-prediction";
import {
  hideRunTabTitles,
  runTabsLayout,
  showRunResults,
} from "@/capabilities/prediction-runtime/mlform/run-tabs-layout";
import {
  type JsonRecord,
  type PredictionTheme,
  isRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";

/** What the runtime returned for the report of the public form that carries this key. */
export type PublicRunReport = { key: string; payload: JsonRecord };

type Options = {
  container: HTMLElement;
  /**
   * A public form schema: built-in fields and reports whose `mappedTo` is an opaque key.
   * MLForm serializes each value under its key; the server maps the keys back to models.
   */
  schema: unknown;
  theme: PredictionTheme;
  /** Runs the form's values, keyed by input key, and resolves with the reports that have a result. */
  run: (values: JsonRecord, signal?: AbortSignal) => Promise<readonly PublicRunReport[]>;
  onRunningChange?: (running: boolean) => void;
  onRunError?: (error: unknown) => void;
};

export type MountedPublicRunForm = {
  updateTheme: (theme: PredictionTheme) => void;
  unmount: () => void;
};

/** MLForm's name for the backend behind a `mappedTo` that is a bare key. */
const BACKEND = "default";

const toReportResult = (
  report: ReportConfig,
  answered: readonly PublicRunReport[],
): ReportResult => {
  const mappedTo = String(report.mappedTo);
  const answer = answered.find((item) => item.key === mappedTo);
  const normalized = answer && toAnalyzerReportPayload(report, { reports: [answer.payload] });
  if (!normalized) return { backend: BACKEND, mappedTo, status: "skipped", reason: "No result" };
  const { kind: _kind, ...payload } = normalized;
  void _kind;
  return { backend: BACKEND, mappedTo, status: "ready", payload };
};

/**
 * Mounts a public form to be filled and run: the same inputs, Results tab and report rendering
 * as a workspace run, but one request decides the whole run and nothing here names a model.
 */
export const mountPublicRunForm = ({
  container,
  schema,
  theme,
  run,
  onRunningChange,
  onRunError,
}: Options): MountedPublicRunForm => {
  const pack = createMlRegistryPack();
  const result = validateSchema(withResolvedDisplayKeys(schema), pack.registry);
  if (!result.success) throw new Error(result.issues[0]?.message ?? "Invalid MLForm schema.");
  const normalized = normalizeSchema(result.data, pack.registry);
  // The outcome of the last run; the hooks below read it once MLForm has settled the submit.
  let failed = false;
  const transport: Transport = {
    /**
     * A failed run resolves with no results instead of rejecting: MLForm would show the raw
     * error text and leave its rejection unhandled, and the host owns what a visitor is told.
     */
    submit: async (request: SubmitRequest) => {
      const reports = request.reports as readonly ReportConfig[];
      failed = false;
      try {
        const answered = await run(
          isRecord(request.modelValues) ? request.modelValues : {},
          request.signal,
        );
        return { reports: reports.map((report) => toReportResult(report, answered)) };
      } catch (error) {
        failed = true;
        onRunError?.(error);
        return { reports: reports.map((report) => toReportResult(report, [])) };
      }
    },
  };
  const mounted = mountForm(container, {
    schema: result.data,
    registry: pack.registry,
    descriptorRegistry: pack.descriptorRegistry,
    primitiveRegistry: createBuiltinPrimitiveRegistry(),
    transport,
    hooks: {
      beforeSubmit() {
        onRunningChange?.(true);
      },
      afterSubmit() {
        onRunningChange?.(false);
        if (!failed && normalized.reports.length > 0) showRunResults(mounted.host);
      },
      // Reached when MLForm itself cannot submit; a failed run is reported by the transport.
      onSubmitError({ error }: SubmitErrorContext) {
        onRunningChange?.(false);
        onRunError?.(error);
      },
    },
    layout: runTabsLayout(
      normalized.fields.map((field) => field.id),
      normalized.reports.map((report) => report.id),
    ),
    reportFetchMode: "none",
    labels: { submit: "Run", validating: "Checking inputs…", submitting: "Running…" },
    designSystem: getPredictionDesignSystem(theme),
  });
  hideRunTabTitles(mounted.host);
  return {
    updateTheme: (nextTheme) => mounted.replaceDesignSystem(getPredictionDesignSystem(nextTheme)),
    unmount: () => mounted.unmount(),
  };
};
