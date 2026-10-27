/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { attachDesignSystem } from "mlform/design";
import {
  createBuiltinPrimitiveRegistry,
  primitiveStaticText,
  primitiveTagNames,
  type PrimitiveRegistry,
  type PrimitiveReportController,
  type PrimitiveSubmitResult,
  type ReportDescriptor,
} from "mlform/primitives";
import type { ReportConfig } from "mlform/runtime";
import { getPredictionDesignSystem } from "@/capabilities/prediction-runtime/mlform/headless-prediction";
import { reportTargetForBinding } from "@/capabilities/prediction-runtime/mlform/schema-run-report-mapping";
import { isRecord, type PredictionTheme } from "@/capabilities/prediction-runtime/mlform/shared";
import { resolveCustomReportDefinition } from "@/capabilities/prediction-runtime/plugins/custom-report-source-runtime";
import type { SandboxReportView } from "./sandbox-protocol";

type ReportFrame = HTMLElement & {
  controller?: PrimitiveReportController;
  descriptor?: ReportDescriptor;
  registry?: PrimitiveRegistry;
  text?: typeof primitiveStaticText;
  lastResult?: PrimitiveSubmitResult;
};

/** A saved result as the report's presenter reads one: the result it was given in the run. */
const submitResultOf = ({
  report,
  result,
  backendUrl,
}: SandboxReportView): PrimitiveSubmitResult => {
  const state = { payload: report.payload, error: null, status: "ready" as const };
  const meta = {
    backendUrl,
    backendFieldValues: result.modelInput,
    schemaRun: true,
    modelId: result.modelId,
    ...(isRecord(result.output.meta) ? result.output.meta : {}),
  };
  const config = report.config as ReportConfig;
  const target = reportTargetForBinding(config, { modelId: result.modelId }) ?? report.id;
  return {
    inputs: [],
    displayValues: {},
    modelValues: result.modelInput,
    reports: [
      {
        backend: String(result.modelId),
        mappedTo: target,
        status: "ready",
        payload: report.payload,
      },
    ],
    reportContexts: {
      [report.id]: {
        reportId: report.id,
        kind: report.kind,
        label: report.label,
        mappedTo: config.mappedTo,
        target,
        targetKey: String(target),
        backend: String(result.modelId),
        displayValues: {},
        modelValues: result.modelInput,
        reports: [],
        meta,
        raw: result.output,
      },
    },
    reportStates: { [report.id]: state },
    meta,
    raw: result.output,
  };
};

/** Draws one saved report with its plugin's presenter, which draws its own card and title. */
export const renderSandboxReport = async (
  root: HTMLElement,
  view: SandboxReportView,
  theme: PredictionTheme,
) => {
  const definition = await resolveCustomReportDefinition(view.plugin.source);
  const { report } = view;
  const config = { ...(report.config as ReportConfig), id: report.id };
  const state = { payload: report.payload, error: null, status: "ready" as const };
  const lastResult = submitResultOf(view);
  const descriptor = definition.presenter.describe(config as never, {
    reportId: report.id,
    state,
    payload: report.payload,
    result: lastResult,
  });
  if (!descriptor) return { rendered: false, updateTheme: () => {}, unmount: () => {} };

  const host = document.createElement("div");
  root.replaceChildren(host);
  let designSystem = attachDesignSystem(host, { config: getPredictionDesignSystem(theme) });
  const frame = document.createElement(primitiveTagNames.reportFrame) as ReportFrame;
  frame.controller = {
    id: report.id,
    kind: report.kind,
    config: { ...config, label: report.label },
    state,
    fetch: async () => report.payload,
    subscribe: () => () => {},
  };
  frame.descriptor = descriptor;
  frame.registry = createBuiltinPrimitiveRegistry();
  frame.text = primitiveStaticText;
  frame.lastResult = lastResult;
  host.append(frame);
  return {
    rendered: true,
    updateTheme(next: PredictionTheme) {
      designSystem.disconnect();
      designSystem = attachDesignSystem(host, { config: getPredictionDesignSystem(next) });
    },
    unmount() {
      designSystem.disconnect();
      root.replaceChildren();
    },
  };
};
