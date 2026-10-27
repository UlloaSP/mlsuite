/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SubmitRequest } from "mlform/runtime";
import { mountPublicRunForm } from "@/capabilities/prediction-runtime/mlform/public-run-mount";
import { mountSchemaPreviewForm } from "@/capabilities/prediction-runtime/mlform/schema-preview-mount";
import { mountSchemaRunForm } from "@/capabilities/prediction-runtime/mlform/schema-run-mount";
import type { JsonRecord, PredictionTheme } from "@/capabilities/prediction-runtime/mlform/shared";
import { compilePluginCatalog } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { explanationFetch } from "./guest-explanations";
import { renderSandboxReport } from "./guest-report";
import type { SandboxChannel } from "./sandbox-channel";
import { toJsonData, type AppEvents, type AppMethods, type SandboxView } from "./sandbox-protocol";

type App = SandboxChannel<AppMethods, AppEvents>;
type Scope = Pick<typeof globalThis, "fetch">;

export type SandboxGuestView = {
  rendered: boolean;
  updateTheme(theme: PredictionTheme): void;
  setRunOffered?(offered: boolean): void;
  unmount(): void;
};

/** A run the app made and already told the visitor about; the form only shows no result. */
class ReportedRunFailure extends Error {}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const runResult = (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) =>
  toJsonData({ inputData, raw, reportsPending });

const submitted = (request: SubmitRequest) =>
  toJsonData({
    inputs: request.inputs as unknown as JsonRecord[],
    displayValues: { ...request.displayValues },
    modelValues: { ...request.modelValues },
    reports: [...request.reports] as JsonRecord[],
  });

const mountRunForm = async (
  root: HTMLElement,
  view: Extract<SandboxView, { kind: "run" }>,
  theme: PredictionTheme,
  app: App,
  scope: Scope,
): Promise<SandboxGuestView> => {
  const plugins = await compilePluginCatalog(view.plugins);
  scope.fetch = explanationFetch(app, view.backendUrl);
  const mounted = mountSchemaRunForm({
    container: root,
    schema: view.schema,
    bindings: view.bindings,
    theme,
    customFieldDefinitions: plugins.fieldDefinitions,
    customReportDefinitions: plugins.reportDefinitions,
    transport: (fields) => ({
      submit: (request) =>
        app.request("submit", { request: submitted(request), fields: toJsonData([...fields]) }),
    }),
    onSubmit: (...result) => app.emit("run-settled", runResult(...result)),
    onResultUpdate: (...result) => app.emit("run-updated", runResult(...result)),
    onSubmitError: (error) => app.emit("submit-error", { message: message(error) }),
    onRunningChange: (running) => app.emit("running", { running }),
  });
  return { rendered: true, updateTheme: mounted.updateTheme, unmount: mounted.unmount };
};

const mountPublicForm = async (
  root: HTMLElement,
  view: Extract<SandboxView, { kind: "public-run" }>,
  theme: PredictionTheme,
  app: App,
): Promise<SandboxGuestView> => {
  const mounted = mountPublicRunForm({
    container: root,
    schema: view.schema,
    plugins: await compilePluginCatalog(view.plugins),
    theme,
    run: async (values) => {
      const answer = await app.request("public-run", { values: toJsonData(values) });
      if (answer.status === "failed") throw new ReportedRunFailure();
      return answer.status === "answered" ? answer.reports : null;
    },
    onRunningChange: (running) => app.emit("running", { running }),
    onRunError: (error) => {
      if (!(error instanceof ReportedRunFailure))
        app.emit("submit-error", { message: message(error) });
    },
  });
  return {
    rendered: true,
    updateTheme: mounted.updateTheme,
    setRunOffered: mounted.setRunOffered,
    unmount: mounted.unmount,
  };
};

/** Draws the view the app asked for in the sandbox document's root, which it owns until unmounted. */
export const mountSandboxView = async (
  root: HTMLElement,
  view: SandboxView,
  theme: PredictionTheme,
  app: App,
  scope: Scope,
): Promise<SandboxGuestView> => {
  switch (view.kind) {
    case "run":
      return mountRunForm(root, view, theme, app, scope);
    case "public-run":
      return mountPublicForm(root, view, theme, app);
    case "preview": {
      const plugins = await compilePluginCatalog(view.plugins);
      const mounted = mountSchemaPreviewForm({
        container: root,
        schema: view.schema,
        plugins,
        theme,
      });
      return { rendered: true, updateTheme: mounted.updateTheme, unmount: mounted.unmount };
    }
    case "report":
      return renderSandboxReport(root, view, theme);
  }
};
