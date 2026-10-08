/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlSuiteRegistry } from "./builtin-registry";
import { mountForm } from "mlform/kit";
import { createBuiltinPrimitiveRegistry } from "mlform/primitives";
import type { ReportConfig, SubmitErrorContext, SubmitRequest, Transport } from "mlform/runtime";
import { validateSchema, type ReportResult } from "mlform/schema";
import { toAnalyzerReportPayload } from "@/capabilities/prediction-runtime/data/report-normalization";
import { withResolvedDisplayKeys } from "@/capabilities/prediction-runtime/mlform/display-key";
import { withSeriesColumns } from "./series-schema";
import {
  connectStoredStatusConditions,
  withStoredStatusConditions,
} from "./stored-status-conditions";
import { getPredictionDesignSystem } from "@/capabilities/prediction-runtime/mlform/headless-prediction";
import {
  type JsonRecord,
  type PredictionTheme,
  isRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";
import { adoptShadowRules } from "@/capabilities/prediction-runtime/mlform/shadow-rules";

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
  /**
   * Runs the form's values, keyed by input key, and resolves with the reports that have a
   * result, or with null when no run was made: the form then keeps the result it shows.
   */
  run: (values: JsonRecord, signal?: AbortSignal) => Promise<readonly PublicRunReport[] | null>;
  onRunningChange?: (running: boolean) => void;
  onRunError?: (error: unknown) => void;
};

export type MountedPublicRunForm = {
  updateTheme: (theme: PredictionTheme) => void;
  /** Shows or withholds the Run action; the fields and the shown result are left as they are. */
  setRunOffered: (offered: boolean) => void;
  unmount: () => void;
};

const RUN_WITHHELD = "data-run-withheld";

/**
 * What the kit always draws and a public page must not show. Its count of fields, reports and
 * submits repeats the page's own, and counts fields a visitor never sees. Its status reads
 * "success" whenever the transport answered, and a refused or failed run answers too: the host
 * tells what happened to a run. Its submit action is hidden while the host withholds the run.
 */
const PUBLIC_RUN_RULES = `
  .meta, .left-section .sticky-meta { display: none; }
  :host([${RUN_WITHHELD}]) .form-actions { display: none; }
`;

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
 * Mounts a public form to be filled and run, inputs beside results: the same fields and report
 * rendering as a workspace run, but one request decides the whole run and nothing here names a
 * model.
 */
export const mountPublicRunForm = ({
  container,
  schema,
  theme,
  run,
  onRunningChange,
  onRunError,
}: Options): MountedPublicRunForm => {
  const registry = createMlSuiteRegistry();
  const result = validateSchema(
    withStoredStatusConditions(withSeriesColumns(withResolvedDisplayKeys(schema))),
    registry,
  );
  if (!result.success) throw new Error(result.issues[0]?.message ?? "Invalid MLForm schema.");
  // The reports of the last run that was made: a refused one leaves them on screen.
  let shown: readonly PublicRunReport[] = [];
  const transport: Transport = {
    /**
     * A failed run resolves with no results instead of rejecting: MLForm would show the raw
     * error text and leave its rejection unhandled, and the host owns what a visitor is told.
     */
    submit: async (request: SubmitRequest) => {
      const reports = request.reports as readonly ReportConfig[];
      try {
        const answered = await run(
          isRecord(request.modelValues) ? request.modelValues : {},
          request.signal,
        );
        shown = answered ?? shown;
      } catch (error) {
        shown = [];
        onRunError?.(error);
      }
      return { reports: reports.map((report) => toReportResult(report, shown)) };
    },
  };
  const mounted = mountForm(container, {
    schema: result.data,
    registry,
    primitiveRegistry: createBuiltinPrimitiveRegistry(),
    transport,
    hooks: {
      beforeSubmit() {
        onRunningChange?.(true);
      },
      afterSubmit() {
        onRunningChange?.(false);
      },
      // Reached when MLForm itself cannot submit; a failed run is reported by the transport.
      onSubmitError({ error }: SubmitErrorContext) {
        onRunningChange?.(false);
        onRunError?.(error);
      },
    },
    layout: { kind: "split" },
    reportPane: "always",
    reportFetchMode: "none",
    labels: {
      form: "Inputs",
      reports: "Results",
      submit: "Run",
      validating: "Checking inputs…",
      submitting: "Running…",
    },
    primitiveText: {
      reportsEmptyTitle: "No results yet",
      reportsEmptyBody: "Run the form to see its results here.",
    },
    designSystem: getPredictionDesignSystem(theme),
  });
  connectStoredStatusConditions(mounted.form);
  adoptShadowRules(mounted.host, PUBLIC_RUN_RULES);
  return {
    updateTheme: (nextTheme) => mounted.replaceDesignSystem(getPredictionDesignSystem(nextTheme)),
    setRunOffered: (offered) => mounted.host.toggleAttribute(RUN_WITHHELD, !offered),
    unmount: () => mounted.unmount(),
  };
};
